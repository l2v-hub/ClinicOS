import assert from 'node:assert/strict';
import test from 'node:test';
import {
  editableDraftPatch,
  patchDraft,
  patchDraftWithRecovery,
  refreshImportDraft,
  decideImportProposal,
  createDraftFromImport,
  confirmDraft,
  VersionedDraftSaveQueue,
} from '../intakeDraftApi';
import { setCurrentOperator } from '../../../../lib/operatorSession';
import { buildIntakeTherapyReview } from '../intakeTherapies';
import {
  dischargeRowToTherapyForm,
  therapyFormToDischargeRow,
  type DischargeTherapyRow,
} from '../dischargeTherapy';

test('draft writes preserve source authority and carry CAS/version, result identity and authenticated actor', async () => {
  const original = globalThis.fetch;
  const calls: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
  try {
    setCurrentOperator({ id: 'real-actor', role: 'nurse', accessToken: 'synthetic-test-token' }); // secret-scan-ignore: non-secret fixture token, local tests only
    globalThis.fetch = (async (url, init) => {
      calls.push({ url: String(url), init: init!, body: JSON.parse(init!.body as string) });
      return new Response(JSON.stringify({ id: 'draft', version: 8, data: {} }), { status: 200 });
    }) as typeof fetch;
    const source = { manifestRevision: 4, resultHash: 'hash' };
    await createDraftFromImport('job', undefined, source);
    await patchDraft(
      'draft',
      editableDraftPatch({
        anagrafica: { firstName: 'Manual' },
        _accepted: { therapy: true },
        _importSource: source,
        _importProposals: ['server'],
        _importReview: ['server'],
      }),
      undefined,
      7,
    );
    await refreshImportDraft('draft', {
      ...source,
      expectedDraftVersion: 8,
      requestId: 'refresh-key',
    });
    await decideImportProposal('draft', 'proposal', {
      action: 'add',
      expectedDraftVersion: 9,
      requestId: 'proposal-key',
    });
    assert.deepEqual(calls[0].body, { importJobId: 'job', ...source });
    assert.deepEqual(calls[1].body, {
      anagrafica: { firstName: 'Manual' },
      _accepted: { therapy: true },
      expectedDraftVersion: 7,
    });
    assert.equal(calls[2].body.requestId, 'refresh-key');
    assert.equal(calls[3].body.action, 'add');
    assert.match(calls[3].url, /import-proposals\/proposal\/decide$/);
    assert.equal(
      (calls[0].init.headers as Record<string, string>).Authorization,
      'Bearer synthetic-test-token',
    );
  } finally {
    globalThis.fetch = original;
    setCurrentOperator(null);
  }
});
test('outdated source conflict is distinguishable from duplicate-patient confirmation', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ code: 'import_review_outdated', error: 'source changed' }), {
        status: 409,
      })) as typeof fetch;
    const result = await confirmDraft('draft', {});
    assert.equal(result.code, 'import_review_outdated');
    assert.notEqual(result.status, 'duplicate');
  } finally {
    globalThis.fetch = original;
  }
});
test('changed source keeps complete manual therapy values and still requires explicit re-review', () => {
  const row: DischargeTherapyRow = {
    farmacoNome: 'Synthetic',
    forma: 'compressa',
    dosaggio: '5 mg',
    viaSomministrazione: 'OS',
    quantita: '1 compressa',
    orari: ['08:00'],
    giorni: [],
    dataInizio: '2026-09-23',
    classe: '',
    note: '',
    originalText: 'synthetic source',
    stato: 'ok',
    sourceOutdated: true,
  };
  const form = dischargeRowToTherapyForm(row);
  form.note = 'manual correction';
  const edited = therapyFormToDischargeRow(form, row);
  assert.equal(edited.reviewedTherapy?.note, 'manual correction');
  assert.equal(edited.sourceOutdated, true);
  const review = buildIntakeTherapyReview({ terapiaImport: [edited] });
  assert.equal(review[0].requiresSourceReview, true);
  const deferred = buildIntakeTherapyReview({
    terapiaImport: [{ ...edited, excludedFromConfirm: true }],
  });
  assert.equal(deferred[0].excluded, true);
});
test('lost CAS response recovers exact saved revision without overwriting concurrent edits', async () => {
  const original = globalThis.fetch;
  const patch = { anagrafica: { firstName: 'Manual', lastName: 'Retained' } };
  let saved = { id: 'draft', version: 8, data: patch };
  let writes = 0;
  try {
    globalThis.fetch = (async (_, init) => {
      if (init?.method === 'PATCH') {
        writes++;
        throw new TypeError('lost response');
      }
      return new Response(JSON.stringify(saved));
    }) as typeof fetch;
    assert.equal((await patchDraftWithRecovery('draft', patch, undefined, 7)).version, 8);
    assert.equal(writes, 1);
    saved = {
      id: 'draft',
      version: 9,
      data: { anagrafica: { firstName: 'Concurrent', lastName: 'Retained' } },
    };
    await assert.rejects(patchDraftWithRecovery('draft', patch, undefined, 7), /lost response/);
    assert.equal(writes, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test('receipt replay returning a newer concurrent version cannot advance a stale editor', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: 'draft',
          version: 9,
          data: { anagrafica: { firstName: 'Concurrent' } },
        }),
      )) as typeof fetch;
    await assert.rejects(
      patchDraftWithRecovery('draft', { anagrafica: { firstName: 'Reviewed' } }, undefined, 7),
      /altra sessione/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('autosave recovers uncertain A before writing newer B with the advanced CAS version', async () => {
  const original = globalThis.fetch;
  let offline = true;
  let saved = { id: 'draft', version: 0, data: {} as Record<string, unknown> };
  const writes: { patch: Record<string, unknown>; expectedDraftVersion: number }[] = [];
  try {
    globalThis.fetch = (async (_, init) => {
      if (init?.method === 'PATCH') {
        const { expectedDraftVersion, ...patch } = JSON.parse(init.body as string);
        writes.push({ patch, expectedDraftVersion });
        if (expectedDraftVersion === saved.version) {
          saved = { id: 'draft', version: saved.version + 1, data: patch };
        } else {
          assert.deepEqual(patch, saved.data, 'only the exact uncertain A may be replayed');
        }
        if (offline) throw new TypeError('lost PATCH response');
      } else if (offline) throw new TypeError('recovery GET offline');
      return new Response(JSON.stringify(saved));
    }) as typeof fetch;
    const queue = new VersionedDraftSaveQueue('draft', 0);
    await assert.rejects(queue.save({ anagrafica: { firstName: 'EDIT_A' } }));
    assert.equal(queue.version, 0);
    offline = false;
    const next = await queue.save({ anagrafica: { firstName: 'EDIT_B' } });
    assert.equal(queue.version, 2);
    assert.deepEqual(next.data, { anagrafica: { firstName: 'EDIT_B' } });
    assert.deepEqual(
      writes.map((write) => write.expectedDraftVersion),
      [0, 0, 1],
    );
    assert.deepEqual(writes[0], writes[1]);
  } finally {
    globalThis.fetch = original;
  }
});

test('autosave validation failure can be corrected without replaying the rejected fields', async () => {
  const original = globalThis.fetch;
  let writes = 0;
  try {
    globalThis.fetch = (async (_, init) => {
      if (init?.method === 'GET')
        return new Response(JSON.stringify({ id: 'draft', version: 0, data: {} }));
      writes++;
      if (writes === 1)
        return new Response(JSON.stringify({ error: 'invalid field' }), { status: 400 });
      const { expectedDraftVersion, ...patch } = JSON.parse(init!.body as string);
      assert.equal(expectedDraftVersion, 0);
      assert.equal(patch.value, 'corrected');
      return new Response(JSON.stringify({ id: 'draft', version: 1, data: patch }));
    }) as typeof fetch;
    const queue = new VersionedDraftSaveQueue('draft', 0);
    await assert.rejects(queue.save({ value: 'invalid' }), /invalid field/);
    assert.equal((await queue.save({ value: 'corrected' })).version, 1);
    assert.equal(writes, 2);
  } finally {
    globalThis.fetch = original;
  }
});
