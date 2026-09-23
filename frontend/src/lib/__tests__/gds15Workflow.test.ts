import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createAssessmentDraftStore,
  submitAssessment,
  patchMatches,
} from '../assessments/assessmentDraftStore';
import { createAssessmentClient } from '../assessments/assessmentClient';
import { emptyGds15Answers } from '../assessments/gds15Definition';
import { ASSESSMENT_VERSIONS } from '../assessments/assessmentTypes';
import { completeGds15, gds15Assessment } from './gds15.fixtures';
import { finalAssessment, uncertain, deferred } from './assessments.fixtures';

test('GDS private local drafts separate patient/type; correction retains predecessor instant and exact retries', () => {
  const store = createAssessmentDraftStore();
  const keys = Object.keys(ASSESSMENT_VERSIONS).map((type) =>
    store.create('patient-a', undefined, type as keyof typeof ASSESSMENT_VERSIONS),
  );
  assert.equal(new Set(keys).size, 5);
  assert.equal(store.list('patient-b', 'gds15').length, 0);
  assert.equal(store.list('patient-a', 'gds15').length, 1);
  assert.deepEqual(store.get(keys[4])!.fields.answers, emptyGds15Answers());
  const predecessor = gds15Assessment({ status: 'final' }),
    before = structuredClone(predecessor);
  const key = store.create('patient-a', predecessor);
  assert.equal(store.begin(key, 'save'), null);
  const answers = completeGds15(false);
  store.update(key, { answers, correctionReason: 'Rettifica sintetica' });
  answers.notes = 'External mutation';
  const token = store.begin(key, 'save')!;
  assert.equal(token.operation.kind, 'create');
  if (token.operation.kind !== 'create') throw new Error('Expected create');
  assert.equal(token.operation.body.type, 'gds15');
  assert.equal(token.operation.body.formVersion, ASSESSMENT_VERSIONS.gds15);
  assert.equal(token.operation.body.assessedAt, predecessor.assessedAt);
  assert.equal(token.operation.body.predecessorId, predecessor.id);
  assert.equal(Object.isFrozen(token.operation.body.answers), true);
  assert.notEqual((token.operation.body.answers as typeof answers).notes, answers.notes);
  store.finish(token, uncertain);
  store.update(key, { answers: emptyGds15Answers() });
  assert.equal(store.begin(key, 'save')!.operation, token.operation);
  assert.deepEqual(predecessor, before);
});

test('GDS missing fields and invalid notes block finalization; preview is bound to exact saved answers and CAS version', () => {
  const store = createAssessmentDraftStore();
  const key = store.load(gds15Assessment({ answers: emptyGds15Answers() }));
  assert.equal(store.preview(key), false);
  assert.equal(store.get(key)!.failure!.missingPaths!.length, 15);
  assert.equal(store.begin(key, 'finalize'), null);
  const complete = store.load(gds15Assessment({ id: 'complete' }));
  assert.equal(store.preview(complete), true);
  for (const notes of ['😀'.repeat(4001), '\ud800', '\udfff']) {
    store.update(complete, { answers: { ...completeGds15(), notes } });
    assert.equal(store.get(complete)!.preview, null);
    assert.equal(store.begin(complete, 'save'), null);
    assert.deepEqual(store.get(complete)!.failure!.missingPaths, ['notes']);
    assert.equal(store.begin(complete, 'finalize'), null);
  }
  store.update(complete, { answers: completeGds15(false) });
  const save = store.begin(complete, 'save')!;
  assert.equal(save.operation.kind, 'patch');
  const saved = gds15Assessment({ id: 'complete', version: 2, answers: completeGds15(false) });
  assert.equal(patchMatches(saved, save.operation), true);
  store.finish(save, { kind: 'saved', assessment: saved });
  assert.equal(store.preview(complete), true);
  const finalize = store.begin(complete, 'finalize')!;
  assert.equal(
    finalize.operation.kind === 'finalize' && finalize.operation.body.expectedVersion,
    2,
  );
  store.finish(finalize, {
    kind: 'saved',
    assessment: gds15Assessment({
      id: 'complete',
      version: 3,
      status: 'final',
      answers: completeGds15(false),
    }),
  });
  assert.equal(store.begin(complete, 'save'), null);
});

test('GDS current/history enforce typed responses; logout and wrong-patient replies cannot populate another draft', async () => {
  const final = gds15Assessment({ status: 'final' });
  const history = Object.fromEntries(
    Object.entries(final).filter(
      ([key]) => !['answers', 'finalSnapshot', 'snapshotSha256'].includes(key),
    ),
  );
  const client = createAssessmentClient('/api', {}, async (url) => {
    assert.equal(
      new URL(String(url), 'https://synthetic.invalid').searchParams.get('type'),
      'gds15',
    );
    return Response.json(
      String(url).includes('/current')
        ? { assessment: final }
        : { items: [history], pageInfo: { loadedCount: 1, hasMore: false, nextCursor: null } },
    );
  });
  assert.equal((await client.current('patient-a', 'gds15'))!.type, 'gds15');
  assert.equal((await client.page('patient-a', { type: 'gds15' })).items.length, 1);
  const wrong = createAssessmentClient('/api', {}, async () =>
    Response.json({ assessment: finalAssessment() }),
  );
  await assert.rejects(wrong.current('patient-a', 'gds15'));
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'gds15');
  const token = store.begin(key, 'save')!;
  const pending = deferred<Response>();
  const writing = submitAssessment(
    store,
    token,
    createAssessmentClient('/api', {}, () => pending.promise),
  );
  store.clear();
  const next = store.create('patient-b', undefined, 'gds15');
  pending.resolve(
    Response.json({
      assessment: gds15Assessment(),
      requestId: token.operation.kind === 'create' ? token.operation.body.requestId : '',
      replayed: false,
    }),
  );
  assert.equal(await writing, false);
  assert.equal(store.list('patient-a', 'gds15').length, 0);
  assert.deepEqual(store.get(next)!.fields.answers, emptyGds15Answers());
  const other = store.begin(next, 'save')!;
  assert.equal(store.finish(other, { kind: 'saved', assessment: final }), false);
  assert.equal(store.get(next)!.failure?.uncertain, true);
  assert.equal(store.get(next)!.record, null);
});

test('GDS stale-save reconciliation preserves explicit local answers and rejects changed saved content', () => {
  const store = createAssessmentDraftStore(),
    original = gds15Assessment();
  const key = store.load(original);
  store.update(key, { answers: completeGds15(false) });
  const token = store.begin(key, 'save')!;
  store.finish(token, {
    kind: 'failed',
    failure: { code: 'assessment_version_conflict', message: 'Conflict', uncertain: false },
  });
  const remote = gds15Assessment({ version: 3 });
  store.remote(key, remote);
  store.resolve(key, true);
  assert.deepEqual(store.get(key)!.fields.answers, completeGds15(false));
  const rebased = store.begin(key, 'save')!;
  assert.equal(rebased.operation.kind === 'patch' && rebased.operation.body.expectedVersion, 3);
  assert.equal(patchMatches(gds15Assessment({ version: 4 }), rebased.operation), false);
  assert.equal(
    patchMatches(gds15Assessment({ version: 4, answers: completeGds15(false) }), rebased.operation),
    true,
  );
});
