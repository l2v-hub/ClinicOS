import test from 'node:test';
import assert from 'node:assert/strict';
import { configureRepository } from '../../../scripts/quality-gate/configure-bug-repository.mjs';

const sha = 'a'.repeat(40);
const name = 'ClinicOS Codex: bug-pipeline-tests';
const check = { context: 'bug-pipeline-tests', integration_id: 15368 };
function fixture({ permission = 'admin', existing = null, denyRead = false } = {}) {
  const writes = [];
  const settings = {
    default_workflow_permissions: 'read',
    can_approve_pull_request_reviews: false,
  };
  let ruleset = structuredClone(existing);
  const request = async (method, route, body) => {
    if (method !== 'GET') writes.push({ method, route, body: structuredClone(body) });
    if (route.endsWith('/permission')) return { permission };
    if (denyRead) throw new Error('HTTP 403');
    if (route.endsWith('/actions/permissions/workflow')) {
      if (body) Object.assign(settings, body);
      return structuredClone(settings);
    }
    if (route.endsWith('/branches/main') && !route.includes('/rules/')) return { name: 'main' };
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
    if (route.endsWith('/rules/branches/main'))
      return ruleset.rules.map((rule) => ({ ...rule, ruleset_id: ruleset.id }));
    throw new Error(`Unexpected API route: ${method} ${route}`);
  };
  return {
    writes,
    settings,
    request,
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

test('repository settings reject a mismatched revision before using credentials', async () => {
  const f = fixture();
  await assert.rejects(f.configure({ actualSha: 'b'.repeat(40) }), /reviewed revision/);
  assert.equal(f.writes.length, 0);
});
test('non-admin callers and failed read preflights cannot mutate settings', async () => {
  for (const options of [{ permission: 'write' }, { denyRead: true }]) {
    const f = fixture(options);
    await assert.rejects(f.configure());
    assert.equal(f.writes.length, 0);
  }
});
test('configuration adds a cumulative exact-main gate and preserves default permissions', async () => {
  const f = fixture();
  const result = await f.configure();
  assert.equal(result.status, 'verified');
  assert.equal(f.settings.default_workflow_permissions, 'read');
  assert.deepEqual(f.writes[0].body, { can_approve_pull_request_reviews: true });
  assert.deepEqual(f.writes[1].body.conditions, {
    ref_name: { include: ['refs/heads/main'], exclude: [] },
  });
  assert.deepEqual(f.writes[1].body.bypass_actors, []);
  assert.deepEqual(f.writes[1].body.rules[0].parameters.required_status_checks, [check]);
  await f.configure();
  assert.equal(f.writes.length, 2, 'a verified configuration must be idempotent');
});
test('adding the check preserves existing human review and strict status requirements', async () => {
  const review = { type: 'pull_request', parameters: { required_approving_review_count: 2 } };
  const f = fixture({
    existing: managed([
      review,
      {
        type: 'required_status_checks',
        parameters: {
          required_status_checks: [{ context: 'existing-ci', integration_id: 15368 }],
          strict_required_status_checks_policy: true,
        },
      },
    ]),
  });
  await f.configure();
  const update = f.writes.find((write) => write.route.endsWith('/rulesets/91'));
  assert.deepEqual(Object.keys(update.body), ['rules']);
  assert.deepEqual(update.body.rules[0], review);
  assert.equal(update.body.rules[1].parameters.strict_required_status_checks_policy, true);
  assert.deepEqual(update.body.rules[1].parameters.required_status_checks, [
    { context: 'existing-ci', integration_id: 15368 },
    check,
  ]);
});
test('ambiguous targets and differently bound checks fail before any mutation', async () => {
  const wrongTarget = managed();
  wrongTarget.conditions.ref_name.include = ['~ALL'];
  const wrongApp = managed([
    {
      type: 'required_status_checks',
      parameters: {
        required_status_checks: [{ context: 'bug-pipeline-tests', integration_id: 1 }],
      },
    },
  ]);
  for (const existing of [wrongTarget, wrongApp]) {
    const f = fixture({ existing });
    await assert.rejects(f.configure());
    assert.equal(f.writes.length, 0);
  }
});
