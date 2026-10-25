import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createIssueReviewCommunication,
  communicationText,
  reviewProjection,
  REVIEW_LABELS,
  ISSUE_REVIEW_MARKER,
  SOURCE_FEEDBACK_MARKER,
  COMMUNICATION_GUARD_MAX_AGE_MS,
} from '../qa-source4/agent-team/src/bug-pipeline/issue-review-communication.mjs';
import { externalReport, externalReviewStep } from '../qa-source4/agent-team/src/bug-pipeline/external-review.mjs';
import { syncIssueReviews, main as syncMain } from '../qa-source4/agent-team/src/bug-pipeline/issue-review-sync.mjs';
import { feedbackFingerprint, sha256 } from '../qa-source4/agent-team/src/bug-pipeline/contracts.mjs';
import { createGitHub } from '../qa-source4/agent-team/src/bug-pipeline/github.mjs';

const repo = 'l2v-hub/ClinicOS';
const sha = 'a'.repeat(40);
const clone = (value) => structuredClone(value);

export function communicationFixture({ clock } = {}) {
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17, 18],
    sha,
    phase: 'waiting-review',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [],
    pr: { number: 81, url: `https://github.com/${repo}/pull/81` },
    externalReview: {
      status: 'requested',
      subjectSha: sha,
      requestedAt: '2026-10-17T00:00:00.000Z',
    },
    plan: {
      title: 'Synthetic code regression',
      feature: 'Filter',
      rationale: 'Shared file',
      analysis: 'Synthetic only',
      execution: { difficulty: 'low', mode: 'direct', reason: 'Bounded' },
      issues: [17, 18],
      scope: ['feature.ts'],
      tasks: [{ title: 'Fix', files: ['feature.ts'], steps: ['Cover regression'] }],
      acceptance: [17, 18].map((issue) => ({ issue, criteria: ['Filter persists'] })),
      verification: [
        { command: 'node', args: ['--test', 'feature.test.mjs'] },
        { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
      ],
      evidence: [17, 18].map((issue) => ({
        issue,
        screenshot: `artifacts/task-validation/bug-batch-17/evidence/${issue}.png`,
        trace: `artifacts/task-validation/bug-batch-17/evidence/${issue}.zip`,
        video: '',
      })),
    },
  };
  let state = { schemaVersion: 1, repository: repo, batches: [clone(batch)] };
  const issues = new Map(
    [17, 18, 81].map((number) => [
      number,
      {
        number,
        state: 'open',
        ...(number === 81 ? { pull_request: {} } : {}),
        labels: [{ name: 'In progress' }, { name: 'clinical-unrelated' }],
        comments: [],
      },
    ]),
  );
  const labels = REVIEW_LABELS.map((name) => ({ name }));
  const pr = {
    created_at: '2026-10-17T00:00:00.000Z',
    number: 81,
    state: 'open',
    merged: false,
    draft: false,
    head: { sha, ref: batch.branch, repo: { full_name: repo, fork: false } },
    base: { ref: 'main' },
  };
  const commit = { sha, commit: { committer: { date: '2026-10-17T00:00:00.000Z' } } };
  const authorized = new Set(['review-bot', 'maintainer', 'another-maintainer']);
  const calls = [];
  const writes = [];
  let nextId = 1000;
  let hook = () => {};
  let failure = null;
  let reads = 0;
  const github = {
    createStateStore: () => ({
      load: async () => {
        reads++;
        return clone(state);
      },
      save: async () => assert.fail('Communication must never save state'),
    }),
    authorized: async (login) => authorized.has(login),
  };
  const run = async (call) => {
    calls.push(clone(call));
    await hook(call);
    const endpoint = call.args[1];
    const method = call.args.includes('-X') ? call.args[call.args.indexOf('-X') + 1] : 'GET';
    if (failure?.(call))
      return { ok: false, error: 'timeout', stderr: 'synthetic private provider body never logged' };
    const clean = endpoint.split('?')[0];
    let value;
    if (method === 'GET') {
      if (clean === 'user') value = { login: 'review-bot' };
      else if (clean.endsWith('/pulls/81')) value = clone(pr);
      else if (clean.includes('/commits/')) value = clone(commit);
      else if (clean === `repos/${repo}/labels`) value = clone(labels);
      else if (/\/issues\/comments\/\d+$/.test(clean)) {
        const id = Number(clean.split('/').at(-1));
        value = clone(
          [...issues.values()].flatMap((item) => item.comments).find((item) => item.id === id),
        );
      } else {
        const match = clean.match(/\/issues\/(\d+)(\/comments)?$/);
        assert.ok(match, `Unexpected read ${clean}`);
        const issue = issues.get(Number(match[1]));
        value = clone(match[2] ? issue.comments : { ...issue, comments: undefined });
      }
      if (call.args.includes('--slurp')) value = [value];
    } else {
      const body = call.input === undefined ? undefined : JSON.parse(call.input);
      writes.push({ endpoint: clean, method, body: clone(body) });
      if (clean === `repos/${repo}/labels`) {
        labels.push(body);
        value = body;
      } else {
        const match = clean.match(/\/issues\/(\d+)\/(comments|labels)(?:\/(.*))?$/);
        assert.ok(match, `Unexpected mutation ${clean}`);
        const issue = issues.get(Number(match[1]));
        if (match[2] === 'comments') {
          value = { id: nextId++, body: body.body, user: { login: 'review-bot', type: 'User' } };
          issue.comments.push(value);
        } else if (method === 'POST') {
          for (const name of body.labels)
            if (!issue.labels.some((label) => label.name === name)) issue.labels.push({ name });
          value = clone(issue.labels);
        } else {
          issue.labels = issue.labels.filter((item) => item.name !== decodeURIComponent(match[3]));
          value = null;
        }
      }
    }
    return { ok: true, stdout: JSON.stringify(value) };
  };
  const communication = createIssueReviewCommunication({
    github,
    cwd: '/tmp',
    repo,
    run,
    readReport: externalReport,
    clock,
  });
  const persist = () => {
    state.batches[0] = clone(batch);
  };
  const feedback = () => ({
    state: 'OPEN',
    isDraft: false,
    head: batch.sha,
    headRef: batch.branch,
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: issues
      .get(81)
      .comments.map((item) => ({ id: item.id, author: item.user.login, body: item.body })),
    unresolved: false,
    changesRequested: false,
  });
  github.viewIssue = async (number) => clone(issues.get(number));
  github.reviewFeedback = async () => feedback();
  github.requiredChecks = async () => ({ ok: true });
  github.draftReady = async () => {};
  return {
    batch,
    github,
    communication,
    run,
    issues,
    labels,
    pr,
    commit,
    authorized,
    writes,
    calls,
    feedback,
    state: () => state,
    reads: () => reads,
    persist,
    hook: (fn) => {
      hook = fn;
    },
    fail: (fn) => {
      failure = fn;
    },
    source: (issue, body, author = 'maintainer', id = nextId++) => {
      const item = {
        id,
        body,
        user: { login: author, type: 'User' },
        created_at: '2026-10-17T01:00:00.000Z',
        updated_at: '2026-10-17T01:00:00.000Z',
      };
      issues.get(issue).comments.push(item);
      return item;
    },
  };
}
