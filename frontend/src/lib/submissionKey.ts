// Phase 6 — idempotency key for a logical submission. The SAME payload keeps the SAME requestId
// across retries (double click, lost response, timeout after commit) so the backend replays the
// first result instead of writing twice; a different payload gets a new id. Reset after success.

export interface SubmissionKey {
  for(payload: unknown): string;
  reset(): void;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createSubmissionKey(): SubmissionKey {
  let fingerprint: string | null = null;
  let id: string | null = null;
  return {
    for(payload) {
      const next = JSON.stringify(payload);
      if (next !== fingerprint || !id) {
        fingerprint = next;
        id = newId();
      }
      return id;
    },
    reset() {
      fingerprint = null;
      id = null;
    },
  };
}
