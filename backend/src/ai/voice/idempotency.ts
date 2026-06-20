// REQ-041: idempotency store. A confirmed action carries an idempotency_key generated once per
// preview; a double-confirm or a network retry replays the SAME key and must not create a second
// record. In-memory + TTL (single process; back with Redis for multi-instance).

import type { ExecuteResult } from './types.js';

interface Entry { result: ExecuteResult; at: number }

const TTL_MS = 10 * 60_000; // a confirmation window; ample for double-clicks and retries

export class IdempotencyStore {
  private map = new Map<string, Entry>();

  /** Returns a prior result for this key (marked deduped) or null. Prunes expired entries. */
  get(key: string, now: number = Date.now()): ExecuteResult | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (now - e.at > TTL_MS) { this.map.delete(key); return null; }
    return { ...e.result, deduped: true };
  }

  put(key: string, result: ExecuteResult, now: number = Date.now()): void {
    this.map.set(key, { result, at: now });
  }
}

// Process-wide store for the live route.
export const voiceIdempotency = new IdempotencyStore();
