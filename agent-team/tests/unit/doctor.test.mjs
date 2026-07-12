import test from 'node:test';
import assert from 'node:assert/strict';
import { runDoctor } from '../../src/commands/doctor.mjs';

const config = { repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main' };
const result = (stdout, code = 0) => ({ ok: code === 0, code, stdout, stderr: '', error: null });

test('doctor marks development unavailable when Claude is unauthenticated', async () => {
  const run = async ({ command, args }) => {
    const key = `${command} ${args.join(' ')}`;
    if (key === 'claude auth status') return result('{"loggedIn":false}', 1);
    if (key === 'codex login status') return result('Logged in using ChatGPT');
    return result(key.includes('remote get-url') ? 'https://github.com/l2v-hub/ClinicOS.git' : 'ok');
  };
  const doctor = await runDoctor({ config, run, isSupervisorLive: async () => false });
  assert.equal(doctor.developmentReady, false);
  assert.equal(doctor.qaReady, true);
  assert.equal(doctor.ok, false);
});

test('doctor accepts Codex login confirmation printed to stderr', async () => {
  // Real installed behavior (Codex CLI 0.144.x): `codex login status` exits 0 and
  // writes "Logged in using ChatGPT" to stderr, not stdout.
  const run = async ({ command, args }) => {
    const key = `${command} ${args.join(' ')}`;
    if (key === 'codex login status') return { ok: true, code: 0, stdout: '', stderr: 'Logged in using ChatGPT\n', error: null };
    if (key === 'claude auth status') return result('{"loggedIn":true}');
    return result(key.includes('remote get-url') ? 'https://github.com/l2v-hub/ClinicOS.git' : 'ok');
  };
  const doctor = await runDoctor({ config, run, isSupervisorLive: async () => false });
  assert.equal(doctor.checks.find((check) => check.id === 'codex-auth').ok, true);
  assert.equal(doctor.qaReady, true);
});

test('doctor refuses a duplicate local supervisor', async () => {
  const run = async () => result('{"loggedIn":true}');
  const doctor = await runDoctor({ config, run, isSupervisorLive: async () => true });
  assert.equal(doctor.checks.find((check) => check.id === 'duplicate-supervisor').ok, false);
});
