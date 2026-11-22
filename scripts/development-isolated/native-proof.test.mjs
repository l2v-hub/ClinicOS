import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyNativeReviews, readOnlyRunner } from './native-proof.mjs';
import { APP } from './policy.mjs';

test('unadopted, duplicate or unmerged gate cannot borrow the application review', async () => {
  for (const subjects of [
    [],
    [{ pr: { number: 526 } }],
    [{ pr: { number: 526 } }, { pr: { number: 526 } }],
    [{ pr: { number: 525 }, release: { mergeSha: APP.sha, reviewProof: {} } }],
  ]) {
    const github = {
      createStateStore: () => ({
        load: async () => ({ repository: 'l2v-hub/ClinicOS', standaloneReviews: subjects }),
      }),
    };
    await assert.rejects(verifyNativeReviews({ workflowSha: 'a'.repeat(40) }, 526, {}, { github }));
  }
});
test('native missing-branch path cannot issue the attempted initialization POST', async () => {
  let calls = 0;
  const run = async () => {
    calls++;
    return { ok: false, code: 1, stdout: '', stderr: 'HTTP 404' };
  };
  await assert.rejects(verifyNativeReviews({ workflowSha: 'a'.repeat(40) }, 526, {}, { run }));
  assert.equal(calls, 2);
});
test('proof runner rejects mutations with a broad local token too', async () => {
  let calls = 0;
  const run = readOnlyRunner(async () => {
    calls++;
  });
  for (const call of [
    { command: 'gh', args: ['api', 'repos/l2v-hub/ClinicOS/git/refs', '-X', 'POST'] },
    { command: 'gh', args: ['api', 'graphql'], input: 'mutation' },
    { command: 'gh', args: ['pr', 'merge', '526'] },
  ])
    await assert.rejects(run(call));
  assert.equal(calls, 0);
});
test('a divergent GH_TOKEN cannot change the native proof reader identity', async () => {
  let calls = 0;
  await assert.rejects(
    verifyNativeReviews(
      { workflowSha: 'a'.repeat(40) },
      526,
      { GH_TOKEN: 'other', GITHUB_TOKEN: 'expected' },
      {
        run: async () => {
          calls++;
        },
      },
    ),
  );
  assert.equal(calls, 0);
});
test('the exact native review-thread query remains read-only and usable', async () => {
  let calls = 0;
  const run = readOnlyRunner(async () => {
    calls++;
    return { ok: true };
  });
  await run({
    command: 'gh',
    args: [
      'api',
      'graphql',
      '-f',
      'query=query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){pageInfo{hasNextPage} nodes{isResolved}}}}}',
      '-F',
      'owner=l2v-hub',
      '-F',
      'name=ClinicOS',
      '-F',
      'number=525',
    ],
  });
  assert.equal(calls, 1);
});
for (const tail of [
  ['--method', 'POST'],
  ['-f', 'x=y'],
  ['-F', 'x=true'],
  ['-X', 'GET', '-X', 'POST'],
  ['--input', '-'],
]) {
  test(`REST read-only boundary rejects ${tail.join(' ')}`, async () => {
    let calls = 0;
    const run = readOnlyRunner(async () => {
      calls++;
    });
    await assert.rejects(
      run({ command: 'gh', args: ['api', 'repos/l2v-hub/ClinicOS/git/refs', ...tail] }),
    );
    assert.equal(calls, 0);
  });
}
