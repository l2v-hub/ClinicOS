import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAssessmentDraftStore, submitAssessment } from '../assessments/assessmentDraftStore';
import { createAssessmentClient } from '../assessments/assessmentClient';
import { emptyTransfersAnswers } from '../assessments/transfersDefinition';
import type { TransfersAnswers } from '../assessments/transfersTypes';
import { completeTransfers, transfersAssessment } from './transfers.fixtures';
import { assessment, deferred, uncertain } from './assessments.fixtures';

test('one patient keeps separate PAINAD and transfers drafts across route subscriptions', () => {
  const store = createAssessmentDraftStore();
  const painad = store.create('patient-a');
  const transfers = store.create('patient-a', undefined, 'postural_transfers');
  assert.notEqual(painad, transfers);
  assert.equal(store.create('patient-a', undefined, 'postural_transfers'), transfers);
  assert.equal(store.list('patient-a', 'painad')[0].key, painad);
  assert.equal(store.list('patient-a', 'postural_transfers')[0].key, transfers);
  const value = completeTransfers();
  store.update(transfers, { answers: value });
  value.aids.wheelchair.selected = true;
  assert.equal(
    (store.get(transfers)!.fields.answers as TransfersAnswers).aids.wheelchair.selected,
    false,
  );
  assert.equal(store.list('patient-b', 'postural_transfers').length, 0);
  const unsubscribe = store.subscribe(() => {});
  unsubscribe();
  assert.equal(store.get(transfers)!.dirty, true);
});

test('nested correction and pending operation cannot mutate predecessor or lose exact retry payload', () => {
  const predecessor = transfersAssessment({ status: 'final' });
  const before = structuredClone(predecessor);
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', predecessor);
  assert.equal(store.get(key)!.fields.instantChoice, predecessor.assessedAt);
  const answers = structuredClone(store.get(key)!.fields.answers) as TransfersAnswers;
  answers.aids.rollator.selected = true;
  answers.aids.rollator.ownership = 'personal';
  store.update(key, { answers, correctionReason: 'Rettifica sintetica' });
  const token = store.begin(key, 'save')!;
  assert.equal(token.type, 'postural_transfers');
  assert.equal(
    token.operation.kind === 'create' && token.operation.body.assessedAt,
    predecessor.assessedAt,
  );
  assert.equal(
    token.operation.kind === 'create' &&
      Object.isFrozen((token.operation.body.answers as TransfersAnswers).aids.rollator),
    true,
  );
  assert.deepEqual(predecessor, before);
  store.finish(token, uncertain);
  store.update(key, { answers: emptyTransfersAnswers() });
  assert.equal(store.begin(key, 'save')!.operation, token.operation);
  assert.equal(
    (store.get(key)!.fields.answers as TransfersAnswers).aids.rollator.ownership,
    'personal',
  );
});

test('server incomplete preview identifies fields and complete transfers can finalize despite result null', () => {
  const store = createAssessmentDraftStore();
  const incomplete = store.load(transfersAssessment({ answers: emptyTransfersAnswers() }));
  assert.equal(store.preview(incomplete), false);
  assert.ok(store.get(incomplete)!.failure?.missingPaths?.includes('walking'));
  const key = store.load(transfersAssessment({ id: 'complete-b' }));
  assert.equal(store.get(key)!.record?.result, null);
  assert.equal(store.begin(key, 'finalize'), null);
  assert.equal(store.preview(key), true);
  const token = store.begin(key, 'finalize')!;
  assert.equal(token.operation.kind, 'finalize');
  store.finish(token, {
    kind: 'failed',
    failure: {
      code: 'assessment_incomplete',
      uncertain: false,
      message: 'Verifica',
      missingPaths: ['walking'],
    },
  });
  assert.equal(store.get(key)!.preview, null);
  assert.equal(store.get(key)!.pending, null);
});

test('PATCH loss reconciles nested canonical key order, while another type is rejected', async () => {
  const store = createAssessmentDraftStore();
  const key = store.load(transfersAssessment());
  const answers = completeTransfers();
  answers.notes = 'Riga modificata\nSeconda riga';
  store.update(key, { answers });
  const token = store.begin(key, 'save')!;
  const canonicalize = (value: unknown): unknown =>
    value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .reverse()
            .map(([key, child]) => [key, canonicalize(child)]),
        )
      : value;
  const record = transfersAssessment({
    version: 2,
    answers: canonicalize(answers) as TransfersAnswers,
  });
  let reads = 0;
  const client = createAssessmentClient('/api', {}, async (_url, init) => {
    if (init?.method === 'PATCH') throw new Error('response lost');
    reads++;
    return Response.json({ assessment: record });
  });
  assert.equal(await submitAssessment(store, token, client), true);
  assert.equal(reads, 1);
  store.update(key, { answers: completeTransfers() });
  const next = store.begin(key, 'save')!;
  assert.equal(
    store.finish(next, { kind: 'saved', assessment: assessment({ id: record.id }) }),
    false,
  );
  assert.equal(store.get(key)!.type, 'postural_transfers');
  assert.equal(store.get(key)!.failure?.uncertain, true);
});

test('late write after logout cannot repopulate transfers state or initiate reconciliation', async () => {
  const store = createAssessmentDraftStore();
  const key = store.load(transfersAssessment());
  store.update(key, { answers: completeTransfers() });
  const token = store.begin(key, 'save')!;
  const response = deferred<Response>();
  let calls = 0;
  const client = createAssessmentClient('/api', {}, async () => {
    calls++;
    return response.promise;
  });
  const pending = submitAssessment(store, token, client);
  store.clear();
  response.resolve(Response.json({ code: 'scope_unavailable' }, { status: 503 }));
  assert.equal(await pending, false);
  assert.equal(calls, 1);
  assert.equal(store.list('patient-a', 'postural_transfers').length, 0);
});
