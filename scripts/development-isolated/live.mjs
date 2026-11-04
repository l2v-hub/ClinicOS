import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  createRailwayClient,
  fetchJson,
  serializeDemoMetadata,
} from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import {
  APP,
  TARGET,
  SERVICES,
  ENVIRONMENT,
  REPOSITORY,
  SHA,
  sourcePatch,
  request,
  validateContext,
  validateReleaseProof,
  validateInventory,
  hash,
} from './policy.mjs';
import { execute } from './controller.mjs';
import { verifyNativeReviews } from './native-proof.mjs';

const ROOT = `https://api.github.com/repos/${REPOSITORY}`;
const INVENTORY = `query($projectId:String!,$environmentId:String!){
 projectToken{project{id} environment{id name}}
 environment(id:$environmentId,projectId:$projectId){id projectId name isEphemeral
 deploymentTriggers(first:100){pageInfo{hasNextPage} edges{node{id}}}
 serviceInstances(first:100){pageInfo{hasNextPage} edges{node{
 serviceId environmentId source{repo image}
 activeDeployments{id status} latestDeployment{id status}}}}}
}`;
const PATCHES = `query($environmentId:String!){environmentPatches(environmentId:$environmentId,first:100){
 pageInfo{hasNextPage} edges{node{id environmentId status patch}}}}`;
const VARS = `query($projectId:String!,$environmentId:String!,$serviceId:String!){
 variables(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId)}`;
const DEPLOY = `mutation($environmentId:String!,$serviceId:String!,$commitSha:String){
 serviceInstanceDeployV2(environmentId:$environmentId,serviceId:$serviceId,commitSha:$commitSha)}`;
const ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function githubClient(token, fetchImpl = fetch) {
  assert.ok(typeof token === 'string' && token.length > 0);
  return async (route, method = 'GET', body) => {
    assert.ok(/^\/[A-Za-z0-9_%./?=&-]+$/.test(route) && !route.includes('..'));
    assert.ok(['GET', 'POST'].includes(method));
    return fetchJson(ROOT + route, {
      fetchImpl,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
}

export function credentialAliases(env) {
  return [env.GITHUB_TOKEN, env.RAILWAY_DEVELOPMENT_TOKEN].flatMap((raw) => {
    assert.ok(typeof raw === 'string' && raw.length > 0 && !/[\x00-\x1f\x7f]/.test(raw));
    return [raw, new Headers({ authorization: raw }).get('authorization')];
  });
}
export function liveHost({ env, gh, gatePr, provider, nativeReviews = verifyNativeReviews }) {
  assert.match(String(gatePr), /^[1-9][0-9]{0,7}$/);
  const host = {
    async requireWriteAuthority() {
      throw new Error('DEVELOPMENT_TRUSTED_USER_ACTION_VERIFIER_NOT_CONNECTED');
    },
    async authorize(req, reservation) {
      validateContext(env, req);
      await nativeReviews(req, Number(gatePr), env);
      const [main, pr, reviews, app, merged] = await Promise.all([
        gh('/git/ref/heads/main'),
        gh(`/pulls/${gatePr}`),
        gh(`/pulls/${gatePr}/reviews?per_page=100`),
        gh(`/git/commits/${APP.sha}`),
        gh(`/git/commits/${req.workflowSha}`),
      ]);
      assert.ok(Array.isArray(reviews) && reviews.length < 100);
      assert.match(pr.head?.sha ?? '', SHA);
      const [head, checks] = await Promise.all([
        gh(`/git/commits/${pr.head.sha}`),
        gh(`/commits/${pr.head.sha}/check-runs?per_page=100`),
      ]);
      const approver = validateReleaseProof(
        {
          pr,
          reviews,
          checks,
          mainSha: main.object?.sha,
          appTree: app.tree?.sha,
          workflowTree: merged.tree?.sha,
          reviewedTree: head.tree?.sha,
        },
        req,
      );
      assert.notEqual(approver, env.GITHUB_ACTOR);
      assert.match(approver, /^[A-Za-z0-9-]{1,39}$/);
      const permission = await gh(`/collaborators/${approver}/permission`);
      assert.ok(['admin', 'maintain', 'write'].includes(permission.permission));
      if (reservation) {
        const actual = await gh(`/deployments/${reservation.id}`);
        assert.equal(actual.sha, req.workflowSha);
        assert.equal(actual.environment, ENVIRONMENT);
        assert.deepEqual(actual.payload, reservation.payload);
        const states = await gh(`/deployments/${reservation.id}/statuses?per_page=100`);
        assert.ok(
          Array.isArray(states) && states.length === 1 && states[0].state === 'in_progress',
        );
      }
    },
    async reserve(req, preflight) {
      const previous = await gh(
        `/deployments?environment=${encodeURIComponent(ENVIRONMENT)}&per_page=100`,
      );
      assert.ok(Array.isArray(previous) && previous.length < 100);
      for (const deployment of previous) {
        const statuses = await gh(`/deployments/${deployment.id}/statuses?per_page=100`);
        assert.ok(Array.isArray(statuses) && statuses.length > 0 && statuses.length < 100);
        assert.equal(
          statuses[0].state,
          'success',
          'Unknown or failed operations require independent reconciliation',
        );
        assert.notEqual(
          deployment.payload?.dispatchId,
          req.dispatchId,
          'Dispatch cannot be replayed',
        );
      }
      const payload = {
        dispatchId: req.dispatchId,
        action: req.action,
        serviceId: req.serviceId,
        appSha: APP.sha,
        preflightDigest: hash(preflight),
        runId: env.GITHUB_RUN_ID,
      };
      const deployment = await gh('/deployments', 'POST', {
        ref: req.workflowSha,
        auto_merge: false,
        // Required checks are independently authenticated against the reviewed PR head.
        required_contexts: [],
        environment: ENVIRONMENT,
        production_environment: false,
        transient_environment: false,
        payload,
      });
      assert.ok(Number.isSafeInteger(deployment.id) && deployment.id > 0);
      await gh(`/deployments/${deployment.id}/statuses`, 'POST', {
        state: 'in_progress',
        auto_inactive: false,
        description: 'Reserved; uncertain results must be reconciled without retry',
      });
      return { id: deployment.id, payload };
    },
    async unknown() {
      /* Keep the native in_progress reservation; never mark failure retryable. */
    },
    async complete(reservation, receipt) {
      const bytes = serializeDemoMetadata(receipt, { forbiddenValues: credentialAliases(env) });
      await writeFile('development-release-receipt.json', bytes, { flag: 'wx', mode: 0o600 });
      await gh(`/deployments/${reservation.id}/statuses`, 'POST', {
        state: 'success',
        auto_inactive: false,
        description: `Verified receipt sha256:${hash(receipt)}`,
      });
    },
    async validateConfiguration(req) {
      await provider.validateConfiguration(req);
    },
  };
  return host;
}

export function liveProvider(
  client,
  { sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now } = {},
) {
  const variables = async (serviceId) => (await client(VARS, { ...TARGET, serviceId })).variables;
  const provider = {
    async requireAtomicEffect() {
      throw new Error('DEVELOPMENT_PROVIDER_ATOMIC_EFFECT_NOT_QUALIFIED');
    },
    inspect: (req) =>
      client(INVENTORY, { projectId: req.projectId, environmentId: req.environmentId }),
    async patches(req) {
      const value = (await client(PATCHES, { environmentId: req.environmentId }))
        .environmentPatches;
      assert.ok(value && Array.isArray(value.edges));
      assert.ok(value.edges.every(({ node }) => node.environmentId === req.environmentId));
      return value;
    },
    async stage(req, patch) {
      const value = await client(
        `mutation($environmentId:String!,$input:EnvironmentConfig!){
        environmentStageChanges(environmentId:$environmentId,input:$input,merge:false){id environmentId status patch}}`,
        { environmentId: req.environmentId, input: patch },
      );
      return value.environmentStageChanges;
    },
    async commit(req, patchId, options) {
      assert.equal(options.skipDeploys, true);
      // The API commits the environment's current staged patch, not a patch ID.
      // Recheck immediately; this remains a disclosed cross-request race window.
      const p = await provider.patches(req);
      const staged = p.edges.filter(({ node }) => node.status === 'STAGED');
      assert.equal(staged.length, 1);
      assert.equal(staged[0].node.id, patchId);
      assert.deepEqual(staged[0].node.patch, sourcePatch(req.service));
      const operationId = (
        await client(
          `mutation($environmentId:String!){environmentPatchCommitStaged(
        environmentId:$environmentId,skipDeploys:true,commitMessage:"ClinicOS isolated development source binding")}`,
          { environmentId: req.environmentId },
        )
      ).environmentPatchCommitStaged;
      return { patchId, operationId };
    },
    async deploy(req, commitSha) {
      const result = await client(DEPLOY, {
        environmentId: req.environmentId,
        serviceId: req.serviceId,
        commitSha,
      });
      return result.serviceInstanceDeployV2;
    },
    async validateConfiguration(req) {
      let backend, database, runtime;
      try {
        [backend, database, runtime] = await Promise.all([
          variables(SERVICES.backend),
          variables(SERVICES.database),
          variables(SERVICES.runtime),
        ]);
        assert.equal(backend.RAILWAY_PROJECT_ID, TARGET.projectId);
        assert.equal(database.RAILWAY_ENVIRONMENT_ID, TARGET.environmentId);
        assert.equal(runtime.RAILWAY_ENVIRONMENT_ID, TARGET.environmentId);
        const a = new URL(backend.DATABASE_URL),
          b = new URL(database.DATABASE_URL);
        assert.ok(['postgres:', 'postgresql:'].includes(a.protocol));
        assert.equal(a.hostname, database.RAILWAY_PRIVATE_DOMAIN);
        assert.equal(a.href, b.href);
        assert.equal(backend.NODE_ENV, 'production');
        assert.equal(backend.CLINICOS_ENV, 'demo');
        assert.equal(backend.AUTH_MODE, 'demo');
        assert.equal(backend.DEMO_DATASET_ID, 'synthetic-v1');
        for (const key of [
          'DEMO_AUTH_NO_EXPIRY',
          'ALLOW_PRODUCTION_DEMO_AUTH',
          'ROLE_SIMULATOR_ENABLED',
          'ROLE_SIMULATOR_ALLOW_PRODUCTION',
        ])
          assert.equal(backend[key], 'true');
        assert.ok(
          typeof backend.ROLE_SIMULATOR_SECRET === 'string' &&
            backend.ROLE_SIMULATOR_SECRET.length >= 32,
        );
        assert.notEqual(backend.AUTHZ_ENFORCEMENT, 'off');
        assert.equal(backend.AUTHZ_UNMAPPED_ROUTES, 'deny');
        const ai = new URL(backend.AI_RUNTIME_URL);
        assert.equal(ai.hostname, runtime.RAILWAY_PRIVATE_DOMAIN);
        // Only same-environment reference bindings are accepted. Never print/hash these objects.
        assert.ok(backend.FRONTEND_URL && new URL(backend.FRONTEND_URL).protocol === 'https:');
      } catch {
        throw new Error('DEVELOPMENT_CONFIGURATION_NOT_ATTESTED');
      } finally {
        backend = database = runtime = undefined;
      }
    },
    async verify(req, result, before) {
      if (req.action === 'stage-source') {
        assert.ok(ID.test(result?.id ?? ''));
        assert.equal(result.environmentId, req.environmentId);
        assert.equal(result.status, 'STAGED');
        assert.deepEqual(result.patch, sourcePatch(req.service));
        assert.deepEqual(
          await provider.inspect(req),
          before,
          'Staging must not deploy or alter live bindings',
        );
        return { patchId: result.id, sourceSha: APP.sha, deploymentSubmitted: false };
      }
      if (req.action === 'commit-source') {
        assert.ok(ID.test(result?.patchId ?? '') && ID.test(result.operationId ?? ''));
        const snapshot = await provider.inspect(req);
        validateInventory(snapshot, req);
        const rows = snapshot.environment.serviceInstances.edges;
        const old = before.environment.serviceInstances.edges;
        for (const { node } of rows) {
          const prior = old.find((r) => r.node.serviceId === node.serviceId).node;
          assert.deepEqual(node.activeDeployments, prior.activeDeployments);
          assert.deepEqual(node.latestDeployment, prior.latestDeployment);
        }
        const patch = await client(
          `query($id:String!){environmentPatch(id:$id){id environmentId status patch}}`,
          { id: result.patchId },
        );
        assert.equal(patch.environmentPatch.environmentId, req.environmentId);
        assert.equal(patch.environmentPatch.status, 'COMMITTED');
        assert.deepEqual(patch.environmentPatch.patch, sourcePatch(req.service));
        return {
          patchId: result.patchId,
          operationId: result.operationId,
          sourceSha: APP.sha,
          deploymentSubmitted: false,
        };
      }
      assert.ok(ID.test(result ?? ''));
      const deadline = now() + 20 * 60_000;
      while (now() < deadline) {
        const value = (
          await client(
            `query($id:String!){deployment(id:$id){id status projectId environmentId serviceId meta}}`,
            { id: result },
          )
        ).deployment;
        assert.equal(value?.id, result);
        assert.equal(value.projectId, TARGET.projectId);
        assert.equal(value.environmentId, TARGET.environmentId);
        assert.equal(value.serviceId, req.serviceId);
        if (value.status === 'SUCCESS') {
          assert.equal(value.meta?.commitHash, APP.sha);
          const row = validateInventory(await provider.inspect(req), req);
          assert.deepEqual(row.activeDeployments, [{ id: result, status: 'SUCCESS' }]);
          return {
            deploymentId: result,
            status: 'SUCCESS',
            commitSha: APP.sha,
            buildDigest: null,
            readiness: 'not-proven',
            migrationDelta: 'unproven',
          };
        }
        assert.ok(!['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED'].includes(value.status));
        await sleep(5_000);
      }
      throw new Error('DEVELOPMENT_DEPLOYMENT_PROOF_TIMEOUT');
    },
  };
  return provider;
}

export async function main(env = process.env) {
  const req = request({
    action: env.DEVELOPMENT_OPERATION,
    service: env.DEVELOPMENT_SERVICE,
    dispatchId: env.DEVELOPMENT_DISPATCH_ID,
    workflowSha: env.DEVELOPMENT_WORKFLOW_SHA,
  });
  validateContext(env, req);
  credentialAliases(env);
  assert.ok(
    env.RAILWAY_DEVELOPMENT_TOKEN && !env.RAILWAY_TOKEN && !env.RAILWAY_API_TOKEN,
    'Only the dedicated development project credential may be present',
  );
  const gh = githubClient(env.GITHUB_TOKEN);
  const provider = liveProvider(createRailwayClient({ token: env.RAILWAY_DEVELOPMENT_TOKEN }));
  const host = liveHost({ env, gh, gatePr: env.DEVELOPMENT_GATE_PR, provider });
  const receipt = await execute({ req, host, provider });
  if (req.action === 'preflight')
    await writeFile(
      'development-preflight-receipt.json',
      serializeDemoMetadata(receipt, { forbiddenValues: credentialAliases(env) }),
      { flag: 'wx', mode: 0o600 },
    );
  console.log('DEVELOPMENT_OPERATION_VERIFIED');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error('DEVELOPMENT_OPERATION_BLOCKED_OR_UNKNOWN');
    process.exitCode = 1;
  });
