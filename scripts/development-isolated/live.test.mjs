import test from 'node:test';
import assert from 'node:assert/strict';
import { githubClient, liveHost, liveProvider, credentialAliases } from './live.mjs';
import { request, APP, TARGET, WORKFLOW } from './policy.mjs';
import { serializeDemoMetadata } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { execute } from './controller.mjs';

const W = 'a'.repeat(40);
const req = (action = 'preflight') =>
  request({
    action,
    service: 'backend',
    workflowSha: W,
    dispatchId: 'bcff0957-d503-4e26-8a52-70ff3e3fc016',
  });
const env = {
  GITHUB_REPOSITORY: 'l2v-hub/ClinicOS',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: W,
  GITHUB_WORKFLOW_SHA: W,
  GITHUB_WORKFLOW_REF: `l2v-hub/ClinicOS/${WORKFLOW}@refs/heads/main`,
  GITHUB_RUN_ATTEMPT: '1',
  GITHUB_ACTOR: 'author',
  GITHUB_TRIGGERING_ACTOR: 'author',
  GITHUB_TOKEN: ' github-fixture ',
  RAILWAY_DEVELOPMENT_TOKEN: ' railway-fixture ',
};

test('normalized credential aliases cannot appear in serialized artifacts', () => {
  const aliases = credentialAliases(env);
  assert.ok(aliases.includes('github-fixture') && aliases.includes('railway-fixture'));
  for (const alias of aliases)
    assert.throws(() => serializeDemoMetadata({ value: alias }, { forbiddenValues: aliases }));
});
for (const raw of ['', 'token\n', 'token\x00', undefined])
  test(`reject malformed credential ${JSON.stringify(raw)}`, () =>
    assert.throws(() => credentialAliases({ ...env, GITHUB_TOKEN: raw })));

test('GitHub transport is fixed origin, rejects redirects and bounds HTTP failures', async () => {
  let calls = 0;
  const gh = githubClient('fake', async (url, options) => {
    calls++;
    assert.ok(url.startsWith('https://api.github.com/repos/l2v-hub/ClinicOS/'));
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer fake');
    return new Response('{"ok":true}', { status: 200 });
  });
  assert.deepEqual(await gh('/git/ref/heads/main'), { ok: true });
  await assert.rejects(gh('/../../other/repo'));
  await assert.rejects(gh('https://attacker.invalid'));
  assert.equal(calls, 1);
});
test('native Max and final Codex provenance are required before provider reads', async () => {
  let providerCalls = 0,
    githubCalls = 0;
  const host = liveHost({
    env,
    gatePr: 526,
    provider: {},
    gh: async () => {
      githubCalls++;
      throw Error('unexpected');
    },
    nativeReviews: async () => {
      throw Error('Native review proof missing');
    },
  });
  await assert.rejects(
    execute({
      req: req(),
      host,
      provider: {
        inspect: async () => {
          providerCalls++;
        },
      },
    }),
  );
  assert.equal(githubCalls, 0);
  assert.equal(providerCalls, 0);
});
test('a workflow rerun is rejected before provenance and provider access', async () => {
  let calls = 0;
  const host = liveHost({
    env: { ...env, GITHUB_RUN_ATTEMPT: '2' },
    gatePr: 526,
    provider: {},
    gh: async () => {
      calls++;
    },
    nativeReviews: async () => {
      calls++;
    },
  });
  await assert.rejects(host.authorize(req()));
  assert.equal(calls, 0);
});
test('live writes are disabled until real host authority and atomic provider effects qualify', async () => {
  let calls = 0;
  const provider = liveProvider(async () => {
    calls++;
  });
  const host = liveHost({
    env,
    gatePr: 526,
    provider,
    gh: async () => {},
    nativeReviews: async () => {},
  });
  await assert.rejects(host.requireWriteAuthority(req('stage-source')), {
    message: 'DEVELOPMENT_TRUSTED_USER_ACTION_VERIFIER_NOT_CONNECTED',
  });
  for (const action of ['stage-source', 'commit-source', 'deploy'])
    await assert.rejects(provider.requireAtomicEffect(req(action)), {
      message: 'DEVELOPMENT_PROVIDER_ATOMIC_EFFECT_NOT_QUALIFIED',
    });
  assert.equal(calls, 0);
});
test('live stage operation contains only exact target and pinned application source', async () => {
  const calls = [];
  const provider = liveProvider(async (query, variables) => {
    calls.push({ query, variables });
    return { environmentStageChanges: { id: 'fixture' } };
  });
  const { sourcePatch } = await import('./policy.mjs');
  await provider.stage(req('stage-source'), sourcePatch('backend'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].variables.environmentId, TARGET.environmentId);
  const source = Object.values(calls[0].variables.input.services)[0].source;
  assert.equal(source.commitSha, APP.sha);
  assert.equal(source.branch, null);
  assert.ok(calls[0].query.includes('merge:false'));
});
test('provider failures in configuration validation never reflect variable values', async () => {
  const secret = 'fixture-secret-never-reflect';
  const provider = liveProvider(async () => ({ variables: { DATABASE_URL: secret } }));
  await assert.rejects(provider.validateConfiguration(req('deploy')), {
    message: 'DEVELOPMENT_CONFIGURATION_NOT_ATTESTED',
  });
});
