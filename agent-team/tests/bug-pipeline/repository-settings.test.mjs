import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import {
  configureRepository,
  restrictDemoEnvironment,
} from '../../../scripts/quality-gate/configure-bug-repository.mjs';

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

const demoBase = '/repos/l2v-hub/ClinicOS';
const demoRoute = `${demoBase}/environments/glistening-friendship%20%2F%20demo`;
const policyRoute = `${demoRoute}/deployment-branch-policies`;
const customRoute = `${demoRoute}/deployment_protection_rules`;
const mainPolicy = { id: 71, name: 'main', type: 'branch' };
const demoContext = {
  restrictDemoEnvironment: true,
  configureRepository: false,
  actor: 'l2v-hub',
  triggeringActor: 'l2v-hub',
  expectedSha: sha,
  actualSha: sha,
  workflowSha: sha,
  eventName: 'workflow_dispatch',
  repository: 'l2v-hub/ClinicOS',
  ref: 'refs/heads/reviewed-admin-bootstrap',
  workflowRef:
    'l2v-hub/ClinicOS/.github/workflows/bug-pipeline-tests.yml@refs/heads/reviewed-admin-bootstrap',
};

function demoFixture({
  environment = {},
  policies = [],
  permission = 'admin',
  permissionLogin = demoContext.actor,
  repository = {},
  customRules = [],
  repositorySecrets = [],
  environmentSecrets = [],
  transform = (_method, _route, result) => result,
  mutate = () => {},
} = {}) {
  const state = {
    environment: {
      id: 20880188544,
      name: 'glistening-friendship / demo',
      deployment_branch_policy: null,
      protection_rules: [],
      can_admins_bypass: false,
      ...structuredClone(environment),
    },
    policies: structuredClone(policies),
    customRules: structuredClone(customRules),
  };
  const events = [],
    reads = [],
    writes = [];
  const request = async (method, route, body) => {
    const url = new URL(route, 'https://api.github.com');
    const path = url.pathname;
    let result;
    events.push({ method, route, ...(body ? { body: structuredClone(body) } : {}) });
    if (method === 'GET') reads.push(route);
    else {
      writes.push({ method, route, body: structuredClone(body) });
      mutate(method, route, body, state);
    }
    const page = Number(url.searchParams.get('page'));
    const paginated = (items, key) => {
      assert.equal(url.searchParams.get('per_page'), '100');
      assert.ok(page >= 1 && page <= 100);
      return {
        total_count: items.length,
        [key]: structuredClone(items.slice((page - 1) * 100, page * 100)),
      };
    };
    if (method === 'GET' && path === `${demoBase}/collaborators/l2v-hub/permission`)
      result = { permission, user: { login: permissionLogin } };
    else if (method === 'GET' && path === demoBase)
      result = { full_name: 'l2v-hub/ClinicOS', default_branch: 'main', ...repository };
    else if (path === demoRoute) {
      if (method === 'PUT') {
        // Model GitHub's PUT defaults so accidentally omitted controls cause a real failure.
        const prior = state.environment.protection_rules;
        state.environment.protection_rules = prior.filter(
          (rule) => !['required_reviewers', 'wait_timer', 'branch_policy'].includes(rule.type),
        );
        if (Object.hasOwn(body, 'wait_timer'))
          state.environment.protection_rules.push({
            ...(prior.find((rule) => rule.type === 'wait_timer') ?? {}),
            type: 'wait_timer',
            wait_timer: body.wait_timer,
          });
        if (Object.hasOwn(body, 'reviewers'))
          state.environment.protection_rules.push({
            ...(prior.find((rule) => rule.type === 'required_reviewers') ?? {}),
            type: 'required_reviewers',
            prevent_self_review: body.prevent_self_review ?? false,
            reviewers: body.reviewers.map(({ type, id }) => ({ type, reviewer: { id } })),
          });
        state.environment.protection_rules.push({ type: 'branch_policy', id: 900 });
        state.environment.deployment_branch_policy = structuredClone(body.deployment_branch_policy);
        if (Object.hasOwn(body, 'can_admins_bypass'))
          state.environment.can_admins_bypass = body.can_admins_bypass;
      } else assert.equal(method, 'GET', 'No environment deletion or creation route');
      result = structuredClone(state.environment);
    } else if (path === policyRoute) {
      if (method === 'POST') {
        assert.deepEqual(body, { name: 'main', type: 'branch' });
        assert.deepEqual(state.environment.deployment_branch_policy, {
          protected_branches: false,
          custom_branch_policies: true,
        });
        state.policies.push(structuredClone(mainPolicy));
        result = structuredClone(mainPolicy);
      } else {
        assert.equal(method, 'GET', 'Existing policies must never be deleted or modified');
        if (state.environment.deployment_branch_policy === null)
          throw Object.assign(new Error('HTTP 404'), { status: 404 });
        result = paginated(state.policies, 'branch_policies');
      }
    } else if (method === 'GET' && path === customRoute)
      result = paginated(state.customRules, 'custom_deployment_protection_rules');
    else if (method === 'GET' && path === `${demoBase}/actions/secrets`)
      result = paginated(repositorySecrets, 'secrets');
    else if (method === 'GET' && path === `${demoRoute}/secrets`)
      result = paginated(environmentSecrets, 'secrets');
    else throw new Error(`Unexpected API route: ${method} ${route}`);
    return transform(method, route, result, state, reads, writes);
  };
  return {
    state,
    events,
    reads,
    writes,
    request,
    configure: (overrides = {}) =>
      restrictDemoEnvironment({ request, ...demoContext, ...overrides }),
  };
}

test('demo restriction rejects every untrusted dispatch context before any credential request', async (t) => {
  for (const overrides of [
    { restrictDemoEnvironment: false },
    { restrictDemoEnvironment: undefined },
    { configureRepository: true },
    { configureRepository: undefined },
    { actualSha: 'b'.repeat(40) },
    { workflowSha: 'b'.repeat(40) },
    { expectedSha: `${sha}\n`, actualSha: `${sha}\n` },
    { expectedSha: 'A'.repeat(40) },
    { actor: '../outside' },
    { actor: 'l2v-hub\n' },
    { actor: 'l2v-hub\n', triggeringActor: 'l2v-hub\n' },
    { triggeringActor: 'another-admin' },
    { eventName: 'pull_request' },
    { repository: 'other/ClinicOS' },
    { workflowRef: 'l2v-hub/ClinicOS/.github/workflows/other.yml@refs/heads/main' },
    {
      ref: 'refs/tags/main',
      workflowRef: 'l2v-hub/ClinicOS/.github/workflows/bug-pipeline-tests.yml@refs/tags/main',
    },
    {
      ref: 'refs/heads/main\n',
      workflowRef: 'l2v-hub/ClinicOS/.github/workflows/bug-pipeline-tests.yml@refs/heads/main\n',
    },
  ]) {
    await t.test(JSON.stringify(overrides), async () => {
      const f = demoFixture();
      await assert.rejects(f.configure(overrides));
      assert.deepEqual(f.reads, []);
      assert.deepEqual(f.writes, []);
    });
  }
});

test('demo administrator identity, repository, exact environment ID/name and every preflight read fail closed', async (t) => {
  const options = [
    { permission: 'write' },
    { permissionLogin: 'another-admin' },
    { repository: { full_name: 'other/ClinicOS' } },
    { repository: { default_branch: 'maintenance' } },
    { environment: { id: 20880188545 } },
    { environment: { id: '20880188544' } },
    { environment: { name: 'production' } },
    { environment: { deployment_branch_policy: undefined } },
    { environment: { protection_rules: undefined } },
    ...[
      `${demoBase}/collaborators/l2v-hub/permission`,
      demoBase,
      demoRoute,
      customRoute,
      `${demoBase}/actions/secrets`,
      `${demoRoute}/secrets`,
    ].map((denied) => ({
      transform: (_method, route, result) => {
        if (route.split('?')[0] === denied) throw new Error('preflight unavailable');
        return result;
      },
    })),
    {
      environment: {
        deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
      },
      transform: (_method, route, result) => {
        if (route.split('?')[0] === policyRoute) throw new Error('preflight unavailable');
        return result;
      },
    },
  ];
  for (const [i, option] of options.entries())
    await t.test(String(i), async () => {
      const f = demoFixture(option);
      await assert.rejects(f.configure());
      assert.deepEqual(f.writes, []);
    });
});

test('demo restriction changes only the fixed environment, verifies exact main and is idempotent', async () => {
  const f = demoFixture();
  const result = await f.configure({
    environmentName: 'production',
    environmentId: 1,
    branch: '*',
    route: '/elsewhere',
  });
  assert.equal(result.status, 'verified');
  assert.equal(result.environmentId, 20880188544);
  assert.equal(result.previousBranchPolicy, null);
  assert.equal(result.previousMainPolicyPresent, false);
  assert.equal(result.mainBranchOnly, true);
  assert.deepEqual(f.writes, [
    {
      method: 'PUT',
      route: demoRoute,
      body: {
        deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
        can_admins_bypass: false,
      },
    },
    { method: 'POST', route: policyRoute, body: { name: 'main', type: 'branch' } },
  ]);
  assert.deepEqual(f.state.policies, [mainPolicy]);
  const repeated = await f.configure();
  assert.equal(repeated.environmentUpdated, false);
  assert.equal(repeated.policyCreated, false);
  assert.equal(repeated.previousMainPolicyPresent, true);
  assert.equal(f.writes.length, 2);
});

test('demo restriction preserves reviewers, self-review, timer, bypass and custom protections', async () => {
  const protections = [
    { id: 4, type: 'custom_rule', app: { id: 8 } },
    { id: 2, type: 'wait_timer', wait_timer: 25 },
    {
      id: 3,
      type: 'required_reviewers',
      prevent_self_review: true,
      reviewers: [
        { type: 'Team', reviewer: { id: 21 } },
        { type: 'User', reviewer: { id: 22 } },
      ],
    },
  ];
  const customRules = [{ id: 5, app: { id: 9, slug: 'existing-protection' } }];
  const f = demoFixture({
    environment: { protection_rules: protections, can_admins_bypass: true },
    customRules,
  });
  const result = await f.configure();
  assert.equal(result.protectionsPreserved, true);
  assert.equal(f.writes[0].body.wait_timer, 25);
  assert.equal(f.writes[0].body.prevent_self_review, true);
  assert.deepEqual(f.writes[0].body.reviewers, [
    { type: 'Team', id: 21 },
    { type: 'User', id: 22 },
  ]);
  assert.equal(f.writes[0].body.can_admins_bypass, true);
  assert.deepEqual(
    f.state.environment.protection_rules.filter((rule) => rule.type !== 'branch_policy'),
    protections,
  );
  assert.deepEqual(f.state.customRules, customRules);
  const empty = demoFixture();
  await empty.configure();
  assert.ok(!Object.hasOwn(empty.writes[0].body, 'reviewers'), 'No new approval requirement');
});

test('an exact null policy bootstraps before actual policy inventory and verifies preservation immediately', async () => {
  const protections = [
    { id: 1, type: 'wait_timer', wait_timer: 0 },
    {
      id: 2,
      type: 'required_reviewers',
      prevent_self_review: true,
      reviewers: [{ type: 'Team', reviewer: { id: 31 } }],
    },
  ];
  const customRules = [{ id: 5, app: { id: 9, slug: 'existing-protection' } }];
  const f = demoFixture({
    environment: { protection_rules: protections, can_admins_bypass: true },
    customRules,
  });
  const result = await f.configure();
  assert.equal(result.status, 'verified');
  assert.deepEqual(f.writes.map(({ method, route }) => [method, route]), [
    ['PUT', demoRoute],
    ['POST', policyRoute],
  ]);
  const firstPolicyRead = f.events.findIndex(
    (event) => event.method === 'GET' && event.route.startsWith(policyRoute),
  );
  const put = f.events.findIndex((event) => event.method === 'PUT' && event.route === demoRoute);
  assert.ok(put >= 0);
  assert.ok(firstPolicyRead > put, 'null-policy inventory must wait for the PUT');
  assert.equal(f.events[put + 1].method, 'GET');
  assert.equal(f.events[put + 1].route, demoRoute, 'PUT must be followed by environment readback');
  assert.deepEqual(f.events[put].body, {
    deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    wait_timer: 0,
    prevent_self_review: true,
    reviewers: [{ type: 'Team', id: 31 }],
    can_admins_bypass: true,
  });
  assert.deepEqual(
    f.state.environment.protection_rules.filter((rule) => rule.type !== 'branch_policy'),
    protections,
  );
  assert.deepEqual(f.state.customRules, customRules);
});

test('pre-existing main policy and protected-branches modes converge without duplicate policies', async () => {
  for (const policy of [
    null,
    { protected_branches: true, custom_branch_policies: false },
    { protected_branches: false, custom_branch_policies: true },
  ]) {
    const f = demoFixture({
      environment: { deployment_branch_policy: policy },
      policies: [mainPolicy],
    });
    await f.configure();
    assert.equal(f.writes.filter((write) => write.method === 'POST').length, 0);
    assert.equal(f.writes.length, policy?.custom_branch_policies ? 0 : 1);
  }
  const f = demoFixture({
    environment: {
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    },
  });
  await f.configure();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].method, 'POST');
});

test('conflicting, duplicate, wildcard, tag and malformed policies are never deleted or mutated', async () => {
  for (const policies of [
    [{ ...mainPolicy, name: 'maintenance' }],
    [{ ...mainPolicy, name: '*' }],
    [{ ...mainPolicy, name: 'main*' }],
    [{ ...mainPolicy, type: 'tag' }],
    [{ ...mainPolicy, type: undefined }],
    [{ ...mainPolicy, id: undefined }],
    [mainPolicy, { ...mainPolicy, id: 72 }],
    Array.from({ length: 101 }, (_, id) => ({
      id,
      name: id === 100 ? 'other' : 'main',
      type: 'branch',
    })),
  ]) {
    const f = demoFixture({
      policies,
      environment: {
        deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
      },
    });
    await assert.rejects(f.configure());
    assert.deepEqual(f.writes, []);
    if (policies.length === 101) assert.ok(f.reads.includes(`${policyRoute}?per_page=100&page=2`));
  }
});

test('conflicting policies discovered after null-policy enablement stop without another write', async () => {
  for (const policies of [
    [{ ...mainPolicy, name: 'maintenance' }],
    [{ ...mainPolicy, name: '*' }],
    [{ ...mainPolicy, name: 'main*' }],
    [{ ...mainPolicy, type: 'tag' }],
    [{ ...mainPolicy, type: undefined }],
    [{ ...mainPolicy, id: undefined }],
    [mainPolicy, { ...mainPolicy, id: 72 }],
  ]) {
    const f = demoFixture({ policies });
    await assert.rejects(f.configure());
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].method, 'PUT');
    assert.equal(f.writes.some((write) => write.method === 'POST'), false);
  }
});

test('null-policy post-enable inventory 404 and failed immediate readback stop after one PUT', async () => {
  const unavailableInventory = demoFixture({
    transform: (method, route, result) => {
      if (method === 'GET' && route.startsWith(policyRoute))
        throw Object.assign(new Error('HTTP 404'), { status: 404 });
      return result;
    },
  });
  await assert.rejects(unavailableInventory.configure(), /HTTP 404/);
  assert.equal(unavailableInventory.writes.length, 1);
  assert.equal(unavailableInventory.writes[0].method, 'PUT');
  assert.equal(unavailableInventory.writes.some((write) => write.method === 'POST'), false);

  const badReadback = demoFixture({
    transform: (method, route, result, _state, _reads, writes) =>
      method === 'GET' && route === demoRoute && writes.length ? { ...result, id: 1 } : result,
  });
  await assert.rejects(badReadback.configure(), /Unexpected demo environment identity/);
  assert.equal(badReadback.writes.length, 1);
  assert.equal(badReadback.reads.some((route) => route.startsWith(policyRoute)), false);
});

test('pagination is complete for policy, protection and secret inventories and has a fixed upper bound', async () => {
  const hundred = Array.from({ length: 100 }, (_, id) => ({ id, name: `OTHER_${id}` }));
  const f = demoFixture({
    repositorySecrets: [...hundred, { name: 'RAILWAY_DEMO_TOKEN' }],
    environmentSecrets: [...hundred, { name: 'RAILWAY_DEMO_TOKEN' }],
    customRules: Array.from({ length: 101 }, (_, id) => ({ id })),
  });
  const result = await f.configure();
  assert.deepEqual(result.secrets, {
    repository: { readable: true, present: true },
    environment: { readable: true, present: true },
  });
  for (const route of [customRoute, `${demoBase}/actions/secrets`, `${demoRoute}/secrets`])
    assert.ok(f.reads.includes(`${route}?per_page=100&page=2`));
  for (const route of [
    policyRoute,
    customRoute,
    `${demoBase}/actions/secrets`,
    `${demoRoute}/secrets`,
  ]) {
    for (const broken of [
      (result) => ({ ...result, total_count: 10001 }),
      (result) => ({ ...result, total_count: -1 }),
      (result) => ({ ...result, total_count: 1.5 }),
      (result) => ({ ...result, total_count: 1 }),
      (result) => ({
        ...result,
        total_count: 0,
        branch_policies: [mainPolicy],
        secrets: hundred,
        custom_deployment_protection_rules: hundred,
      }),
    ]) {
      const bad = demoFixture({
        environment:
          route === policyRoute
            ? {
                deployment_branch_policy: {
                  protected_branches: false,
                  custom_branch_policies: true,
                },
              }
            : {},
        transform: (_method, current, result) =>
          current.split('?')[0] === route ? broken(result) : result,
      });
      await assert.rejects(bad.configure());
      assert.deepEqual(bad.writes, []);
    }
  }
  const changed = demoFixture({
    repositorySecrets: [...hundred, { name: 'RAILWAY_DEMO_TOKEN' }],
    transform: (_method, route, result) =>
      route === `${demoBase}/actions/secrets?per_page=100&page=2`
        ? { ...result, total_count: 102 }
        : result,
  });
  await assert.rejects(changed.configure(), /changed during pagination/);
  assert.deepEqual(changed.writes, []);
});

test('readback detects changed identity, controls, custom rules and non-main policies', async () => {
  for (const breakReadback of [
    (route, result) => (route === demoRoute ? { ...result, id: 1 } : result),
    (route, result) => (route === demoRoute ? { ...result, can_admins_bypass: true } : result),
    (route, result) =>
      route === demoRoute ? { ...result, deployment_branch_policy: null } : result,
    (route, result) =>
      route === demoRoute
        ? { ...result, protection_rules: [{ type: 'required_reviewers' }] }
        : result,
    (route, result) =>
      route.split('?')[0] === policyRoute
        ? { total_count: 1, branch_policies: [{ ...mainPolicy, type: 'tag' }] }
        : result,
    (route, result) =>
      route.split('?')[0] === policyRoute ? { total_count: 0, branch_policies: [] } : result,
    (route, result) =>
      route.split('?')[0] === customRoute
        ? { total_count: 1, custom_deployment_protection_rules: [{ id: 999 }] }
        : result,
  ]) {
    const f = demoFixture({
      transform: (method, route, result, _state, _reads, writes) =>
        method === 'GET' && writes.length ? breakReadback(route, result) : result,
    });
    await assert.rejects(f.configure());
    assert.ok(f.writes.length <= 2);
  }
});

test('failed mutations are attempted once and stop later writes without a blind retry', async () => {
  for (const failRoute of [demoRoute, policyRoute]) {
    const f = demoFixture({
      mutate: (_method, route) => {
        if (route === failRoute) throw new Error('HTTP 503');
      },
    });
    await assert.rejects(f.configure(), /HTTP 503/);
    assert.equal(f.writes.filter((write) => write.route === failRoute).length, 1);
    assert.equal(f.writes.length, failRoute === demoRoute ? 1 : 2);
  }
});

test('secret reports distinguish repository exposure from environment restriction and never emit values', async () => {
  const sentinel = 'synthetic-secret-must-never-appear';
  for (const repositoryPresent of [true, false])
    for (const environmentPresent of [true, false]) {
      const f = demoFixture({
        repositorySecrets: repositoryPresent
          ? [{ name: 'RAILWAY_DEMO_TOKEN', value: sentinel }]
          : [],
        environmentSecrets: environmentPresent
          ? [{ name: 'RAILWAY_DEMO_TOKEN', value: sentinel }]
          : [],
        environment: {
          arbitrary_provider_metadata: sentinel,
          deployment_branch_policy: {
            protected_branches: true,
            custom_branch_policies: false,
            extra: sentinel,
          },
        },
      });
      const result = await f.configure();
      assert.deepEqual(result.secrets, {
        repository: { readable: true, present: repositoryPresent },
        environment: { readable: true, present: environmentPresent },
      });
      assert.equal(result.repositorySecretsAreNotRestrictedByEnvironmentPolicy, true);
      assert.ok(!JSON.stringify(result).includes(sentinel));
      assert.ok(f.writes.every((write) => !write.route.includes('/secrets')));
    }
  for (const denied of [403, 404]) {
    const f = demoFixture({
      transform: (_method, route, result) => {
        if (route.includes('/secrets?'))
          throw Object.assign(new Error('metadata unavailable'), { status: denied });
        return result;
      },
    });
    const result = await f.configure();
    assert.deepEqual(result.secrets, {
      repository: { readable: false },
      environment: { readable: false },
    });
    assert.ok(
      !Object.hasOwn(result.secrets.repository, 'present'),
      'Unreadable is never reported as absent',
    );
  }
});

test('demo CLI never reflects provider errors or credentials and performs no real network calls', () => {
  const sentinel = 'synthetic-secret-reflection-sentinel';
  const preload = `globalThis.fetch = async () => { throw new Error(${JSON.stringify(sentinel)}); };`;
  const result = spawnSync(
    process.execPath,
    [
      `--import=data:text/javascript,${encodeURIComponent(preload)}`,
      new URL('../../../scripts/quality-gate/configure-bug-repository.mjs', import.meta.url)
        .pathname,
    ],
    {
      encoding: 'utf8',
      env: {
        GH_TOKEN: sentinel,
        CLINICOS_RESTRICT_DEMO_ENVIRONMENT: 'true',
        CLINICOS_CONFIGURE_REPOSITORY: 'false',
        CLINICOS_REVIEWED_SHA: sha,
        GITHUB_SHA: sha,
        GITHUB_WORKFLOW_SHA: sha,
        GITHUB_ACTOR: demoContext.actor,
        GITHUB_TRIGGERING_ACTOR: demoContext.triggeringActor,
        GITHUB_REF: demoContext.ref,
        GITHUB_WORKFLOW_REF: demoContext.workflowRef,
        GITHUB_EVENT_NAME: 'workflow_dispatch',
        GITHUB_REPOSITORY: demoContext.repository,
      },
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(
    result.stderr,
    /^Demo environment restriction blocked; no provider details are printed\nDemo environment diagnostic: (.+)\s*$/,
  );
  const diagnostic = JSON.parse(result.stderr.split('\n')[1].replace('Demo environment diagnostic: ', ''));
  assert.deepEqual(diagnostic, {
    phase: 'authorization',
    code: 'transport',
    status: null,
    readRequests: 1,
    writeAttempts: 0,
  });
  assert.ok(!`${result.stdout}${result.stderr}`.includes(sentinel));
});

test('demo CLI diagnostics classify denied reads and attempted writes without reflecting provider data', () => {
  const sentinel = 'never-print-this-token-"escaped"-Authorization-Bearer';
  const program = new URL('../../../scripts/quality-gate/configure-bug-repository.mjs', import.meta.url)
    .pathname;
  const cases = [
    { name: 'environment403', expected: ['environment_metadata', 'http_denied', 403, 3, 0] },
    { name: 'policy404', expected: ['policy_inventory', 'http_denied', 404, 4, 0] },
    { name: 'put403', expected: ['UPDATEENV', 'http_denied', 403, 7, 1] },
    { name: 'post403', expected: ['CREATEMAIN', 'http_denied', 403, 8, 2] },
    { name: 'repositorySecrets503', expected: ['repoenvsecretnames', 'http_denied', 503, 6, 0] },
    { name: 'environmentSecrets503', expected: ['repoenvsecretnames', 'http_denied', 503, 7, 0] },
    { name: 'malformedStatus', expected: ['authorization', 'http_denied', null, 1, 0] },
    { name: 'validation', expected: ['authorization', 'validation', null, 1, 0] },
    { name: 'transport', expected: ['authorization', 'transport', null, 1, 0] },
    { name: 'context', expected: ['context', 'validation', null, 0, 0] },
  ];
  for (const scenario of cases) {
    const preload = `
      const bad = ${JSON.stringify(sentinel)};
      const ok = (body) => ({ ok: true, status: 200, json: async () => body });
      const denied = (status) => ({ ok: false, status, headers: new Headers({ authorization: bad, 'x-api-key': bad }), json: async () => ({ message: bad, token: bad }) });
      let environmentReads = 0;
      globalThis.fetch = async (url, options) => {
        const requestUrl = new URL(url);
        const route = requestUrl.pathname;
        const method = options.method;
        if (${JSON.stringify(scenario.name)} === 'transport') throw new Error(bad + '\\u0022');
        if (${JSON.stringify(scenario.name)} === 'malformedStatus') return denied('403 ' + bad);
        if (route.includes('/collaborators/')) return ${scenario.name === 'validation' ? "ok({ permission: 'write', user: { login: 'l2v-hub' } })" : 'ok({ permission: \'admin\', user: { login: \'l2v-hub\' } })'};
        if (route === '/repos/l2v-hub/ClinicOS') return ok({ full_name: 'l2v-hub/ClinicOS', default_branch: 'main' });
        if (route === '/repos/l2v-hub/ClinicOS/environments/glistening-friendship%20%2F%20demo' && method === 'GET') {
          if (${JSON.stringify(scenario.name)} === 'environment403') return denied(403);
          environmentReads += 1;
          if (${JSON.stringify(scenario.name)} === 'post403' && environmentReads > 1) return ok({ id: 20880188544, name: 'glistening-friendship / demo', protection_rules: [], deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } });
          if (${JSON.stringify(scenario.name)} === 'post403') return ok({ id: 20880188544, name: 'glistening-friendship / demo', protection_rules: [], deployment_branch_policy: { protected_branches: true, custom_branch_policies: false } });
          if (${JSON.stringify(scenario.name)} === 'put403') return ok({ id: 20880188544, name: 'glistening-friendship / demo', protection_rules: [], deployment_branch_policy: { protected_branches: true, custom_branch_policies: false } });
          return ok({ id: 20880188544, name: 'glistening-friendship / demo', protection_rules: [], deployment_branch_policy: { protected_branches: true, custom_branch_policies: false } });
        }
        if (route.endsWith('/deployment-branch-policies')) {
          if (${JSON.stringify(scenario.name)} === 'policy404') return denied(404);
          if (method === 'POST') return denied(403);
          return ok({ total_count: 0, branch_policies: [] });
        }
        if (route.endsWith('/deployment_protection_rules')) return ok({ total_count: 0, custom_deployment_protection_rules: [] });
        if (route.endsWith('/secrets')) {
          if (${JSON.stringify(scenario.name)} === 'repositorySecrets503' || ${JSON.stringify(scenario.name)} === 'environmentSecrets503') {
            if (requestUrl.search !== '?per_page=100&page=1') throw new Error('unexpected secret inventory query');
            if (${JSON.stringify(scenario.name)} === 'repositorySecrets503' && route.endsWith('/actions/secrets')) return denied(503);
            if (${JSON.stringify(scenario.name)} === 'environmentSecrets503' && route.includes('/environments/')) return denied(503);
          }
          return ok({ total_count: 0, secrets: [] });
        }
        if (method === 'PUT') return ${scenario.name === 'post403' ? "ok({})" : 'denied(403)'};
        throw new Error(bad + ' unexpected route');
      };
    `;
    const result = spawnSync(
      process.execPath,
      [`--import=data:text/javascript,${encodeURIComponent(preload)}`, program],
      {
        encoding: 'utf8',
        env: {
          GH_TOKEN: sentinel,
          CLINICOS_RESTRICT_DEMO_ENVIRONMENT: 'true',
          CLINICOS_CONFIGURE_REPOSITORY: 'false',
          CLINICOS_REVIEWED_SHA: sha,
          GITHUB_SHA: sha,
          GITHUB_WORKFLOW_SHA: sha,
          GITHUB_ACTOR: demoContext.actor,
          GITHUB_TRIGGERING_ACTOR: scenario.name === 'context' ? 'other-actor' : demoContext.triggeringActor,
          GITHUB_REF: demoContext.ref,
          GITHUB_WORKFLOW_REF: demoContext.workflowRef,
          GITHUB_EVENT_NAME: 'workflow_dispatch',
          GITHUB_REPOSITORY: demoContext.repository,
        },
      },
    );
    assert.equal(result.status, 1, scenario.name);
    assert.equal(result.stdout, '', scenario.name);
    const lines = result.stderr.trimEnd().split('\n');
    assert.equal(lines[0], 'Demo environment restriction blocked; no provider details are printed');
    assert.ok(lines[1]?.startsWith('Demo environment diagnostic: '), scenario.name);
    const diagnostic = JSON.parse(lines[1].slice('Demo environment diagnostic: '.length));
    assert.deepEqual(
      [diagnostic.phase, diagnostic.code, diagnostic.status, diagnostic.readRequests, diagnostic.writeAttempts],
      scenario.expected,
      scenario.name,
    );
    assert.ok(!`${result.stdout}${result.stderr}`.includes(sentinel), scenario.name);
    assert.ok(!/api\.github\.com|\/repos\/|x-api-key/i.test(`${result.stdout}${result.stderr}`), scenario.name);
  }
});

test('demo CLI null-policy failures count the bootstrap PUT and stop after readback or inventory conflict', () => {
  const sentinel = 'null-bootstrap-secret-sentinel';
  const program = new URL('../../../scripts/quality-gate/configure-bug-repository.mjs', import.meta.url)
    .pathname;
  const cases = [
    { name: 'inventory404', expected: ['policy_inventory', 'http_denied', 404, 8, 1] },
    { name: 'inventoryConflict', expected: ['policy_inventory', 'validation', null, 8, 1] },
    { name: 'readback404', expected: ['environment_metadata', 'http_denied', 404, 7, 1] },
    { name: 'readbackMismatch', expected: ['environment_metadata', 'validation', null, 7, 1] },
  ];
  for (const scenario of cases) {
    const preload = `
      const bad = ${JSON.stringify(sentinel)};
      const ok = (body) => ({ ok: true, status: 200, json: async () => body });
      const denied = (status) => ({ ok: false, status, headers: new Headers({ authorization: bad }), json: async () => ({ message: bad }) });
      let environmentReads = 0;
      let customEnabled = false;
      globalThis.fetch = async (url, options) => {
        const requestUrl = new URL(url);
        const route = requestUrl.pathname;
        const method = options.method;
        if (route.includes('/collaborators/')) return ok({ permission: 'admin', user: { login: 'l2v-hub' } });
        if (route === '/repos/l2v-hub/ClinicOS') return ok({ full_name: 'l2v-hub/ClinicOS', default_branch: 'main' });
        if (route === '/repos/l2v-hub/ClinicOS/environments/glistening-friendship%20%2F%20demo') {
          if (method === 'PUT') { customEnabled = true; return ok({}); }
          environmentReads += 1;
          if (environmentReads === 1) return ok({ id: 20880188544, name: 'glistening-friendship / demo', protection_rules: [], deployment_branch_policy: null });
          if (${JSON.stringify(scenario.name)} === 'readback404') return denied(404);
          if (${JSON.stringify(scenario.name)} === 'readbackMismatch') return ok({ id: 1, name: 'glistening-friendship / demo', protection_rules: [], deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } });
          if (!customEnabled) throw new Error('environment readback must precede inventory');
          return ok({ id: 20880188544, name: 'glistening-friendship / demo', protection_rules: [{ type: 'branch_policy', id: 9 }], deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } });
        }
        if (route.endsWith('/deployment_protection_rules')) return ok({ total_count: 0, custom_deployment_protection_rules: [] });
        if (route.endsWith('/secrets')) return ok({ total_count: 0, secrets: [] });
        if (route.endsWith('/deployment-branch-policies')) {
          if (!customEnabled) return denied(404);
          if (${JSON.stringify(scenario.name)} === 'inventory404') return denied(404);
          if (${JSON.stringify(scenario.name)} === 'inventoryConflict') return ok({ total_count: 1, branch_policies: [{ id: 7, name: 'main*', type: 'branch' }] });
          return ok({ total_count: 0, branch_policies: [] });
        }
        throw new Error(bad + ' unexpected route');
      };
    `;
    const result = spawnSync(
      process.execPath,
      [`--import=data:text/javascript,${encodeURIComponent(preload)}`, program],
      {
        encoding: 'utf8',
        env: {
          GH_TOKEN: sentinel,
          CLINICOS_RESTRICT_DEMO_ENVIRONMENT: 'true',
          CLINICOS_CONFIGURE_REPOSITORY: 'false',
          CLINICOS_REVIEWED_SHA: sha,
          GITHUB_SHA: sha,
          GITHUB_WORKFLOW_SHA: sha,
          GITHUB_ACTOR: demoContext.actor,
          GITHUB_TRIGGERING_ACTOR: demoContext.triggeringActor,
          GITHUB_REF: demoContext.ref,
          GITHUB_WORKFLOW_REF: demoContext.workflowRef,
          GITHUB_EVENT_NAME: 'workflow_dispatch',
          GITHUB_REPOSITORY: demoContext.repository,
        },
      },
    );
    assert.equal(result.status, 1, scenario.name);
    assert.equal(result.stdout, '', scenario.name);
    const lines = result.stderr.trimEnd().split('\n');
    assert.equal(lines[0], 'Demo environment restriction blocked; no provider details are printed');
    const diagnostic = JSON.parse(lines[1].slice('Demo environment diagnostic: '.length));
    assert.deepEqual(
      [diagnostic.phase, diagnostic.code, diagnostic.status, diagnostic.readRequests, diagnostic.writeAttempts],
      scenario.expected,
      scenario.name,
    );
    assert.ok(!`${result.stdout}${result.stderr}`.includes(sentinel), scenario.name);
    assert.ok(!/api\.github\.com|\/repos\/|x-api-key/i.test(`${result.stdout}${result.stderr}`), scenario.name);
  }
});

test('demo workflow selects one explicit mode before the bot credential and stays in existing native CI', async () => {
  const workflow = await readFile(
    new URL('../../../.github/workflows/bug-pipeline-tests.yml', import.meta.url),
    'utf8',
  );
  assert.match(
    workflow,
    /restrict_demo_environment:\n\s+description:.*\n\s+type: boolean\n\s+default: false/,
  );
  assert.match(workflow, /inputs.configure_repository \|\| inputs.restrict_demo_environment/);
  const job = workflow.match(/^  configure-repository:\n([\s\S]*?)(?=^  bug-pipeline-tests:)/m)[1];
  const validation = job.indexOf('Validate the explicit administration mode');
  const credential = job.indexOf('GH_TOKEN:');
  assert.ok(validation >= 0 && validation < credential);
  assert.match(job.slice(validation, credential), /assert.notEqual\(configure, demo/);
  assert.match(job.slice(validation, credential), /validateDemoEnvironmentDispatch/);
  assert.doesNotMatch(job, /RAILWAY(?:_DEMO)?_TOKEN|environment:\s|persist-credentials: true/);
  assert.match(workflow, /node --test agent-team\/tests\/bug-pipeline\/\*\.test\.mjs/);
});

test('actual credential-free workflow validation executes both modes and rejects ambiguous or stale dispatches', async () => {
  const workflow = await readFile(
    new URL('../../../.github/workflows/bug-pipeline-tests.yml', import.meta.url),
    'utf8',
  );
  const section = workflow.slice(
    workflow.indexOf('- name: Validate the explicit administration mode'),
  );
  const source = section
    .match(/node --input-type=module <<'JS'\n([\s\S]*?)\n\s+JS/)[1]
    .split('\n')
    .map((line) => line.replace(/^          /, ''))
    .join('\n');
  const defaults = {
    CLINICOS_REVIEWED_SHA: sha,
    GITHUB_SHA: sha,
    GITHUB_WORKFLOW_SHA: sha,
    GITHUB_ACTOR: demoContext.actor,
    GITHUB_TRIGGERING_ACTOR: demoContext.triggeringActor,
    GITHUB_REF: demoContext.ref,
    GITHUB_WORKFLOW_REF: demoContext.workflowRef,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REPOSITORY: demoContext.repository,
    CLINICOS_CONFIGURE_REPOSITORY: 'false',
    CLINICOS_RESTRICT_DEMO_ENVIRONMENT: 'true',
  };
  for (const [overrides, expected] of [
    [{}, 0],
    [{ CLINICOS_CONFIGURE_REPOSITORY: 'true', CLINICOS_RESTRICT_DEMO_ENVIRONMENT: 'false' }, 0],
    [{ CLINICOS_CONFIGURE_REPOSITORY: 'true' }, 1],
    [{ CLINICOS_RESTRICT_DEMO_ENVIRONMENT: 'false' }, 1],
    [{ GITHUB_SHA: 'b'.repeat(40) }, 1],
    [{ GITHUB_WORKFLOW_SHA: 'b'.repeat(40) }, 1],
    [{ GITHUB_EVENT_NAME: 'pull_request' }, 1],
    [{ GITHUB_REPOSITORY: 'other/ClinicOS' }, 1],
    [{ GITHUB_TRIGGERING_ACTOR: 'other-admin' }, 1],
  ]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
      cwd: new URL('../../../', import.meta.url),
      encoding: 'utf8',
      env: { ...defaults, ...overrides },
    });
    assert.equal(result.status, expected, result.stderr);
  }
});
