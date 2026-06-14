import app from './app.js';
import { publicStatus } from './ai/config.js';
import { sweepExpiredJobs } from './ai/upload/job-service.js';
import { startWorker } from './ai/upload/worker.js';

const DEFAULT_PORT = 3001;

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
};

const port = process.env.PORT || 3001;


const server = app.listen(port, () => {
  console.log(`ClinicOS backend listening on port ${port}`);
  // Controlled AI config validation at startup (secret-free).
  const ai = publicStatus();
  if (ai.available) {
    console.log(`[ai] extraction ready: provider=${ai.provider} model=${ai.model}`);
  } else {
    console.warn(`[ai] extraction NOT available: ${ai.errors.join('; ')}`);
  }
  // Periodic retention sweep for expired import jobs (REQ-014/019). Best-effort.
  const SWEEP_MS = 15 * 60_000;
  setInterval(() => {
    sweepExpiredJobs().catch(() => { /* DB may be unavailable; ignore */ });
  }, SWEEP_MS).unref();
  // Async import worker (REQ-022): processes queued jobs in the background.
  // Disable in-process with AI_WORKER_INLINE=false when running a separate worker service.
  if ((process.env.AI_WORKER_INLINE ?? 'true').toLowerCase() !== 'false') {
    startWorker();
  }
});

server.on('error', (error) => {
  console.error('Failed to start ClinicOS backend:', error);
  process.exit(1);
});
