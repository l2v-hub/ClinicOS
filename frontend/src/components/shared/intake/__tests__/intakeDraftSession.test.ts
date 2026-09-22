import assert from 'node:assert/strict';
import test from 'node:test';
import { clearManualDraft, openManualDraft } from '../intakeDraftSession';

test('manual reopen and timeout retry reuse one draft; simultaneous initializers create only once', async () => {
  const values = new Map<string, string>();
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  Object.assign(globalThis, {
    window: {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
  const calls: { method?: string; url: string }[] = [];
  const actor = { operatorId: 'synthetic-operator', operatorRole: 'nurse' };
  try {
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ method: init.method, url });
      return { ok: true, json: async () => ({ id: 'same-draft', data: {} }) } as Response;
    }) as typeof fetch;
    const [one, two] = await Promise.all([openManualDraft(actor), openManualDraft(actor)]);
    assert.equal(one.id, two.id);
    assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
    assert.equal(values.values().next().value, 'same-draft');
    assert.equal((await openManualDraft(actor)).id, 'same-draft');
    assert.equal(calls.at(-1)?.method, 'GET');
    globalThis.fetch = (async () => {
      throw new Error('synthetic network failure');
    }) as typeof fetch;
    await assert.rejects(openManualDraft(actor), /network failure/);
    assert.equal(values.values().next().value, 'same-draft');
    clearManualDraft(actor);
    assert.equal(values.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
    Object.assign(globalThis, { window: originalWindow });
  }
});
