import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createGitHub } from '../../agent-team/src/bug-pipeline/github.mjs';
import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { verifyMergedReleaseProof } from '../../agent-team/src/bug-pipeline/release.mjs';
import { REPOSITORY, APP } from './policy.mjs';

const THREAD_QUERY =
  'query=query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){pageInfo{hasNextPage} nodes{isResolved}}}}}';

export function readOnlyRunner(run) {
  return async (call) => {
    assert.equal(call.command, 'gh');
    const args = call.args ?? [];
    assert.equal(args[0], 'api');
    {
      if (args[1] === 'graphql') {
        assert.equal(call.input, undefined);
        assert.deepEqual(args.slice(0, 9), [
          'api',
          'graphql',
          '-f',
          THREAD_QUERY,
          '-F',
          'owner=l2v-hub',
          '-F',
          'name=ClinicOS',
          '-F',
        ]);
        assert.equal(args.length, 10);
        assert.match(args[9], /^number=[1-9][0-9]*$/);
        return run(call);
      }
      assert.equal(call.input, undefined);
      assert.ok(
        args[1] === 'user' || /^repos\/l2v-hub\/ClinicOS\/[A-Za-z0-9._/?=&%+-]+$/.test(args[1]),
      );
      assert.ok(!args[1].includes('..'));
      const tail = args.slice(2);
      assert.ok(
        tail.length === 0 ||
          JSON.stringify(tail) === JSON.stringify(['--paginate', '--slurp']) ||
          JSON.stringify(tail) === JSON.stringify(['-X', 'GET']),
        'Only exact read-only REST argument forms are admitted',
      );
    }
    return run(call);
  };
}

// Read-only consumer of the existing native review ledger. The workflow token has
// contents:read, so this process cannot initialize or change its branch/file.
// Historical application approval is distinct from approval of the new gate.
export async function verifyNativeReviews(req, gatePr, env = process.env, dependencies = {}) {
  assert.ok(!env.GH_TOKEN || env.GH_TOKEN === env.GITHUB_TOKEN, 'Divergent GitHub credentials');
  const run = readOnlyRunner(
    dependencies.run ??
      createRunner({
        env: { ...env, PATH: env.PATH ?? env.Path, GH_TOKEN: env.GITHUB_TOKEN },
        runtimeRoot: path.join(os.tmpdir(), 'clinicos-development-proof-reader'),
      }),
  );
  const github = dependencies.github ?? createGitHub({ cwd: process.cwd(), repo: REPOSITORY, run });
  const state = await github.createStateStore().load();
  assert.equal(state?.repository, REPOSITORY);
  for (const [pr, mergeSha] of [
    [gatePr, req.workflowSha],
    [525, APP.sha],
  ]) {
    const matches = state.standaloneReviews.filter((s) => s.pr?.number === pr);
    assert.equal(matches.length, 1, 'One canonical standalone review owner required');
    const subject = matches[0];
    assert.equal(subject.release?.mergeSha, mergeSha);
    assert.ok(subject.release?.reviewProof, 'Native Max and final Codex proof required');
    await verifyMergedReleaseProof({
      state,
      subject,
      github,
      repository: REPOSITORY,
      collection: 'standaloneReviews',
    });
  }
}
