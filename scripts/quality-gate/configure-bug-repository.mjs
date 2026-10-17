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
        throw new Error(
          `GitHub ${method} ${route}: HTTP ${response.status}; ${reason}; repository Administration write access is required`,
        );
      }
      return response.status === 204 ? null : response.json();
    };
    const result = await configureRepository({
      request,
      actor: process.env.GITHUB_ACTOR,
      expectedSha: process.env.CLINICOS_REVIEWED_SHA,
      actualSha: process.env.GITHUB_SHA,
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Repository configuration blocked: ${error.message}`);
    process.exitCode = 1;
  }
}
