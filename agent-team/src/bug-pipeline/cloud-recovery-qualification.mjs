// Reuse a canonically verified probe. Qualification must NEVER invoke inference.
import assert from 'node:assert/strict';
import { CLOUD_CLAUDE_VERSION, CLOUD_REVIEW_REPO } from './cloud-review-worker.mjs';

export function canonicalRecoveryQualification(request) {
  const receipt = request.probe;
  assert.equal(receipt?.status, 'probe-passed');
  assert.equal(receipt.providerExecuted, true);
  assert.ok(Number.isSafeInteger(receipt.runId) && receipt.runId > 0);
  assert.match(receipt.headSha ?? '', /^[a-f0-9]{40}$/);
  assert.equal(receipt.headSha, request.trustedWorkerSource?.sha);
  assert.match(receipt.receiptSha256 ?? '', /^[a-f0-9]{64}$/);
  assert.ok(receipt.profile && typeof receipt.profile === 'object');
  // The trusted host previously read and hashed the successful receipt. The
  // execution capability seals this exact canonical profile and provenance.
  return structuredClone({
    runId: receipt.runId,
    headSha: receipt.headSha,
    receiptSha256: receipt.receiptSha256,
    profile: receipt.profile,
  });
}

export async function qualifyRecoveryWithoutInference({ receipt, run, cwd }) {
  assert.ok(Number.isSafeInteger(receipt?.runId) && receipt.runId > 0);
  assert.match(receipt.headSha ?? '', /^[a-f0-9]{40}$/);
  assert.match(receipt.receiptSha256 ?? '', /^[a-f0-9]{64}$/);
  const api = async (suffix) => {
    const result = await run({
      command: 'gh',
      args: ['api', `repos/${CLOUD_REVIEW_REPO}/${suffix}`],
      cwd,
      envMode: 'controller',
      timeoutMs: 30000,
      maxOutputBytes: 128 * 1024,
    });
    assert.equal(result.ok, true, 'Saved probe provenance unavailable');
    return JSON.parse(result.stdout);
  };
  const observed = await api(`actions/runs/${receipt.runId}`);
  assert.equal(observed.id, receipt.runId);
  assert.equal(observed.repository?.full_name, CLOUD_REVIEW_REPO);
  assert.equal(observed.status, 'completed');
  assert.equal(observed.conclusion, 'success');
  assert.equal(observed.event, 'workflow_dispatch');
  assert.equal(observed.path, '.github/workflows/claude-cloud-review.yml');
  assert.equal(observed.head_branch, 'main');
  assert.equal(observed.head_sha, receipt.headSha);
  const pinned = await api(
    `contents/scripts/automation/claude-cloud-tools/package.json?ref=${receipt.headSha}`,
  );
  assert.equal(pinned.encoding, 'base64');
  assert.equal(pinned.type, 'file');
  assert.equal(pinned.path, 'scripts/automation/claude-cloud-tools/package.json');
  assert.ok(typeof pinned.content === 'string' && pinned.content.length <= 8192);
  const manifest = JSON.parse(Buffer.from(pinned.content, 'base64').toString('utf8'));
  assert.equal(manifest.dependencies?.['@anthropic-ai/claude-code'], CLOUD_CLAUDE_VERSION);
  const version = await run({ command: 'claude', args: ['--version'], envMode: 'review', cwd });
  assert.ok(
    version.ok && version.stdout.trim().startsWith(`${CLOUD_CLAUDE_VERSION} `),
    'Unqualified Claude CLI',
  );
  return {
    profile: structuredClone(receipt.profile),
    reusedProbeRunId: receipt.runId,
    receiptSha256: receipt.receiptSha256,
    providerExecuted: false,
  };
}
