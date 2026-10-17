// Reviewer-owned isolated synthetic transport derived from candidate test fixture. No production identity/checks/CAS asserted.
import assert from 'node:assert/strict';
import {
  createStandaloneReview,
  standaloneReviewStep,
  mergeStandaloneReview,
  STANDALONE_REPO as repo,
} from '../../../../agent-team/src/bug-pipeline/standalone-review.mjs';
import { sha256, feedbackFingerprint } from '../../../../agent-team/src/bug-pipeline/contracts.mjs';
import { runPipeline } from '../../../../agent-team/src/bug-pipeline/pipeline.mjs';
import { STANDALONE_INFRASTRUCTURE_FILES } from '../../../../agent-team/src/bug-pipeline/cli.mjs';
import { main as handoffMain } from '../../../../agent-team/src/bug-pipeline/review-handoff-cli.mjs';
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
      path: 'agent-team/src/example.mjs',
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
    restoreAuthorization: () => (authorized = true),
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

function revision(f, { rewriteCopy = false, rewriteOld = false, removeOld = false } = {}) {
  const old = f.manifest,
    next = clone(old),
    current = 'f'.repeat(40),
    packet = path + '-revision-2';
  const previousEntries = Object.entries(old.packet.files).map(([file, digest]) => ({
    path: path + '/' + file,
    type: 'blob',
    mode: '100644',
    sha: digest.slice(0, 40),
  }));
  for (const [file, text] of Object.entries(f.content)) f.fileContents.set(path + '/' + file, text);
  if (rewriteOld) {
    f.fileContents.set(path + '/analysis.md', 'Rewritten historical contract analysis');
    previousEntries.find((e) => e.path === path + '/analysis.md').sha = sha256(
      'Rewritten historical contract analysis',
    ).slice(0, 40);
  }
  if (removeOld)
    previousEntries.splice(
      previousEntries.findIndex((e) => e.path === path + '/analysis.md'),
      1,
    );
  next.sha = current;
  next.packet = { path: packet, files: {} };
  next.sourceManifest = [
    ...clone(old.sourceManifest),
    ...previousEntries.map((e) => ({
      path: e.path,
      blob: e.sha,
      mode: e.mode,
      baseBlob: null,
      baseMode: null,
    })),
  ];
  const contents = clone(f.content);
  delete contents['imported-history.json'];
  if (rewriteCopy) contents['attempt-1.json'] = 'Rewritten failed attempt proof';
  for (const [file, text] of Object.entries(contents)) next.packet.files[file] = sha256(text);
  contents['imported-history.json'] = JSON.stringify({
    implementation: next.implementation,
    reviews: next.reviews,
    reviewLedger: next.reviewLedger,
    reviewReports: next.reviewReports,
    sourceManifest: next.sourceManifest,
    packetFiles: clone(next.packet.files),
  });
  next.packet.files['imported-history.json'] = sha256(contents['imported-history.json']);
  for (const [file, text] of Object.entries(contents))
    f.fileContents.set(packet + '/' + file, text);
  const tree = [
    {
      path: old.sourceManifest[0].path,
      type: 'blob',
      mode: '100644',
      sha: old.sourceManifest[0].blob,
    },
    ...previousEntries,
    ...Object.entries(next.packet.files).map(([file, digest]) => ({
      path: packet + '/' + file,
      type: 'blob',
      mode: '100644',
      sha: digest.slice(0, 40),
    })),
  ];
  f.treeOverrides.set(current, tree);
  f.pr.head.sha = current;
  f.feedback.head = current;
  return next;
}

async function runRuntime(
  f,
  workspace = {
    finalQaStandalone: async () => ({
      status: 'verified',
      summary: 'Read-only source and evidence inspection passed.',
    }),
  },
) {
  f.github.intake = async () => {};
  f.github.discoverQueue = async () => [];
  return runPipeline({
    repo,
    event: {},
    gh: f.github,
    models: {},
    workspace,
    store: f.github.createStateStore(),
    standaloneController: f.controller,
    standaloneInfrastructureFiles: STANDALONE_INFRASTRUCTURE_FILES,
  });
}
function makeAllowlisted(f, file = 'agent-team/src/bug-pipeline/standalone-review.mjs') {
  f.manifest.sourceManifest[0].path = file;
  const history = JSON.parse(f.content['imported-history.json']);
  history.sourceManifest = clone(f.manifest.sourceManifest);
  f.content['imported-history.json'] = JSON.stringify(history);
  f.manifest.packet.files['imported-history.json'] = sha256(f.content['imported-history.json']);
}


export {fixture,report,published,stepOptions,revision,runRuntime,makeAllowlisted,sha,baseSha,repo,STANDALONE_INFRASTRUCTURE_FILES,handoffMain};
