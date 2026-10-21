#!/usr/bin/env node
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const REPO = 'l2v-hub/ClinicOS';
const NAME = 'ClinicOS Codex: bug-pipeline-tests';
const CHECK = 'bug-pipeline-tests';
const REQUIRED_CHECKS = [
  CHECK,
  'secret-scan',
  'frontend-tests',
  'archive-tests',
  'gate',
  'browser-e2e',
];
const ACTIONS_APP = 15368;
const DEMO_ENVIRONMENT = 'glistening-friendship / demo';
const DEMO_ENVIRONMENT_ID = 20880188544;
const DEMO_ROUTE = `/repos/${REPO}/environments/${encodeURIComponent(DEMO_ENVIRONMENT)}`;

export function validateDemoEnvironmentDispatch(context) {
  assert.equal(context.restrictDemoEnvironment, true, 'Explicit demo restriction mode is required');
  assert.equal(context.configureRepository, false, 'Administration modes are mutually exclusive');
  assert.equal(context.eventName, 'workflow_dispatch');
  assert.equal(context.repository, REPO);
  assert.match(context.expectedSha ?? '', /^[a-f0-9]{40}$/);
  assert.equal(context.expectedSha.length, 40);
  assert.equal(context.actualSha, context.expectedSha);
  assert.equal(context.workflowSha, context.expectedSha);
  assert.match(context.ref ?? '', /^refs\/heads\/[^\s]+$/);
  assert.equal(context.ref.trim(), context.ref);
  assert.equal(
    context.workflowRef,
    `${REPO}/.github/workflows/bug-pipeline-tests.yml@${context.ref}`,
  );
  assert.match(context.actor ?? '', /^[A-Za-z0-9][A-Za-z0-9-]*(?:\[bot\])?$/);
  assert.equal(context.actor.trim(), context.actor);
  assert.equal(context.actor, context.triggeringActor, 'A different rerun actor is not authorized');
}

// Never follow provider pagination URLs or accept a route/name/branch from a dispatch input.
async function listEnvironmentMetadata(request, route, key) {
  const records = [];
  let total;
  for (let page = 1; page <= 100; page++) {
    const result = await request('GET', `${route}?per_page=100&page=${page}`);
    assert.ok(Number.isSafeInteger(result?.total_count) && result.total_count >= 0);
    assert.ok(result.total_count <= 10000, 'Metadata pagination exceeded its safety bound');
    assert.ok(Array.isArray(result[key]) && result[key].length <= 100);
    total ??= result.total_count;
    assert.equal(result.total_count, total, 'Metadata changed during pagination');
    records.push(...result[key]);
    assert.ok(records.length <= total, 'Invalid metadata count');
    if (records.length === total) return records;
    assert.equal(result[key].length, 100, 'Incomplete metadata pagination');
  }
  assert.fail('Metadata pagination exceeded its safety bound');
}

function verifyEnvironment(environment) {
  assert.equal(environment?.id, DEMO_ENVIRONMENT_ID, 'Unexpected demo environment identity');
  assert.equal(environment.name, DEMO_ENVIRONMENT);
  assert.ok(Array.isArray(environment.protection_rules), 'Unreadable environment protections');
  const policy = environment.deployment_branch_policy;
  assert.ok(
    policy === null ||
      (typeof policy?.protected_branches === 'boolean' &&
        typeof policy.custom_branch_policies === 'boolean' &&
        !(policy.protected_branches && policy.custom_branch_policies)),
    'Unreadable environment branch policy',
  );
}

function unrelatedEnvironmentSettings(environment) {
  const { deployment_branch_policy, updated_at, protection_rules, ...settings } = environment;
  return {
    ...settings,
    protection_rules: protection_rules.filter((rule) => rule.type !== 'branch_policy'),
  };
}

function environmentUpdate(environment) {
  const body = {
    deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  };
  // PUT defaults must not reset an existing wait timer, reviewer list or self-review rule.
  for (const type of ['wait_timer', 'required_reviewers']) {
    const rules = environment.protection_rules.filter((rule) => rule.type === type);
    assert.ok(rules.length <= 1, 'Ambiguous environment protection rules');
    const rule = rules[0];
    if (!rule) continue;
    if (type === 'wait_timer') {
      assert.ok(Number.isInteger(rule.wait_timer) && rule.wait_timer >= 0);
      body.wait_timer = rule.wait_timer;
    } else {
      assert.equal(typeof rule.prevent_self_review, 'boolean');
      assert.ok(Array.isArray(rule.reviewers));
      body.prevent_self_review = rule.prevent_self_review;
      body.reviewers = rule.reviewers.map(({ type, reviewer }) => {
        assert.ok(['User', 'Team'].includes(type) && Number.isSafeInteger(reviewer?.id));
        return { type, id: reviewer.id };
      });
    }
  }
  if (Object.hasOwn(environment, 'can_admins_bypass')) {
    assert.equal(typeof environment.can_admins_bypass, 'boolean');
    body.can_admins_bypass = environment.can_admins_bypass;
  }
  return body;
}

function validateMainPolicies(policies) {
  assert.ok(policies.length <= 1, 'Conflicting deployment policies require separate authorization');
  for (const policy of policies) {
    assert.ok(Number.isSafeInteger(policy?.id));
    assert.equal(policy.name, 'main', 'Conflicting deployment branch policy');
    assert.equal(policy.type, 'branch', 'Only the main branch may deploy; tags are forbidden');
  }
}

async function secretPresence(request, route) {
  try {
    const secrets = await listEnvironmentMetadata(request, route, 'secrets');
    assert.ok(secrets.every((secret) => typeof secret?.name === 'string'));
    return {
      readable: true,
      present: secrets.some((secret) => secret.name === 'RAILWAY_DEMO_TOKEN'),
    };
  } catch (error) {
    // An unavailable inventory is unknown, never an assertion that the secret is absent.
    if ([403, 404].includes(error.status)) return { readable: false };
    throw error;
  }
}

export async function restrictDemoEnvironment({ request, ...context }) {
  validateDemoEnvironmentDispatch(context);
  const base = `/repos/${REPO}`;
  const permission = await request('GET', `${base}/collaborators/${context.actor}/permission`);
  assert.equal(permission.permission, 'admin', 'Only a repository administrator may restrict demo');
  assert.equal(permission.user?.login, context.actor, 'Administrator identity does not match');
  const repository = await request('GET', base);
  assert.equal(repository.full_name, REPO);
  assert.equal(repository.default_branch, 'main');
  const before = await request('GET', DEMO_ROUTE);
  verifyEnvironment(before); // A missing or renamed environment must NEVER be created by PUT.
  const policies = await listEnvironmentMetadata(
    request,
    `${DEMO_ROUTE}/deployment-branch-policies`,
    'branch_policies',
  );
  validateMainPolicies(policies); // Never delete an existing conflicting policy.
  const customRules = await listEnvironmentMetadata(
    request,
    `${DEMO_ROUTE}/deployment_protection_rules`,
    'custom_deployment_protection_rules',
  );
  const body = environmentUpdate(before);
  const secrets = {
    repository: await secretPresence(request, `${base}/actions/secrets`),
    environment: await secretPresence(request, `${DEMO_ROUTE}/secrets`),
  };
  let environmentUpdated = false;
  let policyCreated = false;
  if (before.deployment_branch_policy?.custom_branch_policies !== true) {
    await request('PUT', DEMO_ROUTE, body);
    environmentUpdated = true;
    // Verify identity and preservation before the next (non-retried) mutation.
    const enabled = await request('GET', DEMO_ROUTE);
    verifyEnvironment(enabled);
    assert.deepEqual(enabled.deployment_branch_policy, body.deployment_branch_policy);
    assert.deepEqual(unrelatedEnvironmentSettings(enabled), unrelatedEnvironmentSettings(before));
  }
  if (!policies.length) {
    await request('POST', `${DEMO_ROUTE}/deployment-branch-policies`, {
      name: 'main',
      type: 'branch',
    });
    policyCreated = true;
  }
  const after = await request('GET', DEMO_ROUTE);
  verifyEnvironment(after);
  assert.deepEqual(after.deployment_branch_policy, body.deployment_branch_policy);
  assert.deepEqual(unrelatedEnvironmentSettings(after), unrelatedEnvironmentSettings(before));
  const verifiedPolicies = await listEnvironmentMetadata(
    request,
    `${DEMO_ROUTE}/deployment-branch-policies`,
    'branch_policies',
  );
  validateMainPolicies(verifiedPolicies);
  assert.equal(verifiedPolicies.length, 1, 'The main-only policy was not verified');
  const verifiedCustomRules = await listEnvironmentMetadata(
    request,
    `${DEMO_ROUTE}/deployment_protection_rules`,
    'custom_deployment_protection_rules',
  );
  assert.deepEqual(verifiedCustomRules, customRules, 'Custom deployment protections changed');
  // Return only fixed identity, safe policy metadata and booleans, never provider bodies.
  return {
    status: 'verified',
    repository: REPO,
    environment: DEMO_ENVIRONMENT,
    environmentId: DEMO_ENVIRONMENT_ID,
    previousBranchPolicy:
      before.deployment_branch_policy === null
        ? null
        : {
            protected_branches: before.deployment_branch_policy.protected_branches,
            custom_branch_policies: before.deployment_branch_policy.custom_branch_policies,
          },
    previousMainPolicyPresent: policies.length === 1,
    deploymentBranchPolicy: { protected_branches: false, custom_branch_policies: true },
    mainBranchOnly: true,
    environmentUpdated,
    policyCreated,
    protectionsPreserved: true,
    secrets,
    repositorySecretsAreNotRestrictedByEnvironmentPolicy: true,
  };
}

function assertCheckBindings(checks, binding = 'integration_id') {
  assert.ok(Array.isArray(checks), 'Required checks must be readable');
  for (const check of checks)
    if (REQUIRED_CHECKS.includes(check.context))
      assert.equal(
        check[binding],
        ACTIONS_APP,
        `Inspect the differently bound ${check.context} check before changing it`,
      );
}

export async function configureRepository({ request, actor, expectedSha, actualSha }) {
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/);
  assert.equal(expectedSha.length, 40);
  assert.equal(actualSha, expectedSha, 'The dispatched revision must match the reviewed revision');
  assert.match(actor ?? '', /^[A-Za-z0-9][A-Za-z0-9-]*(?:\[bot\])?$/);
  const base = `/repos/${REPO}`;
  const permission = await request('GET', `${base}/collaborators/${actor}/permission`);
  assert.equal(
    permission.permission,
    'admin',
    'Only a repository administrator may configure gates',
  );
  const settings = await request('GET', `${base}/actions/permissions/workflow`);
  assert.ok(
    ['read', 'write'].includes(settings.default_workflow_permissions),
    'Default workflow permissions must be readable',
  );
  assert.equal(typeof settings.can_approve_pull_request_reviews, 'boolean');
  const branch = await request('GET', `${base}/branches/main`);
  assert.equal(branch.name, 'main', 'The target branch must be main');
  const classic = branch.protection?.required_status_checks;
  if (classic) {
    assertCheckBindings(classic.checks ?? [], 'app_id');
    for (const context of classic.contexts ?? [])
      if (REQUIRED_CHECKS.includes(context))
        assert.ok(
          classic.checks?.some(
            (check) => check.context === context && check.app_id === ACTIONS_APP,
          ),
          `The classic ${context} check must have the expected Actions binding`,
        );
  }
  const listAll = async (route) => {
    const all = [];
    for (let page = 1; ; page++) {
      const records = await request('GET', `${base}${route}?per_page=100&page=${page}`);
      assert.ok(Array.isArray(records) && records.length <= 100, 'Invalid paginated rules list');
      all.push(...records);
      if (records.length < 100) return all;
      assert.ok(page < 100, 'Rules pagination exceeded its safety bound');
    }
  };
  // Read effective cumulative gates before ANY write, including enabling PR approval.
  const before = await listAll('/rules/branches/main');
  assert.ok(Array.isArray(before), 'Effective branch rules must be readable');
  for (const rule of before.filter((rule) => rule.type === 'required_status_checks'))
    assertCheckBindings(rule.parameters?.required_status_checks);
  const rulesets = await listAll('/rulesets');
  const matches = rulesets.filter((rule) => rule.name === NAME && rule.source === REPO);
  assert.ok(matches.length < 2, 'Ambiguous managed ruleset');
  let existing = matches.length ? await request('GET', `${base}/rulesets/${matches[0].id}`) : null;
  if (existing) {
    assert.equal(existing.target, 'branch');
    assert.deepEqual(existing.conditions, {
      ref_name: { include: ['refs/heads/main'], exclude: [] },
    });
    assert.equal(
      existing.enforcement,
      'active',
      'Inspect a disabled or evaluating gate before changing it',
    );
  }
  const rules = structuredClone(existing?.rules ?? []);
  const gates = rules.filter((rule) => rule.type === 'required_status_checks');
  assert.ok(gates.length <= 1, 'Ambiguous managed required-check rules');
  let gate = gates[0];
  if (!gate) {
    gate = {
      type: 'required_status_checks',
      parameters: { required_status_checks: [], strict_required_status_checks_policy: false },
    };
    rules.push(gate);
  }
  assertCheckBindings(gate.parameters?.required_status_checks);
  let changed = false;
  for (const context of REQUIRED_CHECKS) {
    if (!gate.parameters.required_status_checks.some((check) => check.context === context)) {
      gate.parameters.required_status_checks.push({ context, integration_id: ACTIONS_APP });
      changed = true;
    }
  }

  // Only this flag changes; the repository's default workflow permissions are preserved.
  if (settings.can_approve_pull_request_reviews !== true) {
    await request('PUT', `${base}/actions/permissions/workflow`, {
      can_approve_pull_request_reviews: true,
    });
  }
  // Rulesets add requirements cumulatively; existing classic protections/review rules stay intact.
  if (!existing) {
    existing = await request('POST', `${base}/rulesets`, {
      name: NAME,
      target: 'branch',
      enforcement: 'active',
      conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
      bypass_actors: [],
      rules,
    });
  } else if (changed) {
    await request('PUT', `${base}/rulesets/${existing.id}`, { rules });
  }
  const verifiedSettings = await request('GET', `${base}/actions/permissions/workflow`);
  assert.equal(verifiedSettings.can_approve_pull_request_reviews, true);
  assert.equal(
    verifiedSettings.default_workflow_permissions,
    settings.default_workflow_permissions,
  );
  const effective = await listAll('/rules/branches/main');
  assert.ok(Array.isArray(effective), 'Effective branch rules must be readable');
  const effectiveGates = effective.filter((rule) => rule.type === 'required_status_checks');
  for (const rule of effectiveGates) assertCheckBindings(rule.parameters?.required_status_checks);
  const managedChecks = effectiveGates
    .filter((rule) => rule.ruleset_id === existing.id)
    .flatMap((rule) => rule.parameters.required_status_checks);
  for (const context of REQUIRED_CHECKS)
    assert.ok(
      managedChecks.some(
        (check) => check.context === context && check.integration_id === ACTIONS_APP,
      ),
      `The required Actions check ${context} is not effective on main`,
    );

  return {
    status: 'verified',
    repository: REPO,
    approvePullRequests: true,
    requiredCheck: CHECK,
    requiredChecks: [...REQUIRED_CHECKS],
    rulesetId: existing.id,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.env.GH_TOKEN, 'The repository bot credential is unavailable');
    const request = async (method, route, body) => {
      const response = await fetch(`https://api.github.com${route}`, {
        method,
        headers: {
          Authorization: `Bearer ${process.env.GH_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
        redirect: 'error',
      });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        const reason =
          new Map([
            ['Resource not accessible by personal access token', 'bot-token-permission-denied'],
            ['Resource not accessible by integration', 'integration-permission-denied'],
            ['Bad credentials', 'invalid-credential'],
            ['Not Found', 'resource-not-visible'],
          ]).get(details.message) || 'github-request-denied';
        const error = new Error(
          `GitHub ${method} ${route}: HTTP ${response.status}; ${reason}; repository Administration write access is required`,
        );
        error.status = response.status;
        throw error;
      }
      return response.status === 204 ? null : response.json();
    };
    const context = {
      request,
      actor: process.env.GITHUB_ACTOR,
      expectedSha: process.env.CLINICOS_REVIEWED_SHA,
      actualSha: process.env.GITHUB_SHA,
    };
    const demoMode = process.env.CLINICOS_RESTRICT_DEMO_ENVIRONMENT === 'true';
    const result = demoMode
      ? await restrictDemoEnvironment({
          ...context,
          restrictDemoEnvironment: true,
          configureRepository: process.env.CLINICOS_CONFIGURE_REPOSITORY !== 'false',
          eventName: process.env.GITHUB_EVENT_NAME,
          repository: process.env.GITHUB_REPOSITORY,
          workflowSha: process.env.GITHUB_WORKFLOW_SHA,
          workflowRef: process.env.GITHUB_WORKFLOW_REF,
          ref: process.env.GITHUB_REF,
          triggeringActor: process.env.GITHUB_TRIGGERING_ACTOR,
        })
      : await configureRepository(context);
    console.log(JSON.stringify(result));
  } catch (error) {
    // The new privileged mode never serializes provider/transport/assertion bodies.
    console.error(
      process.env.CLINICOS_RESTRICT_DEMO_ENVIRONMENT === 'true'
        ? 'Demo environment restriction blocked; no provider details are printed'
        : `Repository configuration blocked: ${error.message}`,
    );
    process.exitCode = 1;
  }
}
