// frontend/src/components/shared/intake/__tests__/intakeDraftApi.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDraft,
  patchDraft,
  editableDraftPatch,
  confirmPersistedDraft,
} from '../intakeDraftApi.js';

test('autosave excludes immutable source and receipt fields without dropping editable draft content', () => {
  const draft = {
    _narrative: { raw: 'original narrative' },
    _sections: { original: true },
    _terapiaText: 'original therapy text',
    _confirmation: { confirmed: true },
    _accepted: { demographics: true, therapy: true },
    anagrafica: { firstName: 'Ada', codiceFiscale: '' },
    terapiaImport: [{ originalText: 'original row', excludedFromConfirm: true }],
  };
  const before = JSON.stringify(draft);
  assert.deepEqual(editableDraftPatch(draft), {
    _accepted: draft._accepted,
    anagrafica: draft.anagrafica,
    terapiaImport: draft.terapiaImport,
  });
  assert.equal(JSON.stringify(draft), before);
});

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

test('lost confirmation response and refused retry autosave recover the same confirmed patient', async () => {
  for (const failAt of ['confirm', 'autosave']) {
    const methods: string[] = [];
    globalThis.fetch = (async (url: string, options: any) => {
      assert.match(url, /\/intake\/drafts\/same-draft(?:\/confirm)?$/);
      methods.push(options.method);
      if (options.method === 'POST') throw new Error('Response lost after commit');
      return {
        ok: true,
        json: async () => ({
          id: 'same-draft',
          status: 'confirmed',
          confirmedPatientId: 'same-patient',
          data: {},
        }),
      };
    }) as any;
    const result = await confirmPersistedDraft('same-draft', {}, async () => {
      if (failAt === 'autosave') throw new Error('Already confirmed');
    });
    assert.deepEqual(result, { status: 'idempotent', patient: { id: 'same-patient' } });
    assert.deepEqual(methods, failAt === 'confirm' ? ['POST', 'GET'] : ['GET']);
  }
});

test('failed confirmation remains an error if its draft is still open or cannot be read', async () => {
  for (const unreachable of [false, true]) {
    globalThis.fetch = (async () => {
      if (unreachable) throw new Error('Offline');
      return { ok: true, json: async () => ({ id: 'same-draft', status: 'draft', data: {} }) };
    }) as any;
    await assert.rejects(
      confirmPersistedDraft('same-draft', {}, async () => {
        throw new Error('Original failure');
      }),
      /Original failure/,
    );
  }
});
