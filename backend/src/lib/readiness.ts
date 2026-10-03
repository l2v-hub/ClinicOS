// Phase 9: readiness probe.
//
//   GET /health  liveness  — the process answers (app.ts). Used by Railway's healthcheck.
//   GET /ready   readiness — the core clinical software can serve: database reachable and the
//                active authorization policy loadable. AI is reported as configured/disabled only:
//                no LLM, runtime or STT call is ever made by a probe, and a degraded AI never makes
//                the service "not ready" (the classic GUI keeps working without it).
//
// The body carries no secrets, hostnames or versions of dependencies — only check outcomes.

import type { Request, Response } from 'express';
import { operatorAuthMode } from '../ai/auth.js';
import { deploymentTier } from './deployment.js';
import { aiEnabled } from './ai-flags.js';

const CHECK_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

export type CheckState = 'ok' | 'fail';

export interface ReadinessDeps {
  pingDatabase: () => Promise<unknown>;
  loadPolicy: () => Promise<unknown>;
}

const defaultDeps: ReadinessDeps = {
  pingDatabase: async () => {
    const { prisma } = await import('./prisma.js');
    return prisma.$queryRaw`SELECT 1`;
  },
  loadPolicy: async () => {
    const { loadActivePolicyCached } = await import('../authz/policy-cache.js');
    return loadActivePolicyCached();
  },
};

let deps: ReadinessDeps = defaultDeps;

/** Test hook: inject failing/slow dependencies. Pass null to restore the defaults. */
export function setReadinessDeps(next: ReadinessDeps | null): void {
  deps = next ?? defaultDeps;
}

let shuttingDown = false;
/** Called on SIGTERM: readiness flips to 503 so the platform stops routing new traffic. */
export function markShuttingDown(): void {
  shuttingDown = true;
}

function aiStatus(env: NodeJS.ProcessEnv = process.env) {
  const enabled = aiEnabled(env);
  const runtime = enabled && Boolean(env.AI_RUNTIME_URL && env.AI_RUNTIME_SERVICE_TOKEN);
  const interpreter =
    (env.SKILLS_INTERPRETER || '').trim().toLowerCase() === 'deterministic' || !runtime
      ? 'deterministic'
      : 'agno';
  return {
    enabled,
    runtime: runtime ? 'configured' : 'disabled',
    interpreter,
    voice:
      enabled && (env.VOICE_CHANNEL_ENABLED || '').trim().toLowerCase() === 'true'
        ? 'enabled'
        : 'disabled',
  };
}

async function check(fn: () => Promise<unknown>): Promise<CheckState> {
  try {
    await withTimeout(fn(), CHECK_TIMEOUT_MS);
    return 'ok';
  } catch {
    return 'fail';
  }
}

export async function readinessHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const database = await check(deps.pingDatabase);
  // The policy is read from the DB: skip it when the DB is already known down.
  const policy = database === 'ok' ? await check(deps.loadPolicy) : 'fail';
  const ready = !shuttingDown && database === 'ok' && policy === 'ok';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : shuttingDown ? 'shutting_down' : 'not_ready',
    tier: deploymentTier(),
    authMode: operatorAuthMode(),
    checks: { database, policy },
    // Informative only: AI never decides readiness.
    ai: aiStatus(),
  });
}
