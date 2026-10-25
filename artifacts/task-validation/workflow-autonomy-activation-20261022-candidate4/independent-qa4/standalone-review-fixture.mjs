import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStandaloneReview,
  standaloneReviewStep,
  mergeStandaloneReview,
  validateStandaloneState,
  STANDALONE_REPO as repo,
} from '../qa-source4/agent-team/src/bug-pipeline/standalone-review.mjs';
import { sha256, feedbackFingerprint } from '../qa-source4/agent-team/src/bug-pipeline/contracts.mjs';
import { runPipeline } from '../qa-source4/agent-team/src/bug-pipeline/pipeline.mjs';
import { STANDALONE_INFRASTRUCTURE_FILES } from '../qa-source4/agent-team/src/bug-pipeline/cli.mjs';
import {
  finalizeEnvironment,
  main as handoffMain,
  handoffErrorDiagnostic,
} from '../qa-source4/agent-team/src/bug-pipeline/review-handoff-cli.mjs';
import {
  createGitHub,
  MERGE_PREPARATION_TIMEOUT_MS,
  MERGE_RESERVATION_LEASE_MS,
  MAX_DURABLE_STATE_BYTES,
  RESULT_RESERVATION_BYTES,
} from '../qa-source4/agent-team/src/bug-pipeline/github.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import nodePath from 'node:path';
const clone = (value) => structuredClone(value);
// Core merge fixtures inject a harmless scope; production CLI policy remains empty.
const FIXTURE_INFRASTRUCTURE_FILES = Object.freeze(['docs/synthetic-review-regression.md']);
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
function fixture({ authorizationVerifier = true, now } = {}) {
  let remote = { schemaVersion: 1, repository: repo, batches: [] },
    version = 0,
    login = 'maintainer',
    authorized = true,
    allChecks = true,
    mutateTree,
    checksHook,
    mergeBase = baseSha;
  const stateReads = [];
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
          stateReads.push({operatorTakeoverActive:remote.operatorTakeover?.active===true});
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
  let authorizationNonce = 0;
  const controller = createStandaloneReview({
    now,
    authorizationVerifier: authorizationVerifier ? async ({ binding }) => ({
      provenance: 'user-session', grantId: 'synthetic-session', sourceRef: 'test:session',
      consumptionNonce: `action-${++authorizationNonce}`, binding,
    }) : undefined,
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
    stateReads,
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

export {fixture};
