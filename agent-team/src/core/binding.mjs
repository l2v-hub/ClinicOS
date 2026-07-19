import { createHash } from 'node:crypto';
import { validateAgainstSchema } from './json-schema.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// Non-circular binding: the envelope is generated AFTER the final commit and published only as a
// protocol comment, so it can name the exact PR head while the committed manifest names the
// evidence commit it was generated at. Verification proves the committed chain from the PR head.
export async function buildEvidenceBinding({
  git,
  repoRoot,
  headSha,
  manifestPath,
  issueNumber,
  pullRequestNumber,
  correlationId,
  schema,
  now = new Date(),
}) {
  const manifestRaw = await git.showFile(repoRoot, headSha, manifestPath);
  const manifest = JSON.parse(manifestRaw);
  const envelope = {
    schema_version: 1,
    message_type: 'evidence_binding',
    message_id: `binding-${issueNumber}-${headSha.slice(0, 12)}`,
    correlation_id: correlationId,
    producer_role: 'claude-development',
    repository: manifest.repository,
    issue_number: issueNumber,
    pull_request_number: pullRequestNumber,
    created_at: now.toISOString(),
    subject_sha: headSha,
    manifest_path: manifestPath,
    manifest_git_blob_sha: await git.blobSha(repoRoot, headSha, manifestPath),
    manifest_sha256: sha256(manifestRaw),
    manifest_subject_sha: manifest.subject_sha,
  };
  if (schema) validateAgainstSchema(envelope, schema);
  return envelope;
}

export async function verifyEvidenceBinding({
  git,
  repoRoot,
  envelope,
  pullRequestHeadSha,
  schema,
}) {
  if (schema) validateAgainstSchema(envelope, schema);
  if (envelope.subject_sha !== pullRequestHeadSha) {
    throw new Error(
      `evidence binding subject mismatch: envelope ${envelope.subject_sha} vs PR head ${pullRequestHeadSha}`,
    );
  }
  const manifestRaw = await git.showFile(repoRoot, pullRequestHeadSha, envelope.manifest_path);
  if (sha256(manifestRaw) !== envelope.manifest_sha256)
    throw new Error(`manifest digest mismatch at PR head: ${envelope.manifest_path}`);
  const manifestBlob = await git.blobSha(repoRoot, pullRequestHeadSha, envelope.manifest_path);
  if (manifestBlob !== envelope.manifest_git_blob_sha)
    throw new Error(`manifest blob mismatch at PR head: ${envelope.manifest_path}`);
  const manifest = JSON.parse(manifestRaw);
  if (manifest.subject_sha !== envelope.manifest_subject_sha)
    throw new Error('committed manifest subject disagrees with the binding envelope');
  for (const artifact of manifest.artifacts ?? []) {
    let blob = null;
    try {
      blob = await git.blobSha(repoRoot, pullRequestHeadSha, artifact.path);
    } catch {
      blob = null;
    }
    if (blob !== artifact.git_blob_sha)
      throw new Error(`artifact blob mismatch at PR head: ${artifact.path}`);
    const content = await git.showFile(repoRoot, pullRequestHeadSha, artifact.path);
    if (sha256(content) !== artifact.sha256)
      throw new Error(`artifact digest mismatch at PR head: ${artifact.path}`);
  }
  return { ok: true, artifacts: (manifest.artifacts ?? []).length };
}
