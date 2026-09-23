import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAssessmentDraftStore, submitAssessment } from '../assessments/assessmentDraftStore';
import { createAssessmentClient } from '../assessments/assessmentClient';
import { emptyTinettiAnswers } from '../assessments/tinettiDefinition';
import { legacyTinetti } from '../assessments/tinettiLegacy';
import { cartellaWriteData, mergeCartellaPatch, CartellaWriteQueue } from '../cartellaWriteQueue';
import type { CartellaPaziente } from '../../types';
import { completeTinetti, tinettiAssessment } from './tinetti.fixtures';
import { finalAssessment, uncertain, deferred } from './assessments.fixtures';

test('Tinetti draft isolation, correction instant, exact retry and predecessor immutability reuse shared store', () => {
  const store = createAssessmentDraftStore();
  const keys = ['painad', 'postural_transfers', 'tinetti'].map((type) =>
    store.create('patient-a', undefined, type as 'painad' | 'postural_transfers' | 'tinetti'),
  );
  assert.equal(new Set(keys).size, 3);
  assert.equal(store.list('patient-b', 'tinetti').length, 0);
  const predecessor = tinettiAssessment({ status: 'final' });
  const before = structuredClone(predecessor);
  const key = store.create('patient-a', predecessor);
  const answers = completeTinetti(false);
  store.update(key, { answers, correctionReason: 'Rettifica sintetica' });
  answers.notes = 'External mutation';
  const token = store.begin(key, 'save')!;
  assert.equal(token.operation.kind, 'create');
  if (token.operation.kind !== 'create') throw new Error('Expected create');
  assert.equal(token.operation.body.type, 'tinetti');
  assert.equal(token.operation.body.assessedAt, predecessor.assessedAt);
  assert.equal(token.operation.body.predecessorId, predecessor.id);
  assert.equal(Object.isFrozen(token.operation.body.answers), true);
  assert.notEqual((token.operation.body.answers as typeof answers).notes, answers.notes);
  store.finish(token, uncertain);
  store.update(key, { answers: emptyTinettiAnswers() });
  assert.equal(store.begin(key, 'save')!.operation, token.operation);
  assert.deepEqual(predecessor, before);
});
test('incomplete Tinetti has no preview/finalization; saved complete draft permits CAS-bound finalization', () => {
  const store = createAssessmentDraftStore();
  const key = store.load(tinettiAssessment({ answers: emptyTinettiAnswers() }));
  assert.equal(store.preview(key), false);
  assert.equal(store.get(key)!.failure!.missingPaths!.length, 20);
  assert.equal(store.begin(key, 'finalize'), null);
  const complete = store.load(tinettiAssessment({ id: 'complete' }));
  assert.equal(store.preview(complete), true);
  const token = store.begin(complete, 'finalize')!;
  assert.equal(token.operation.kind, 'finalize');
  assert.equal(token.operation.kind === 'finalize' && token.operation.body.expectedVersion, 1);
  store.finish(token, {
    kind: 'saved',
    assessment: tinettiAssessment({ id: 'complete', version: 2, status: 'final' }),
  });
  assert.equal(store.get(complete)!.record!.status, 'final');
  assert.equal(store.begin(complete, 'save'), null);
});
test('Tinetti client uses typed current/history and retains server incomplete paths without cross-type receipts', async () => {
  const final = tinettiAssessment({ status: 'final' });
  const client = createAssessmentClient('/api', {}, async (url, init) => {
    if (init?.method === 'POST')
      return Response.json(
        { code: 'assessment_incomplete', missingPaths: ['cammino'] },
        { status: 422 },
      );
    assert.equal(
      new URL(String(url), 'https://synthetic.invalid').searchParams.get('type'),
      'tinetti',
    );
    return Response.json(
      String(url).includes('/current')
        ? { assessment: final }
        : { items: [final], pageInfo: { loadedCount: 1, hasMore: false, nextCursor: null } },
    );
  });
  assert.equal((await client.current('patient-a', 'tinetti'))!.type, 'tinetti');
  assert.equal((await client.page('patient-a', { type: 'tinetti' })).items.length, 1);
  const result = await client.write('patient-a', {
    kind: 'finalize',
    id: final.id,
    body: { requestId: 'request', expectedVersion: 1 },
  });
  assert.deepEqual(result.kind === 'failed' && result.failure.missingPaths, ['cammino']);
  const wrong = createAssessmentClient('/api', {}, async () =>
    Response.json({ assessment: finalAssessment() }),
  );
  await assert.rejects(wrong.current('patient-a', 'tinetti'));
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'tinetti');
  const token = store.begin(key, 'save')!;
  const pending = deferred<Response>();
  const writing = submitAssessment(
    store,
    token,
    createAssessmentClient('/api', {}, () => pending.promise),
  );
  store.clear();
  pending.resolve(
    Response.json({
      assessment: tinettiAssessment(),
      requestId: token.operation.kind === 'create' ? token.operation.body.requestId : '',
      replayed: false,
    }),
  );
  assert.equal(await writing, false);
  assert.equal(store.list('patient-a', 'tinetti').length, 0);
});
test('legacy adapter preserves raw data and suppresses any risk for missing, -1 or invalid values', () => {
  const legacy = {
    ...completeTinetti(),
    id: 'legacy-original',
    data: '1999-01-01',
    createdAt: 'previous-text-date',
    operatore: 'Operatore riportato',
    note: 'Nota\n storica ',
  };
  const before = JSON.stringify(legacy);
  assert.equal(legacyTinetti(legacy).result?.total, 28);
  for (const value of [-1, null, undefined, '1', 0.5, 2]) {
    const bad = { ...legacy, equilibrioSeduto: value };
    assert.equal(legacyTinetti(bad).result, null);
    assert.equal(legacyTinetti(bad).source, bad);
  }
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(legacyTinetti(null).result, null);
});
test('Cartella request omission and queue preserve legacy absent/null/array without changing retained form fields', async () => {
  for (const branch of [undefined, null, [], [{ id: 'historic', cammino: -1 }]]) {
    const snapshot = {
      pazienteId: 'patient-a',
      noteGenerali: 'initial',
      ...(branch === undefined ? {} : { valutazioniTinetti: branch }),
    } as unknown as CartellaPaziente;
    const before = JSON.stringify(snapshot);
    const merged = mergeCartellaPatch(snapshot, snapshot, {
      noteGenerali: 'retained input',
      valutazioniTinetti: [],
    });
    assert.equal(
      Object.hasOwn(merged, 'valutazioniTinetti'),
      Object.hasOwn(snapshot, 'valutazioniTinetti'),
    );
    assert.deepEqual(merged.valutazioniTinetti, snapshot.valutazioniTinetti);
    assert.equal(Object.hasOwn(cartellaWriteData(merged), 'valutazioniTinetti'), false);
    const queue = new CartellaWriteQueue<CartellaPaziente>();
    assert.equal(
      await queue.enqueue(
        'patient-a',
        snapshot,
        { noteGenerali: 'retained input' },
        async (data) => {
          assert.equal(data.noteGenerali, 'retained input');
          return false;
        },
        mergeCartellaPatch,
      ),
      false,
    );
    assert.equal(JSON.stringify(snapshot), before);
    assert.equal(merged.noteGenerali, 'retained input');
  }
});
