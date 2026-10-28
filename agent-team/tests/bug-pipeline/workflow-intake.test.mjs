import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const workflow = await readFile(
  new URL('../../../.github/workflows/codex-bug-pipeline.yml', import.meta.url),
  'utf8',
);
const expression = /^    if: >-?\n((?:      .*\n)+)/m.exec(workflow)?.[1];
assert(expression, 'A job condition is required before serialized concurrency');
const eligible = (event_name, event, repository = 'l2v-hub/ClinicOS') =>
  runInNewContext(
    expression,
    {
      github: { repository, event_name, event },
      fromJSON: JSON.parse,
      contains: (values, value) =>
        values.some((entry) => String(entry).toLowerCase() === String(value).toLowerCase()),
      startsWith: (value, prefix) =>
        String(value ?? '')
          .toLowerCase()
          .startsWith(prefix.toLowerCase()),
    },
    { timeout: 100 },
  );

test('irrelevant labels are filtered before serialized controller concurrency', () => {
  assert.doesNotMatch(
    workflow,
    /^concurrency:/m,
    'workflow-level concurrency would replace pending opt-ins',
  );
  assert(workflow.indexOf('    if:') < workflow.indexOf('    concurrency:'));
  for (const name of ['codex-run', 'codex-review-ready'])
    assert.equal(eligible('issues', { label: { name } }), true);
  for (const name of ['bug', 'codex-triage', 'claude-review-ready', 'unrelated'])
    assert.equal(eligible('issues', { label: { name } }), false);
  assert.match(
    workflow,
    /^    concurrency:\n      group: codex-bug-pipeline-\$\{\{ github.repository \}\}\n      cancel-in-progress: false/m,
  );
});

test('native CI/Claude completion and PR head changes wake trusted-main reconciliation', () => {
  assert.match(
    workflow,
    /workflow_run:\s+workflows:\s+\[\s*Bug pipeline regression gate,\s*Frontend Secret Scan,\s*AI Import E2E Gate,\s*Claude cloud review,?\s*\]\s+types: \[completed\]/,
  );
  assert.match(
    workflow,
    /pull_request_target:\n    types: \[labeled, synchronize, reopened, ready_for_review\]/,
  );
  assert.match(workflow, /ref: \$\{\{ github.event.repository.default_branch \}\}/);
  assert.equal(
    eligible('workflow_run', {
      workflow_run: { head_repository: { full_name: 'l2v-hub/ClinicOS' } },
    }),
    true,
  );
  assert.equal(
    eligible('workflow_run', {
      workflow_run: { head_repository: { full_name: 'untrusted/fork' } },
    }),
    false,
  );
  const pull_request = { head: { repo: { full_name: 'l2v-hub/ClinicOS' } } };
  for (const action of ['synchronize', 'reopened', 'ready_for_review'])
    assert.equal(eligible('pull_request_target', { action, pull_request }), true);
  assert.equal(
    eligible('pull_request_target', {
      action: 'labeled',
      label: { name: 'codex-review-ready' },
      pull_request,
    }),
    true,
  );
  assert.equal(
    eligible('pull_request_target', {
      action: 'labeled',
      label: { name: 'unrelated' },
      pull_request,
    }),
    false,
  );
  assert.equal(
    eligible('pull_request_target', {
      action: 'synchronize',
      pull_request: { head: { repo: { full_name: 'untrusted/fork' } } },
    }),
    false,
  );
});

test('protocol status comments do not create self-wakeup loops and foreign repositories are rejected', () => {
  assert.equal(
    eligible('issue_comment', {
      comment: { body: '<!-- codex-bug-pipeline:status -->' },
    }),
    false,
  );
  assert.equal(
    eligible('issue_comment', {
      comment: {
        body: '<!-- clinicos-review-handoff:v1 --> genuine structured report',
      },
    }),
    true,
  );
  assert.equal(
    eligible('pull_request_review', {
      review: { body: 'Actual reviewer feedback' },
    }),
    true,
  );
  assert.equal(eligible('workflow_dispatch', {}, 'untrusted/fork'), false);
});
