import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { pathToFileURL } from 'node:url';

export const TARGET = Object.freeze({
  repository: 'l2v-hub/ClinicOS',
  owner: 'l2v-hub',
  actor: 'l2v-hub',
  branch: 'main',
  workflowRef: 'l2v-hub/ClinicOS/.github/workflows/protect-demo-secret.yml@refs/heads/main',
  environmentId: 20880188544,
  environmentName: 'glistening-friendship / demo',
  secretName: 'RAILWAY_DEMO_TOKEN',
});

const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const MAX_RESPONSE_BYTES = 262_144;
const MAX_SECRET_PAGES = 100;
const SHA = /^[a-f0-9]{40}$/;

export class ProtectionError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProtectionError';
    this.code = code;
  }
}

const fail = (code) => {
  throw new ProtectionError(code);
};

function safeString(value, max = 200) {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !/[\r\n\0]/.test(value);
}

export function validateTrustedContext(context) {
  const reviewed = context.reviewedSha;
  if (
    context.eventName !== 'workflow_dispatch' ||
    context.repository !== TARGET.repository ||
    context.ref !== 'refs/heads/main' ||
    context.workflowRef !== TARGET.workflowRef ||
    !SHA.test(context.sha ?? '') ||
    !SHA.test(context.workflowSha ?? '') ||
    context.sha !== context.workflowSha ||
    context.sha !== reviewed ||
    context.actor !== TARGET.actor ||
    !safeString(context.actor) ||
    context.actor !== context.triggeringActor
  )
    fail('TRUSTED_MAIN_CONTEXT_REQUIRED');
  return Object.freeze({ sha: context.sha, actor: context.actor });
}

async function readBoundedJson(response, expectedUrl) {
  if (!response?.ok || response.redirected || response.url !== expectedUrl) fail('GITHUB_REQUEST_FAILED');
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) fail('GITHUB_RESPONSE_TOO_LARGE');
  const chunks = [];
  let bytes = 0;
  try {
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > MAX_RESPONSE_BYTES) fail('GITHUB_RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof ProtectionError) throw error;
    fail('GITHUB_RESPONSE_INVALID');
  }
}

export function createGitHubApi({ token, fetchImpl = fetch }) {
  if (typeof token !== 'string' || token.length === 0) fail('BOT_TOKEN_REQUIRED');
  const request = async (method, route, body) => {
    if (!/^\/(?:repos|user)\/[A-Za-z0-9_.%/?=&-]+$/.test(route)) fail('FIXED_ROUTE_REQUIRED');
    const url = `${API}${route}`;
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': API_VERSION,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      fail('GITHUB_REQUEST_FAILED');
    }
    if (method === 'DELETE' && response.status === 204 && !response.redirected && response.url === url)
      return null;
    return readBoundedJson(response, url);
  };

  const base = `/repos/${TARGET.repository}`;
  const env = `/environments/${encodeURIComponent(TARGET.environmentName)}`;
  return Object.freeze({
    getMainRef: () => request('GET', `${base}/git/ref/heads/main`),
    getCollaboratorPermission: (actor) => {
      if (actor !== TARGET.actor) fail('TRUSTED_ADMIN_REQUIRED');
      return request('GET', `${base}/collaborators/${encodeURIComponent(actor)}/permission`);
    },
    getEnvironment: () => request('GET', `${base}${env}`),
    getEnvironmentPolicies: () => request('GET', `${base}${env}/deployment-branch-policies?per_page=100&page=1`),
    listRepoSecrets: (page) => request('GET', `${base}/actions/secrets?per_page=100&page=${page}`),
    listEnvironmentSecrets: (page) =>
      request('GET', `${base}${env}/secrets?per_page=100&page=${page}`),
    deleteRepoSecret: () => request('DELETE', `${base}/actions/secrets/${TARGET.secretName}`),
  });
}

function verifyEnvironment(environment, policies) {
  if (
    environment?.id !== TARGET.environmentId ||
    environment?.name !== TARGET.environmentName ||
    environment?.deployment_branch_policy?.protected_branches !== false ||
    environment?.deployment_branch_policy?.custom_branch_policies !== true
  )
    fail('ENVIRONMENT_POLICY_MISMATCH');
  if (
    policies?.total_count !== 1 ||
    !Array.isArray(policies?.branch_policies) ||
    policies.branch_policies.length !== 1 ||
    policies.branch_policies[0]?.name !== TARGET.branch ||
    policies.branch_policies[0]?.type !== 'branch'
  )
    fail('ENVIRONMENT_MAIN_POLICY_REQUIRED');
}

export function validateInventoryPage(body, page, expectedTotal = null) {
  if (
    !body ||
    !Number.isSafeInteger(body.total_count) ||
    body.total_count < 0 ||
    !Array.isArray(body.secrets) ||
    body.secrets.length > 100 ||
    body.secrets.some((secret) => !safeString(secret?.name))
  )
    fail('SECRET_INVENTORY_INCOMPLETE');
  if (expectedTotal !== null && body.total_count !== expectedTotal) fail('SECRET_INVENTORY_DRIFT');
  if (page >= MAX_SECRET_PAGES && body.secrets.length === 100) fail('SECRET_INVENTORY_LIMIT');
  return { total: body.total_count, names: body.secrets.map(({ name }) => name) };
}

async function completeInventory(readPage) {
  const names = [];
  const seen = new Set();
  let expectedTotal = null;
  for (let page = 1; page <= MAX_SECRET_PAGES; page += 1) {
    let body;
    try {
      body = await readPage(page);
    } catch (error) {
      if (error instanceof ProtectionError) throw error;
      fail('SECRET_INVENTORY_UNREADABLE');
    }
    const parsed = validateInventoryPage(body, page, expectedTotal);
    expectedTotal ??= parsed.total;
    for (const name of parsed.names) {
      if (seen.has(name)) fail('SECRET_INVENTORY_DRIFT');
      seen.add(name);
      names.push(name);
    }
    if (parsed.names.length < 100) {
      if (names.length !== expectedTotal) fail('SECRET_INVENTORY_INCOMPLETE');
      return Object.freeze(names);
    }
  }
  fail('SECRET_INVENTORY_LIMIT');
}

async function inventory(api) {
  const [repo, environment] = await Promise.all([
    completeInventory((page) => api.listRepoSecrets(page)),
    completeInventory((page) => api.listEnvironmentSecrets(page)),
  ]);
  return { repo, environment };
}

async function assertAdmin(api, actor) {
  let permission;
  try {
    permission = await api.getCollaboratorPermission(actor);
  } catch {
    fail('TRUSTED_ADMIN_REQUIRED');
  }
  if (permission?.permission !== 'admin' || permission?.user?.login !== actor)
    fail('TRUSTED_ADMIN_REQUIRED');
}

async function assertFreshProtectedMain(api, trusted) {
  let environment, policies;
  try {
    [environment, policies] = await Promise.all([
      api.getEnvironment(),
      api.getEnvironmentPolicies(),
    ]);
  } catch {
    fail('FRESH_ENVIRONMENT_CHECK_FAILED');
  }
  verifyEnvironment(environment, policies);
  await assertAdmin(api, trusted.actor);
  let ref;
  try {
    ref = await api.getMainRef();
  } catch {
    fail('FRESH_MAIN_CHECK_FAILED');
  }
  if (ref?.object?.sha !== trusted.sha || ref?.ref !== 'refs/heads/main') fail('FRESH_MAIN_SHA_MISMATCH');
}

function secretValuePresent(value) {
  return typeof value === 'string' && value.length > 0 && !/[\r\n\0]/.test(value);
}

export async function ensureEnvironmentSecret({ context, api, secretValue, writeEnvironmentSecret }) {
  const trusted = validateTrustedContext(context);
  if (!api || typeof writeEnvironmentSecret !== 'function') fail('DEPENDENCIES_REQUIRED');
  const before = await inventory(api);
  const envHasSecret = before.environment.includes(TARGET.secretName);
  const repoHasSecret = before.repo.includes(TARGET.secretName);
  if (!envHasSecret && !repoHasSecret) fail('BOTH_SECRET_COPIES_MISSING');
  if (!secretValuePresent(secretValue)) fail('ENVIRONMENT_BINDING_MISSING');
  if (envHasSecret) {
    await assertFreshProtectedMain(api, trusted);
    const finalNames = await inventory(api);
    if (!finalNames.environment.includes(TARGET.secretName)) fail('ENVIRONMENT_SECRET_DRIFT');
    return Object.freeze({ operation: 'ensure-environment', result: 'already-present', writes: 0 });
  }

  await assertFreshProtectedMain(api, trusted);
  const fresh = await inventory(api);
  if (fresh.environment.includes(TARGET.secretName)) {
    return Object.freeze({ operation: 'ensure-environment', result: 'appeared-before-write', writes: 0 });
  }
  if (!fresh.repo.includes(TARGET.secretName)) fail('BOTH_SECRET_COPIES_MISSING');
  if (!secretValuePresent(secretValue)) fail('ENVIRONMENT_BINDING_MISSING');

  // GitHub has no conditional create for secrets. The fixed workflow serializes
  // its own runs; exclusive operational ownership is required for other writers.
  let result;
  try {
    result = await writeEnvironmentSecret(secretValue);
  } catch {
    fail('ENVIRONMENT_WRITE_UNCERTAIN');
  }
  if (result?.ok !== true) fail('ENVIRONMENT_WRITE_UNCERTAIN');
  const readback = await completeInventory((page) => api.listEnvironmentSecrets(page));
  if (!readback.includes(TARGET.secretName)) fail('ENVIRONMENT_WRITE_READBACK_FAILED');
  return Object.freeze({ operation: 'ensure-environment', result: 'written-and-listed', writes: 1 });
}

export async function removeRepositorySecret({ context, api, secretValue }) {
  const trusted = validateTrustedContext(context);
  if (!api) fail('DEPENDENCIES_REQUIRED');
  const snapshot = await inventory(api);
  if (!snapshot.environment.includes(TARGET.secretName)) fail('ENVIRONMENT_SECRET_REQUIRED');
  if (!secretValuePresent(secretValue)) fail('ENVIRONMENT_BINDING_MISSING');
  if (!snapshot.repo.includes(TARGET.secretName)) {
    await assertFreshProtectedMain(api, trusted);
    const finalNames = await inventory(api);
    if (!finalNames.environment.includes(TARGET.secretName)) fail('ENVIRONMENT_SECRET_REQUIRED');
    if (finalNames.repo.includes(TARGET.secretName)) fail('REPOSITORY_SECRET_DRIFT');
    return Object.freeze({ operation: 'remove-repository', result: 'already-absent', deletes: 0 });
  }

  await assertFreshProtectedMain(api, trusted);
  const fresh = await inventory(api);
  if (!fresh.environment.includes(TARGET.secretName)) fail('ENVIRONMENT_SECRET_REQUIRED');
  if (!secretValuePresent(secretValue)) fail('ENVIRONMENT_BINDING_MISSING');
  if (!fresh.repo.includes(TARGET.secretName))
    return Object.freeze({ operation: 'remove-repository', result: 'already-absent', deletes: 0 });

  // GitHub has no conditional delete for secrets. The fixed workflow serializes
  // its own runs; exclusive operational ownership is required for other writers.
  try {
    await api.deleteRepoSecret();
  } catch {
    fail('REPOSITORY_DELETE_UNCERTAIN');
  }
  const readback = await inventory(api);
  if (!readback.environment.includes(TARGET.secretName)) fail('ENVIRONMENT_PRESERVATION_READBACK_FAILED');
  if (readback.repo.includes(TARGET.secretName)) fail('REPOSITORY_DELETE_READBACK_FAILED');
  return Object.freeze({ operation: 'remove-repository', result: 'deleted-and-absent', deletes: 1 });
}

function workflowContext(env) {
  return {
    eventName: env.GITHUB_EVENT_NAME,
    repository: env.GITHUB_REPOSITORY,
    ref: env.GITHUB_REF,
    workflowRef: env.GITHUB_WORKFLOW_REF,
    sha: env.GITHUB_SHA,
    workflowSha: env.GITHUB_WORKFLOW_SHA,
    actor: env.GITHUB_ACTOR,
    triggeringActor: env.GITHUB_TRIGGERING_ACTOR,
    reviewedSha: env.PROTECT_DEMO_REVIEWED_SHA,
  };
}

const runnerSafeEnv = (env) => {
  const allowed = ['PATH', 'HOME', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'SSL_CERT_FILE', 'NODE_EXTRA_CA_CERTS'];
  return Object.fromEntries(allowed.filter((key) => typeof env[key] === 'string').map((key) => [key, env[key]]));
};

export async function writeEnvironmentSecretWithGh({ secretValue, env = process.env, runnerFactory = createRunner }) {
  if (!secretValuePresent(secretValue)) fail('ENVIRONMENT_BINDING_MISSING');
  const ghToken = env.GH_TOKEN;
  if (typeof ghToken !== 'string' || ghToken.length === 0) fail('BOT_TOKEN_REQUIRED');
  const childEnv = { ...runnerSafeEnv(env), GH_TOKEN: ghToken };
  const runner = runnerFactory({ env: childEnv, runtimeRoot: '/tmp/protect-demo-secret-runtime' });
  let result;
  try {
    result = await runner({
      command: 'gh',
      args: ['secret', 'set', TARGET.secretName, '--env', TARGET.environmentName, '--repo', TARGET.repository],
      cwd: process.cwd(),
      input: secretValue,
      timeoutMs: 30_000,
      maxOutputBytes: 16_384,
      envMode: 'controller',
    });
  } catch {
    fail('ENVIRONMENT_WRITE_UNCERTAIN');
  }
  if (result?.ok !== true) fail('ENVIRONMENT_WRITE_UNCERTAIN');
  return { ok: true };
}

function operationFromEnv(env) {
  if (env.PROTECT_DEMO_OPERATION === 'ensure-environment') return 'ensure-environment';
  if (env.PROTECT_DEMO_OPERATION === 'remove-repository') return 'remove-repository';
  fail('FIXED_OPERATION_REQUIRED');
}

export async function main(env = process.env, dependencies = {}) {
  const context = workflowContext(env);
  validateTrustedContext(context);
  const operation = operationFromEnv(env);
  const api = dependencies.api ?? createGitHubApi({ token: env.GH_TOKEN, fetchImpl: dependencies.fetchImpl ?? fetch });
  const secretValue = env.RAILWAY_DEMO_TOKEN;
  const receipt = operation === 'ensure-environment'
    ? await ensureEnvironmentSecret({
        context,
        api,
        secretValue,
        writeEnvironmentSecret: dependencies.writeEnvironmentSecret ?? ((value) => writeEnvironmentSecretWithGh({ secretValue: value, env })),
      })
    : await removeRepositorySecret({ context, api, secretValue });
  return Object.freeze({ schemaVersion: 1, ...receipt });
}

if (typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const receipt = await main();
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
  } catch (error) {
    const code = error instanceof ProtectionError ? error.code : 'PROTECTION_OPERATION_FAILED';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}
