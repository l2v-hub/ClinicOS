// In-memory rate limiting + cost guard for the AI import flow (REQ-019).
//
// Two limiters: a general one for all import requests, and a stricter one for
// model-backed extraction (the costly path). Keyed by operator id (falls back to
// IP). Single-process sliding window — for multi-instance, back with Redis.

import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from './auth.js';

interface Bucket {
  hits: number[];
}

function makeLimiter(windowMs: number, max: number, label: string) {
  const buckets = new Map<string, Bucket>();
  return function limiter(req: AuthedRequest, res: Response, next: NextFunction): void {
    const key = req.operator?.id || req.ip || 'anon';
    const now = Date.now();
    const cutoff = now - windowMs;
    const b = buckets.get(key) ?? { hits: [] };
    b.hits = b.hits.filter((t) => t > cutoff);
    if (b.hits.length >= max) {
      const retryMs = b.hits[0] + windowMs - now;
      res.setHeader('Retry-After', Math.ceil(retryMs / 1000));
      res.status(429).json({ error: `Troppe richieste (${label}). Riprova tra poco.` });
      return;
    }
    b.hits.push(now);
    buckets.set(key, b);
    next();
  };
}

const intEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

// General import API: default 60 requests / minute per operator.
export const importRateLimit = makeLimiter(60_000, intEnv('AI_RATE_LIMIT_PER_MIN', 60), 'import');

// Cost guard on extraction: default 10 model runs / 5 minutes per operator.
export const extractionCostGuard = makeLimiter(
  5 * 60_000,
  intEnv('AI_MAX_EXTRACTIONS_PER_5MIN', 10),
  'estrazione',
);
