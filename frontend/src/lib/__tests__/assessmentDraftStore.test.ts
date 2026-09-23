import assert from 'node:assert/strict';
import { assessmentEditable } from '../assessments/assessmentTime';
import { test } from 'node:test';
import {
  createAssessmentDraftStore,
  patchMatches,
  submitAssessment,
} from '../assessments/assessmentDraftStore';
import type { AssessmentClient } from '../assessments/assessmentClient';
import type { AssessmentWriteResult } from '../assessments/assessmentTypes';
import {
  assessment,
  completeAnswers,
  conflict,
  deferred,
  finalAssessment,
  uncertain,
} from './assessments.fixtures';
const client = (
  write: AssessmentClient['write'],
  get: AssessmentClient['get'] = async () => assessment(),
): AssessmentClient => ({
  write,
  get,
  page: async () => ({ items: [], pageInfo: { loadedCount: 0, hasMore: false, nextCursor: null } }),
  retryPdf: async () => finalAssessment(),
});

test('new observations are blank, patient-specific and survive internal unsubscribe/remount', () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a');
  const second = store.create('patient-b');
  assert.notEqual(key, second);
  assert.deepEqual(Object.values(store.get(key)!.fields.answers), [null, null, null, null, null]);
  const unsubscribe = store.subscribe(() => {});
  store.update(key, { answers: { ...completeAnswers } });
  unsubscribe();
  assert.equal(store.list('patient-a')[0].key, key);
  assert.equal(store.get(second)!.fields.answers.respiration, null);
  assert.equal(store.hasUnsaved(), true);
});

test('synchronous create lock and uncertain retry retain exact UUID, body and answers', async () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a');
  store.update(key, { answers: { ...completeAnswers } });
  const token = store.begin(key, 'save')!;
  assert.equal(store.begin(key, 'save'), null);
  store.discard(key);
  assert.equal(store.get(key)!.busy, true);
  assert.equal(Object.isFrozen(token.operation.body), true);
  await submitAssessment(
    store,
    token,
    client(async () => uncertain),
  );
  store.update(key, { correctionReason: 'must not replace request' });
  assert.equal(store.get(key)!.fields.correctionReason, '');
  const retry = store.begin(key, 'save')!;
  assert.equal(retry.operation, token.operation);
  assert.equal(Object.isFrozen(retry.operation.body), true);
  const currentReplay = assessment({ version: 4, answers: { ...completeAnswers, respiration: 2 } });
  assert.equal(
    await submitAssessment(
      store,
      retry,
      client(async () => ({ kind: 'saved', assessment: currentReplay })),
    ),
    true,
  );
  assert.equal(store.get(key)!.record?.version, 4);
  assert.equal(store.get(key)!.fields.answers.respiration, 2);
  assert.equal(store.hasUnsaved(), false);
});

test('finalization requires a saved complete preview and exact retry survives response loss', async () => {
  const store = createAssessmentDraftStore();
  const key = store.load(assessment());
  assert.equal(store.begin(key, 'finalize'), null);
  assert.equal(store.preview(key), true);
  store.update(key, { answers: { ...completeAnswers, respiration: 1 } });
  assert.equal(store.get(key)!.preview, null);
  assert.equal(store.begin(key, 'finalize'), null);
  const save = store.begin(key, 'save')!;
  store.finish(save, {
    kind: 'saved',
    assessment: assessment({ version: 2, answers: { ...completeAnswers, respiration: 1 } }),
  });
  assert.equal(store.preview(key), true);
  const token = store.begin(key, 'finalize')!;
  await submitAssessment(
    store,
    token,
    client(async () => uncertain),
  );
  const retry = store.begin(key, 'finalize')!;
  assert.equal(retry.operation, token.operation);
  const final = finalAssessment({ version: 3, answers: { ...completeAnswers, respiration: 1 } });
  await submitAssessment(
    store,
    retry,
    client(async () => ({ kind: 'saved', assessment: final })),
  );
  assert.equal(store.get(key)!.record?.status, 'final');
  assert.equal(store.get(key)!.record?.pdf?.status, 'pending');
  store.update(key, { answers: completeAnswers });
  assert.equal(store.get(key)!.fields.answers.respiration, 1);
  assert.equal(store.begin(key, 'save'), null);
});

test('PATCH response loss reconciles only the same next-version record and exact editable fields', async () => {
  const store = createAssessmentDraftStore();
  const key = store.load(assessment());
  store.update(key, { answers: { ...completeAnswers, respiration: 1 } });
  const token = store.begin(key, 'save')!;
  assert.equal(token.operation.kind, 'patch');
  const matching = assessment({ version: 2, answers: { ...completeAnswers, respiration: 1 } });
  assert.equal(patchMatches(matching, token.operation), true);
  for (const mismatch of [
    assessment({ version: 3, answers: matching.answers }),
    assessment({ id: 'other', version: 2, answers: matching.answers }),
    assessment({ version: 2 }),
    assessment({ version: 2, answers: matching.answers, assessedAt: '2026-09-22T08:30:00.000Z' }),
  ])
    assert.equal(patchMatches(mismatch, token.operation), false);
  let reads = 0;
  const ok = await submitAssessment(
    store,
    token,
    client(
      async () => uncertain,
      async () => {
        reads++;
        return matching;
      },
    ),
  );
  assert.equal(ok, true);
  assert.equal(reads, 1);
  assert.equal(store.get(key)!.dirty, false);
});

test('CAS conflicts preserve local fields until explicit keep-local or accept-remote resolution', async () => {
  const store = createAssessmentDraftStore();
  const key = store.load(assessment());
  store.update(key, { answers: { ...completeAnswers, respiration: 2 } });
  const token = store.begin(key, 'save')!;
  await submitAssessment(
    store,
    token,
    client(async () => conflict),
  );
  assert.equal(store.begin(key, 'save'), null);
  store.load(assessment({ version: 3 }));
  assert.equal(store.get(key)!.fields.answers.respiration, 2);
  store.remote(key, assessment({ patientId: 'patient-b', version: 3 }));
  assert.equal(store.get(key)!.remote, null);
  store.remote(key, assessment({ version: 3 }));
  store.resolve(key, true);
  assert.equal(store.get(key)!.fields.answers.respiration, 2);
  assert.equal(store.get(key)!.record?.version, 3);
  assert.equal(store.get(key)!.dirty, true);
  const rebased = store.begin(key, 'save')!;
  assert.equal(rebased.operation.kind === 'patch' && rebased.operation.body.expectedVersion, 3);
  store.finish(rebased, conflict);
  store.remote(key, finalAssessment({ version: 4 }));
  store.resolve(key, true);
  assert.equal(store.get(key)!.record?.status, 'draft');
  store.resolve(key, false);
  assert.equal(store.get(key)!.record?.status, 'final');
  assert.equal(store.get(key)!.fields.answers.respiration, 0);
});

test('logout clear fences late writes; disposed UI never starts a follow-up reconciliation GET', async () => {
  const store = createAssessmentDraftStore();
  const key = store.load(assessment());
  store.update(key, { answers: { ...completeAnswers, respiration: 2 } });
  const token = store.begin(key, 'save')!;
  const request = deferred<AssessmentWriteResult>();
  let reads = 0;
  const pending = submitAssessment(
    store,
    token,
    client(
      () => request.promise,
      async () => {
        reads++;
        return assessment();
      },
    ),
  );
  store.clear();
  request.resolve(uncertain);
  assert.equal(await pending, false);
  assert.equal(reads, 0);
  assert.equal(store.get(key), undefined);
  const next = store.load(assessment());
  store.update(next, { answers: { ...completeAnswers, respiration: 1 } });
  const nextToken = store.begin(next, 'save')!;
  await submitAssessment(
    store,
    nextToken,
    client(
      async () => uncertain,
      async () => {
        reads++;
        return assessment();
      },
    ),
    () => false,
  );
  assert.equal(reads, 0);
  assert.equal(store.get(next)!.pending, nextToken.operation);
  assert.equal(store.get(next)!.busy, false);
});

test('another patient and mismatched write receipt cannot replace or clear this observation', () => {
  const store = createAssessmentDraftStore();
  const first = store.create('patient-a');
  const second = store.create('patient-b');
  const token = store.begin(first, 'save')!;
  assert.equal(
    store.finish(token, { kind: 'saved', assessment: assessment({ patientId: 'patient-b' }) }),
    false,
  );
  assert.equal(store.get(first)!.failure?.uncertain, true);
  assert.equal(store.get(second)!.dirty, true);
  assert.equal(store.get(first)!.record, null);
});

test('correction starts explicitly from a final, requires reason and never changes predecessor', () => {
  const store = createAssessmentDraftStore();
  const predecessor = finalAssessment();
  const before = structuredClone(predecessor);
  const key = store.create('patient-a', predecessor);
  assert.equal(store.get(key)!.predecessorId, predecessor.id);
  assert.equal(store.get(key)!.fields.correctionReason, '');
  assert.equal(store.begin(key, 'save'), null);
  store.update(key, {
    correctionReason: 'Correzione sintetica',
    answers: { ...completeAnswers, respiration: 2 },
  });
  const token = store.begin(key, 'save')!;
  assert.equal(
    token.operation.kind === 'create' && token.operation.body.predecessorId,
    predecessor.id,
  );
  assert.deepEqual(predecessor, before);
  assert.throws(() => store.create('patient-b', predecessor));
  assert.throws(() => store.create('patient-a', finalAssessment({ correctedById: 'correction' })));
});

test('correction preserves original clinical instant including both repeated Rome DST occurrences', () => {
  for (const assessedAt of [
    '2026-09-22T08:30:25.123Z',
    '2026-10-25T00:30:25.123Z',
    '2026-10-25T01:30:25.123Z',
  ]) {
    const store = createAssessmentDraftStore();
    const predecessor = finalAssessment({ assessedAt });
    const key = store.create('patient-a', predecessor);
    const draft = store.get(key)!;
    assert.equal(draft.fields.instantChoice, assessedAt);
    if (assessedAt.startsWith('2026-10-25'))
      assert.equal(draft.fields.assessedAtLocal, '2026-10-25T02:30');
    store.update(key, { correctionReason: 'Rettifica sintetica' });
    assert.equal(assessmentEditable(store.get(key)!.fields, true).assessedAt, assessedAt);
    const token = store.begin(key, 'save')!;
    assert.equal(token.operation.kind === 'create' && token.operation.body.assessedAt, assessedAt);
  }
});
