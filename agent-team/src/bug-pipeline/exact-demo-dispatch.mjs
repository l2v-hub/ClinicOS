import { randomUUID } from 'node:crypto';
import { DEMO_SOURCE_POLICIES, validateReceipt } from './demo-deployment.mjs';

const REPO = 'l2v-hub/ClinicOS';
const WORKFLOW = '.github/workflows/deploy-demo-exact-commit.yml';
const ROUTE = `repos/${REPO}/actions/workflows/deploy-demo-exact-commit.yml/dispatches`;
const SHA = /^[a-f0-9]{40}(?![\s\S])/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}(?![\s\S])/;
const integer = (n) => Number.isSafeInteger(n) && n > 0;
const fail = (message) => {
  throw new Error(`Exact demo dispatch blocked: ${message}`);
};
const title = (p) => `demo-exact ${p.operation} ${p.sha} ${p.dispatchId}`;

function validateRun(run, progress) {
  if (
    !integer(run?.id) ||
    run.run_attempt !== 1 ||
    run.head_sha !== progress.sha ||
    run.repository?.full_name !== REPO ||
    run.head_repository?.full_name !== REPO ||
    run.path !== WORKFLOW ||
    run.event !== 'workflow_dispatch' ||
    run.head_branch !== 'main' ||
    run.display_title !== title(progress) ||
    progress.priorRunIds.includes(run.id) ||
    (progress.runId !== undefined && run.id !== progress.runId)
  )
    fail('run identity mismatch');
}

// This adapter has one literal dispatch endpoint, a fixed main ref and bounded output.
// A successful POST only acknowledges submission; ensure() requires the actual run and receipt.
export function createExactDispatchPoster({ run, cwd }) {
  return async (body) => {
    if (
      body?.ref !== 'main' ||
      !SHA.test(body.inputs?.reviewed_sha ?? '') ||
      !['preflight', 'deploy'].includes(body.inputs?.operation) ||
      !UUID.test(body.inputs?.dispatch_id ?? '') ||
      Object.keys(body).sort().join(',') !== 'inputs,ref' ||
      Object.keys(body.inputs).sort().join(',') !== 'dispatch_id,operation,reviewed_sha'
    )
      fail('fixed main dispatch inputs required');
    const result = await run({
      command: 'gh',
      args: ['api', ROUTE, '-X', 'POST', '--input', '-'],
      input: JSON.stringify(body),
      cwd,
      timeoutMs: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    if (!result?.ok || result.stdout.trim() !== '')
      fail('dispatch acknowledgement uncertain; intent retained');
  };
}

export function createExactDemoDispatcher({
  reader,
  postDispatch,
  now = Date.now,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  newId = randomUUID,
  timeoutMs = 45 * 60_000,
  pollMs = 10_000,
} = {}) {
  if (
    !reader?.getJson ||
    !reader?.artifact ||
    typeof postDispatch !== 'function' ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 45 * 60_000 ||
    !Number.isFinite(pollMs) ||
    pollMs <= 0
  )
    throw new TypeError('bounded exact dispatcher dependencies required');
  const currentMain = async (expected) => {
    const head = await reader.getJson('commits/main');
    if (!SHA.test(head?.sha ?? '') || (expected !== undefined && head.sha !== expected))
      fail('current main changed');
    return head.sha;
  };
  const runs = async (sha) => {
    const list = await reader.getJson(
      `actions/workflows/deploy-demo-exact-commit.yml/runs?branch=main&event=workflow_dispatch&head_sha=${sha}&per_page=100`,
    );
    if (
      !Array.isArray(list?.workflow_runs) ||
      !Number.isSafeInteger(list.total_count) ||
      list.total_count < 0 ||
      list.total_count > 100 ||
      list.workflow_runs.length !== list.total_count ||
      list.workflow_runs.some((run) => !integer(run?.id))
    )
      fail('bounded complete run inventory unavailable');
    return list.workflow_runs;
  };
  return {
    async ensure({ operation, expectedSha, progress, saveProgress, guard = async () => {} }) {
      if (
        !['preflight', 'deploy'].includes(operation) ||
        (expectedSha !== undefined && !SHA.test(expectedSha)) ||
        (operation === 'deploy' && expectedSha === undefined) ||
        typeof saveProgress !== 'function'
      )
        throw new TypeError('fixed operation and exact merged SHA required');
      const started = now();
      await guard();
      const sha = await currentMain(expectedSha);
      if (progress !== undefined) {
        if (
          progress.operation !== operation ||
          progress.sha !== sha ||
          !UUID.test(progress.dispatchId ?? '') ||
          !['intent', 'submitted', 'observed', 'succeeded'].includes(progress.phase) ||
          !Array.isArray(progress.priorRunIds) ||
          progress.priorRunIds.length > 100 ||
          progress.priorRunIds.some((id) => !integer(id)) ||
          (progress.runId !== undefined && !integer(progress.runId))
        )
          fail('saved dispatch identity mismatch');
        progress = structuredClone(progress);
      } else {
        const prior = await runs(sha);
        const dispatchId = newId();
        if (!UUID.test(dispatchId)) fail('invalid correlation identity');
        progress = {
          operation,
          sha,
          dispatchId,
          phase: 'intent',
          priorRunIds: prior.map((run) => run.id),
        };
        await saveProgress(progress); // Durable intent precedes the one possible mutation.
        await guard();
        await currentMain(sha);
        await postDispatch({
          ref: 'main',
          inputs: { reviewed_sha: sha, operation, dispatch_id: dispatchId },
        });
        progress = { ...progress, phase: 'submitted' };
        await saveProgress(progress);
      }
      for (;;) {
        await guard();
        await currentMain(sha);
        const matches = (await runs(sha)).filter((run) => run.display_title === title(progress));
        if (matches.length > 1) fail('ambiguous correlated runs; no redispatch');
        const run = structuredClone(
          progress.runId === undefined
            ? matches[0]
            : await reader.getJson(`actions/runs/${progress.runId}`),
        );
        if (run) {
          validateRun(run, progress);
          if (progress.runId === undefined) {
            progress = { ...progress, runId: run.id, phase: 'observed' };
            await saveProgress(progress);
          }
          if (run.status === 'completed') {
            if (run.conclusion !== 'success') fail('workflow failed; no redispatch');
            const kind =
              operation === 'preflight' ? 'clinicos-demo-preflight' : 'clinicos-demo-backend';
            const proof = await reader.artifact(run, kind);
            validateReceipt(proof.receipt, run, kind, now(), DEMO_SOURCE_POLICIES.exact);
            await currentMain(sha);
            // Re-read attempt and identity after artifact retrieval to reject a concurrent rerun.
            const finalRun = await reader.getJson(`actions/runs/${run.id}`);
            validateRun(finalRun, progress);
            if (finalRun.status !== 'completed' || finalRun.conclusion !== 'success')
              fail('completed run changed');
            progress = { ...progress, phase: 'succeeded' };
            await saveProgress(progress);
            await guard();
            await currentMain(sha);
            return {
              ...proof,
              runUrl: `https://github.com/${REPO}/actions/runs/${run.id}`,
              progress,
            };
          }
          if (!['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status))
            fail('unrecognized run status');
        }
        if (now() - started >= timeoutMs)
          fail('run discovery or completion timed out; no redispatch');
        await delay(Math.min(pollMs, timeoutMs - (now() - started)));
      }
    },
  };
}
