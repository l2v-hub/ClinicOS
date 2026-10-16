#!/usr/bin/env node
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const REPO = 'l2v-hub/ClinicOS';
const NAME = 'ClinicOS Codex: bug-pipeline-tests';
const CHECK = 'bug-pipeline-tests';

export async function configureRepository({ request, actor, expectedSha, actualSha }) {
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/);
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
  await request('GET', `${base}/branches/main`);
  const rulesets = [];
  for (let page = 1; ; page++) {
    const records = await request('GET', `${base}/rulesets?per_page=100&page=${page}`);
    assert.ok(Array.isArray(records), 'Invalid ruleset list');
    rulesets.push(...records);
    if (records.length < 100) break;
    assert.ok(page < 100, 'Ruleset pagination exceeded its safety bound');
  }
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
  let gate = rules.find((rule) => rule.type === 'required_status_checks');
  if (!gate) {
    gate = {
      type: 'required_status_checks',
      parameters: { required_status_checks: [], strict_required_status_checks_policy: false },
    };
    rules.push(gate);
  }
  const prior = gate.parameters.required_status_checks.find((check) => check.context === CHECK);
  if (prior)
    assert.equal(
      prior.integration_id,
      15368,
      'Inspect a differently bound check before changing it',
    );
  else gate.parameters.required_status_checks.push({ context: CHECK, integration_id: 15368 });

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
  } else if (!prior) {
    await request('PUT', `${base}/rulesets/${existing.id}`, { rules });
  }
  const verifiedSettings = await request('GET', `${base}/actions/permissions/workflow`);
  assert.equal(verifiedSettings.can_approve_pull_request_reviews, true);
  assert.equal(
    verifiedSettings.default_workflow_permissions,
    settings.default_workflow_permissions,
  );
  const effective = await request('GET', `${base}/rules/branches/main`);
  assert.ok(
    effective.some(
      (rule) =>
        rule.type === 'required_status_checks' &&
        rule.ruleset_id === existing.id &&
        rule.parameters.required_status_checks.some(
          (check) => check.context === CHECK && check.integration_id === 15368,
        ),
    ),
    'The required Actions check is not effective on main',
  );
  return {
    status: 'verified',
    repository: REPO,
    approvePullRequests: true,
    requiredCheck: CHECK,
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
