// Async import worker (REQ-022).
//
// In-process background loop that claims `queued` jobs from the PostgreSQL-backed
// queue and runs them through the extraction state machine. Jobs and their files
// are persisted, so a backend/worker restart does not lose work: orphaned in-flight
// jobs are reclaimed back to `queued` on startup and resumed.
//
// Can also run as a SEPARATE process (import startWorker from this module in a
// dedicated entrypoint) when the API and worker are split into two Railway services.

import { prisma } from '../../lib/prisma.js';
import { loadAiConfig } from '../config.js';
import { runJob } from './job-service.js';

const ORPHAN_STATES = ['processing', 'uploading_to_google', 'waiting_for_model', 'validating_response', 'repairing_response'];

let timer: ReturnType<typeof setInterval> | null = null;
let busy = false;

async function claimAndRun(): Promise<void> {
  if (busy) return; // single-flight worker (AI_MAX_CONCURRENCY=1)
  const next = await prisma.importJob.findFirst({
    where: { status: 'queued' },
    orderBy: { updatedAt: 'asc' },
    select: { id: true },
  });
  if (!next) return;
  // Atomic claim: only one worker can flip queued -> processing.
  const claim = await prisma.importJob.updateMany({
    where: { id: next.id, status: 'queued' },
    data: { status: 'processing' },
  });
  if (claim.count !== 1) return;
  busy = true;
  try {
    await runJob(next.id); // sets its own states; never throws (errors -> retryable/failed)
  } catch (e) {
    console.warn('[ai-worker] runJob error:', e instanceof Error ? e.message.slice(0, 120) : e);
  } finally {
    busy = false;
  }
}

/** Reset jobs that were in-flight when a previous worker died back to `queued`. */
export async function reclaimOrphans(): Promise<number> {
  const r = await prisma.importJob.updateMany({
    where: { status: { in: ORPHAN_STATES } },
    data: { status: 'queued', stage: 'queued', currentFileName: null },
  });
  return r.count;
}

export function startWorker(): void {
  if (timer) return;
  const cfg = loadAiConfig();
  reclaimOrphans()
    .then((n) => { if (n) console.log(`[ai-worker] reclaimed ${n} orphaned job(s)`); })
    .catch(() => { /* DB may be unavailable; tick will retry */ });
  timer = setInterval(() => { claimAndRun().catch(() => {}); }, cfg.jobPollIntervalMs);
  timer.unref?.();
  console.log(`[ai-worker] started (poll ${cfg.jobPollIntervalMs}ms)`);
}

export function stopWorker(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
