// frontend/src/components/shared/intake/__tests__/intakeDraftApi.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, patchDraft } from '../intakeDraftApi.js';

test('createDraft POSTs to /intake/drafts', async () => {
  const calls: any[] = [];
  globalThis.fetch = (async (url: string, opts: any) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => ({ id: 'd1', data: {} }) };
  }) as any;
  const d = await createDraft('manual');
  assert.equal(d.id, 'd1');
  assert.match(calls[0].url, /\/intake\/drafts$/);
  assert.equal(calls[0].opts.method, 'POST');
});

test('patchDraft PATCHes the draft id', async () => {
  const calls: any[] = [];
  globalThis.fetch = (async (url: string, opts: any) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => ({ id: 'd1', data: { a: 1 } }) };
  }) as any;
  await patchDraft('d1', { a: 1 });
  assert.match(calls[0].url, /\/intake\/drafts\/d1$/);
  assert.equal(calls[0].opts.method, 'PATCH');
});
