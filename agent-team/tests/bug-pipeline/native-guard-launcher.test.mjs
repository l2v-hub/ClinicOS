import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nativeGuardArguments,
  parseNativeBootstrap,
  nativeGuardEnvironment,
  assertNoMachinePolicy,
} from '../../src/bug-pipeline/native-guard-launcher.mjs';
const input = {
  oauthToken: 'synthetic-only-test-token',
  model: 'claude-opus-4-6',
  schema: { type: 'object' },
  input: 'UNTRUSTED synthetic source',
  outputCap: 32768,
};
test('fixed native arguments keep official provider and only one turn', () => {
  const a = nativeGuardArguments(input);
  assert.equal(a[a.indexOf('--max-turns') + 1], '1');
  assert.ok(a.includes('--debug-to-stderr'));
  assert.equal(a[a.indexOf('--tools') + 1], '');
  assert.ok(!a.some((x) => x.includes(input.oauthToken)));
  assert.ok(!a.includes('--dangerously-skip-permissions'));
  const settings = JSON.parse(a[a.indexOf('--settings') + 1]);
  assert.equal(settings.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '32768');
  assert.equal(settings.env.DISABLE_COMPACT, '1');
});
test('bootstrap rejects arbitrary commands, env, extra keys and unsafe models', () => {
  assert.deepEqual(parseNativeBootstrap(Buffer.from(JSON.stringify(input))), input);
  for (const bad of [
    { ...input, command: 'sh' },
    { ...input, env: {} },
    { ...input, model: 'opus' },
    { ...input, outputCap: 128000 },
  ])
    assert.throws(() => parseNativeBootstrap(Buffer.from(JSON.stringify(bad))));
  assert.throws(() =>
    parseNativeBootstrap(
      Buffer.from(
        JSON.stringify(input).replace('"outputCap":32768', '"outputCap":128000,"outputCap":32768'),
      ),
    ),
  );
  assert.throws(() =>
    parseNativeBootstrap(Buffer.from(JSON.stringify({ ...input, input: '\ud800' }))),
  );
});
test('managed path absence is checked; present, unreadable and unknown errors fail closed', async () => {
  let seen = [];
  await assertNoMachinePolicy({
    stat: async (p) => {
      seen.push(p);
      throw Object.assign(Error('absent'), { code: 'ENOENT' });
    },
  });
  assert.equal(seen.length, 3);
  for (const stat of [
    async () => ({ isFile: () => true }),
    async () => {
      throw Object.assign(Error('private-path'), { code: 'EACCES' });
    },
    async () => {
      throw Error('unknown');
    },
  ])
    await assert.rejects(assertNoMachinePolicy({ stat }), {
      message: 'native-managed-policy-not-absent',
    });
});
test('native environment cannot inherit controller/provider credentials', () => {
  const e = nativeGuardEnvironment(input.oauthToken);
  assert.deepEqual(
    Object.keys(e).filter((k) => /TOKEN|KEY/.test(k)),
    ['CLAUDE_CODE_OAUTH_TOKEN'],
  );
  assert.equal(e.HTTPS_PROXY, 'http://127.0.0.1:43193');
  assert.equal(e.NODE_EXTRA_CA_CERTS, '/guard/public-ca.pem');
  assert.equal(e.HOME, '/tmp/native-home');
  assert.equal(e.ANTHROPIC_BASE_URL, undefined);
});
