import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createAssessmentDraftStore,
  patchMatches,
  submitAssessment,
} from '../assessments/assessmentDraftStore';
import { createAssessmentClient } from '../assessments/assessmentClient';
import { emptyMnaAnswers, mnaResult } from '../assessments/mnaDefinition';
import {
  updateMnaInput,
  mnaHasInputErrors,
  mnaVisibleAnswers,
} from '../assessments/mnaLocalInputs';
import type { MnaAnswers, MnaInputPath } from '../assessments/mnaTypes';
import { mnaAssessment, completeMna } from './mna.fixtures';
import { assertAssessment } from '../assessments/assessmentValidation';
import { finalAssessment } from './assessments.fixtures';
import { mnaAssessmentDate, mnaAssessmentInstants, mnaLocalMinute } from '../assessments/mnaTime';
import { assessmentEditable, assessmentFields } from '../assessments/assessmentTime';
import { mnaAge } from '../assessments/mnaValidation';

test('raw invalid measures/dates remain dirty and visible across navigation, blocking save/preview/finalize until corrected', () => {
  const store = createAssessmentDraftStore();
  const key = store.load(mnaAssessment());
  const input = (path: MnaInputPath, raw: string) => {
    const fields = store.get(key)!.fields;
    store.update(key, updateMnaInput(fields.answers as MnaAnswers, fields.mnaInputs, path, raw));
  };
  input('measurements.weightKg', '60');
  input('measurements.heightCm', '170');
  let fields = store.get(key)!.fields;
  assert.deepEqual((fields.answers as MnaAnswers).F, { method: 'measured' });
  input('measurements.weightKg', '60oops');
  input('measurementDates.heightCm', '2026-02-30');
  store.create('patient-b', undefined, 'painad');
  assert.equal(store.load(mnaAssessment()), key);
  fields = store.get(key)!.fields;
  assert.equal(fields.mnaInputs?.raw['measurements.weightKg'], '60oops');
  assert.equal(mnaHasInputErrors(fields.answers as MnaAnswers, fields.mnaInputs), true);
  assert.equal(
    mnaResult(mnaVisibleAnswers(fields.answers as MnaAnswers, fields.mnaInputs)).screening,
    null,
  );
  assert.equal(store.begin(key, 'save'), null);
  assert.equal(store.preview(key), false);
  assert.equal(store.begin(key, 'finalize'), null);
  assert.equal(store.hasUnsaved(), true);
  assert.equal(store.get(key)!.pending, null);
  input('measurements.weightKg', '61,5');
  input('measurementDates.heightCm', '2026-02-28');
  const token = store.begin(key, 'save')!;
  assert.equal(token.operation.kind, 'patch');
  assert.equal('mnaInputs' in token.operation.body, false);
  if (token.operation.kind !== 'patch') throw new Error('Expected patch');
  assert.equal((token.operation.body.answers as MnaAnswers).measurements.weightKg, 61.5);
  assert.deepEqual((token.operation.body.answers as MnaAnswers).F, { method: 'measured' });
  assert.equal(
    Object.isFrozen((token.operation.body.answers as MnaAnswers).measurementDates),
    true,
  );
});
test('atomic measured transitions retain unrelated G–R and date inputs; clearing does not revive a hidden category', () => {
  let state = {
    answers: completeMna(),
    mnaInputs: undefined as ReturnType<typeof updateMnaInput>['mnaInputs'] | undefined,
  };
  state = updateMnaInput(
    state.answers,
    state.mnaInputs,
    'measurementDates.armCircumferenceCm',
    '2026-01-01',
  );
  state = updateMnaInput(state.answers, state.mnaInputs, 'measurements.armCircumferenceCm', '21');
  assert.deepEqual(state.answers.Q, { method: 'measured' });
  assert.equal(state.answers.P, 'better');
  state = updateMnaInput(state.answers, state.mnaInputs, 'measurements.armCircumferenceCm', '');
  assert.deepEqual(state.answers.Q, { method: 'measured' });
  assert.equal(state.answers.measurements.armCircumferenceCm, null);
  assert.equal(state.answers.measurementDates.armCircumferenceCm, '2026-01-01');
  state = updateMnaInput(state.answers, state.mnaInputs, 'measurements.heightCm', '170');
  assert.equal(state.answers.F.method, 'category');
  state = updateMnaInput(state.answers, state.mnaInputs, 'measurements.weightKg', '60');
  assert.deepEqual(state.answers.F, { method: 'measured' });
  const before = structuredClone(state.answers);
  const screening = { ...state.answers, extent: 'screening' as const };
  assert.deepEqual({ ...screening, extent: 'full' }, before);
  assert.equal(mnaResult(screening).total, null);
});
test('raw metadata is copied, preserved on keep-local conflict and discarded on accepting remote/session clear', () => {
  const store = createAssessmentDraftStore();
  const key = store.load(mnaAssessment());
  const fields = updateMnaInput(completeMna(), undefined, 'measurements.weightKg', 'invalid');
  store.update(key, fields);
  fields.mnaInputs.raw['measurements.weightKg'] = 'mutated outside';
  assert.equal(store.get(key)!.fields.mnaInputs?.raw['measurements.weightKg'], 'invalid');
  store.remote(key, mnaAssessment({ version: 2 }));
  store.resolve(key, true);
  assert.equal(store.get(key)!.fields.mnaInputs?.raw['measurements.weightKg'], 'invalid');
  assert.equal(store.begin(key, 'save'), null);
  store.remote(key, mnaAssessment({ version: 3 }));
  store.resolve(key, false);
  assert.equal(store.get(key)!.fields.mnaInputs, undefined);
  assert.equal(store.get(key)!.dirty, false);
  store.clear();
  assert.equal(store.list('patient-a', 'mna').length, 0);
});
test('screening finalization keeps partial global responses; full requires all K; correction/retry remains immutable', () => {
  const store = createAssessmentDraftStore();
  const answers = {
    ...completeMna(),
    extent: 'screening' as const,
    K: { dairyDaily: true, eggsOrLegumesWeekly: null, meatFishOrPoultryDaily: false },
  };
  const key = store.load(mnaAssessment({ answers }));
  assert.equal(store.preview(key), true);
  const token = store.begin(key, 'finalize')!;
  assert.equal(token.operation.kind, 'finalize');
  const final = mnaAssessment({ answers, status: 'final', version: 2 });
  store.finish(token, { kind: 'saved', assessment: final });
  assert.deepEqual(final.finalSnapshot!.answers.K, answers.K);
  assert.equal(final.result.total, null);
  assert.equal(store.begin(key, 'save'), null);
  const full = store.load(mnaAssessment({ id: 'full', answers: { ...answers, extent: 'full' } }));
  assert.equal(store.preview(full), false);
  assert.deepEqual(store.get(full)!.failure?.missingPaths, ['K.eggsOrLegumesWeekly']);
  const correction = store.create('patient-a', final);
  store.update(correction, {
    correctionReason: 'Rettifica sintetica',
    answers: { ...answers, extent: 'full' },
  });
  const create = store.begin(correction, 'save')!;
  store.finish(create, {
    kind: 'failed',
    failure: { code: 'network', message: 'Incerto', uncertain: true },
  });
  store.update(correction, { answers: emptyMnaAnswers() });
  assert.equal(store.begin(correction, 'save')!.operation, create.operation);
  assert.equal(final.extent, 'screening');
});
test('CAS reconciliation compares actual dates/method/extent and client validates patient/type/session scope', async () => {
  const answers = completeMna();
  const row = mnaAssessment({ answers, version: 2 });
  const operation = {
    kind: 'patch' as const,
    id: row.id,
    body: { expectedVersion: 1, assessedAt: row.assessedAt, answers },
  };
  assert.equal(patchMatches(row, operation), true);
  assert.equal(
    patchMatches(
      mnaAssessment({ answers: { ...answers, extent: 'screening' }, version: 2 }),
      operation,
    ),
    false,
  );
  assert.equal(
    patchMatches(
      mnaAssessment({
        answers: {
          ...answers,
          measurementDates: { ...answers.measurementDates, weightKg: '2026-01-01' },
        },
        version: 2,
      }),
      operation,
    ),
    false,
  );
  const client = createAssessmentClient('/api', {}, async (url) => {
    assert.equal(new URL(String(url), 'https://synthetic.invalid').searchParams.get('type'), 'mna');
    return Response.json({ assessment: mnaAssessment({ status: 'final' }) });
  });
  assert.equal((await client.current('patient-a', 'mna'))!.type, 'mna');
  const wrong = createAssessmentClient('/api', {}, async () =>
    Response.json({ assessment: finalAssessment() }),
  );
  await assert.rejects(wrong.current('patient-a', 'mna'));
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'mna');
  const token = store.begin(key, 'save')!;
  let resolve!: (value: Response) => void;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  const saving = submitAssessment(
    store,
    token,
    createAssessmentClient('/api', {}, () => pending),
  );
  store.clear();
  resolve(
    Response.json({
      assessment: mnaAssessment(),
      requestId: token.operation.kind === 'create' ? token.operation.body.requestId : '',
      replayed: false,
    }),
  );
  assert.equal(await saving, false);
  assert.equal(store.list('patient-a', 'mna').length, 0);
});
test('MNA date handling pads AD years, preserves exact loaded instants and resolves modern DST separately', () => {
  assert.equal(mnaAssessmentDate('0001-01-01T00:00:00.000Z'), '0001-01-01');
  assert.match(mnaLocalMinute('0001-01-01T00:00:00.000Z'), /^0001-/);
  assert.equal(mnaAssessmentDate('9999-12-31T21:00:00.000Z'), '9999-12-31');
  for (const invalid of ['0000-01-01T00:00:00.000Z', '9999-12-31T23:30:00.000Z'])
    assert.throws(() => mnaAssessmentDate(invalid));
  assert.equal(mnaAssessmentInstants('2026-03-29T02:30').length, 0);
  assert.equal(mnaAssessmentInstants('2026-10-25T02:30').length, 2);
  assert.deepEqual(mnaAssessmentInstants('bad'), []);
  for (const assessedAt of ['0001-01-01T00:00:00.000Z', '9999-12-31T21:00:00.000Z']) {
    const record = mnaAssessment({ assessedAt, status: 'final' });
    assert.doesNotThrow(() => assertAssessment(record, 'patient-a'));
    assert.equal(assessmentEditable(assessmentFields(record), false, 'mna').assessedAt, assessedAt);
  }
  assert.equal(mnaAssessmentDate('2026-09-22T23:30:00.000Z'), '2026-09-23');
  assert.equal(mnaAge('2000-02-29', '2025-02-28'), 24);
  assert.equal(mnaAge('2000-02-29', '2025-03-01'), 25);
  assert.equal(mnaAge('2030-01-01', '2026-01-01'), null);
});
test('MNA detail validates all retained data, snapshot K text, source, age and final hash', () => {
  const final = mnaAssessment({ status: 'final' });
  assert.doesNotThrow(() => assertAssessment(final, 'patient-a'));
  const mutations = [
    (r: typeof final) => {
      r.snapshotSha256 = null;
    },
    (r: typeof final) => {
      r.extent = 'screening';
    },
    (r: typeof final) => {
      r.finalSnapshot!.copyright = 'changed';
    },
    (r: typeof final) => {
      r.finalSnapshot!.demographics.ageOnDate = '2026-10-24';
    },
    (r: typeof final) => {
      r.finalSnapshot!.items[10].subitems![0].label = 'changed';
    },
    (r: typeof final) => {
      delete r.finalSnapshot!.items[10].subitems;
    },
    (r: typeof final) => {
      r.finalSnapshot!.answers.measurementDates.weightKg = '2026-01-01';
    },
    (r: typeof final) => {
      r.result.global = { score: 15.5, maximum: 16 };
    },
    (r: typeof final) => {
      r.completion.global.answeredCount = 11;
    },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(final);
    mutate(bad);
    assert.throws(() => assertAssessment(bad, 'patient-a'));
  }
  assert.throws(() => assertAssessment(final, 'patient-b'));
  assert.throws(() => assertAssessment(final, 'patient-a', final.id, 'painad'));
});
