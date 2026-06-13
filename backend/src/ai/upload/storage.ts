// Temporary file storage for import jobs (REQ-014 / REQ-019).
// Files live under <uploadDir>/<jobId>/<docId>. Never executed, only read for
// extraction. Retention sweep removes expired job directories.

import { createWriteStream } from 'node:fs';
import { mkdir, rm, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadAiConfig } from '../config.js';

function jobDir(jobId: string, uploadDir = loadAiConfig().uploadDir): string {
  return resolve(uploadDir, jobId);
}

export async function ensureJobDir(jobId: string): Promise<string> {
  const dir = jobDir(jobId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Persist file bytes; returns the absolute storage path. */
export async function storeFile(jobId: string, docId: string, data: Buffer): Promise<string> {
  const dir = await ensureJobDir(jobId);
  const path = resolve(dir, docId);
  await new Promise<void>((res, reject) => {
    const ws = createWriteStream(path, { mode: 0o600 });
    ws.on('error', reject);
    ws.on('finish', () => res());
    ws.end(data);
  });
  return path;
}

export async function removeFile(storagePath: string): Promise<void> {
  await rm(storagePath, { force: true });
}

export async function removeJobDir(jobId: string): Promise<void> {
  await rm(jobDir(jobId), { recursive: true, force: true });
}

/** Delete on-disk job directories whose mtime is older than retention. */
export async function sweepExpiredDirs(retentionMin = loadAiConfig().jobRetentionMin): Promise<number> {
  const root = loadAiConfig().uploadDir;
  let removed = 0;
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return 0; // dir not created yet
  }
  const cutoff = msNow() - retentionMin * 60_000;
  for (const name of entries) {
    const dir = resolve(root, name);
    try {
      const s = await stat(dir);
      if (s.isDirectory() && s.mtimeMs < cutoff) {
        await rm(dir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // ignore individual failures
    }
  }
  return removed;
}

// Wrapped so the rest of the module stays pure-ish and testable.
function msNow(): number {
  return Date.now();
}
