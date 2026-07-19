import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runProcess } from '../../src/adapters/process-runner.mjs';
import { createGitAdapter } from '../../src/adapters/git.mjs';
import { buildEvidenceBinding, verifyEvidenceBinding } from '../../src/core/binding.mjs';

const schema = JSON.parse(
  await readFile(path.resolve('agent-team/protocol/schemas/evidence-binding.schema.json'), 'utf8'),
);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const config = {
  repository: 'l2v-hub/ClinicOS',
  commandTimeoutMs: 30000,
  maxOutputBytes: 10485760,
  baseBranch: 'origin/main',
  worktreeRoot: 'x',
};

async function realRepo() {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-binding-'));
  const git = async (...args) => {
    const result = await runProcess({
      command: 'git',
      args,
      cwd: repoRoot,
      timeoutMs: 30000,
      maxOutputBytes: 1048576,
    });
    assert.equal(result.ok, true, `git ${args.join(' ')} failed: ${result.stderr}`);
    return result.stdout.trim();
  };
  await git('init', '-b', 'main');
  await git('config', 'user.email', 'agent-team@test.local');
  await git('config', 'user.name', 'Agent Team Test');
  await git('config', 'commit.gpgsign', 'false');
  return { repoRoot, git };
}

test('evidence binding builds from and verifies against committed state at the PR head, rejecting tampering', async () => {
  const { repoRoot, git } = await realRepo();
  const adapter = createGitAdapter({ run: runProcess, config });

  await mkdir(path.join(repoRoot, 'evidence'), { recursive: true });
  await writeFile(path.join(repoRoot, 'evidence', 'report.md'), '# report\nline\n');
  await git('add', '.');
  await git('commit', '-m', 'evidence');
  const evidenceSha = await git('rev-parse', 'HEAD');

  const reportBlob = await adapter.blobSha(repoRoot, evidenceSha, 'evidence/report.md');
  const manifest = {
    schema_version: 1,
    message_type: 'artifact_manifest',
    message_id: 'manifest-1',
    correlation_id: 'issue-263-attempt-2',
    producer_role: 'claude-development',
    repository: 'l2v-hub/ClinicOS',
    issue_number: 263,
    pull_request_number: 264,
    created_at: '2026-07-13T08:00:00Z',
    subject_sha: evidenceSha,
    artifacts: [
      {
        path: 'evidence/report.md',
        media_type: 'text/markdown',
        sha256: sha256('# report\nline\n'),
        git_blob_sha: reportBlob,
        producer_role: 'claude-development',
        subject_sha: evidenceSha,
      },
    ],
  };
  await writeFile(
    path.join(repoRoot, 'evidence', 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await git('add', '.');
  await git('commit', '-m', 'manifest');
  const headSha = await git('rev-parse', 'HEAD');

  const envelope = await buildEvidenceBinding({
    git: adapter,
    repoRoot,
    headSha,
    manifestPath: 'evidence/manifest.json',
    issueNumber: 263,
    pullRequestNumber: 264,
    correlationId: 'issue-263-attempt-2',
    schema,
  });
  assert.equal(envelope.subject_sha, headSha);
  assert.equal(envelope.manifest_subject_sha, evidenceSha);

  const verified = await verifyEvidenceBinding({
    git: adapter,
    repoRoot,
    envelope,
    pullRequestHeadSha: headSha,
    schema,
  });
  assert.equal(verified.ok, true);
  assert.equal(verified.artifacts, 1);

  await writeFile(path.join(repoRoot, 'evidence', 'report.md'), '# tampered\n');
  await git('add', '.');
  await git('commit', '-m', 'tamper');
  const tamperedSha = await git('rev-parse', 'HEAD');

  await assert.rejects(
    () =>
      verifyEvidenceBinding({
        git: adapter,
        repoRoot,
        envelope,
        pullRequestHeadSha: tamperedSha,
        schema,
      }),
    /evidence binding subject mismatch/,
  );
  const tamperedEnvelope = await buildEvidenceBinding({
    git: adapter,
    repoRoot,
    headSha: tamperedSha,
    manifestPath: 'evidence/manifest.json',
    issueNumber: 263,
    pullRequestNumber: 264,
    correlationId: 'issue-263-attempt-2',
    schema,
  });
  await assert.rejects(
    () =>
      verifyEvidenceBinding({
        git: adapter,
        repoRoot,
        envelope: tamperedEnvelope,
        pullRequestHeadSha: tamperedSha,
        schema,
      }),
    /artifact blob mismatch at PR head: evidence\/report.md/,
  );
});

test('evidence binding rejects a schema-invalid envelope before touching git history', async () => {
  const adapter = {
    showFile: async () => {
      throw new Error('must not be called');
    },
    blobSha: async () => {
      throw new Error('must not be called');
    },
  };
  await assert.rejects(
    () =>
      verifyEvidenceBinding({
        git: adapter,
        repoRoot: 'C:/nowhere',
        envelope: { schema_version: 1, message_type: 'evidence_binding' },
        pullRequestHeadSha: 'a'.repeat(40),
        schema,
      }),
    /missing/,
  );
});
