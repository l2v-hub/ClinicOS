import { MAX_EVIDENCE_BYTES, MAX_EVIDENCE_TRANSPORT_BYTES } from './evidence-limits.mjs';
import { ENTITY_COLLECTIONS, attemptLimit } from './attempt-budget.mjs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const STATE_BRANCH = 'codex/bug-control';
const STATE_PATH = '.codex-bug-state.json';
export const MAX_DURABLE_STATE_BYTES = 8 * 1024 * 1024;
export const RESULT_RESERVATION_BYTES = 512 * 1024;
const STATE_OUTPUT_BYTES = 16 * 1024 * 1024;
// A command may start only within preparation's bounded window. The recovery lease
// also includes its 30-second command timeout, so a slow guard cannot expire ownership.
export const MERGE_PREPARATION_TIMEOUT_MS = 5 * 60_000;
export const MERGE_RESERVATION_LEASE_MS = MERGE_PREPARATION_TIMEOUT_MS + 30_000;
export const GITHUB_TRANSIENT_WINDOW_MS = 30 * 60_000;
export function recordTransientGitHubFailure(subject, clock) {
  const previous = subject.lastTransientFailure;
  const sameHead = previous?.subjectSha === subject.sha;
  const count = sameHead ? Math.min(previous.count + 1, 32) : 1;
  const firstFailureAt =
    sameHead && Number.isFinite(previous.firstFailureAt) ? previous.firstFailureAt : clock;
  subject.lastTransientFailure = {
    code: 'github-read-transient',
    operation: 'read',
    at: new Date(clock).toISOString(),
    count,
    firstFailureAt,
    subjectSha: subject.sha,
    nextRetryAt: clock + Math.min(60_000 * 2 ** Math.min(count - 1, 5), 30 * 60_000),
  };
  return clock - firstFailureAt >= GITHUB_TRANSIENT_WINDOW_MS;
}
const REQUIRED_LABELS = ['bug', 'codex-triage', 'codex-run'];
const BLOCKING_LABELS = new Set([
  'codex-blocked',
  'codex-in-flight',
  'codex-processing',
  'status-blocked',
]);
const EXTERNAL_WORK_LABELS = new Set([
  'agent-working',
  'ready-for-dev',
  'assigned-to-claude',
  'ready-for-qa',
  'qa-passed',
]);
const BOT_PROTOCOL_MARKER = '<!-- codex-bug-pipeline:';
const ISSUE_STATUSES = ['In progress', 'Bloccato', 'Risolto'];
const FAILURE_CODES = new Set([
  'state-capacity-exhausted',
  'state-write-failed',
  'state-write-uncertain',
  'github-read-failed',
  'github-read-transient',
  'github-read-rejected',
  'github-write-rejected',
  'github-write-uncertain',
  'github-transient-exhausted',
  'github-merge-rejected',
  'label-projection-failed',
  'codex-auth-unavailable',
  'codex-auth-conflict',
  'state-cas-conflict',
  'state-rebase-conflict',
  'state-rebase-invalid',
  'model-execution-failed',
  'model-result-invalid',
  'workspace-verification-failed',
  'workspace-evidence-invalid',
  'workspace-scope-invalid',
  'independent-qa-blocked',
  'implementation-blocked',
  'controller-execution-failed',
]);
export function controllerFailureCode(error) {
  for (let depth = 0; error && depth < 6; depth++, error = error.cause)
    if (FAILURE_CODES.has(error.code)) return error.code;
    else if (['required verification failed or executed no tests'].includes(error.message))
      return 'workspace-verification-failed';
    else if (
      [
        'executor edited outside accepted file scope',
        'symlink implementation/evidence is not publishable',
        'executor changed the frozen contract or plan',
      ].includes(error.message)
    )
      return 'workspace-scope-invalid';
    else if (
      ['independent Codex QA blocked', 'Independent QA blocked', 'independent QA blocked'].includes(
        error.message,
      )
    )
      return 'independent-qa-blocked';
    else if (
      [
        'executor blocked',
        'simplification blocked',
        'review correction blocked',
        'Correction blocked',
        'PR feedback correction blocked',
      ].includes(error.message)
    )
      return 'implementation-blocked';
  return 'controller-execution-failed';
}
export function stateError(code, message, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), {
    code,
  });
}
// Only finite diagnostic metadata crosses the controller boundary. Provider stderr can
// contain arbitrary clinical text and credentials, so it is never persisted or interpolated.
export function githubOperationError(result, operation = 'read') {
  const detail = String(result?.stderr ?? '');
  const statusMatch =
    /(?:\(HTTP ([45][0-9]{2})\)|^HTTP(?:\/\d(?:\.\d)?)?\s+([45][0-9]{2})\b)/m.exec(detail);
  const status = statusMatch ? Number(statusMatch[1] ?? statusMatch[2]) : null;
  const rateLimited =
    status === 403 && /(?:API rate limit exceeded|secondary rate limit)/i.test(detail);
  const timeout = result?.error === 'timeout';
  const graphqlMergeRefusal =
    operation === 'merge' &&
    result?.code === 1 &&
    !result?.error &&
    !String(result?.stdout ?? '').trim() &&
    /^GraphQL: Head branch was modified\. Review and try the merge again\. \(mergePullRequest\)$/.test(
      detail.trim(),
    );
  const transient = timeout || status === 408 || status === 429 || status >= 500 || rateLimited;
  const code =
    operation === 'read'
      ? transient
        ? 'github-read-transient'
        : status
          ? 'github-read-rejected'
          : 'github-read-failed'
      : (status && status < 500 && status !== 408) || graphqlMergeRefusal
        ? 'github-write-rejected'
        : 'github-write-uncertain';
  return Object.assign(
    stateError(code, `GitHub operation failed${status ? ` (HTTP ${status})` : ''}`),
    {
      operation,
      httpStatus: status,
      retryable: ['read', 'projection'].includes(operation) && transient,
      diagnostic: timeout
        ? 'timeout'
        : rateLimited
          ? 'rate-limit'
          : status
            ? 'http-status'
            : graphqlMergeRefusal
              ? 'graphql-merge-refusal'
              : 'unknown',
    },
  );
}
export function githubApiOperation({ method, body } = {}) {
  return (!method && body === undefined) || method === 'GET' ? 'read' : 'mutation';
}
export function isRetryableGitHubFailure(error) {
  return controllerFailureCode(error) === 'github-read-transient';
}
export function pendingResultBytes(subject) {
  const reviews = Array.isArray(subject.reviews)
    ? subject.reviews.filter((a) => a.status === 'running').length
    : 0;
  const external = ['running', 'comment-running'].includes(subject.externalReview?.status) ? 1 : 0;
  const qa = subject.codexFinalReview?.status === 'running' ? 1 : 0;
  const merge = subject.release?.status === 'merging' ? 1 : 0;
  return (Math.max(reviews, external) + qa + merge) * RESULT_RESERVATION_BYTES;
}
export function assertSubjectResultCapacity(subject, limit) {
  if (Buffer.byteLength(JSON.stringify(subject)) + pendingResultBytes(subject) > limit)
    throw stateError(
      'state-capacity-exhausted',
      'Standalone subject has no capacity for all reserved review results',
    );
}
function reservedStateBytes(state) {
  return ENTITY_COLLECTIONS.reduce(
    (total, key) =>
      total +
      (Array.isArray(state[key])
        ? state[key].reduce((sum, subject) => sum + pendingResultBytes(subject), 0)
        : 0),
    0,
  );
}

function mergeIndependentEntities(base, intended, fresh) {
  if (!base || !fresh)
    throw stateError('state-rebase-conflict', 'Cannot rebase uninitialized state');
  const merged = structuredClone(fresh);
  for (const key of new Set([
    ...Object.keys(base),
    ...Object.keys(intended),
    ...Object.keys(fresh),
  ])) {
    if (key === 'updatedAt') {
      if (key in intended || key in fresh) merged.updatedAt = new Date().toISOString();
      continue;
    }
    if (ENTITY_COLLECTIONS.includes(key)) {
      const inventory = (value) => {
        if (value === undefined) return new Map();
        if (
          !Array.isArray(value) ||
          value.some((item) => !item || typeof item.id !== 'string' || !item.id)
        )
          throw stateError('state-rebase-invalid', 'Invalid entity collection for rebase');
        const map = new Map(value.map((item) => [item.id, item]));
        if (map.size !== value.length)
          throw stateError('state-rebase-invalid', 'Duplicate entity identity');
        return map;
      };
      const before = inventory(base[key]),
        ours = inventory(intended[key]),
        theirs = inventory(fresh[key]);
      for (const id of new Set([...before.keys(), ...ours.keys(), ...theirs.keys()])) {
        const oursChanged = !isDeepStrictEqual(before.get(id), ours.get(id));
        const theirsChanged = !isDeepStrictEqual(before.get(id), theirs.get(id));
        if (oursChanged && theirsChanged)
          throw stateError(
            'state-rebase-conflict',
            'Durable state compare-and-swap conflict: concurrent changes to the same durable entity',
          );
        if (oursChanged) {
          if (ours.has(id)) theirs.set(id, structuredClone(ours.get(id)));
          else theirs.delete(id);
        }
      }
      if (key in intended || key in fresh) merged[key] = [...theirs.values()];
    } else {
      const changed = (value) =>
        Object.hasOwn(base, key) !== Object.hasOwn(value, key) ||
        !isDeepStrictEqual(base[key], value[key]);
      if (changed(intended) && changed(fresh))
        throw stateError('state-rebase-conflict', 'Concurrent changes to a shared durable field');
      if (changed(intended)) {
        if (Object.hasOwn(intended, key))
          Object.defineProperty(merged, key, {
            value: structuredClone(intended[key]),
            enumerable: true,
            writable: true,
            configurable: true,
          });
        else delete merged[key];
      }
    }
  }
  return merged;
}

// Preserve references held across awaits by pipeline loops and their active attempt objects.
function synchronizeInPlace(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    const identity = (item) =>
      item && typeof item === 'object'
        ? typeof item.id === 'string'
          ? `id:${item.id}`
          : Number.isInteger(item.round)
            ? `round:${item.round}`
            : null
        : null;
    const existing = new Map(
      target.filter((item) => identity(item) !== null).map((item) => [identity(item), item]),
    );
    const next = source.map((item, index) => {
      const previous = identity(item) === null ? target[index] : existing.get(identity(item));
      return previous &&
        item &&
        typeof previous === 'object' &&
        typeof item === 'object' &&
        Array.isArray(previous) === Array.isArray(item)
        ? synchronizeInPlace(previous, item)
        : structuredClone(item);
    });
    target.length = 0;
    for (const item of next) target.push(item);
    return target;
  }
  for (const key of Object.keys(target)) if (!Object.hasOwn(source, key)) delete target[key];
  for (const [key, value] of Object.entries(source)) {
    if (
      Object.hasOwn(target, key) &&
      value &&
      target[key] &&
      typeof value === 'object' &&
      typeof target[key] === 'object' &&
      Array.isArray(value) === Array.isArray(target[key])
    )
      synchronizeInPlace(target[key], value);
    else
      Object.defineProperty(target, key, {
        value: structuredClone(value),
        writable: true,
        enumerable: true,
        configurable: true,
      });
  }
  return target;
}

function assertRepo(repo) {
  if (typeof repo !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new TypeError('repo must be an owner/name pair');
  }
  return repo;
}

function parseJson(text, description) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GitHub returned invalid JSON for ${description}`);
  }
}

function encodeState(state) {
  const bytes = Buffer.from(JSON.stringify(state), 'utf8');
  if (bytes.length > MAX_DURABLE_STATE_BYTES)
    throw new Error('Durable state exceeds 8 MiB save bound');
  if (bytes.length + reservedStateBytes(state) > MAX_DURABLE_STATE_BYTES)
    throw stateError(
      'state-capacity-exhausted',
      'Durable state has no capacity for all reserved review results',
    );
  return bytes.toString('base64');
}

function gitBlobSHA(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function decodeStateBlob(record, expectedSHA, declaredSize) {
  if (
    !record ||
    typeof record !== 'object' ||
    record.encoding !== 'base64' ||
    typeof record.content !== 'string' ||
    record.content.length > 12 * 1024 * 1024 ||
    !Number.isSafeInteger(record.size) ||
    record.size <= 0 ||
    record.size > MAX_DURABLE_STATE_BYTES ||
    record.size !== declaredSize
  ) {
    throw new Error('Durable state blob metadata is invalid');
  }
  const encoded = record.content.replace(/[\r\n]/g, '');
  if (encoded.length === 0 || encoded.length > Math.ceil(MAX_DURABLE_STATE_BYTES / 3) * 4) {
    throw new Error('Durable state blob content is invalid');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length !== record.size || bytes.toString('base64') !== encoded) {
    throw new Error('Durable state blob content is invalid');
  }
  if (gitBlobSHA(bytes) !== expectedSHA.toLowerCase()) {
    throw new Error('Durable state blob SHA does not match its content');
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Durable state file is not valid UTF-8');
  }
  const state = parseJson(text, 'durable state');
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('Durable state must be a JSON object');
  }
  return state;
}

function issueNumber(issue) {
  const n = Number(issue?.number);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new TypeError('issue number must be a positive integer');
  return n;
}

function actorLogin(actor) {
  const login = actor?.login ?? actor?.user?.login ?? actor?.name;
  return typeof login === 'string' && login.length > 0 ? login : null;
}

export function createGitHub({ cwd = process.cwd(), repo, run }) {
  assertRepo(repo);
  if (typeof run !== 'function') throw new TypeError('run must be a function');
  const [owner, name] = repo.split('/');
  const statusCache = new Map();

  async function invoke(
    args,
    { input, allowFailure = false, maxOutputBytes = 2 * 1024 * 1024, operation = 'read' } = {},
  ) {
    const result = await run({
      command: 'gh',
      args,
      cwd,
      ...(input === undefined ? {} : { input }),
      timeoutMs: 30000,
      maxOutputBytes,
    });
    if (!result?.ok && !allowFailure) {
      throw githubOperationError(result, operation);
    }
    return result ?? { ok: false, stdout: '', stderr: 'No command result' };
  }

  // Optional release authorization reaches the actual request boundary, after earlier awaits.
  // Existing intake/status callers omit it and retain their current behavior.
  async function checkMutationGuard(guard) {
    if (typeof guard !== 'function') throw new TypeError('Issue mutation guard must be a function');
    if ((await guard()) === false) throw new Error('Issue mutation guard rejected the operation');
  }

  async function api(path, { method, body, allowFailure = false, maxOutputBytes, guard } = {}) {
    const args = ['api', path];
    if (method) args.push('-X', method);
    if (body !== undefined) args.push('--input', '-');
    if (guard !== undefined) await checkMutationGuard(guard);
    const result = await invoke(args, {
      ...(body === undefined ? {} : { input: JSON.stringify(body) }),
      allowFailure,
      operation: githubApiOperation({ method, body }),
      ...(maxOutputBytes === undefined ? {} : { maxOutputBytes }),
    });
    if (!result.ok && allowFailure) return { ok: false, status: result.code, value: null, result };
    return {
      ok: true,
      status: result.code,
      value: parseJson(result.stdout, path),
      result,
    };
  }

  async function apiList(path) {
    const result = await invoke(['api', path, '--paginate', '--slurp']);
    const pages = parseJson(result.stdout, path);
    if (!Array.isArray(pages) || !pages.every(Array.isArray))
      throw new Error(`GitHub returned invalid list for ${path}`);
    return pages.flat();
  }

  function notFound(response) {
    return /\b404\b/.test(String(response?.result?.stderr ?? response?.result?.error ?? ''));
  }

  async function authorized(login) {
    if (typeof login !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(login)) return false;
    const response = await api(
      `repos/${repo}/collaborators/${encodeURIComponent(login)}/permission`,
      {
        allowFailure: true,
      },
    );
    if (!response.ok) return false;
    return ['write', 'maintain', 'admin'].includes(response.value?.permission);
  }

  async function authorizedMaintainer(login) {
    if (typeof login !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(login)) return false;
    const response = await api(
      `repos/${repo}/collaborators/${encodeURIComponent(login)}/permission`,
      { allowFailure: true },
    );
    return response.ok && ['maintain', 'admin'].includes(response.value?.permission);
  }

  async function ensureLabel(label, { guard } = {}) {
    const check = await api(`repos/${repo}/labels/${encodeURIComponent(label)}`, {
      allowFailure: true,
    });
    if (check.ok) return;
    if (!notFound(check)) throw new Error(`Cannot inspect GitHub label ${label}`);
    const created = await api(`repos/${repo}/labels`, {
      method: 'POST',
      body: {
        name: label,
        color: '1D76DB',
        description: 'Codex bug pipeline queue',
      },
      allowFailure: true,
      guard,
    });
    if (created.ok) return;
    // A concurrent workflow may have created it between GET and POST.
    const retry = await api(`repos/${repo}/labels/${encodeURIComponent(label)}`, {
      allowFailure: true,
    });
    if (!retry.ok) throw new Error(`Could not ensure GitHub label ${label}`);
  }

  async function applyIntakeLabels(number) {
    for (const label of REQUIRED_LABELS) await ensureLabel(label);
    const response = await api(`repos/${repo}/issues/${number}/labels`, {
      method: 'POST',
      body: { labels: REQUIRED_LABELS },
    });
    return response.value;
  }

  async function intake(event) {
    const issue = event?.issue;
    if (!issue || issue.pull_request) return [];
    const number = issueNumber(issue);
    const actor = actorLogin(event?.sender);
    let isCommand = false;
    if (event?.comment && event?.action === 'created') {
      if (actor !== actorLogin(event.comment.user)) return [];
      isCommand = /^\/codex fix$/.test(String(event.comment.body ?? '').trim());
    } else if (event?.action === 'labeled') {
      isCommand = event?.label?.name === 'codex-run';
    }
    if (!isCommand || !actor || !(await authorized(actor))) return [];
    await applyIntakeLabels(number);
    return [number];
  }

  async function latestAuthorizedRunEvent(number) {
    const events = await apiList(`repos/${repo}/issues/${number}/events?per_page=100`);
    if (!Array.isArray(events))
      throw new Error(`GitHub returned invalid issue events for #${number}`);
    const latest = events
      .filter((event) => event?.event === 'labeled' && event?.label?.name === 'codex-run')
      .sort(
        (a, b) =>
          Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0) ||
          Number(b.id ?? 0) - Number(a.id ?? 0),
      )[0];
    const login = actorLogin(latest?.actor);
    if (!login) return false;
    // A maintainer may use their own PAT as CLINICOS_BOT_TOKEN. The same login
    // is still a human actor; GitHub's actor type distinguishes it from an App.
    if (latest.actor.type === 'User') return await authorized(login);
    if (latest.actor.type === 'Bot') {
      // A label added by this workflow cannot authenticate itself. Accept its event only
      // when a recent exact command by a write-capable human immediately preceded it.
      const eventAt = Date.parse(latest.created_at ?? '');
      if (!Number.isFinite(eventAt)) return false;
      const comments = await apiList(`repos/${repo}/issues/${number}/comments?per_page=100`);
      for (const comment of comments) {
        const createdAt = Date.parse(comment.created_at ?? '');
        const author = actorLogin(comment.user);
        if (
          author &&
          comment.user?.type === 'User' &&
          /^\/codex fix$/.test(String(comment.body ?? '').trim()) &&
          Number.isFinite(createdAt) &&
          createdAt <= eventAt &&
          eventAt - createdAt <= 60 * 60 * 1000 &&
          (await authorized(author))
        )
          return true;
      }
      return false;
    }
    return false;
  }

  async function discoverQueue({ normalize = false, excludeIssues = [] } = {}) {
    if (
      !Array.isArray(excludeIssues) ||
      excludeIssues.length > 100000 ||
      excludeIssues.some((number) => !Number.isSafeInteger(number) || number < 1)
    )
      throw new TypeError('Invalid excluded queue issue numbers');
    const excluded = new Set(excludeIssues);
    const issues = await apiList(`repos/${repo}/issues?state=open&labels=codex-run&per_page=100`);
    const queued = [];
    for (const issue of issues) {
      if (issue.pull_request || excluded.has(issue.number)) continue;
      const labels = new Set((issue.labels ?? []).map((label) => label.name));
      if ([...BLOCKING_LABELS].some((label) => labels.has(label))) continue;
      if (!(await latestAuthorizedRunEvent(issueNumber(issue)))) continue;
      // A later label event can replace a pending Actions run. Recover from the
      // durable codex-run label even if that event never normalized bug/triage.
      // Dashboard callers use the read-only default and never change labels.
      if (
        normalize &&
        ![...EXTERNAL_WORK_LABELS].some((label) => labels.has(label)) &&
        REQUIRED_LABELS.some((label) => !labels.has(label))
      )
        await applyIntakeLabels(issue.number);
      queued.push(issue);
    }
    return queued;
  }

  async function decodeDurableState(contents) {
    if (
      contents?.type !== 'file' ||
      contents.target !== undefined ||
      contents.submodule_git_url !== undefined ||
      typeof contents.sha !== 'string' ||
      !/^[a-f0-9]{40}$/i.test(contents.sha) ||
      !Number.isSafeInteger(contents.size) ||
      contents.size <= 0 ||
      contents.size > MAX_DURABLE_STATE_BYTES
    )
      throw new Error('Durable state path is not a regular file');
    let record;
    if (contents.encoding === 'base64') record = contents;
    else if (contents.encoding === 'none') {
      if (contents.content !== '') throw new Error('Durable state blob metadata is invalid');
      const blob = await api(`repos/${repo}/git/blobs/${contents.sha}`, {
        maxOutputBytes: STATE_OUTPUT_BYTES,
      });
      if (blob.value?.sha !== contents.sha || blob.value?.size !== contents.size)
        throw new Error('Durable state blob does not match the pinned Contents object');
      record = blob.value;
    } else throw new Error('Durable state Contents encoding is invalid');
    return decodeStateBlob(record, contents.sha, contents.size);
  }

  function createStateStore() {
    let fileSHA;
    let loaded = false;
    let persistedBase;

    async function ensureBranch() {
      const refPath = `repos/${repo}/git/ref/heads/${STATE_BRANCH}`;
      const existing = await api(refPath, { allowFailure: true });
      if (existing.ok) return;
      if (!notFound(existing)) throw new Error('Cannot inspect durable state branch');
      const main = await api(`repos/${repo}/git/ref/heads/main`, {
        allowFailure: true,
      });
      if (!main.ok)
        throw new Error('Cannot initialize durable state: main branch ref is unavailable');
      const sha = main.value?.object?.sha;
      if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/i.test(sha)) {
        throw new Error('Cannot initialize durable state: main ref has an invalid commit SHA');
      }
      const created = await api(`repos/${repo}/git/refs`, {
        method: 'POST',
        body: { ref: `refs/heads/${STATE_BRANCH}`, sha },
        allowFailure: true,
      });
      if (!created.ok && !(await api(refPath, { allowFailure: true })).ok) {
        throw new Error('Cannot initialize durable state branch');
      }
    }

    async function load() {
      loaded = false;
      await ensureBranch();
      const response = await api(
        `repos/${repo}/contents/${STATE_PATH}?ref=${encodeURIComponent(STATE_BRANCH)}`,
        {
          allowFailure: true,
          maxOutputBytes: STATE_OUTPUT_BYTES,
        },
      );
      if (!response.ok) {
        if (!notFound(response)) throw new Error('Cannot read durable bug pipeline state');
        loaded = true;
        fileSHA = null;
        persistedBase = null;
        return null;
      }
      const state = await decodeDurableState(response.value);
      fileSHA = response.value.sha;
      persistedBase = structuredClone(state);
      loaded = true;
      return state;
    }

    async function save(state, { guard, rebaseIndependentSubjects } = {}) {
      if (!loaded) throw new Error('load durable state before saving (optimistic concurrency)');
      if (state === null || typeof state !== 'object' || Array.isArray(state)) {
        throw new TypeError('state must be a JSON object');
      }
      if (
        rebaseIndependentSubjects !== undefined &&
        typeof rebaseIndependentSubjects !== 'function'
      )
        throw new TypeError('Independent subject rebase requires a full state validator');
      const expectedFileSHA = fileSHA,
        originalBase = structuredClone(persistedBase);
      // Freeze both intended data and its actual persisted base BEFORE any validator/guard await.
      let content = encodeState(state);
      const intended = parseJson(
        Buffer.from(content, 'base64').toString('utf8'),
        'intended durable state',
      );
      let candidate = intended,
        candidateSHA = expectedFileSHA;
      try {
        if (rebaseIndependentSubjects) await rebaseIndependentSubjects(structuredClone(candidate));
        for (let retry = 0; ; retry++) {
          const body = {
            message: 'chore: update Codex bug pipeline state',
            content,
            branch: STATE_BRANCH,
          };
          if (candidateSHA) body.sha = candidateSHA;
          await ensureBranch();
          const response = await api(`repos/${repo}/contents/${STATE_PATH}`, {
            method: 'PUT',
            body,
            allowFailure: true,
            ...(guard === undefined ? {} : { guard }),
          });
          if (response.ok) {
            const sha = response.value?.content?.sha;
            if (typeof sha !== 'string')
              throw stateError(
                'state-write-uncertain',
                'GitHub saved state without a confirmed file SHA; reconcile before retrying',
              );
            fileSHA = sha;
            persistedBase = structuredClone(candidate);
            loaded = true;
            return sha;
          }
          const detail = String(response.result?.stderr ?? response.result?.error ?? '');
          const conflict = /(?:\bHTTP\s*409\b|\b409\s+conflict\b)/i.test(detail);
          if (!conflict) {
            const uncertain =
              response.result?.error === 'timeout' || !/\b(?:HTTP\s*)?[45][0-9]{2}\b/i.test(detail);
            throw stateError(
              uncertain ? 'state-write-uncertain' : 'state-write-failed',
              'Durable state write failed; reconcile the persisted state before retrying',
            );
          }
          if (!rebaseIndependentSubjects || retry >= 3)
            throw stateError('state-cas-conflict', 'Durable state compare-and-swap conflict');
          const fresh = await load();
          const freshSHA = fileSHA; // A subsequent validator or guard load cannot promote this body.
          candidate = mergeIndependentEntities(originalBase, intended, fresh);
          try {
            await rebaseIndependentSubjects(structuredClone(candidate));
          } catch (error) {
            throw stateError(
              'state-rebase-invalid',
              'Merged durable state failed full validation',
              error,
            );
          }
          content = encodeState(candidate); // NEW merged body, including every remote reservation.
          synchronizeInPlace(state, candidate);
          candidateSHA = freshSHA;
        }
      } catch (error) {
        // A guard may load a newer revision. Never retry this old body against it.
        fileSHA = expectedFileSHA;
        persistedBase = originalBase;
        throw error;
      }
    }

    return { load, save };
  }

  async function createDraft({ branch, title, body }) {
    if (
      typeof branch !== 'string' ||
      !/^[A-Za-z0-9._/-]+$/.test(branch) ||
      branch.startsWith('-')
    ) {
      throw new TypeError('invalid draft branch');
    }
    if (typeof title !== 'string' || !title.trim() || typeof body !== 'string') {
      throw new TypeError('draft title and body are required');
    }
    const response = await invoke(
      [
        'pr',
        'create',
        '--repo',
        repo,
        '--base',
        'main',
        '--head',
        branch,
        '--title',
        title,
        '--body',
        body,
        '--draft',
      ],
      { operation: 'mutation' },
    );
    const url = response.stdout.trim();
    const match = url.match(/\/pull\/(\d+)\/?$/);
    if (!match) throw new Error('GitHub did not return a draft pull request URL');
    return { number: Number(match[1]), url };
  }

  async function commentIssue(number, body, { guard } = {}) {
    issueNumber({ number });
    return (
      await api(`repos/${repo}/issues/${number}/comments`, {
        method: 'POST',
        body: { body: String(body) },
        guard,
      })
    ).value;
  }

  async function setIssueStatus(number, status, { guard } = {}) {
    issueNumber({ number });
    if (!ISSUE_STATUSES.includes(status)) throw new Error('Invalid issue lifecycle status');
    if (guard !== undefined) await checkMutationGuard(guard);
    if (statusCache.get(number) === status) return;
    await ensureLabel(status, { guard });
    // A partial update makes a formerly cached status unreliable until reconciliation succeeds.
    statusCache.delete(number);
    // Preserve unrelated labels and never reopen an issue closed by another operator.
    await api(`repos/${repo}/issues/${number}/labels`, {
      method: 'POST',
      body: { labels: [status] },
      guard,
    });
    for (const old of ISSUE_STATUSES.filter((value) => value !== status)) {
      const removed = await api(
        `repos/${repo}/issues/${number}/labels/${encodeURIComponent(old)}`,
        {
          method: 'DELETE',
          allowFailure: true,
          guard,
        },
      );
      if (!removed.ok && !notFound(removed))
        throw new Error('Cannot reconcile issue lifecycle labels');
    }
    if (status === 'Risolto') {
      await api(`repos/${repo}/issues/${number}`, {
        method: 'PATCH',
        body: { state: 'closed', state_reason: 'completed' },
        guard,
      });
    }
    statusCache.set(number, status);
  }

  async function readDashboardState() {
    const response = await api(
      `repos/${repo}/contents/${STATE_PATH}?ref=${encodeURIComponent(STATE_BRANCH)}`,
      { allowFailure: true, maxOutputBytes: STATE_OUTPUT_BYTES },
    );
    if (!response.ok) {
      if (notFound(response)) return null;
      throw new Error('Cannot read dashboard state');
    }
    return decodeDurableState(response.value);
  }

  async function listBugIssues() {
    return (await apiList(`repos/${repo}/issues?state=open&labels=bug&per_page=100`)).filter(
      (issue) => !issue.pull_request,
    );
  }

  async function dashboardSetup() {
    const pr = (await api(`repos/${repo}/pulls/471`)).value;
    const runs = (
      await api(
        `repos/${repo}/actions/workflows/bug-pipeline-tests.yml/runs?branch=${encodeURIComponent(pr.head.ref)}&per_page=10`,
      )
    ).value.workflow_runs;
    const latest = runs.find((run) => run.head_sha === pr.head.sha);
    return {
      head: pr.head.sha,
      merged: Boolean(pr.merged),
      draft: pr.draft,
      check: latest
        ? {
            status: latest.status,
            conclusion: latest.conclusion,
            url: latest.html_url,
          }
        : null,
    };
  }

  async function commentPR(number, body) {
    issueNumber({ number });
    return (
      await api(`repos/${repo}/issues/${number}/comments`, {
        method: 'POST',
        body: { body: String(body) },
      })
    ).value;
  }

  async function publishExternalReview(number, sha, report, round, subject) {
    issueNumber({ number });
    if (
      !/^[a-f0-9]{40}$/.test(sha) ||
      !Number.isInteger(round) ||
      round < 1 ||
      round > (subject ? attemptLimit(subject, 'reviews') : 4)
    )
      throw new Error('Invalid external review identity');
    const marker = `<!-- clinicos-claude-cron:${number}:${sha}:${round} -->`;
    const full = `${marker}\nClaude Code review ${round}/${subject ? attemptLimit(subject, 'reviews') : 4} on \`${sha}\`: **${report.verdict}**.\n\n${report.summary}\n\n${JSON.stringify(report, null, 2)}`;
    const body =
      full.length <= 60000
        ? full
        : `${marker}\nClaude Code review ${round}/${subject ? attemptLimit(subject, 'reviews') : 4} on \`${sha}\`: **${report.verdict}**. Full hashed report is preserved in codex/bug-control, .codex-bug-state.json.`;
    const reviews = await apiList(`repos/${repo}/pulls/${number}/reviews?per_page=100`);
    const previous = reviews.find((review) => review.commit_id === sha && review.body === body);
    if (previous) return previous;
    return (
      await api(`repos/${repo}/pulls/${number}/reviews`, {
        method: 'POST',
        body: { event: 'COMMENT', commit_id: sha, body },
      })
    ).value;
  }

  async function viewIssue(number) {
    issueNumber({ number });
    const value = (await api(`repos/${repo}/issues/${number}`)).value;
    const [labels, comments] = await Promise.all([
      apiList(`repos/${repo}/issues/${number}/labels?per_page=100`),
      apiList(`repos/${repo}/issues/${number}/comments?per_page=100`),
    ]);
    return { ...value, labels, comments };
  }

  async function reviewFeedback(pr) {
    const number = issueNumber({
      number: typeof pr === 'object' ? pr.number : pr,
    });
    const details = await api(`repos/${repo}/pulls/${number}`);
    const [reviews, reviewComments, issueComments, user] = await Promise.all([
      apiList(`repos/${repo}/pulls/${number}/reviews?per_page=100`),
      apiList(`repos/${repo}/pulls/${number}/comments?per_page=100`),
      apiList(`repos/${repo}/issues/${number}/comments?per_page=100`),
      api('user', { allowFailure: true }),
    ]);
    const graph = await invoke([
      'api',
      'graphql',
      '-f',
      'query=query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){pageInfo{hasNextPage} nodes{isResolved}}}}}',
      '-F',
      `owner=${owner}`,
      '-F',
      `name=${name}`,
      '-F',
      `number=${number}`,
    ]);
    const threadData = parseJson(graph.stdout, 'unresolved review threads');
    const threadConnection = threadData?.data?.repository?.pullRequest?.reviewThreads;
    const threads = threadConnection?.nodes;
    if (!Array.isArray(threads)) throw new Error('GitHub did not return PR review thread status');
    const ownLogin = user.ok ? actorLogin(user.value) : null;
    const isOwnProtocolComment = (author, body) =>
      (author === ownLogin || author === 'github-actions[bot]') &&
      String(body ?? '').includes(BOT_PROTOCOL_MARKER);
    const comments = [];
    for (const review of reviews) {
      const author = actorLogin(review.user);
      if (isOwnProtocolComment(author, review.body)) continue;
      if (review.body)
        comments.push({
          id: review.id,
          body: review.body,
          author,
          state: review.state,
          submitted_at: review.submitted_at,
        });
    }
    for (const comment of [...reviewComments, ...issueComments]) {
      const author = actorLogin(comment.user);
      if (isOwnProtocolComment(author, comment.body)) continue;
      comments.push({
        id: comment.id,
        body: comment.body ?? '',
        author,
        path: comment.path,
        line: comment.line,
        created_at: comment.created_at,
        url: comment.html_url,
      });
    }
    const latestReviewByAuthor = new Map();
    for (const review of reviews) {
      // A later COMMENTED/PENDING review is not an approval and cannot clear a
      // prior request for changes. Dismissed decisions are already marked by GitHub.
      if (!['APPROVED', 'CHANGES_REQUESTED'].includes(review.state)) continue;
      const author = actorLogin(review.user);
      if (!author) continue;
      const prior = latestReviewByAuthor.get(author);
      if (!prior || Date.parse(review.submitted_at ?? 0) > Date.parse(prior.submitted_at ?? 0)) {
        latestReviewByAuthor.set(author, review);
      }
    }
    return {
      number,
      url: details.value.html_url,
      state:
        details.value.merged === true ? 'MERGED' : String(details.value.state ?? '').toUpperCase(),
      isDraft: details.value.draft === true,
      mergeCommitSha: details.value.merge_commit_sha,
      head: details.value.head?.sha,
      headRef: details.value.head?.ref,
      headRepo: details.value.head?.repo?.full_name,
      headIsFork:
        details.value.head?.repo?.fork === true || details.value.head?.repo?.full_name !== repo,
      baseRef: details.value.base?.ref,
      comments,
      unresolved:
        threadConnection.pageInfo?.hasNextPage === true ||
        threads.some((thread) => !thread.isResolved),
      changesRequested: [...latestReviewByAuthor.values()].some(
        (review) => review.state === 'CHANGES_REQUESTED',
      ),
    };
  }

  async function nativeReviewAuthorization(pr, sha, { excludedLogins = [] } = {}) {
    const details = (await api(`repos/${repo}/pulls/${issueNumber({ number: pr })}`)).value;
    if (details.head?.sha !== sha || details.state !== 'open')
      throw stateError('controller-execution-failed', 'Native approval subject changed');
    const reviews = await apiList(`repos/${repo}/pulls/${pr}/reviews?per_page=100`);
    const latest = new Map();
    for (const review of reviews) {
      if (!['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) continue;
      const login = actorLogin(review.user);
      if (
        !latest.has(login) ||
        Date.parse(review.submitted_at) >= Date.parse(latest.get(login).submitted_at)
      )
        latest.set(login, review);
    }
    const protection = await api(`repos/${repo}/branches/main/protection`, {
      allowFailure: true,
    });
    const rule = protection.value?.required_pull_request_reviews;
    const classic =
      protection.ok &&
      rule?.required_approving_review_count >= 1 &&
      rule.dismiss_stale_reviews === true &&
      protection.value?.enforce_admins?.enabled === true;
    const active = classic
      ? null
      : await api(`repos/${repo}/rules/branches/main`, { allowFailure: true });
    const rules = active?.ok && Array.isArray(active.value) ? active.value : [];
    const protectedReviews =
      classic ||
      rules.some(
        (item) =>
          item.type === 'pull_request' &&
          item.parameters?.required_approving_review_count >= 1 &&
          item.parameters?.dismiss_stale_reviews_on_push === true,
      );
    let humanApproved = false;
    if (protectedReviews)
      for (const review of latest.values()) {
        if (
          review.state === 'APPROVED' &&
          review.commit_id === sha &&
          review.user?.type === 'User' &&
          review.user.login !== details.user?.login &&
          !excludedLogins.includes(review.user.login) &&
          (await authorized(review.user.login))
        )
          humanApproved = true;
      }
    return {
      author: details.user?.login,
      humanApproved,
      protectedReviews,
      protectionStatus: protectedReviews ? 'verified' : 'review-rule-unverified',
    };
  }

  async function draftReady(pr, { guard } = {}) {
    const number = issueNumber({
      number: typeof pr === 'object' ? pr.number : pr,
    });
    if (guard !== undefined) await checkMutationGuard(guard);
    await invoke(['pr', 'ready', String(number), '--repo', repo], {
      operation: 'projection',
    });
    return (await api(`repos/${repo}/pulls/${number}`)).value;
  }

  async function mergePullRequest(pr, sha, { guard } = {}) {
    const number = issueNumber({
      number: typeof pr === 'object' ? pr.number : pr,
    });
    if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha))
      throw new TypeError('merge requires an exact reviewed SHA');
    if (guard !== undefined) await checkMutationGuard(guard);
    await invoke(
      ['pr', 'merge', String(number), '--repo', repo, '--squash', '--match-head-commit', sha],
      { operation: 'merge' },
    );
    const merged = await api(`repos/${repo}/pulls/${number}`);
    if (
      String(merged.value.state ?? '').toUpperCase() !== 'CLOSED' ||
      merged.value.merged !== true ||
      !/^[a-f0-9]{40}$/.test(merged.value.merge_commit_sha ?? '')
    ) {
      throw new Error('GitHub did not confirm the expected pull request merge');
    }
    return {
      number,
      reviewedSha: sha,
      mergeSha: merged.value.merge_commit_sha,
      url: merged.value.html_url,
    };
  }

  async function readFileAtRevision(file, sha) {
    if (
      typeof file !== 'string' ||
      !file ||
      file.startsWith('/') ||
      file.includes('\\') ||
      file.split('/').some((part) => !part || part === '.' || part === '..')
    ) {
      throw new TypeError('invalid repository file path');
    }
    if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha))
      throw new TypeError('file lookup requires an exact commit SHA');
    const encoded = file.split('/').map(encodeURIComponent).join('/');
    const metadata = await api(`repos/${repo}/contents/${encoded}?ref=${sha}`);
    if (
      metadata.value?.type !== 'file' ||
      !/^[a-f0-9]{40}$/.test(metadata.value.sha ?? '') ||
      !Number.isSafeInteger(metadata.value.size) ||
      metadata.value.size < 0 ||
      metadata.value.size > MAX_EVIDENCE_BYTES
    ) {
      throw new Error(`remote evidence file is unavailable or outside size limits: ${file}`);
    }
    const blob = await api(`repos/${repo}/git/blobs/${metadata.value.sha}`, {
      maxOutputBytes: MAX_EVIDENCE_TRANSPORT_BYTES,
    });
    if (
      blob.value?.encoding !== 'base64' ||
      typeof blob.value.content !== 'string' ||
      blob.value.content.length > MAX_EVIDENCE_TRANSPORT_BYTES ||
      (blob.value.sha !== undefined && blob.value.sha !== metadata.value.sha)
    )
      throw new Error(`remote evidence blob is not base64: ${file}`);
    const encodedBlob = blob.value.content.replace(/[\r\n]/g, '');
    if (encodedBlob.length > Math.ceil(MAX_EVIDENCE_BYTES / 3) * 4)
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
