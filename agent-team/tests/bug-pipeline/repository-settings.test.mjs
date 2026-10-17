import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configureRepository } from '../../../scripts/quality-gate/configure-bug-repository.mjs';

const sha = 'a'.repeat(40);
const name = 'ClinicOS Codex: bug-pipeline-tests';
const contexts = [
  'bug-pipeline-tests',
  'secret-scan',
  'frontend-tests',
  'archive-tests',
  'gate',
  'browser-e2e',
];
const checks = contexts.map((context) => ({ context, integration_id: 15368 }));
function fixture({
  permission = 'admin',
  existing = null,
  denyRead = false,
  denyRoute = '',
  beforeRules = [],
  classic,
  effectiveTransform = (rules) => rules,
  canApprove = false,
} = {}) {
  const writes = [],
    reads = [];
  const settings = {
    default_workflow_permissions: 'read',
    can_approve_pull_request_reviews: canApprove,
  };
  let ruleset = structuredClone(existing),
    effectiveReads = 0;
  const request = async (method, route, body) => {
    if (method !== 'GET') writes.push({ method, route, body: structuredClone(body) });
    else reads.push(route);
    if (route.endsWith('/permission')) return { permission };
    if (
      denyRead ||
      (method === 'GET' &&
        denyRoute &&
        (route.endsWith(denyRoute) || route.split('?')[0].endsWith(denyRoute)))
    )
      throw new Error('HTTP 403');
    if (route.endsWith('/actions/permissions/workflow')) {
      if (body) Object.assign(settings, body);
      return structuredClone(settings);
    }
    if (route.endsWith('/branches/main') && !route.includes('/rules/'))
      return {
        name: 'main',
        ...(classic ? { protection: { required_status_checks: classic } } : {}),
      };
    if (route.includes('/rulesets?'))
      return ruleset ? [{ id: ruleset.id, name, source: 'l2v-hub/ClinicOS' }] : [];
    if (route.endsWith('/rulesets') && method === 'POST') {
      ruleset = { ...structuredClone(body), id: 91 };
      return structuredClone(ruleset);
    }
    if (route.endsWith('/rulesets/91')) {
      if (body) Object.assign(ruleset, structuredClone(body));
      return structuredClone(ruleset);
    }
    if (route.split('?')[0].endsWith('/rules/branches/main')) {
      const cumulative = [
        ...structuredClone(beforeRules),
        ...(ruleset?.rules ?? []).map((rule) => ({
          ...structuredClone(rule),
          ruleset_id: ruleset.id,
        })),
      ];
      const page = Number(new URLSearchParams(route.split('?')[1]).get('page') || 1);
      return effectiveTransform(cumulative, ++effectiveReads).slice((page - 1) * 100, page * 100);
    }
    throw new Error(`Unexpected API route: ${method} ${route}`);
  };
  return {
    writes,
    reads,
    settings,
    request,
    getRuleset: () => structuredClone(ruleset),
    configure: (overrides) =>
      configureRepository({
        request,
        actor: 'l2v-hub',
        expectedSha: sha,
        actualSha: sha,
        ...overrides,
      }),
  };
}
function managed(rules = []) {
  return {
    id: 91,
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    bypass_actors: [],
    rules,
  };
}
const gate = (required) => ({
  type: 'required_status_checks',
  parameters: {
    required_status_checks: structuredClone(required),
    strict_required_status_checks_policy: true,
  },
});

test('repository settings reject mismatched or malformed revisions before using credentials', async () => {
  for (const overrides of [
    { actualSha: 'b'.repeat(40) },
    { expectedSha: `${sha}\n`, actualSha: `${sha}\n` },
  ]) {
    const f = fixture();
    await assert.rejects(f.configure(overrides));
    assert.equal(f.writes.length, 0);
    assert.equal(f.reads.length, 0);
  }
});

test('non-admin callers and every failed read preflight cannot mutate settings', async () => {
  for (const options of [
    { permission: 'write' },
    { denyRead: true },
    ...[
      '/actions/permissions/workflow',
      '/branches/main',
      '/rules/branches/main',
      '/rulesets?per_page=100&page=1',
      '/rulesets/91',
    ].map((denyRoute) => ({ denyRoute, existing: managed([gate([])]) })),
  ]) {
    const f = fixture(options);
    await assert.rejects(f.configure());
    assert.equal(f.writes.length, 0);
  }
});

test('configuration adds all six cumulative exact-main Actions gates and preserves default permissions', async () => {
  const f = fixture();
  const result = await f.configure();
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.requiredChecks, contexts);
  assert.equal(f.settings.default_workflow_permissions, 'read');
  assert.deepEqual(f.writes[0].body, { can_approve_pull_request_reviews: true });
  assert.deepEqual(f.writes[1].body.conditions, {
    ref_name: { include: ['refs/heads/main'], exclude: [] },
  });
  assert.deepEqual(f.writes[1].body.bypass_actors, []);
  assert.deepEqual(f.writes[1].body.rules[0].parameters.required_status_checks, checks);
  await f.configure();
  assert.equal(f.writes.length, 2, 'a fully verified configuration must be idempotent');
});

test('adding missing gates preserves existing human reviews, strict checks, bypass actors and default permissions', async () => {
  const review = {
    type: 'pull_request',
    parameters: { required_approving_review_count: 2, dismiss_stale_reviews_on_push: true },
  };
  const priorCheck = { context: 'existing-ci', integration_id: 777 };
  const existing = managed([review, gate([priorCheck, checks[0]])]);
  existing.bypass_actors = [{ actor_id: 123, actor_type: 'Team', bypass_mode: 'pull_request' }];
  const f = fixture({ existing });
  await f.configure();
  const update = f.writes.find((write) => write.route.endsWith('/rulesets/91'));
  assert.deepEqual(Object.keys(update.body), ['rules']);
  assert.deepEqual(update.body.rules[0], review);
  assert.equal(update.body.rules[1].parameters.strict_required_status_checks_policy, true);
  assert.deepEqual(update.body.rules[1].parameters.required_status_checks, [priorCheck, ...checks]);
  assert.deepEqual(f.getRuleset().bypass_actors, existing.bypass_actors);
  assert.equal(f.settings.default_workflow_permissions, 'read');
});

test('fully configured rules preserve all controls without issuing writes', async () => {
  const existing = managed([gate(checks)]);
  const f = fixture({ existing, canApprove: true });
  await f.configure();
  assert.equal(f.writes.length, 0);
  assert.deepEqual(f.getRuleset(), existing);
});

test('ambiguous managed targets fail before any mutation', async () => {
  const wrongTarget = managed();
  wrongTarget.conditions.ref_name.include = ['~ALL'];
  for (const existing of [wrongTarget, managed([gate([]), gate([])])]) {
    const f = fixture({ existing });
    await assert.rejects(f.configure());
    assert.equal(f.writes.length, 0);
  }
});

test('a wrong managed or cumulative app binding for ANY mandatory check blocks ALL mutations', async (t) => {
  for (const context of contexts)
    for (const where of ['managed', 'effective', 'classic']) {
      await t.test(`${where}: ${context}`, async () => {
        const wrong = { context, integration_id: 1 };
        const options =
          where === 'managed'
            ? { existing: managed([gate([wrong])]) }
            : where === 'effective'
              ? { beforeRules: [{ ...gate([wrong]), ruleset_id: 88 }] }
              : { classic: { contexts: [context], checks: [{ context, app_id: 1 }] } };
        const f = fixture(options);
        await assert.rejects(f.configure());
        assert.equal(f.writes.length, 0);
      });
    }
  const unbound = fixture({ classic: { contexts: ['browser-e2e'], checks: [] } });
  await assert.rejects(unbound.configure());
  assert.equal(unbound.writes.length, 0);
});

test('effective verification checks EVERY mandatory check instead of accepting only bug-pipeline-tests', async (t) => {
  for (const missing of contexts)
    await t.test(missing, async () => {
      const f = fixture({
        effectiveTransform: (rules, read) =>
          read === 1
            ? rules
            : rules.map((rule) =>
                rule.type === 'required_status_checks'
                  ? {
                      ...rule,
                      parameters: {
                        ...rule.parameters,
                        required_status_checks: rule.parameters.required_status_checks.filter(
                          (check) => check.context !== missing,
                        ),
                      },
                    }
                  : rule,
              ),
      });
      await assert.rejects(f.configure(), new RegExp(missing));
    });
});

test('mandatory check jobs are emitted by existing unrestricted pull-request workflows', async () => {
  const importWorkflow = await readFile(
    new URL('../../../.github/workflows/ai-import-e2e.yml', import.meta.url),
    'utf8',
  );
  const pipelineWorkflow = await readFile(
    new URL('../../../.github/workflows/bug-pipeline-tests.yml', import.meta.url),
    'utf8',
  );
  for (const workflow of [importWorkflow, pipelineWorkflow]) {
    const triggers = workflow.slice(0, workflow.indexOf('\njobs:'));
    assert.match(triggers, /pull_request:/);
    const pullRequest = triggers.match(/^  pull_request:([\s\S]*?)(?=^  [A-Za-z_]+:|$(?![\s\S]))/m);
    assert.ok(pullRequest);
    assert.doesNotMatch(pullRequest[1], /\bpaths(?:-ignore)?:/);
  }
  for (const context of contexts) {
    const workflow = context === 'bug-pipeline-tests' ? pipelineWorkflow : importWorkflow;
    const job = workflow.match(
      new RegExp(`^  ${context}:\\n([\\s\\S]*?)(?=^  [a-zA-Z][a-zA-Z0-9_-]*:|$(?![\\s\\S]))`, 'm'),
    );
    assert.ok(job, `missing required job ${context}`);
    const condition = job[1].split('    steps:')[0].match(/^    if: (.+)$/m);
    assert.ok(
      !condition || condition[1] === 'always()',
      `required job ${context} must not depend on opt-in configuration`,
    );
  }
});

test('wrong required app binding on a later effective-rules page blocks every mutation', async () => {
  const optional = Array.from({ length: 100 }, (_, i) => ({
    ...gate([{ context: `optional-${i}`, integration_id: 777 }]),
    ruleset_id: 100 + i,
  }));
  const f = fixture({
    beforeRules: [
      ...optional,
      { ...gate([{ context: 'browser-e2e', integration_id: 1 }]), ruleset_id: 999 },
    ],
  });
  await assert.rejects(f.configure(), /browser-e2e/);
  assert.equal(f.writes.length, 0);
  assert.ok(f.reads.some((route) => route.endsWith('/rules/branches/main?per_page=100&page=2')));
});
