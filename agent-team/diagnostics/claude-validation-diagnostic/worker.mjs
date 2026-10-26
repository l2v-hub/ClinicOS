#!/usr/bin/env node
// Observe captured, already sanitized native runner strings. Never repair them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const B = Object.freeze(JSON.parse(readFileSync(new URL('./binding.json', import.meta.url))));
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const CATEGORIES = ['schema','stale-or-shape','contradiction','location','fields','unsafe','envelope-json','post-communication','valid','other'];
const FAILURES = ['claude-timeout','claude-output-limit','claude-nonzero-exit','claude-spawn-failed','claude-authentication-error','claude-rate-limit','claude-overloaded','claude-turn-limit','claude-execution-error','claude-invalid-json','claude-missing-structured-report','review-validation-failed'];
const STATUSES = ['published','published-wake-blocked','provider-failed','publication-uncertain','empty','queue-blocked','capability-blocked','preclaim-source-changed','ownership-changed','diagnostic-blocked'];
const hash = value => createHash('sha256').update(value).digest('hex');
const verdict = value => ['approved','changes-requested','blocked'].includes(value) ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 10000000;
const exactKeys = (value, keys) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
};
const finiteError = code => Object.assign(new Error(code), { finiteCode: code });

export function classifyResult(result, sha, tracked, native) {
  const stdout = typeof result?.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result?.stderr === 'string' ? result.stderr : '';
  const failure = native.claudeFailureCode(result);
  const info = {
    capturedSanitizedStdoutStringBytes: Buffer.byteLength(stdout),
    capturedSanitizedStdoutSha256: hash(stdout),
    capturedSanitizedStderrStringBytes: Buffer.byteLength(stderr),
    capturedSanitizedStderrSha256: hash(stderr),
    exitCode: Number.isInteger(result?.code) && result.code >= 0 && result.code <= 255 ? result.code : null,
    runnerError: ['timeout','output-limit','spawn-failed','subscription-oauth-required','local-subscription-config-required'].includes(result?.error) ? result.error : result?.error ? 'other' : null,
    nativeClaudeFailure: FAILURES.includes(failure) ? failure : failure === null ? null : 'other',
    envelopeParsed: false, structuredOutputPresent: false, schemaAccepted: false,
    nativeAccepted: false, communicationAccepted: false, category: 'envelope-json',
    findingCount: null, verdict: null, reportSha256: null,
  };
  let report;
  try {
    const envelope = JSON.parse(stdout);
    info.envelopeParsed = true;
    report = envelope?.structured_output;
    info.structuredOutputPresent = Boolean(envelope && typeof envelope === 'object' && Object.hasOwn(envelope, 'structured_output'));
    if (!info.structuredOutputPresent) return info;
  } catch { return info; }
  info.findingCount = Array.isArray(report?.findings) && count(report.findings.length) ? report.findings.length : null;
  info.verdict = verdict(report?.verdict);
  info.reportSha256 = hash(JSON.stringify(report));
  // Attribute schema rejection by the exact native stage, never by model text.
  try { native.validateAgainstSchema(report, native.reviewSchema); info.schemaAccepted = true; }
  catch { info.category = 'schema'; return info; }
  let validated;
  try { validated = native.validateReview(report, sha, tracked); info.nativeAccepted = true; }
  catch (error) {
    info.category = new Map([
      ['invalid or stale Claude review','stale-or-shape'],
      ['review verdict contradicts findings','contradiction'],
      ['invalid review finding location','location'],
      ['incomplete review finding','fields'],
      ['unsafe review content','unsafe'],
    ]).get(error?.message) ?? 'other';
    return info;
  }
  try {
    // Exact copy of trusted processCloudReview's communication projection.
    native.validateReview({
      ...validated,
      summary: native.communicationText(validated.summary),
      findings: validated.findings.map(finding => ({
        ...finding,
        ...Object.fromEntries(['problem','requested_change','test_expectation'].map(field => [field, native.communicationText(finding[field])])),
      })),
    }, sha, tracked);
    info.communicationAccepted = true;
    info.category = 'valid';
  } catch { info.category = 'post-communication'; }
  return info;
}

export function context(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true');
  assert.equal(env.GITHUB_EVENT_NAME, 'push');
  assert.equal(env.GITHUB_REPOSITORY, B.repository);
  assert.equal(env.GITHUB_REF, `refs/heads/${B.operatorBranch}`);
  assert.equal(env.GITHUB_WORKFLOW_REF, `${B.repository}/${B.workflowPath}@refs/heads/${B.operatorBranch}`);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'Reruns require independent reconciliation');
  assert.match(env.GITHUB_SHA ?? '', SHA);
  assert.match(env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]{0,19}$/);
  return { operatorSha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: '1' };
}

export function validateMarker(marker, ctx) {
  exactKeys(marker, ['schemaVersion','repository','trustedMain','subjectHead','pr','round','nonce','operatorBranch','operatorSha','runId','runAttempt','requestId','probeMax','reviewMax','officialWorkflowId','previousWorkflowState','officialWorkflowState','nativeRequestAccepted','permanentDisable','acceptedAt']);
  for (const key of ['repository','trustedMain','subjectHead','pr','round','nonce','operatorBranch','probeMax','reviewMax','officialWorkflowId']) assert.equal(marker[key], B[key]);
  for (const key of ['operatorSha','runId','runAttempt']) assert.equal(marker[key], ctx[key]);
  assert.equal(marker.schemaVersion, 1);
  assert.match(marker.requestId ?? '', UUID);
  assert.notEqual(marker.requestId, B.priorFailedRequestId);
  assert.equal(marker.previousWorkflowState, 'active');
  assert.equal(marker.officialWorkflowState, 'disabled_manually');
  assert.equal(marker.nativeRequestAccepted, true);
  assert.equal(marker.permanentDisable, false);
  assert.match(marker.acceptedAt ?? '', /^2026-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/);
  assert.ok(Number.isFinite(Date.parse(marker.acceptedAt)));
  return marker;
}

export function createApi(token, fetcher = fetch) {
  assert.ok(token);
  return async (endpoint, method = 'GET', body, allow404 = false) => {
    assert.ok(endpoint.startsWith(`repos/${B.repository}/`));
    assert.ok(['GET','POST','PATCH'].includes(method));
    const content = body === undefined ? undefined : JSON.stringify(body);
    assert.ok(content === undefined || Buffer.byteLength(content) <= 32768);
    let response;
    try {
      response = await fetcher(`https://api.github.com/${endpoint}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        ...(content === undefined ? {} : { body: content }),
      });
    } catch { throw finiteError('transport-unknown'); }
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw finiteError('http-failed');
    try {
      const raw = await response.text();
      if (Buffer.byteLength(raw) > 16 * 1024 * 1024) throw finiteError('response-bound');
      return raw ? JSON.parse(raw) : null;
    } catch { throw finiteError('response-invalid'); }
  };
}

export async function readMarker(api, ctx) {
  const value = await api(`repos/${B.repository}/contents/${B.markerPath}?ref=${encodeURIComponent(B.controlBranch)}`, 'GET', undefined, true);
  if (value === null) return null;
  assert.equal(value.path, B.markerPath);
  assert.equal(value.type, 'file');
  assert.equal(value.encoding, 'base64');
  assert.ok(Number.isSafeInteger(value.size) && value.size > 0 && value.size <= 8192);
  assert.ok(typeof value.content === 'string' && value.content.length <= 12000);
  const data = Buffer.from(value.content.replace(/\n/g, ''), 'base64');
  assert.equal(data.length, value.size);
  assert.equal(createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'), value.sha);
  return validateMarker(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)), ctx);
}

export async function assertLiveSource(api, requiredWorkflowState) {
  const main = await api(`repos/${B.repository}/git/ref/heads/main`);
  assert.equal(main.ref, 'refs/heads/main');
  assert.equal(main.object?.sha, B.trustedMain);
  const pr = await api(`repos/${B.repository}/pulls/${B.pr}`);
  assert.equal(pr.number, B.pr);
  assert.equal(pr.state, 'open');
  assert.equal(pr.merged, false);
  assert.equal(pr.draft, false);
  assert.equal(pr.head?.sha, B.subjectHead);
  assert.equal(pr.head?.repo?.full_name, B.repository);
  assert.equal(pr.head?.repo?.fork, false);
  assert.equal(pr.base?.ref, 'main');
  assert.equal(pr.base?.repo?.full_name, B.repository);
  const workflow = await api(`repos/${B.repository}/actions/workflows/${B.officialWorkflowId}`);
  assert.equal(workflow.id, B.officialWorkflowId);
  assert.equal(workflow.path, B.officialWorkflowPath);
  assert.equal(workflow.state, requiredWorkflowState);
}

export async function assertLiveJob(api, ctx, reserveMs = 0) {
  const run = await api(`repos/${B.repository}/actions/runs/${ctx.runId}`);
  assert.equal(run.id.toString(), ctx.runId);
  assert.equal(run.run_attempt, 1);
  assert.equal(run.head_sha, ctx.operatorSha);
  assert.equal(run.head_branch, B.operatorBranch);
  assert.equal(run.event, 'push');
  assert.equal(run.path, B.workflowPath);
  assert.equal(run.status, 'in_progress');
  assert.notEqual(run.workflow_id, B.officialWorkflowId);
  const jobs = await api(`repos/${B.repository}/actions/runs/${ctx.runId}/jobs?per_page=100`);
  assert.equal(jobs.total_count, 1);
  assert.equal(jobs.jobs?.length, 1);
  const job = jobs.jobs[0];
  assert.equal(job.name, 'Hold official Claude group');
  assert.equal(job.status, 'in_progress');
  const start = Date.parse(job.started_at);
  assert.ok(Number.isFinite(start) && start <= Date.now());
  assert.ok(Date.now() + reserveMs < start + 35 * 60000, 'Insufficient job time; no provider call');
}

export async function waitForMarker({ api, ctx, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  for (let attempt = 0; attempt < B.waitIterations; attempt++) {
    const marker = await readMarker(api, ctx);
    if (marker) {
      await assertLiveSource(api, 'disabled_manually');
      await assertLiveJob(api, ctx, 25 * 60000);
      return marker;
    }
    if (attempt + 1 < B.waitIterations) await pause(B.waitIntervalMs);
  }
  throw finiteError('marker-timeout');
}

export async function assertNoPriorProof(api, ctx) {
  const prior = await api(`repos/${B.repository}/contents/${B.receiptPath}?ref=${ctx.operatorSha}`, 'GET', undefined, true);
  assert.equal(prior, null, 'An existing receipt cannot authorize another push/run');
}

const subjects = state => ['batches','standaloneReviews'].flatMap(collection => (state?.[collection] ?? []).map(subject => ({ collection, subject })));
const pending = ({ subject }) => subject.phase === 'waiting-review' && subject.externalReview?.channel === 'github-comments' && subject.externalReview.status === 'comment-requested' && subject.externalReview.subjectSha === subject.sha && !['merged','deployed'].includes(subject.release?.status);
export function assertNativeState(state, marker, owner = null) {
  const all = subjects(state);
  const target = all.filter(({ subject }) => subject.pr?.number === B.pr);
  assert.equal(target.length, 1);
  const { subject } = target[0];
  assert.equal(subject.sha, B.subjectHead);
  assert.equal(subject.externalReview?.subjectSha, B.subjectHead);
  assert.equal(subject.externalReview?.channel, 'github-comments');
  assert.equal(subject.externalReview?.requestId, marker.requestId);
  assert.equal(subject.reviewLedger?.schema_version, 1);
  assert.equal(subject.reviewLedger?.max_rounds, 4);
  if (owner === null) {
    const candidates = all.filter(pending);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].subject.pr.number, B.pr);
    assert.equal(subject.reviews?.length, B.priorRounds);
    assert.equal(subject.reviewLedger?.rounds?.length, B.priorRounds);
    assert.equal(subject.externalReview.status, 'comment-requested');
    assert.ok(subject.reviews.every(review => review.status !== 'running'));
  } else {
    assert.equal(all.filter(pending).length, 0);
    assert.equal(subject.phase, 'reviewing');
    assert.equal(subject.externalReview.status, 'comment-running');
    assert.equal(subject.externalReview.owner, owner);
    assert.ok(typeof subject.externalReview.claimId === 'string' && subject.externalReview.claimId.length > 0);
    assert.equal(subject.reviews?.length, B.round);
    assert.deepEqual(subject.reviews.at(-1), { round: B.round, status: 'running', subjectSha: B.subjectHead });
    assert.equal(subject.reviewLedger?.rounds?.length, B.round);
    assert.deepEqual(subject.reviewLedger.rounds.at(-1), { round: B.round, verdict: 'running', subject_sha: B.subjectHead });
  }
  return target[0];
}

export function createObserver({ baseRun, native, tracked, beforeCall, onReview }) {
  let phase = 'idle';
  const counts = { version: 0, probe: 0, review: 0 };
  const diagnostics = { classified: null, runnerThrew: false, observationFailed: false, proofFailed: false };
  const run = async spec => {
    if (spec.command !== 'claude') return baseRun(spec);
    assert.equal(spec.envMode, 'review');
    const version = spec.args?.length === 1 && spec.args[0] === '--version';
    const kind = version ? 'version' : phase === 'probe' ? 'probe' : 'review';
    assert.ok((kind === 'version' || kind === 'probe') ? phase === 'probe' : phase === 'qualified');
    assert.equal(counts[kind], 0, 'One invocation per native phase');
    assert.equal(diagnostics.proofFailed, false);
    await beforeCall(kind);
    counts[kind]++;
    if (kind === 'review') phase = 'spent';
    let result;
    try { result = await baseRun(spec); }
    catch (error) {
      diagnostics.runnerThrew = true;
      if (kind === 'review') {
        try { await onReview(diagnostics); } catch { diagnostics.proofFailed = true; }
      }
      throw error; // exact original exception; native controller owns its outcome
    }
    if (kind === 'review') {
      // Observation and receipt failures never replace native results or errors.
      try { diagnostics.classified = classifyResult(result, B.subjectHead, tracked(), native); }
      catch { diagnostics.observationFailed = true; }
      try { await onReview(diagnostics); }
      catch { diagnostics.proofFailed = true; }
    }
    return result;
  };
  const probe = async args => {
    assert.equal(phase, 'idle');
    phase = 'probe';
    try {
      const result = await native.probeCloudClaude({ ...args, run });
      assert.equal(counts.version, 1);
      assert.equal(counts.probe, 1);
      phase = 'qualified';
      return result;
    } catch (error) { phase = 'spent'; throw error; }
  };
  return { run, probe, counts, diagnostics };
}

const DIAGNOSTIC_KEYS = ['capturedSanitizedStdoutStringBytes','capturedSanitizedStdoutSha256','capturedSanitizedStderrStringBytes','capturedSanitizedStderrSha256','exitCode','runnerError','nativeClaudeFailure','envelopeParsed','structuredOutputPresent','schemaAccepted','nativeAccepted','communicationAccepted','category','findingCount','verdict','reportSha256'];
function validateDiagnostic(value) {
  if (value === null) return;
  exactKeys(value, DIAGNOSTIC_KEYS);
  for (const key of ['capturedSanitizedStdoutStringBytes','capturedSanitizedStderrStringBytes']) assert.ok(count(value[key]));
  for (const key of ['capturedSanitizedStdoutSha256','capturedSanitizedStderrSha256']) assert.match(value[key], HASH);
  assert.ok(value.exitCode === null || Number.isInteger(value.exitCode) && value.exitCode >= 0 && value.exitCode <= 255);
  assert.ok([null,'timeout','output-limit','spawn-failed','subscription-oauth-required','local-subscription-config-required','other'].includes(value.runnerError));
  assert.ok([null,'other',...FAILURES].includes(value.nativeClaudeFailure));
  for (const key of ['envelopeParsed','structuredOutputPresent','schemaAccepted','nativeAccepted','communicationAccepted']) assert.equal(typeof value[key], 'boolean');
  assert.ok(CATEGORIES.includes(value.category));
  assert.ok(value.findingCount === null || count(value.findingCount));
  assert.equal(verdict(value.verdict), value.verdict);
  assert.ok(value.reportSha256 === null || HASH.test(value.reportSha256));
}

export function receipt(ctx, stage, additions = {}) {
  return {
    schemaVersion: 1, repository: B.repository, trustedMain: B.trustedMain, subjectHead: B.subjectHead,
    pr: B.pr, nonce: B.nonce, operatorBranch: B.operatorBranch, ...ctx, stage,
    requestId: null, probeMax: 1, reviewMax: 1, officialWorkflowId: B.officialWorkflowId,
    concurrencyGroup: B.concurrencyGroup, holdingGroup: true,
    markerAccepted: false, nativeOutcome: null, diagnostic: null,
    trackedCount: 0, trackedSha256: null, versionCalls: 0, probeCalls: 0, reviewCalls: 0,
    runnerThrew: false, observationFailed: false, proofFailed: false, diagnosticError: null, ...additions,
  };
}
export function validateReceipt(value, ctx) {
  exactKeys(value, Object.keys(receipt(ctx, 'started')));
  for (const key of ['schemaVersion','repository','trustedMain','subjectHead','pr','nonce','operatorBranch','operatorSha','runId','runAttempt','probeMax','reviewMax','officialWorkflowId','concurrencyGroup','holdingGroup']) assert.equal(value[key], receipt(ctx, 'started')[key]);
  assert.ok(['started','review-classified','final'].includes(value.stage));
  assert.ok(value.requestId === null || UUID.test(value.requestId) && value.requestId !== B.priorFailedRequestId);
  for (const key of ['markerAccepted','runnerThrew','observationFailed','proofFailed']) assert.equal(typeof value[key], 'boolean');
  assert.ok(value.markerAccepted ? value.requestId !== null : value.requestId === null);
  assert.ok(count(value.trackedCount));
  assert.ok(value.trackedSha256 === null || HASH.test(value.trackedSha256));
  for (const key of ['versionCalls','probeCalls','reviewCalls']) assert.ok([0,1].includes(value[key]));
  assert.ok([null,'preflight-blocked','marker-timeout','native-threw','proof-unavailable'].includes(value.diagnosticError));
  validateDiagnostic(value.diagnostic);
  if (value.nativeOutcome !== null) {
    const outcome = value.nativeOutcome;
    exactKeys(outcome, ['status','pr','sha','round','providerExecuted','verdict','findingCount','reportSha256','failureCode']);
    assert.ok(STATUSES.includes(outcome.status) || outcome.status === 'other');
    assert.ok([null,B.pr].includes(outcome.pr)); assert.ok([null,B.subjectHead].includes(outcome.sha));
    assert.ok([null,4].includes(outcome.round)); assert.equal(typeof outcome.providerExecuted, 'boolean');
    assert.equal(verdict(outcome.verdict), outcome.verdict);
    assert.ok(outcome.findingCount === null || count(outcome.findingCount));
    assert.ok(outcome.reportSha256 === null || HASH.test(outcome.reportSha256));
    assert.ok(outcome.failureCode === null || FAILURES.includes(outcome.failureCode));
  }
  assert.ok(Buffer.byteLength(JSON.stringify(value)) <= 12000);
}

export function createProofPublisher({ api, ctx, snapshot, checkpoint = async () => {} }) {
  let parent = snapshot?.parent ?? ctx.operatorSha;
  let stage = snapshot?.stage ?? null;
  let used = snapshot?.used ?? 0;
  let poisoned = snapshot?.poisoned ?? false;
  assert.match(parent, SHA);
  assert.ok(stage === null ? used === 0 && parent === ctx.operatorSha : ['started','review-classified','final'].includes(stage) && [1,2,3].includes(used));
  const state = () => ({ parent, stage, used, poisoned });
  const refEndpoint = `repos/${B.repository}/git/ref/heads/${B.operatorBranch}`;
  const readRef = async expected => {
    const ref = await api(refEndpoint);
    assert.equal(ref.ref, `refs/heads/${B.operatorBranch}`);
    assert.equal(ref.object?.sha, expected, 'Receipt CAS changed; no retry');
  };
  const publish = async value => {
    assert.equal(poisoned, false, 'Receipt publication uncertain; no retry');
    validateReceipt(value, ctx);
    assert.ok(used < B.receiptMax);
    assert.ok(stage === null ? value.stage === 'started' : stage === 'started' ? ['review-classified','final'].includes(value.stage) : stage === 'review-classified' && value.stage === 'final');
    try {
      await readRef(parent);
      const previous = await api(`repos/${B.repository}/git/commits/${parent}`);
      assert.equal(previous.sha, parent);
      assert.match(previous.tree?.sha ?? '', SHA);
      const blob = await api(`repos/${B.repository}/git/blobs`, 'POST', { content: JSON.stringify(value, null, 2) + '\n', encoding: 'utf-8' });
      assert.match(blob.sha ?? '', SHA);
      const tree = await api(`repos/${B.repository}/git/trees`, 'POST', { base_tree: previous.tree.sha, tree: [{ path: B.receiptPath, mode: '100644', type: 'blob', sha: blob.sha }] });
      assert.match(tree.sha ?? '', SHA);
      const commit = await api(`repos/${B.repository}/git/commits`, 'POST', { message: `chore: record bounded Claude diagnostic ${value.stage}`, tree: tree.sha, parents: [parent] });
      assert.match(commit.sha ?? '', SHA);
      await readRef(parent);
      await api(`repos/${B.repository}/git/refs/heads/${B.operatorBranch}`, 'PATCH', { sha: commit.sha, force: false });
      await readRef(commit.sha);
      parent = commit.sha; stage = value.stage; used++;
      await checkpoint(state());
      console.log(JSON.stringify({ type: 'finite-diagnostic-proof', stage, runId: ctx.runId, nonce: B.nonce, operatorSha: ctx.operatorSha, receiptCommit: parent }));
      return parent;
    } catch {
      poisoned = true;
      try { await checkpoint(state()); } catch { /* no replay */ }
      throw finiteError('proof-unavailable');
    }
  };
  const assertCurrent = async () => {
    assert.equal(poisoned, false);
    await readRef(parent);
  };
  return { publish, state, assertCurrent };
}

export async function loadNative(root) {
  const load = relative => import(pathToFileURL(path.join(root, relative)).href);
  const [main, proc, gh, hand, stand, comm, external, cron, validator, schema, contracts] = await Promise.all([
    load('agent-team/src/bug-pipeline/cloud-review-worker.mjs'), load('agent-team/src/bug-pipeline/process.mjs'),
    load('agent-team/src/bug-pipeline/github.mjs'), load('agent-team/src/bug-pipeline/comment-review-handoff.mjs'),
    load('agent-team/src/bug-pipeline/standalone-review.mjs'), load('agent-team/src/bug-pipeline/issue-review-communication.mjs'),
    load('agent-team/src/bug-pipeline/external-review.mjs'), load('agent-team/src/bug-pipeline/claude-review-cron.mjs'),
    load('scripts/quality-gate/claude-bug-review.mjs'), load('agent-team/src/core/json-schema.mjs'), load('agent-team/src/bug-pipeline/contracts.mjs'),
  ]);
  return { ...main, ...proc, ...gh, ...hand, ...stand, ...comm, ...external, ...cron, ...validator, ...schema, validateState: contracts.validateState };
}

export function constructNative(native, run, cwd) {
  const github = native.createGitHub({ cwd, repo: B.repository, run });
  return {
    github,
    handoff: native.createCommentReviewHandoff({ github, cwd, run }),
    standalone: native.createStandaloneReview({ github, cwd, run }),
    communication: native.createIssueReviewCommunication({ github, cwd, run, readReport: native.externalReport }),
    retrieve: native.createReviewSourceReader({ run, cwd, feedbackReader: github.reviewFeedback }),
  };
}

export function observeSource(retrieve, onTracked) {
  return async subject => {
    assert.equal(subject.pr?.number, B.pr); assert.equal(subject.sha, B.subjectHead);
    const original = await retrieve(subject);
    const copied = new Set(original.tracked);
    onTracked(copied, hash([...copied].sort().join('\n')));
    return original;
  };
}

function assertLocal(env) {
  const ctx = context(env);
  for (const [root, expected] of [[env.TRUSTED_ROOT, B.trustedMain],[env.OPERATOR_ROOT, ctx.operatorSha]]) {
    assert.ok(path.isAbsolute(root ?? ''));
    assert.equal(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expected);
    assert.equal(execFileSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' }), '');
  }
  return ctx;
}
const sessionFile = env => path.join(env.RUNNER_TEMP, 'claude-validation-diagnostic-session.json');
const saveSession = (env, session) => writeFile(sessionFile(env), JSON.stringify(session), { mode: 0o600 });

export async function startAndWait(env = process.env) {
  const ctx = assertLocal(env);
  assert.ok(!env.CLAUDE_CODE_OAUTH_TOKEN && !env.GH_TOKEN);
  const native = await loadNative(env.TRUSTED_ROOT);
  // Real constructors/import graph, no runner invocation and no OAuth.
  constructNative(native, () => { throw finiteError('constructor-preflight-invoked-runner'); }, env.RUNNER_TEMP);
  const api = createApi(env.RECEIPT_GH_TOKEN);
  const session = { ctx, proof: null, marker: null };
  const publisher = createProofPublisher({ api, ctx, checkpoint: async state => { session.proof = state; await saveSession(env, session); } });
  try {
    await assertLiveSource(api, 'active');
    await assertLiveJob(api, ctx, 25 * 60000);
    await assertNoPriorProof(api, ctx);
    await publisher.publish(receipt(ctx, 'started'));
    console.log(JSON.stringify({ type: 'holding-shared-group-waiting-host', runId: ctx.runId, nonce: B.nonce }));
    session.marker = await waitForMarker({ api, ctx });
    await saveSession(env, session);
    console.log(JSON.stringify({ type: 'host-marker-accepted', runId: ctx.runId, nonce: B.nonce }));
  } catch (error) {
    if (publisher.state().stage === 'started' && !publisher.state().poisoned) {
      try { await publisher.publish(receipt(ctx, 'final', { diagnosticError: error?.finiteCode === 'marker-timeout' ? 'marker-timeout' : 'preflight-blocked' })); } catch { /* finite failure; no replay */ }
    }
    throw finiteError('preflight-blocked');
  }
}

function safeOutcome(result, reviewUsed) {
  return {
    status: STATUSES.includes(result?.status) ? result.status : 'other',
    pr: result?.pr === B.pr ? B.pr : null,
    sha: result?.sha === B.subjectHead ? B.subjectHead : null,
    round: result?.round === 4 || reviewUsed ? 4 : null,
    providerExecuted: result?.providerExecuted === true,
    verdict: verdict(result?.verdict),
    findingCount: Array.isArray(result?.report?.findings) && count(result.report.findings.length) ? result.report.findings.length : null,
    reportSha256: HASH.test(result?.reportSha256 ?? '') ? result.reportSha256 : null,
    failureCode: FAILURES.includes(result?.failureCode) ? result.failureCode : null,
  };
}

export const REQUIRED_CHECK_NAMES = ['bug-pipeline-tests','secret-scan','frontend-tests','archive-tests','gate','browser-e2e'];
export async function requireCurrentChecks(github) {
  const checks = await github.requiredChecks(B.pr);
  assert.ok(checks?.ok === true && Array.isArray(checks.details) && REQUIRED_CHECK_NAMES.every(name => checks.details.includes(name + ': SUCCESS')), 'Exact required source checks are not passing');
}

export async function runDiagnostic(env = process.env) {
  const ctx = assertLocal(env);
  assert.equal(env.CLAUDE_REVIEW_AUTH_MODE, 'subscription');
  assert.ok(env.CLAUDE_CODE_OAUTH_TOKEN?.trim() && env.GH_TOKEN);
  const session = JSON.parse(await readFile(sessionFile(env), 'utf8'));
  assert.deepEqual(session.ctx, ctx);
  validateMarker(session.marker, ctx);
  assert.equal(session.proof?.stage, 'started');
  assert.equal(session.proof?.used, 1);
  assert.equal(session.proof?.poisoned, false);
  const api = createApi(env.RECEIPT_GH_TOKEN);
  const publisher = createProofPublisher({ api, ctx, snapshot: session.proof, checkpoint: async state => { session.proof = state; await saveSession(env, session); } });
  const runtime = await mkdtemp(path.join(env.RUNNER_TEMP, 'claude-validation-runtime-'));
  const cwd = path.join(runtime, 'empty');
  await mkdir(cwd, { mode: 0o700 });
  let observer, tracked = new Set(), trackedCount = 0, trackedSha256 = null, outcome = null;
  const meta = () => ({ requestId: session.marker.requestId, markerAccepted: true, trackedCount, trackedSha256,
    versionCalls: observer?.counts.version ?? 0, probeCalls: observer?.counts.probe ?? 0, reviewCalls: observer?.counts.review ?? 0,
    diagnostic: observer?.diagnostics.classified ?? null, runnerThrew: observer?.diagnostics.runnerThrew ?? false, observationFailed: observer?.diagnostics.observationFailed ?? false,
    proofFailed: observer?.diagnostics.proofFailed ?? false });
  try {
    const native = await loadNative(env.TRUSTED_ROOT);
    const isolated = { ...env, CLAUDE_REVIEW_AUTH_MODE: 'subscription' };
    for (const key of ['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','OPENAI_API_KEY','CODEX_API_KEY','CLINICOS_CLAUDE_CONFIG_DIR','RECEIPT_GH_TOKEN','GITHUB_TOKEN']) delete isolated[key];
    const baseRun = native.createRunner({ env: isolated, runtimeRoot: runtime });
    let store, expectedOwner;
    const checkState = state => { native.validateState(state, B.repository); if (state.standaloneReviews) native.validateStandaloneState(state); return state; };
    const authorization = async kind => {
      await publisher.assertCurrent();
      assert.deepEqual(await readMarker(api, ctx), session.marker);
      await assertLiveSource(api, 'disabled_manually');
      await assertLiveJob(api, ctx, kind === 'review' ? 22 * 60000 : 25 * 60000);
      assertNativeState(checkState(await store.load()), session.marker, kind === 'review' ? expectedOwner : null);
      await requireCurrentChecks(controllers.github);
    };
    observer = createObserver({ baseRun, native, tracked: () => tracked, beforeCall: authorization,
      onReview: async () => publisher.publish(receipt(ctx, 'review-classified', meta())),
    });
    const controllers = constructNative(native, observer.run, cwd);
    store = controllers.github.createStateStore();
    await authorization('preflight');
    const candidate = assertNativeState(checkState(await store.load()), session.marker);
    expectedOwner = await controllers[candidate.collection === 'batches' ? 'handoff' : 'standalone'].actor();
    assert.ok(typeof expectedOwner === 'string' && expectedOwner.length > 0);
    const retrieve = observeSource(controllers.retrieve, (copied, digest) => {
      tracked = copied; trackedCount = copied.size; trackedSha256 = digest;
    });
    const result = await native.processCloudReview({ ...controllers, run: observer.run, probe: observer.probe, retrieve, cwd, env: isolated });
    outcome = safeOutcome(result, observer.counts.review === 1);
    // The classified receipt was already committed before returning review result
    // to native validation/publication. This final receipt precedes runtime removal.
    if (!publisher.state().poisoned) {
      try { await publisher.publish(receipt(ctx, 'final', { ...meta(), nativeOutcome: outcome })); }
      catch { observer.diagnostics.proofFailed = true; }
    }
    console.log(JSON.stringify({ type: 'finite-native-outcome', ...outcome, ...meta(), diagnosticError: publisher.state().poisoned ? 'proof-unavailable' : null }));
    return { outcome, diagnostic: observer.diagnostics, proof: publisher.state() };
  } catch {
    if (!publisher.state().poisoned && publisher.state().stage !== 'final') {
      try { await publisher.publish(receipt(ctx, 'final', { ...meta(), nativeOutcome: outcome, diagnosticError: 'native-threw' })); } catch { /* no replay */ }
    }
    throw finiteError('diagnostic-blocked');
  } finally { await rm(runtime, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(['--start-and-wait','--execute'].includes(process.argv[2]));
    if (process.argv[2] === '--start-and-wait') await startAndWait();
    else {
      const result = await runDiagnostic();
      if (!['published','published-wake-blocked'].includes(result.outcome.status) || result.proof.poisoned) process.exitCode = 1;
    }
  } catch {
    console.log(JSON.stringify({ type: 'finite-diagnostic-error', status: 'diagnostic-blocked' }));
    process.exitCode = 1;
  }
}
