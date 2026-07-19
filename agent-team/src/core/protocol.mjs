import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateAgainstSchema } from './json-schema.mjs';

const MARKER = '<!-- clinic-os-agent-team:v1 -->';

export function formatProtocolComment(message, schema) {
  if (schema) validateAgainstSchema(message, schema);
  return `${MARKER}\n${JSON.stringify(message)}`;
}

export function parseProtocolComment(body, schema) {
  if (!body.startsWith(`${MARKER}\n`)) return null;
  const value = JSON.parse(body.slice(MARKER.length + 1));
  validateAgainstSchema(value, schema);
  return value;
}

export function fingerprintFinding(finding) {
  const stable = Object.fromEntries(
    Object.entries(finding)
      .filter(([key]) => !['created_at', 'message_id', 'attempt'].includes(key))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

export async function verifyArtifactRefs({ repoRoot, subjectSha, refs }) {
  for (const ref of refs) {
    if (ref.subject_sha !== subjectSha)
      throw new Error(`artifact subject SHA mismatch: ${ref.path}`);
    const absolute = path.resolve(repoRoot, ref.path);
    if (!absolute.startsWith(path.resolve(repoRoot) + path.sep))
      throw new Error(`artifact path escapes repository: ${ref.path}`);
    const bytes = await readFile(absolute);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== ref.sha256) throw new Error(`artifact digest mismatch: ${ref.path}`);
  }
}
