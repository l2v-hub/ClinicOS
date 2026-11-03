
UNTRUSTED SOURCE agent-team/src/bug-pipeline/github.mjs
Git blob: b6f4829b1e1560b8b7af2a882399f442ce86451e
Full SHA256: 0c7b8a38f097ea6c6d0bb7f49b407ed08cbd75bd23fa3d372b75fb556d82c212
Full bytes: 61068; contiguous range [57336,61068)
---BEGIN EXACT SOURCE---
      throw new Error(`remote evidence blob exceeds size limits: ${file}`);
    const bytes = Buffer.from(encodedBlob, 'base64');
    if (
      bytes.length !== metadata.value.size ||
      blob.value.size !== bytes.length ||
      bytes.toString('base64') !== encodedBlob ||
      createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !==
        metadata.value.sha
    )
      throw new Error(`remote evidence size does not match GitHub metadata: ${file}`);
    return {
      path: file,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
      ...(bytes.length <= 1024 * 1024 ? { content: bytes.toString('utf8') } : {}),
    };
  }

  /**
   * Query branch-protection-required checks only. Empty, pending, failed, malformed or
   * unavailable results all block readiness. An empty result cannot prove that protection
   * is configured, so callers must treat it as a configuration failure and verify protection.
   */
  async function requiredChecks(pr) {
    const number = issueNumber({
      number: typeof pr === 'object' ? pr.number : pr,
    });
    const result = await invoke(
      ['pr', 'checks', String(number), '--repo', repo, '--required', '--json', 'name,state,bucket'],
      { allowFailure: true },
    );
    let checks;
    try {
      checks = JSON.parse(result.stdout);
    } catch {
      return {
        ok: false,
        details: ['Cannot determine required checks; GitHub response was missing or invalid.'],
      };
    }
    if (!Array.isArray(checks) || checks.length === 0) {
      return {
        ok: false,
        details: ['No required checks were reported; verify branch protection before release.'],
      };
    }
    const details = checks.map(
      (check) => `${check.name}: ${check.state ?? check.bucket ?? 'unknown'}`,
    );
    const passing = checks.every((check) => {
      const state = String(check.state ?? '').toUpperCase();
      const bucket = String(check.bucket ?? '').toUpperCase();
      return (state ? state === 'SUCCESS' : bucket === 'PASS') && (!bucket || bucket === 'PASS');
    });
    if (!result.ok) details.push(`gh pr checks exited ${result.code ?? 'with an error'}`);
    return { ok: result.ok && passing, details };
  }

  async function authorizeReleaseRecovery(context) {
    if (
      repo !== 'l2v-hub/ClinicOS' ||
      context?.repository !== repo ||
      context.eventName !== 'workflow_dispatch' ||
      context.ref !== 'refs/heads/main' ||
      context.workflowRef !== `${repo}/.github/workflows/codex-bug-release.yml@refs/heads/main` ||
      context.actor !== 'l2v-hub' ||
      context.triggeringActor !== context.actor ||
      !/^[a-f0-9]{40}$/.test(context.sha ?? '') ||
      context.workflowSha !== context.sha
    )
      throw Error('explicit trusted owner recovery required');
    const user = await api('user');
    const permission = await api(`repos/${repo}/collaborators/l2v-hub/permission`);
    if (
      actorLogin(user.value) !== context.actor ||
      permission.value?.permission !== 'admin' ||
      permission.value?.user?.login !== context.actor
    )
      throw Error('authenticated recovery admin required');
    return context.actor;
  }

  return {
    authorizeReleaseRecovery,
    authorized,
    authorizedMaintainer,
    intake,
    discoverQueue,
    createStateStore,
    viewIssue,
    createDraft,
    commentIssue,
    setIssueStatus,
    readDashboardState,
    listBugIssues,
    dashboardSetup,
    commentPR,
    publishExternalReview,
    reviewFeedback,
    nativeReviewAuthorization,
    draftReady,
    mergePullRequest,
    readFileAtRevision,
    requiredChecks,
  };
}

export const BUG_PIPELINE_STATE_BRANCH = STATE_BRANCH;

---END EXACT SOURCE---

UNTRUSTED SOURCE agent-team/src/bug-pipeline/process.mjs
Git blob: 58eb486c968ea9c1181c647609479d639478a713
Full SHA256: 2859598df0808313faed958604a173d066ffd1ad627992e37ef605be7dea9870
Full bytes: 10533; contiguous range [0,10533)
---BEGIN EXACT SOURCE---
import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { sanitizeText } from '../core/sanitize.mjs';

const MAX_RUNNER_LIMIT = 64 * 1024 * 1024;
function validateLimit(value, name, { allowZero = false } = {}) {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum || value > MAX_RUNNER_LIMIT) {
    throw new RangeError(`invalid ${name} limit`);
  }
  return value;
}

function appendCapture(previous, chunk, limit, tail) {
  if (limit === 0) return Buffer.alloc(0);
  if (tail) {
    const retainedLength = Math.min(limit, previous.length + chunk.length);
    const retained = Buffer.alloc(retainedLength);
    const chunkLength = Math.min(chunk.length, retainedLength);
    const previousLength = retainedLength - chunkLength;
    if (previousLength) previous.copy(retained, 0, previous.length - previousLength);
    if (chunkLength) chunk.copy(retained, previousLength, chunk.length - chunkLength);
    return retained;
  }
  const remaining = Math.max(0, limit - previous.length);
  return remaining ? Buffer.concat([previous, chunk.subarray(0, remaining)]) : previous;
}

// Models/tests never receive the controller's GitHub or deployment credentials.
export function childEnvironment(mode, env, runtimeRoot) {
  const binPaths = [env.CODEX_CLI_PATH, env.CLAUDE_CLI_PATH]
    .filter(Boolean)
    .map((f) => path.dirname(f));
  const base = {
    PATH: [...binPaths, env.PATH].filter(Boolean).join(path.delimiter),
    LANG: 'C.UTF-8',
    CI: 'true',
    DISABLE_AUTOUPDATER: '1',
  };
  // Windows native executables need these OS paths even in a restricted child environment.
  if (process.platform === 'win32') {
    for (const key of [
      'SystemRoot',
      'WINDIR',
      'TEMP',
      'TMP',
      'LOCALAPPDATA',
      'CLAUDE_CODE_GIT_BASH_PATH',
    ])
      if (env[key]) base[key] = env[key];
    if (
      mode === 'controller' ||
      mode === 'claude-execution' ||
      (mode === 'review' && env.CLAUDE_REVIEW_AUTH_MODE === 'subscription-local')
    ) {
      for (const key of ['USERPROFILE', 'APPDATA']) if (env[key]) base[key] = env[key];
    }
  }
  if (mode === 'controller') {
    for (const key of [
      'HOME',
      'GH_TOKEN',
      'GITHUB_TOKEN',
      'HTTPS_PROXY',
      'HTTP_PROXY',
      'NO_PROXY',
      'SSL_CERT_FILE',
      'NODE_EXTRA_CA_CERTS',
    ])
      if (env[key]) base[key] = env[key];
    base.GIT_AUTHOR_NAME = base.GIT_COMMITTER_NAME = 'ClinicOS bug pipeline';
    base.GIT_AUTHOR_EMAIL = base.GIT_COMMITTER_EMAIL =
      'clinicos-bug-pipeline@users.noreply.github.com';
  } else {
    base.HOME = path.join(
      runtimeRoot,
      ['model', 'review', 'claude-execution'].includes(mode) ? 'model-home' : 'verification-home',
    );
    base.CODEX_HOME =
      mode === 'model' && !env.CODEX_API_KEY && env.CODEX_HOME
        ? env.CODEX_HOME
        : path.join(base.HOME, '.codex');
    base.CLAUDE_CONFIG_DIR = path.join(base.HOME, '.claude');
    if (mode === 'claude-execution') {
      // The opt-in implementation profile is separate from the read-only reviewer.
      // No API/OAuth, Codex, GitHub or deployment credential is inherited.
      base.CLAUDE_CONFIG_DIR = env.CLINICOS_CLAUDE_EXECUTOR_CONFIG_DIR || '';
    }
    if (mode === 'model' && env.CODEX_API_KEY) base.CODEX_API_KEY = env.CODEX_API_KEY;
    if (mode === 'review') {
      const localSubscription = env.CLAUDE_REVIEW_AUTH_MODE === 'subscription-local';
      if (localSubscription && env.CLINICOS_CLAUDE_CONFIG_DIR)
        base.CLAUDE_CONFIG_DIR = env.CLINICOS_CLAUDE_CONFIG_DIR;
      const oauth =
        !localSubscription &&
        (env.CLAUDE_CODE_OAUTH_TOKEN ||
          (env.ANTHROPIC_API_KEY?.startsWith('sk-ant-oat01-') ? env.ANTHROPIC_API_KEY : undefined));
      if (oauth) base.CLAUDE_CODE_OAUTH_TOKEN = oauth;
      else if (
        !localSubscription &&
        env.CLAUDE_REVIEW_AUTH_MODE !== 'subscription' &&
        env.ANTHROPIC_API_KEY
      )
        base.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    }
    base.NODE_ENV = 'test';
    base.AUTH_MODE = 'demo';
    base.VITE_API_URL = 'http://127.0.0.1:3001';
    base.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/clinicos_test?schema=public';
    base.AI_PROVIDER = 'mock';
    base.AI_RUNTIME_URL = 'http://127.0.0.1:8000';
    base.AI_RUNTIME_SERVICE_TOKEN = 'ci-mock-runtime-token';
  }
  if (mode === 'verification' && env.PLAYWRIGHT_BROWSERS_PATH !== undefined) {
    if (
      !path.isAbsolute(env.PLAYWRIGHT_BROWSERS_PATH) ||
      /[\r\n\0]/.test(env.PLAYWRIGHT_BROWSERS_PATH)
    )
      throw new Error('Verification browser cache must be an absolute nonsecret path');
    base.PLAYWRIGHT_BROWSERS_PATH = env.PLAYWRIGHT_BROWSERS_PATH;
  }
  return base;
}
export function createRunner({ env = process.env, runtimeRoot }) {
  return async ({
    command,
    args = [],
    cwd,
    input,
    timeoutMs = 30_000,
    maxOutputBytes = 2 * 1024 * 1024,
    maxCapturedBytesPerStream,
    maxStderrBytes,
    captureTail = false,
    limitStdout = true,
    envMode = 'controller',
    claudeConfigDir,
  }) => {
    validateLimit(maxOutputBytes, 'maxOutputBytes');
    const legacyCapture =
      maxCapturedBytesPerStream === undefined &&
      maxStderrBytes === undefined &&
      !captureTail &&
      limitStdout;
    maxCapturedBytesPerStream ??= maxOutputBytes;
    validateLimit(maxCapturedBytesPerStream, 'maxCapturedBytesPerStream', { allowZero: true });
    if (typeof captureTail !== 'boolean') throw new TypeError('captureTail must be a boolean');
    if (typeof limitStdout !== 'boolean') throw new TypeError('limitStdout must be a boolean');
    if (maxStderrBytes !== undefined) validateLimit(maxStderrBytes, 'maxStderrBytes');
    const childEnv = childEnvironment(envMode, env, runtimeRoot);
    if (
      envMode === 'claude-execution' &&
      (env.CLINICOS_CLAUDE_EXECUTOR_ENABLED !== 'true' ||
        env.GITHUB_ACTIONS === 'true' ||
        !path.isAbsolute(env.CLINICOS_CLAUDE_EXECUTOR_CONFIG_DIR || '') ||
        !path.isAbsolute(env.CLAUDE_CLI_PATH || '') ||
        command !== env.CLAUDE_CLI_PATH ||
        !path.isAbsolute(claudeConfigDir || '') ||
        path.resolve(claudeConfigDir) !== path.resolve(env.CLINICOS_CLAUDE_EXECUTOR_CONFIG_DIR))
    )
      return {
        ok: false,
        code: null,
        error: 'local-claude-executor-profile-required',
        stdout: '',
        stderr: '',
      };
    if (
      envMode === 'review' &&
      env.CLAUDE_REVIEW_AUTH_MODE === 'subscription-local' &&
      !path.isAbsolute(env.CLINICOS_CLAUDE_CONFIG_DIR || '')
    )
      return {
        ok: false,
        code: null,
        error: 'local-subscription-config-required',
        stdout: '',
        stderr: '',
      };
    if (
      envMode === 'review' &&
      env.CLAUDE_REVIEW_AUTH_MODE === 'subscription' &&
      !childEnv.CLAUDE_CODE_OAUTH_TOKEN
    ) {
      return {
        ok: false,
        code: null,
        error: 'subscription-oauth-required',
        stdout: '',
        stderr: '',
      };
    }
    if (envMode !== 'controller') {
      for (const directory of [childEnv.HOME, childEnv.CODEX_HOME, childEnv.CLAUDE_CONFIG_DIR]) {
        // Personal authentication is read in place by Claude; never create/copy its profile.
        if (envMode === 'claude-execution' && directory === childEnv.CLAUDE_CONFIG_DIR) continue;
        await mkdir(directory, { recursive: true, mode: 0o700 });
      }
    }
    const executable =
      command === 'codex'
        ? env.CODEX_CLI_PATH || command
        : command === 'claude'
          ? env.CLAUDE_CLI_PATH || command
          : command;
    return new Promise((resolve) => {
      let stdout = Buffer.alloc(0),
        stderr = Buffer.alloc(0),
        failure = null,
        stdoutBytes = 0,
        stderrBytes = 0,
        finished = false;
      const javascriptCli = ['claude', 'codex'].includes(command) && /\.[cm]?js$/i.test(executable);
      const child = spawn(
        javascriptCli ? process.execPath : executable,
        javascriptCli ? [executable, ...args] : args,
        {
          cwd,
          env: childEnv,
          shell: false,
          detached: process.platform !== 'win32',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
      const kill = (signal) => {
        try {
          if (process.platform !== 'win32') process.kill(-child.pid, signal);
          else child.kill(signal);
        } catch {
          /* already exited */
        }
      };
      let hardKill;
      const fail = (reason) => {
        failure ??= reason;
        kill('SIGTERM');
        hardKill ??= setTimeout(() => kill('SIGKILL'), 1000);
      };
      const timer = setTimeout(() => fail('timeout'), timeoutMs);
      const data = (kind, chunk) => {
        if (kind === 'out') stdoutBytes = Math.min(Number.MAX_SAFE_INTEGER, stdoutBytes + chunk.length);
        else stderrBytes = Math.min(Number.MAX_SAFE_INTEGER, stderrBytes + chunk.length);
        const limitedBytes = limitStdout ? stdoutBytes + stderrBytes : stderrBytes;
        if (limitedBytes > maxOutputBytes && legacyCapture) {
          fail('output-limit');
          return;
        }
        if (kind === 'out') stdout = appendCapture(stdout, chunk, maxCapturedBytesPerStream, captureTail);
        else {
          stderr = appendCapture(stderr, chunk, maxCapturedBytesPerStream, captureTail);
          if (maxStderrBytes !== undefined && stderrBytes > maxStderrBytes) fail('stderr-limit');
        }
        if (limitedBytes > maxOutputBytes) fail('output-limit');
      };
      child.stdout.on('data', (c) => data('out', c));
      child.stderr.on('data', (c) => data('err', c));
      const finish = (code, error = null) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        clearTimeout(hardKill);
        kill('SIGKILL');
        resolve({
          ok: code === 0 && !failure && !error,
          code,
          error: failure ?? error,
          stdout: sanitizeText(stdout.toString('utf8')),
          stderr: sanitizeText(stderr.toString('utf8')),
          stdoutBytes,
          stderrBytes,
          stdoutCapturedBytes: stdout.length,
          stderrCapturedBytes: stderr.length,
        });
      };
      child.on('error', () => finish(null, 'spawn-failed'));
      child.on('close', (code) => finish(code));
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    });
  };
}

---END EXACT SOURCE---

UNTRUSTED SOURCE scripts/automation/configure-demo-source.mjs
Git blob: ceff8e4720f1a3e3192a41790d739981922b113f
Full SHA256: 3bac135aaecfe5c95b48f38f613f27a0326d8ebb905a4753cb5ecc0d1513264b
Full bytes: 17195; contiguous range [0,17195)
---BEGIN EXACT SOURCE---
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const TARGET = Object.freeze({
  projectId: 'bddf5d1b-ee83-4362-8238-a79721f795e5',
  environmentId: '8021987e-8eaa-4bc8-a102-20566db5e6b4',
  serviceId: 'c000f011-0349-4ea9-9b56-13c625b5767b',
  repository: 'l2v-hub/ClinicOS',
  branch: 'main',
  domain: 'clinicos-backend-demo.up.railway.app',
});
export const ENDPOINT = 'https://backboard.railway.com/graphql/v2';
export const INVENTORY_QUERY = `query($projectId:String!,$environmentId:String!,$serviceId:String!){
  projectToken{project{id} environment{id name}}
  serviceInstance(environmentId:$environmentId,serviceId:$serviceId){
    serviceId environmentId rootDirectory source{repo}
    domains{serviceDomains{domain} customDomains{domain}}
  }
  deploymentTriggers(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,first:2){
    pageInfo{hasNextPage}
    edges{node{id provider projectId environmentId serviceId repository branch checkSuites baseEnvironmentOverrideId}}
  }
}`;
export const UPDATE_BRANCH = `mutation($id:String!,$input:DeploymentTriggerUpdateInput!){
  deploymentTriggerUpdate(id:$id,input:$input){id branch}
}`;
export const CREATE_MAIN = `mutation($input:DeploymentTriggerCreateInput!){
  deploymentTriggerCreate(input:$input){
    id provider projectId environmentId serviceId repository branch checkSuites baseEnvironmentOverrideId
  }
}`;
export const MAIN_ENDPOINT = 'https://api.github.com/repos/l2v-hub/ClinicOS/git/ref/heads/main';
const MAX_BYTES = 262_144;
// GraphQL ID is opaque: accept bounded identifiers without assuming UUID storage.
const ID = /^[A-Za-z0-9][A-Za-z0-9_:/+=.-]{0,199}(?![\s\S])/;
const SHA = /^[a-f0-9]{40}(?![\s\S])/;
const DIGEST = /^[a-f0-9]{64}(?![\s\S])/;
const SECRET = /(?:gh[pousr]_[A-Za-z0-9]|github_pat_|sk-(?:ant-|proj-)|eyJ[A-Za-z0-9_-]{10,}\.)/;

export class ConfigurationError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const fail = (code) => {
  throw new ConfigurationError(code);
};
const freeze = (value) => {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
};
export const inventoryDigest = (inventory) =>
  createHash('sha256').update(JSON.stringify(inventory)).digest('hex');

function projectTrigger(node) {
  if (
    node?.projectId !== TARGET.projectId ||
    node?.environmentId !== TARGET.environmentId ||
    node?.serviceId !== TARGET.serviceId
  )
    fail('DEMO_SOURCE_TRIGGER_TARGET_MISMATCH');
  if (node.repository !== TARGET.repository) fail('DEMO_SOURCE_FOREIGN_REPOSITORY');
  if (typeof node.provider !== 'string' || node.provider.toLowerCase() !== 'github')
    fail('DEMO_SOURCE_FOREIGN_PROVIDER');
  if (
    typeof node.id !== 'string' ||
    !ID.test(node.id) ||
    SECRET.test(node.id) ||
    typeof node.branch !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}(?![\s\S])/.test(node.branch) ||
    SECRET.test(node.branch) ||
    typeof node.checkSuites !== 'boolean' ||
    (node.baseEnvironmentOverrideId !== null &&
      (typeof node.baseEnvironmentOverrideId !== 'string' ||
        !ID.test(node.baseEnvironmentOverrideId) ||
        SECRET.test(node.baseEnvironmentOverrideId)))
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  return {
    id: node.id,
    provider: node.provider,
    projectId: node.projectId,
    environmentId: node.environmentId,
    serviceId: node.serviceId,
    repository: node.repository,
    branch: node.branch,
    checkSuites: node.checkSuites,
    baseEnvironmentOverrideId: node.baseEnvironmentOverrideId,
  };
}

// Only these validated metadata fields may enter an artifact. Provider errors,
// variables, URLs, headers, response extensions and arbitrary object keys never do.
export function projectInventory(data) {
  const token = data?.projectToken;
  const instance = data?.serviceInstance;
  if (
    token?.project?.id !== TARGET.projectId ||
    token?.environment?.id !== TARGET.environmentId ||
    token?.environment?.name !== 'demo' ||
    instance?.serviceId !== TARGET.serviceId ||
    instance?.environmentId !== TARGET.environmentId ||
    instance?.source?.repo !== TARGET.repository
  )
    fail('DEMO_SOURCE_TARGET_MISMATCH');
  const rootDirectory = instance.rootDirectory;
  if (
    rootDirectory !== null &&
    (typeof rootDirectory !== 'string' ||
      rootDirectory.length > 256 ||
      !/^\/?[A-Za-z0-9._/-]*(?![\s\S])/.test(rootDirectory) ||
      SECRET.test(rootDirectory))
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  const domains = [];
  for (const kind of ['serviceDomains', 'customDomains']) {
    const entries = instance.domains?.[kind];
    if (!Array.isArray(entries) || entries.length > 32) fail('DEMO_SOURCE_INVALID_METADATA');
    for (const entry of entries) {
      const domain = entry?.domain;
      if (
        typeof domain !== 'string' ||
        domain.length > 253 ||
        !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?![\s\S])/.test(domain) ||
        SECRET.test(domain)
      )
        fail('DEMO_SOURCE_INVALID_METADATA');
      domains.push({ kind, domain });
    }
  }
  if (!domains.some(({ domain }) => domain === TARGET.domain)) fail('DEMO_SOURCE_DOMAIN_MISMATCH');
  domains.sort((a, b) => a.kind.localeCompare(b.kind) || a.domain.localeCompare(b.domain));
  const connection = data?.deploymentTriggers;
  if (
    !Array.isArray(connection?.edges) ||
    connection.edges.length > 2 ||
    typeof connection?.pageInfo?.hasNextPage !== 'boolean'
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  const triggers = connection.edges.map((edge) => projectTrigger(edge?.node));
  if (new Set(triggers.map(({ id }) => id)).size !== triggers.length)
    fail('DEMO_SOURCE_INVALID_METADATA');
  triggers.sort((a, b) => a.id.localeCompare(b.id));
  return freeze({
    schemaVersion: 1,
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    environmentName: 'demo',
    serviceId: TARGET.serviceId,
    repository: TARGET.repository,
    rootDirectory,
    domains,
    triggers,
    hasMoreTriggers: connection.pageInfo.hasNextPage,
  });
}

export function classify(inventory) {
  if (inventory.hasMoreTriggers || inventory.triggers.length > 1) return 'duplicate-triggers';
  if (!inventory.triggers.length) return 'missing-trigger';
  return inventory.triggers[0].branch === TARGET.branch ? 'already-main' : 'branch-change-required';
}

async function readBoundedJson(response, endpoint) {
  if (!response.ok || response.redirected || (response.url && response.url !== endpoint))
    fail('DEMO_SOURCE_REQUEST_FAILED');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BYTES) fail('DEMO_SOURCE_RESPONSE_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail('DEMO_SOURCE_INVALID_RESPONSE');
  }
}

export function createClient({ token, fetchImpl = fetch } = {}) {
  if (typeof token !== 'string' || !token.trim()) fail('DEMO_SOURCE_TOKEN_MISSING');
  return async (query, variables) => {
    try {
      const response = await fetchImpl(ENDPOINT, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json', 'Project-Access-Token': token },
        body: JSON.stringify({ query, variables }),
      });
      const body = await readBoundedJson(response, ENDPOINT);
      if (!body?.data || body.errors) fail('DEMO_SOURCE_API_REJECTED');
      return body.data;
    } catch (error) {
      if (error instanceof ConfigurationError) throw error;
      fail('DEMO_SOURCE_REQUEST_FAILED');
    }
  };
}

export function createMainVerifier({ token, reviewedSha, fetchImpl = fetch } = {}) {
  if (typeof token !== 'string' || !token.trim() || !SHA.test(reviewedSha ?? ''))
    fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
  return async () => {
    let body;
    try {
      const response = await fetchImpl(MAIN_ENDPOINT, {
        method: 'GET',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Cache-Control': 'no-cache',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ClinicOS-demo-source-configuration',
        },
      });
      body = await readBoundedJson(response, MAIN_ENDPOINT);
    } catch {
      fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
    }
    if (
      body?.ref !== 'refs/heads/main' ||
      body?.object?.type !== 'commit' ||
      !SHA.test(body?.object?.sha ?? '')
    )
      fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
    if (body.object.sha !== reviewedSha) fail('DEMO_SOURCE_CURRENT_MAIN_DRIFT');
  };
}

export function validateContext(env) {
  if (
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.GITHUB_REPOSITORY !== TARGET.repository ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    !SHA.test(env.GITHUB_SHA ?? '') ||
    env.CONFIGURE_DEMO_REVIEWED_SHA !== env.GITHUB_SHA ||
    !/^[1-9][0-9]{0,19}(?![\s\S])/.test(env.GITHUB_RUN_ID ?? '') ||
    !/^[1-9][0-9]{0,9}(?![\s\S])/.test(env.GITHUB_RUN_ATTEMPT ?? '')
  )
    fail('DEMO_SOURCE_TRUSTED_MAIN_REQUIRED');
  return {
    repository: TARGET.repository,
    reviewedSha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
  };
}

const matchesCreatePolicy = (trigger) =>
  trigger?.branch === TARGET.branch &&
  trigger.checkSuites === true &&
  trigger.baseEnvironmentOverrideId === null;

export async function configure({
  client,
  operation = 'inspect',
  expectedDigest,
  assertFreshContext = async () => {},
} = {}) {
  if (!['inspect', 'set-main', 'create-main'].includes(operation))
    fail('DEMO_SOURCE_INVALID_OPERATION');
  if (operation !== 'inspect' && !DIGEST.test(expectedDigest ?? ''))
    fail('DEMO_SOURCE_EXPECTED_DIGEST_REQUIRED');
  const variables = {
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    serviceId: TARGET.serviceId,
  };
  const inspect = async () => projectInventory(await client(INVENTORY_QUERY, variables));
  await assertFreshContext();
  const before = await inspect();
  const beforeDigest = inventoryDigest(before);
  if (operation === 'inspect') {
    await assertFreshContext();
    return {
      operation,
      outcome: classify(before),
      inventory: before,
      inventorySha256: beforeDigest,
    };
  }
  if (beforeDigest !== expectedDigest) fail('DEMO_SOURCE_INVENTORY_DRIFT');
  const decision = classify(before);
  if (decision === 'duplicate-triggers') fail('DEMO_SOURCE_DUPLICATE_TRIGGERS');
  const creating = operation === 'create-main';
  if (!creating && decision === 'missing-trigger') fail('DEMO_SOURCE_MISSING_TRIGGER');
  if (creating && before.triggers.length && !matchesCreatePolicy(before.triggers[0]))
    fail('DEMO_SOURCE_CREATE_CONFLICT');
  await assertFreshContext();
  const fresh = await inspect();
  if (inventoryDigest(fresh) !== beforeDigest) fail('DEMO_SOURCE_INVENTORY_DRIFT');
  if (decision === 'already-main') {
    await assertFreshContext();
    return { operation, outcome: 'unchanged', inventory: fresh, inventorySha256: beforeDigest };
  }
  // Railway offers no trigger revision/CAS field. Re-read immediately before the
  // one write and verify afterwards; any detected concurrent drift blocks success.
  const expectedAfter = structuredClone(before);
  if (creating) {
    const result = await client(CREATE_MAIN, {
      input: {
        ...variables,
        repository: TARGET.repository,
        branch: TARGET.branch,
        // Official schema leaves provider as String. No alternate literal retry.
        provider: 'github',
        checkSuites: true,
        rootDirectory: before.rootDirectory,
      },
    });
    let created;
    try {
      created = projectTrigger(result?.deploymentTriggerCreate);
    } catch {
      fail('DEMO_SOURCE_CREATE_UNCONFIRMED');
    }
    if (!matchesCreatePolicy(created)) fail('DEMO_SOURCE_CREATE_UNCONFIRMED');
    expectedAfter.triggers = [created];
  } else {
    expectedAfter.triggers[0].branch = TARGET.branch;
    const trigger = before.triggers[0];
    const result = await client(UPDATE_BRANCH, {
      id: trigger.id,
      input: { branch: TARGET.branch },
    });
    if (
      result?.deploymentTriggerUpdate?.id !== trigger.id ||
      result.deploymentTriggerUpdate.branch !== TARGET.branch
    )
      fail('DEMO_SOURCE_UPDATE_UNCONFIRMED');
  }
  const after = await inspect();
  if (inventoryDigest(after) !== inventoryDigest(expectedAfter))
    fail(creating ? 'DEMO_SOURCE_POST_CREATE_DRIFT' : 'DEMO_SOURCE_POST_UPDATE_DRIFT');
  await assertFreshContext();
  return {
    operation,
    outcome: creating ? 'trigger-created' : 'branch-updated',
    previousInventorySha256: beforeDigest,
    inventory: after,
    inventorySha256: inventoryDigest(after),
  };
}

// Serialize a validated projection, never the provider response or caller extras.
export function serializeReceipt(
  context,
  result,
  { capturedAt = new Date().toISOString(), forbiddenValues = [] } = {},
) {
  const safeContext = validateContext({
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: context.repository,
    GITHUB_SHA: context.reviewedSha,
    CONFIGURE_DEMO_REVIEWED_SHA: context.reviewedSha,
    GITHUB_RUN_ID: context.runId,
    GITHUB_RUN_ATTEMPT: context.runAttempt,
  });
  const raw = result.inventory;
  const kinds = ['serviceDomains', 'customDomains'];
  if (
    raw?.schemaVersion !== 1 ||
    !Array.isArray(raw.domains) ||
    raw.domains.length > 64 ||
    raw.domains.some((entry) => !kinds.includes(entry?.kind)) ||
    !Array.isArray(raw.triggers)
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const inventory = projectInventory({
    projectToken: {
      project: { id: raw.projectId },
      environment: { id: raw.environmentId, name: raw.environmentName },
    },
    serviceInstance: {
      serviceId: raw.serviceId,
      environmentId: raw.environmentId,
      rootDirectory: raw.rootDirectory,
      source: { repo: raw.repository },
      domains: Object.fromEntries(
        kinds.map((kind) => [
          kind,
          raw.domains.filter((entry) => entry.kind === kind).map(({ domain }) => ({ domain })),
        ]),
      ),
    },
    deploymentTriggers: {
      pageInfo: { hasNextPage: raw.hasMoreTriggers },
      edges: raw.triggers.map((node) => ({ node })),
    },
  });
  const outcomes = {
    inspect: ['missing-trigger', 'duplicate-triggers', 'already-main', 'branch-change-required'],
    'set-main': ['unchanged', 'branch-updated'],
    'create-main': ['unchanged', 'trigger-created'],
  };
  if (
    !Object.hasOwn(outcomes, result.operation) ||
    !outcomes[result.operation].includes(result.outcome) ||
    result.inventorySha256 !== inventoryDigest(inventory) ||
    typeof capturedAt !== 'string' ||
    !Number.isFinite(Date.parse(capturedAt)) ||
    new Date(capturedAt).toISOString() !== capturedAt
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const changed = ['branch-updated', 'trigger-created'].includes(result.outcome);
  if (changed && !DIGEST.test(result.previousInventorySha256 ?? ''))
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const receipt = {
    schemaVersion: 1,
    ...safeContext,
    capturedAt,
    operation: result.operation,
    outcome: result.outcome,
    ...(changed ? { previousInventorySha256: result.previousInventorySha256 } : {}),
    inventory,
    inventorySha256: result.inventorySha256,
  };
  const json = JSON.stringify(receipt);
  if (
    Buffer.byteLength(json) > 32_768 ||
    SECRET.test(json) ||
    forbiddenValues.some(
      (value) => typeof value === 'string' && value.length > 0 && json.includes(value),
    )
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  return json;
}

async function main() {
  const context = validateContext(process.env);
  const result = await configure({
    client: createClient({ token: process.env.RAILWAY_TOKEN }),
    operation: process.env.CONFIGURE_DEMO_OPERATION || 'inspect',
    expectedDigest: process.env.CONFIGURE_DEMO_EXPECTED_DIGEST,
    assertFreshContext: createMainVerifier({
      token: process.env.GITHUB_TOKEN,
      reviewedSha: context.reviewedSha,
    }),
  });
  const receipt = serializeReceipt(context, result, {
    forbiddenValues: [process.env.RAILWAY_TOKEN, process.env.GITHUB_TOKEN],
  });
  await writeFile('demo-source-configuration-receipt.json', `${receipt}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  console.log(`DEMO_SOURCE_CONFIGURATION_RECEIPT ${receipt}`);
  console.log(`DEMO_SOURCE_CONFIGURATION_OK ${result.outcome} ${result.inventorySha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      error instanceof ConfigurationError ? error.code : 'DEMO_SOURCE_CONFIGURATION_FAILED',
    );
    process.exitCode = 1;
  });
}

---END EXACT SOURCE---

UNTRUSTED SOURCE scripts/automation/renew-demo-auth-expiry.mjs
Git blob: 526444974fe4ce08d4e55e57949c8b5f0c9d4f13
Full SHA256: e0be9b877e5b75729b6207b34a42226f48078138e2f72e7f19daf9358869dad7
Full bytes: 22962; contiguous range [0,22962)
---BEGIN EXACT SOURCE---
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createMainVerifier } from './configure-demo-source.mjs';
import { createGitHub } from '../../agent-team/src/bug-pipeline/github.mjs';
import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { authorizationBinding, consumeOperatorAuthorization } from '../../agent-team/src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { DEMO_TARGET, DEMO_SOURCE_POLICIES, createRailwayClient, inspectDemo } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';

export const KEY = 'DEMO_AUTH_EXPIRES_AT';
export const MAX_RENEWAL_MS = 7 * 24 * 60 * 60 * 1000;
export const RENEW_MUTATION = 'mutation($input:VariableUpsertInput!){variableUpsert(input:$input)}';
const ACTION = 'renew-demo-auth-expiry';
const REPO = 'l2v-hub/ClinicOS';
const WORKFLOW = `${REPO}/.github/workflows/renew-demo-auth-expiry.yml@refs/heads/main`;
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const clone = value => structuredClone(value);
const collections = ['batches', 'manualBatches', 'standaloneReviews'];
const statuses = ['claimed', 'write-intent', 'staged', 'uncertain', 'blocked-before-write'];
function exactKeys(value, keys) { assert.deepEqual(Object.keys(value).sort(), keys.slice().sort()); }
function expiry(value) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value));
  const epoch = Date.parse(value);
  assert.ok(Number.isFinite(epoch));
  assert.equal(new Date(epoch).toISOString().replace('.000Z', 'Z'), value);
  return epoch;
}
function select(value) {
  exactKeys(value, ['subjectId', 'operationNonce', 'reviewedSha']);
  assert.match(value.subjectId, ID); assert.match(value.operationNonce, UUID); assert.match(value.reviewedSha, SHA);
  return clone(value);
}
function requestData(q) {
  return Object.fromEntries(['subjectId', 'operationNonce', 'reviewedSha', 'previousExpiry', 'newExpiry', 'owner', 'ownerNonce'].map(k => [k, q[k]]));
}
export function validateRenewalRequest(raw, clock = Date.now()) {
  exactKeys(raw, ['subjectId', 'operationNonce', 'reviewedSha', 'previousExpiry', 'newExpiry', 'owner', 'ownerNonce']);
  select({ subjectId: raw.subjectId, operationNonce: raw.operationNonce, reviewedSha: raw.reviewedSha });
  assert.match(raw.owner, ID); assert.match(raw.ownerNonce, UUID);
  const previous = expiry(raw.previousExpiry), next = expiry(raw.newExpiry);
  assert.ok(Number.isFinite(clock) && previous <= clock && next > clock && next > previous);
  assert.ok(next - clock <= MAX_RENEWAL_MS, 'Renewal exceeds the seven-day ceiling');
  return clone(raw);
}
export function validateRenewalContext(env) {
  assert.equal(env.GITHUB_REPOSITORY, REPO); assert.equal(env.GITHUB_REF, 'refs/heads/main');
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch'); assert.equal(env.GITHUB_WORKFLOW_REF, WORKFLOW);
  assert.match(env.GITHUB_SHA ?? '', SHA); assert.equal(env.RENEW_REVIEWED_SHA, env.GITHUB_SHA);
  assert.match(env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]{0,19}$/);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'Rerun requires a new independently authorized operation');
  return { repository: REPO, reviewedSha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: 1 };
}
function entries(state) { return collections.flatMap(k => (state[k] ?? []).map(subject => ({ collection: k, subject }))); }
function assertPriorRenewals(all, current, request, clock) {
  const stages = [];
  for (const { subject, q } of all) {
    if (q === current || !q.execution || q.execution.status === 'blocked-before-write') continue;
    assert.equal(q.execution.status, 'staged', 'In-flight or uncertain renewal requires operator reconciliation');
    const saved = q.authorization, auth = saved?.authorization, authorizedAt = Date.parse(saved?.authorizedAt);
    assert.ok(Number.isFinite(authorizedAt) && authorizedAt <= clock && new Date(authorizedAt).toISOString() === saved.authorizedAt);
    const prior = validateRenewalRequest(requestData(q), authorizedAt), end = expiry(prior.newExpiry);
    assert.ok(end <= clock && end <= expiry(request.previousExpiry), 'A staged renewal is still live or overlaps this request');
    assert.ok(['user-session', 'distinct-maintainer-comment'].includes(auth?.provenance));
    assert.equal(auth.bindingDigest, historyDigest(auth.binding));
    assert.equal(auth.binding.action, ACTION); assert.equal(auth.binding.entityId, subject.id);
    const reserved = { ...prior, target: DEMO_TARGET, key: KEY, skipDeploys: true };
    for (const [key, value] of Object.entries(reserved)) assert.deepEqual(auth.binding.reservation[key], value);
    const history = subject.recoveryHistory ?? [], index = saved.historyBeforeLength;
    assert.ok(Number.isSafeInteger(index) && index >= 0 && history.length > index);
    assert.equal(historyDigest(history.slice(0, index)), saved.historyBeforeDigest);
    assert.equal(history[index].action, ACTION); assert.equal(history[index].nonce, saved.auditNonce);
    assert.deepEqual(history[index].authorization, auth);
    stages.push(prior);
  }
  stages.sort((a, b) => expiry(a.newExpiry) - expiry(b.newExpiry));
  for (let index = 1; index < stages.length; index++) {
    assert.ok(expiry(stages[index - 1].newExpiry) < expiry(stages[index].newExpiry), 'Parallel staged cutoff is ambiguous');
    assert.equal(stages[index].previousExpiry, stages[index - 1].newExpiry, 'Historical stages do not form one expiry chain');
  }
  if (stages.length) assert.equal(stages.at(-1).newExpiry, request.previousExpiry,
    'The new previous expiry must exactly continue the latest completed staged cutoff');
}
function locate(state, input, clock) {
  const selector = select(input); assert.equal(state.repository, REPO);
  const owners = entries(state).filter(x => x.subject.id === selector.subjectId);
  assert.equal(owners.length, 1);
  const b = owners[0].subject;
  assert.ok(b.issues?.length && !b.issues.some(id => [470, 475, 506, 516].includes(id)), 'Independent auth owner required');
  const all = entries(state).flatMap(({ subject }) => (subject.demoAuthExpiryRenewals ?? []).map(q => ({ subject, q })));
  const matches = all.filter(x => x.q.operationNonce === selector.operationNonce);
  assert.equal(matches.length, 1); assert.equal(matches[0].subject, b);
  const q = matches[0].q;
  assert.equal(q.subjectId, b.id); assert.equal(q.reviewedSha, selector.reviewedSha);
  const request = validateRenewalRequest(requestData(q), clock);
  assert.equal(b.operatorCoordination?.active, true);
  assert.equal(b.operatorCoordination.owner, request.owner); assert.equal(b.operatorCoordination.nonce, request.ownerNonce);
  assert.match(b.sha ?? '', SHA);
  assert.ok(['merged', 'deployed'].includes(b.release?.status)); assert.equal(b.release.mergeSha, request.reviewedSha);
  assertPriorRenewals(all, q, request, clock);
  return { state, b, q, request, selector };
}
function reservation(value) {
  return { ...value.request, target: DEMO_TARGET, key: KEY, skipDeploys: true,
    releaseDigest: historyDigest(value.b.release), ownerDigest: historyDigest(value.b.operatorCoordination) };
}
function verify(value) {
  const saved = value.q.authorization; assert.ok(saved?.authorization);
  const { b } = value, length = saved.historyBeforeLength, history = b.recoveryHistory ?? [];
  assert.ok(Number.isSafeInteger(length) && length >= 0 && history.length === length + 1);
  assert.equal(historyDigest(history.slice(0, length)), saved.historyBeforeDigest);
  assert.equal(history[length].action, ACTION); assert.equal(history[length].nonce, saved.auditNonce);
  assert.deepEqual(history[length].authorization, saved.authorization);
  const auth = saved.authorization;
  assert.ok(['user-session', 'distinct-maintainer-comment'].includes(auth.provenance));
  const baseline = clone(value.state);
  const subject = entries(baseline).find(x => x.subject.id === b.id).subject;
  subject.recoveryHistory = subject.recoveryHistory.slice(0, length);
  const binding = authorizationBinding({ state: baseline, subject, actor: auth.binding.actor,
    action: ACTION, reservation: reservation(value), budget: null });
  assert.deepEqual(auth.binding, binding); assert.equal(auth.bindingDigest, historyDigest(binding));
  return saved;
}
export function createRenewalController({ github, authorizationVerifier, now = Date.now, nonce = randomUUID }) {
  const store = github.createStateStore();
  const observe = async input => locate(await store.observe(), input, now());
  async function allowed(value, actor) {
    assert.ok(typeof actor === 'string' && actor && await github.authorizedMaintainer(actor));
    const author = value.q.authorization?.authorization.binding.actor;
    if (author) assert.equal(await github.authorizedMaintainer(author), true);
  }
  async function save(value, before, actor, guard = async () => {}) {
    value.state.updatedAt = new Date(now()).toISOString();
    await store.save(value.state, { guard: async () => {
      const current = await observe(value.selector); await allowed(current, actor);
      assert.equal(JSON.stringify(current.b), before); await guard();
      assert.equal(JSON.stringify((await observe(value.selector)).b), before);
    } });
  }
  async function authorize(input, { actor, reference }) {
    const value = locate(await store.load(), input, now()), before = JSON.stringify(value.b);
    assert.equal(value.q.authorization, undefined); assert.equal(value.q.execution, undefined);
    await allowed(value, actor);
    const binding = authorizationBinding({ state: value.state, subject: value.b, actor,
      action: ACTION, reservation: reservation(value), budget: null });
    const authorization = await consumeOperatorAuthorization({ state: value.state,
      verifier: authorizationVerifier, reference, binding });
    const history = value.b.recoveryHistory ?? [];
    const saved = { authorization, historyBeforeLength: history.length, historyBeforeDigest: historyDigest(history),
      auditNonce: nonce(), authorizedAt: new Date(now()).toISOString() };
    value.q.authorization = saved;
    value.b.recoveryHistory = [...history, { action: ACTION, nonce: saved.auditNonce,
      at: saved.authorizedAt, operationNonce: value.request.operationNonce, authorization }];
    await save(value, before, actor); return clone(saved);
  }
  async function prepare(input) {
    const value = await observe(input); verify(value); assert.equal(value.q.execution, undefined);
    return { request: clone(value.request), authorizationDigest: value.q.authorization.authorization.bindingDigest };
  }
  async function inspectRequest(input) { return { request: clone((await observe(input)).request) }; }
  async function claim(input, { actor, runId, expectedFingerprint, fresh }) {
    const value = locate(await store.load(), input, now()), before = JSON.stringify(value.b); verify(value);
    assert.equal(value.q.execution, undefined); assert.match(expectedFingerprint, HASH);
    assert.match(String(runId), /^[1-9][0-9]{0,19}$/); assert.equal(typeof fresh, 'function');
    const guard = async () => assert.equal((await fresh()).fingerprint, expectedFingerprint);
    await allowed(value, actor); await guard();
    const execution = { nonce: nonce(), actor, runId: String(runId), status: 'claimed',
      fingerprint: expectedFingerprint, startedAt: new Date(now()).toISOString() };
    value.q.execution = execution;
    await save(value, before, actor, guard);
    return { selector: clone(value.selector), ...clone(execution) };
  }
  async function owned(claim, status, mutable = false) {
    const value = mutable ? locate(await store.load(), claim.selector, now()) : await observe(claim.selector);
    verify(value); const before = historyDigest(value.b); await allowed(value, claim.actor);
    const current = await observe(claim.selector); verify(current);
    assert.equal(historyDigest(current.b), before, 'Renewal ownership changed during permission check');
    const execution = value.q.execution; assert.ok(execution && statuses.includes(execution.status));
    for (const field of ['nonce', 'actor', 'runId', 'fingerprint']) assert.equal(execution[field], claim[field]);
    if (status) assert.equal(execution.status, status);
    return value;
  }
  async function intent(claim) {
    const value = await owned(claim, 'claimed', true), before = JSON.stringify(value.b);
    value.q.execution.status = 'write-intent'; value.q.execution.intentAt = new Date(now()).toISOString();
    await save(value, before, claim.actor);
  }
  async function finish(claim, status) {
    assert.ok(['staged', 'uncertain', 'blocked-before-write'].includes(status));
    const value = await owned(claim, undefined, true), before = JSON.stringify(value.b);
    assert.ok((status === 'blocked-before-write' ? ['claimed', 'write-intent'] : ['write-intent']).includes(value.q.execution.status));
    value.q.execution.status = status; value.q.execution.finishedAt = new Date(now()).toISOString();
    await save(value, before, claim.actor);
  }
  return { authorize, prepare, inspectRequest, claim, intent, finish, assertOwned: owned };
}
export async function inspectRenewalTarget({ request: raw, client, readPublic, assertFreshMain, now = Date.now }) {
  const request = validateRenewalRequest(raw, now()); assert.equal(typeof assertFreshMain, 'function');
  await assertFreshMain();
  const data = await inspectDemo(client, DEMO_SOURCE_POLICIES.exact);
  const instance = data.serviceInstance, active = instance.activeDeployments;
  assert.equal(data.deployments?.pageInfo?.hasNextPage, false); assert.deepEqual(data.deployments.edges, []);
  assert.ok(Array.isArray(active) && active.length === 1);
  assert.match(active[0].id, UUID); assert.equal(active[0].status, 'SUCCESS');
  assert.match(active[0].meta?.commitHash ?? '', SHA);
  assert.equal(instance.latestDeployment?.id, active[0].id); assert.equal(instance.latestDeployment.status, 'SUCCESS');
  const status = await readPublic(`https://${DEMO_TARGET.domain}/auth/status`);
  assert.equal(status.mode, 'disabled'); assert.equal(status.simulator, false);
  assert.equal(status.temporaryDemo, false); assert.equal(status.syntheticOnly, true);
  // The strict request is UTC seconds; the deployed status endpoint may emit
  // the same canonical instant with .000Z. Never parse or normalize public input.
  assert.ok(typeof status.expiresAt === 'string' &&
    [request.previousExpiry, new Date(expiry(request.previousExpiry)).toISOString()].includes(status.expiresAt));
  const ready = await readPublic(`https://${DEMO_TARGET.domain}/ready`);
  assert.equal(ready.status, 'ready'); assert.equal(ready.tier, 'demo');
  assert.equal(ready.deploymentId, active[0].id);
  assert.equal(ready.checks?.database, 'ok'); assert.equal(ready.checks?.policy, 'ok');
  await assertFreshMain();
  const snapshot = { target: DEMO_TARGET, reviewedSha: request.reviewedSha,
    deploymentId: active[0].id, sourceSha: active[0].meta.commitHash, previousExpiry: request.previousExpiry };
  return { ...snapshot, fingerprint: historyDigest(snapshot) };
}
export async function stageRenewal({ selector, actor, runId, controller, inspect, client, onProgress = () => {} }) {
  assert.equal(typeof controller?.prepare, 'function'); assert.equal(typeof inspect, 'function');
  selector = Object.freeze(select(selector));
  const prepared = await controller.prepare(selector), request = Object.freeze(clone(prepared.request));
  const fresh = () => inspect(clone(request)), snapshot = Object.freeze(clone(await fresh()));
  const claim = await controller.claim(selector, { actor, runId, expectedFingerprint: snapshot.fingerprint, fresh });
  let attempted = false, acknowledged = false;
  const receipt = (status, code) => ({ schemaVersion: 1, status, code, subjectId: selector.subjectId,
    reviewedSha: selector.reviewedSha, operationNonce: selector.operationNonce,
    authorizationDigest: prepared.authorizationDigest, fingerprint: snapshot.fingerprint,
    previousExpiry: request.previousExpiry, newExpiry: request.newExpiry,
    mutationAttempted: attempted, deploymentTriggered: false });
  onProgress(receipt('claimed-before-write', 'RENEWAL_CLAIMED'));
  try {
    await controller.assertOwned(claim, 'claimed');
    assert.equal((await fresh()).fingerprint, snapshot.fingerprint);
    await controller.intent(claim); await controller.assertOwned(claim, 'write-intent');
    assert.equal((await fresh()).fingerprint, snapshot.fingerprint);
    await controller.assertOwned(claim, 'write-intent');
    attempted = true; onProgress(receipt('mutation-uncertain-do-not-retry', 'RENEWAL_WRITE_INTENT'));
    const result = await client(RENEW_MUTATION, { input: {
      projectId: DEMO_TARGET.projectId, environmentId: DEMO_TARGET.environmentId, serviceId: DEMO_TARGET.serviceId,
      name: KEY, value: request.newExpiry, skipDeploys: true,
    } });
    assert.equal(result?.variableUpsert, true); acknowledged = true;
    await controller.finish(claim, 'staged');
    return receipt('staged-awaiting-explicit-deployment', 'RENEWAL_STAGED');
  } catch {
    try { await controller.finish(claim, attempted ? 'uncertain' : 'blocked-before-write'); } catch { /* Keep durable intent; never replay. */ }
    return receipt(attempted ? 'mutation-uncertain-do-not-retry' : 'blocked-before-write',
      acknowledged ? 'RENEWAL_ACKNOWLEDGED_RECORD_UNCERTAIN' : attempted ? 'RENEWAL_WRITE_UNCERTAIN' : 'RENEWAL_BLOCKED');
  }
}
export async function runRenewalOperation({ mode = 'inspect', ...options }) {
  assert.ok(['inspect', 'stage'].includes(mode));
  if (mode === 'stage') return stageRenewal(options);
  const request = Object.freeze(clone((await options.controller.inspectRequest(options.selector)).request));
  const snapshot = await options.inspect(clone(request));
  return { schemaVersion: 1, status: 'inspection-passed-awaiting-explicit-stage', code: 'RENEWAL_INSPECTED',
    ...options.selector, previousExpiry: request.previousExpiry, newExpiry: request.newExpiry,
    fingerprint: snapshot.fingerprint, mutationAttempted: false, deploymentTriggered: false };
}
const receiptFields = new Set(['schemaVersion', 'status', 'code', 'subjectId', 'reviewedSha', 'operationNonce',
  'authorizationDigest', 'fingerprint', 'previousExpiry', 'newExpiry', 'mutationAttempted', 'deploymentTriggered']);
const receiptStatuses = new Set(['blocked-before-write', 'claimed-before-write', 'mutation-uncertain-do-not-retry',
  'staged-awaiting-explicit-deployment', 'inspection-passed-awaiting-explicit-stage']);
const receiptCodes = new Set(['RENEWAL_BLOCKED', 'RENEWAL_CLAIMED', 'RENEWAL_WRITE_INTENT', 'RENEWAL_STAGED',
  'RENEWAL_ACKNOWLEDGED_RECORD_UNCERTAIN', 'RENEWAL_WRITE_UNCERTAIN', 'RENEWAL_INSPECTED']);
function credentialAliases(values) {
  return values.filter(v => typeof v === 'string' && v).flatMap(v => {
    try { return [v, new Headers({ 'X-Credential': v }).get('X-Credential')]; } catch { return [v]; }
  }).filter(Boolean);
}
function reflected(text, values) {
  return credentialAliases(values).some(v => text.includes(v) || text.includes(JSON.stringify(v).slice(1, -1)));
}
export function serializeRenewalReceipt(receipt, forbiddenValues = []) {
  assert.ok(receipt && Object.keys(receipt).every(k => receiptFields.has(k)));
  assert.equal(receipt.schemaVersion, 1); assert.ok(receiptStatuses.has(receipt.status)); assert.ok(receiptCodes.has(receipt.code));
  assert.equal(typeof receipt.mutationAttempted, 'boolean'); assert.equal(receipt.deploymentTriggered, false);
  if (receipt.subjectId !== undefined) assert.match(receipt.subjectId, ID);
  if (receipt.reviewedSha !== undefined) assert.match(receipt.reviewedSha, SHA);
  if (receipt.operationNonce !== undefined) assert.match(receipt.operationNonce, UUID);
  for (const k of ['authorizationDigest', 'fingerprint']) if (receipt[k] !== undefined) assert.match(receipt[k], HASH);
  for (const k of ['previousExpiry', 'newExpiry']) if (receipt[k] !== undefined) expiry(receipt[k]);
  const json = JSON.stringify(receipt, null, 2) + '\n';
  assert.ok(Buffer.byteLength(json) <= 8192 && !reflected(json, forbiddenValues));
  return json;
}
function safeOutput(message) {
  if (!reflected(message, [process.env.RAILWAY_TOKEN, process.env.GH_TOKEN, process.env.GITHUB_TOKEN])) console.log(message);
}
async function readPublic(url) {
  assert.ok([`https://${DEMO_TARGET.domain}/auth/status`, `https://${DEMO_TARGET.domain}/ready`].includes(url));
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  assert.equal(response.ok, true);
  const reader = response.body.getReader(); let count = 0, chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break;
    count += value.length; if (count > 16384) { await reader.cancel(); throw Error('PUBLIC_RESPONSE_BOUND'); } chunks.push(Buffer.from(value)); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function main() {
  const env = process.env; let result = { schemaVersion: 1, status: 'blocked-before-write', code: 'RENEWAL_BLOCKED',
    mutationAttempted: false, deploymentTriggered: false };
  try {
    const context = validateRenewalContext(env);
    const selector = select({ subjectId: env.RENEW_SUBJECT_ID, operationNonce: env.RENEW_OPERATION_NONCE, reviewedSha: context.reviewedSha });
    const github = createGitHub({ repo: REPO, cwd: process.cwd(), run: createRunner({ runtimeRoot: '.renew-demo-auth-runtime' }) });
    const client = createRailwayClient({ token: env.RAILWAY_TOKEN });
    const assertFreshMain = createMainVerifier({ token: env.GITHUB_TOKEN, reviewedSha: context.reviewedSha });
    result = await runRenewalOperation({ mode: process.argv[2] ?? 'inspect', selector, actor: env.GITHUB_ACTOR, runId: context.runId,
      controller: createRenewalController({ github }), client,
      inspect: request => inspectRenewalTarget({ request, client, readPublic, assertFreshMain }),
      onProgress: progress => { result = progress; } });
  } catch { /* Only a finite receipt crosses the credential boundary. */ }
  await writeFile('demo-auth-renewal-receipt.json', serializeRenewalReceipt(result,
    [env.RAILWAY_TOKEN, env.GH_TOKEN, env.GITHUB_TOKEN]), { flag: 'wx', mode: 0o600 });
  safeOutput(`DEMO_AUTH_RENEWAL ${result.status}`);
  if (!['inspection-passed-awaiting-explicit-stage', 'staged-awaiting-explicit-deployment'].includes(result.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  safeOutput('DEMO_AUTH_RENEWAL_RECEIPT_FAILED_DO_NOT_RETRY'); process.exitCode = 1;
});

---END EXACT SOURCE---
