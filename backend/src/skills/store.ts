// Workflow state store. Minimal and pluggable: the default keeps structured state in process with
// a TTL (Railway runs one backend instance). A restart drops open workflows — the user simply
// starts again; nothing is ever half-written because writes happen only in EXECUTING, after an
// explicit confirmation, through idempotent tools where available.

import type { WorkflowState } from './types.js';

export interface WorkflowStore {
  get(id: string): WorkflowState | undefined;
  /**
   * Compare-and-set on `version`: refuses (returns false) when the stored copy changed since the
   * caller read it; on success bumps `state.version`. `force` is used only to record the outcome
   * of a write that already happened.
   */
  save(state: WorkflowState, options?: { force?: boolean }): boolean;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 5000;

export function createMemoryWorkflowStore(ttlMs = DEFAULT_TTL_MS): WorkflowStore & {
  ttlMs: number;
} {
  const entries = new Map<string, WorkflowState>();
  function prune(now: number) {
    for (const [id, state] of entries) {
      if (Date.parse(state.expiresAt) <= now) entries.delete(id);
    }
    while (entries.size > MAX_ENTRIES) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }
  return {
    ttlMs,
    get(id) {
      const state = entries.get(id);
      if (!state) return undefined;
      if (Date.parse(state.expiresAt) <= Date.now()) {
        entries.delete(id);
        return undefined;
      }
      return structuredClone(state);
    },
    save(state, options) {
      prune(Date.now());
      const stored = entries.get(state.id);
      if (stored && stored.version !== state.version && !options?.force) return false;
      state.version = (stored?.version ?? state.version) + 1;
      entries.delete(state.id); // keep insertion order = recency
      entries.set(state.id, structuredClone(state));
      return true;
    },
  };
}
