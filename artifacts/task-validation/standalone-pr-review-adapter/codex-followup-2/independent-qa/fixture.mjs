// Fixture adapted from candidate test transport; assertions independently authored. No network.
import assert from 'node:assert/strict';
import {
  createStandaloneReview,
  standaloneReviewStep,
  mergeStandaloneReview,
  validateStandaloneState,
  STANDALONE_REPO as repo,
} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/standalone-review.mjs';
import { sha256, feedbackFingerprint } from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/contracts.mjs';
import { runPipeline } from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/pipeline.mjs';
import { STANDALONE_INFRASTRUCTURE_FILES } from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/cli.mjs';
import { main as handoffMain } from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/review-handoff-cli.mjs';
import {
  createGitHub,
  MAX_DURABLE_STATE_BYTES,
  RESULT_RESERVATION_BYTES,
} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/github.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import nodePath from 'node:path';
const clone = (value) => structuredClone(value);
const sha = 'a'.repeat(40),
  baseSha = 'b'.repeat(40),
  testedSha = 'c'.repeat(40);
const path = 'artifacts/task-validation/standalone-review-81';
const report = () => ({
  subject_sha: sha,
  verdict: 'approved',
  summary: 'Inspected frozen source and evidence.',
  findings: [],
});
function fixture() {
  let remote = { schemaVersion: 1, repository: repo, batches: [] },
    version = 0,
    login = 'maintainer',
    authorized = true,
    allChecks = true,
    mutateTree,
    checksHook,
    mergeBase = baseSha;
  const writes = [],
    published = [],
    comments = [],
    labels = [];
  const treeOverrides = new Map(),
    fileContents = new Map();
  const pr = {
    number: 81,
    state: 'open',
    merged: false,
    draft: false,
    head: { sha, ref: 'feature/review', repo: { full_name: repo, fork: false } },
    base: { sha: baseSha, ref: 'main', repo: { full_name: repo } },
  };
  const feedback = {
    number: 81,
    url: `https://github.com/${repo}/pull/81`,
    state: 'OPEN',
    isDraft: false,
    head: sha,
    headRef: 'feature/review',
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  const implementation = [1, 2, 3].map((round) => ({
    round,
    status: round === 3 ? 'passed' : 'failed',
    subjectSha: testedSha,
    evidence: `attempt-${round}.json`,
    legacy: { attempt: round, retained: true },
  }));
  const sources = [
    {
      path: 'agent-team/tests/example.mjs',
      blob: 'd'.repeat(40),
      mode: '100644',
      baseBlob: 'e'.repeat(40),
      baseMode: '100644',
    },
  ];
  const content = Object.fromEntries(
    [
      'task-contract.md',
      'analysis.md',
      'implementation-plan.md',
      'validation-report.md',
      ...implementation.map((a) => a.evidence),
    ].map((file) => [file, `Synthetic frozen ${file}\n`]),
  );
  const files = Object.fromEntries(
    Object.entries(content).map(([file, text]) => [file, sha256(text)]),
  );
  content['imported-history.json'] = JSON.stringify({
    implementation,
    reviews: [],
    reviewLedger: null,
    reviewReports: {},
    sourceManifest: sources,
    packetFiles: files,
  });
  const manifest = {
    schemaVersion: 1,
    repository: repo,
    pr: { number: 81, url: feedback.url },
    sha,
    baseSha,
    baseRef: 'main',
    branch: pr.head.ref,
    issues: [],
    packet: {
      path,
      files: { ...files, 'imported-history.json': sha256(content['imported-history.json']) },
    },
    sourceManifest: sources,
    implementation,
    reviews: [],
    reviewLedger: null,
    reviewReports: {},
    releaseHold: 'Await genuine reviews and infrastructure authorization',
  };
  const github = {
    createStateStore() {
      let loaded;
      return {
        load: async () => {
          loaded = version;
          return clone(remote);
        },
        save: async (state, { guard } = {}) => {
          const expected = loaded;
          if (guard) await guard();
          assert.equal(expected, version, 'CAS conflict');
          remote = clone(state);
          version++;
          loaded = version;
          writes.push(clone(state));
        },
      };
    },
    authorized: async () => authorized,
    authorizedMaintainer: async () => authorized,
    nativeReviewAuthorization: async () => ({
      author: 'pr-author',
      humanApproved: true,
      protectedReviews: true,
    }),
    requiredChecks: async () => {
      if (checksHook) await checksHook();
      return { ok: true, details: ['required: SUCCESS'] };
    },
    readFileAtRevision: async (file) => {
      const text = fileContents.has(file)
        ? fileContents.get(file)
        : content[file.slice(path.length + 1)];
      assert.equal(typeof text, 'string');
      return { content: text, sha256: sha256(text) };
    },
    viewIssue: async (number) => ({
      number,
      state: 'open',
      pull_request: number === 81 ? {} : undefined,
      comments: clone(comments),
      labels: clone(labels),
    }),
    reviewFeedback: async () => ({
      ...clone(feedback),
      comments: [
        ...clone(feedback.comments),
        ...clone(comments).map((c) => ({ id: c.id, body: c.body, author: c.user.login })),
      ],
    }),
    commentPR: async (number, body) =>
      comments.push({ id: comments.length + 1, body, user: { login, type: 'User' } }),
    publishExternalReview: async (number, head, review, round) => {
      published.push({ number, head, review, round });
      feedback.comments.push({
        id: 900,
        author: login,
        body: `<!-- clinicos-claude-cron:${number}:${head}:${round} -->\nreview`,
      });
    },
  };
  const run = async (call) => {
    assert.equal(call.command, 'gh', 'Review must never execute source or model commands');
    const args = call.args,
      endpoint = args[1];
    if (args[0] === 'pr' && args[1] === 'checks')
      return {
        ok: allChecks,
        stdout: JSON.stringify([
          {
            name: 'AI Runtime Tests',
            state: allChecks ? 'SUCCESS' : 'FAILURE',
            bucket: allChecks ? 'pass' : 'fail',
          },
        ]),
      };
    if (endpoint === 'user') return { ok: true, stdout: JSON.stringify({ login }) };
    if (endpoint === `repos/${repo}/pulls/81`) return { ok: true, stdout: JSON.stringify(pr) };
    if (endpoint.startsWith(`repos/${repo}/compare/`))
      return {
        ok: true,
        stdout: JSON.stringify({
          base_commit: { sha: pr.base.sha },
          merge_base_commit: { sha: mergeBase },
        }),
      };
    if (endpoint.startsWith(`repos/${repo}/git/trees/`)) {
      const revision = endpoint.split('/').at(-1).split('?')[0];
      if (treeOverrides.has(revision))
        return {
          ok: true,
          stdout: JSON.stringify({ truncated: false, tree: clone(treeOverrides.get(revision)) }),
        };
      const tree = [
        {
          path: sources[0].path,
          type: 'blob',
          mode: '100644',
          sha: revision === baseSha ? sources[0].baseBlob : sources[0].blob,
        },
      ];
      if (revision === sha)
        for (const [file, digest] of Object.entries(manifest.packet.files))
          tree.push({
            path: path + '/' + file,
            type: 'blob',
            mode: '100644',
            sha: digest.slice(0, 40),
          });
      if (mutateTree) mutateTree(tree, revision);
      return { ok: true, stdout: JSON.stringify({ truncated: false, tree }) };
    }
    if (endpoint === `repos/${repo}/issues/81/labels`) {
      const body = JSON.parse(call.input);
      labels.push(...body.labels.filter((l) => !labels.includes(l)));
      return { ok: true, stdout: '{}' };
    }
    if (endpoint.startsWith(`repos/${repo}/issues/81/labels/`)) {
      labels.splice(labels.indexOf(decodeURIComponent(endpoint.split('/').at(-1))), 1);
      return { ok: true, stdout: '' };
    }
    assert.fail('Unexpected transport ' + JSON.stringify(call));
  };
  let nonce = 0;
  const controller = createStandaloneReview({
    github,
    run,
    cwd: '/trusted',
    nonce: () => `request-${++nonce}`,
  });
  return {
    controller,
    github,
    manifest,
    content,
    writes,
    published,
    comments,
    feedback,
    labels,
    pr,
    remote: () => remote,
    setActor: (v) => (login = v),
    revoke: () => (authorized = false),
    failChecks: () => (allChecks = false),
    mutateTree: (fn) => (mutateTree = fn),
    checksHook: (fn) => (checksHook = fn),
    setMergeBase: (value) => (mergeBase = value),
    run,
    treeOverrides,
    fileContents,
  };
}
async function claimed(f) {
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  return f.controller.claim(81);
}


async function published(f) {
  await claimed(f);
  await f.controller.submit(81, report());
  return f.controller.reconcilePR(81);
}
function stepOptions(f, subject, qa) {
  const state = f.remote();
  state.standaloneReviews[0] = subject;
  return {
    subject,
    controller: f.controller,
    github: f.github,
    workspace: { finalQaStandalone: qa },
    save: async () => {
      const store = f.github.createStateStore();
      await store.load();
      await store.save(state);
    },
  };
}

function makeAllowlisted(f, file = 'docs/standalone-pr-review.md') {
  f.manifest.sourceManifest[0].path = file;
  const history = JSON.parse(f.content['imported-history.json']);
  history.sourceManifest = clone(f.manifest.sourceManifest);
  f.content['imported-history.json'] = JSON.stringify(history);
  f.manifest.packet.files['imported-history.json'] = sha256(f.content['imported-history.json']);
}

function realSharedStateStore(initial) {
  let raw = Buffer.from(JSON.stringify(initial, null, 2) + '\n');
  const oid = () => createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
  const stats = { writes: 0, conflicts: 0, puts: [] };
  const transport = createGitHub({
    cwd: '/tmp',
    repo,
    run: async (call) => {
      const endpoint = call.args[1];
      let value;
      if (call.args.includes('PUT')) {
        const body = JSON.parse(call.input);
        stats.puts.push(body);
        if (body.sha !== oid()) {
          stats.conflicts++;
          return { ok: false, code: 1, stderr: 'HTTP409 synthetic CAS conflict', stdout: '{}' };
        }
        raw = Buffer.from(body.content, 'base64');
        stats.writes++;
        value = { content: { sha: oid() } };
      } else if (endpoint.includes('/git/ref/')) value = { object: { sha: '1'.repeat(40) } };
      else if (endpoint.includes('/contents/'))
        value = {
          type: 'file',
          sha: oid(),
          size: raw.length,
          encoding: raw.length > 1024 * 1024 ? 'none' : 'base64',
          content: raw.length > 1024 * 1024 ? '' : raw.toString('base64'),
        };
      else if (endpoint.includes('/git/blobs/'))
        value = {
          sha: oid(),
          size: raw.length,
          encoding: 'base64',
          content: raw.toString('base64'),
        };
      else assert.fail('Unexpected state-only endpoint ' + endpoint);
      return { ok: true, stdout: JSON.stringify(value) };
    },
  });
  return {
    createStateStore: transport.createStateStore,
    stats,
    state: () => JSON.parse(raw),
    bytes: () => raw.length,
  };
}
function actualController(f, durable, number = 81) {
  const github = { ...f.github, createStateStore: durable.createStateStore };
  const controller = createStandaloneReview({
    github,
    cwd: '/trusted',
    run: (call) =>
      f.run({
        ...call,
        args: call.args.map((value) =>
          typeof value === 'string' ? value.replace(`/pulls/${number}`, '/pulls/81') : value,
        ),
      }),
  });
  return { github, controller };
}
async function largeHistoryState(f, publishedOwn = false) {
  if (publishedOwn) await published(f);
  else await f.controller.adopt(f.manifest);
  const state = clone(f.remote()),
    base = state.standaloneReviews[0];
  for (let pr = 82; pr < 105; pr++) {
    const subject = clone(base);
    subject.id = `standalone-pr-${pr}`;
    subject.pr = { number: pr, url: `https://github.com/${repo}/pull/${pr}` };
    subject.branch = `synthetic/history-${pr}`;
    subject.reviews = [];
    subject.reviewLedger = { schema_version: 1, max_rounds: 4, rounds: [] };
    subject.reviewReports = {};
    delete subject.externalReview;
    delete subject.reviewChannel;
    delete subject.reviewHandoffHistory;
    for (let round = 1; round <= 4; round++) {
      const content = JSON.stringify({
        ...report(),
        summary: 'Reviewed synthetic frozen source. ' + 'x'.repeat(88000),
      });
      subject.reviews.push({ round, status: 'approved', subjectSha: sha });
      subject.reviewLedger.rounds.push({
        round,
        verdict: 'approved',
        subject_sha: sha,
        review_sha256: sha256(content),
      });
      subject.reviewReports[`claude-review-${round}.json`] = content;
    }
    state.standaloneReviews.push(subject);
  }
  const size = () => Buffer.byteLength(JSON.stringify(state, null, 2) + '\n'),
    target = MAX_DURABLE_STATE_BYTES - 30000;
  let missing = target - size();
  assert.ok(missing > 0);
  for (const subject of state.standaloneReviews.slice(1))
    for (let round = 1; round <= 4 && missing > 0; round++) {
      const file = `claude-review-${round}.json`,
        value = JSON.parse(subject.reviewReports[file]),
        add = Math.min(missing, 99000 - value.summary.length);
      value.summary += 'x'.repeat(add);
      subject.reviewReports[file] = JSON.stringify(value);
      subject.reviewLedger.rounds[round - 1].review_sha256 = sha256(subject.reviewReports[file]);
      missing -= add;
    }
  assert.equal(size(), target);
  validateStandaloneState(state);
  return state;
}

export {fixture, claimed, published, stepOptions, makeAllowlisted, realSharedStateStore, report, sha, repo, clone};
