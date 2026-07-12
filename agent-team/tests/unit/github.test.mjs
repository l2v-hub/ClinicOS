import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubAdapter } from '../../src/adapters/github.mjs';

test('GitHub adapter passes labels as argv and never constructs a shell string', async () => {
  const calls = [];
  const run = async (call) => { calls.push(call); return { ok: true, code: 0, stdout: '[]', stderr: '', error: null }; };
  const github = createGitHubAdapter({ run, config: { repository: 'l2v-hub/ClinicOS', commandTimeoutMs: 1000, maxOutputBytes: 1000 } });
  await github.listIssuesByLabels(['ready-for-dev', 'assigned-to-claude']);
  assert.deepEqual(calls[0].args.slice(0, 4), ['issue', 'list', '--repo', 'l2v-hub/ClinicOS']);
  assert.equal(calls[0].args.includes('ready-for-dev,assigned-to-claude'), true);
});
