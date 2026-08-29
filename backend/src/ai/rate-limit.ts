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

interface LimiterOptions {
  maxBuckets?: number;
  now?: () => number;
  key?: (req: AuthedRequest) => string;
}

export function makeLimiter(
  windowMs: number,
  max: number,
  label: string,
  options: LimiterOptions = {},
) {
  const maxBuckets = Math.max(1, options.maxBuckets ?? 10_000);
  const nowFn = options.now ?? Date.now;
  const buckets = new Map<string, Bucket>();
  let nextSweepAt = 0;
  return function limiter(req: AuthedRequest, res: Response, next: NextFunction): void {
    const key = options.key?.(req) ?? req.operator?.id ?? req.ip ?? 'anon';
    const now = nowFn();
    const cutoff = now - windowMs;

    // Remove expired identities periodically. Without deletion, one request from each new IP would
    // leave a permanent Map entry and turn the abuse control itself into a memory-exhaustion path.
    if (now >= nextSweepAt) {
      for (const [bucketKey, bucket] of buckets) {
        bucket.hits = bucket.hits.filter((t) => t > cutoff);
        if (bucket.hits.length === 0) buckets.delete(bucketKey);
      }
      nextSweepAt = now + Math.min(windowMs, 60_000);
    }

    let b = buckets.get(key);
    if (!b && buckets.size >= maxBuckets) {
      // LRU eviction keeps memory bounded without letting an attacker reserve every identity slot
      // and reject all newcomers until the next sweep. A separate global bucket caps aggregate work.
      const oldestKey = buckets.keys().next().value as string | undefined;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    b ??= { hits: [] };
    b.hits = b.hits.filter((t) => t > cutoff);
    if (b.hits.length >= max) {
      buckets.delete(key);
      buckets.set(key, b);
      const retryMs = b.hits[0] + windowMs - now;
      res.setHeader('Retry-After', Math.ceil(retryMs / 1000));
      res.status(429).json({ error: `Troppe richieste (${label}). Riprova tra poco.` });
      return;
    }
    b.hits.push(now);
    buckets.delete(key);
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

// Public AIFA fuzzy search scans the in-memory medication-name index. Bound repeated CPU work by
// client IP even though the underlying data is public. For multi-instance deployments this guard
// should additionally be enforced by the edge/proxy or backed by a shared store.
export const medicationSearchRateLimit = makeLimiter(
  60_000,
  intEnv('FARMACI_SEARCH_RATE_LIMIT_PER_MIN', 60),
  'ricerca farmaci',
  { maxBuckets: intEnv('FARMACI_SEARCH_MAX_IP_BUCKETS', 10_000) },
);

// A second, shared bucket bounds aggregate fuzzy-search work when callers rotate IPs. Production
// edge rate limiting remains desirable, but the process no longer relies on caller identity alone.
export const medicationSearchGlobalRateLimit = makeLimiter(
  60_000,
  intEnv('FARMACI_SEARCH_GLOBAL_RATE_LIMIT_PER_MIN', 600),
  'ricerca farmaci globale',
  { maxBuckets: 1, key: () => 'global' },
);
