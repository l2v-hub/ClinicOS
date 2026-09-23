import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAssessmentClient } from '../assessments/assessmentClient';
import { createAssessmentDraftStore, submitAssessment } from '../assessments/assessmentDraftStore';
import type { AssessmentOperation } from '../assessments/assessmentTypes';
import { PAINAD_VERSION } from '../assessments/assessmentTypes';
import { assessment, finalAssessment, completeAnswers } from './assessments.fixtures';
const create: AssessmentOperation = {
  kind: 'create',
  body: {
    requestId: '65d8ba8c-fd39-4d38-a626-858d9b85cab8',
    type: 'painad',
    formVersion: PAINAD_VERSION,
    assessedAt: assessment().assessedAt,
    answers: completeAnswers,
  },
};
const json = (value: unknown, status = 200) => Response.json(value, { status });

test('client captures session authority and sends scoped no-store bounded requests', async () => {
  const headers = new Headers({ 'X-Operator-Id': 'operator-a' });
  const seen: { url: string; init: RequestInit }[] = [];
  const client = createAssessmentClient('/api', headers, async (url, init) => {
    seen.push({ url: String(url), init: init! });
    return json({ items: [], pageInfo: { loadedCount: 0, hasMore: false, nextCursor: null } });
  });
  headers.set('X-Operator-Id', 'operator-b');
  await client.page('patient-a', {
    status: 'final',
    from: '2026-09-01',
    to: '2026-09-30',
    cursor: 'opaque + /',
  });
  const url = new URL(seen[0].url, 'https://synthetic.invalid');
  assert.equal(url.pathname, '/api/patients/patient-a/assessments');
  assert.equal(url.searchParams.get('limit'), '25');
  assert.equal(url.searchParams.get('type'), 'painad');
  assert.equal(url.searchParams.get('cursor'), 'opaque + /');
  assert.equal(url.searchParams.get('status'), 'final');
  assert.equal(new Headers(seen[0].init.headers).get('X-Operator-Id'), 'operator-a');
  assert.equal(seen[0].init.cache, 'no-store');
  assert.equal(seen[0].init.signal instanceof AbortSignal, true);
  await assert.rejects(client.page('../other'));
  assert.equal(seen.length, 1);
});

test('create response loss replays identical bytes and accepts current edited draft', async () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a');
  store.update(key, { answers: completeAnswers });
  const bodies: string[] = [];
  const client = createAssessmentClient('/api', {}, async (_url, init) => {
    bodies.push(String(init?.body));
    if (bodies.length === 1) throw new TypeError('response lost');
    const input = JSON.parse(String(init?.body));
    return json({
      assessment: assessment({ version: 3, answers: { ...completeAnswers, respiration: 2 } }),
      requestId: input.requestId,
      replayed: true,
    });
  });
  const token = store.begin(key, 'save')!;
  assert.equal(await submitAssessment(store, token, client), false);
  const retry = store.begin(key, 'save')!;
  assert.equal(await submitAssessment(store, retry, client), true);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(store.get(key)!.fields.answers.respiration, 2);
});

test('finalize response loss replays request before CAS and ready document remains linked', async () => {
  const store = createAssessmentDraftStore();
  const key = store.load(assessment());
  store.preview(key);
  const bodies: string[] = [];
  const client = createAssessmentClient('/api', {}, async (url, init) => {
    assert.match(String(url), /\/assessment-a\/finalize$/);
    bodies.push(String(init?.body));
    if (bodies.length === 1) throw new TypeError('response lost');
    const input = JSON.parse(String(init?.body));
    return json({
      assessment: finalAssessment({
        pdf: { status: 'ready', documentId: 'document-a', retryAvailable: false, errorCode: null },
      }),
      requestId: input.requestId,
      replayed: true,
    });
  });
  await submitAssessment(store, store.begin(key, 'finalize')!, client);
  assert.equal(await submitAssessment(store, store.begin(key, 'finalize')!, client), true);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(store.get(key)!.record?.pdf?.documentId, 'document-a');
});

test('wrong patient, record, idempotency receipt or final snapshot is never reported saved', async () => {
  for (const body of [
    {
      assessment: assessment({ patientId: 'patient-b' }),
      requestId: create.body.requestId,
      replayed: false,
    },
    { assessment: assessment(), requestId: 'different', replayed: false },
    { assessment: assessment(), requestId: create.body.requestId },
    {
      assessment: finalAssessment({ finalSnapshot: null }),
      requestId: 'different',
      replayed: false,
    },
  ]) {
    const client = createAssessmentClient('/api', {}, async () => json(body));
    const result = await client.write('patient-a', create);
    assert.equal(result.kind, 'failed');
    assert.equal(result.kind === 'failed' && result.failure.uncertain, true);
  }
  const client = createAssessmentClient('/api', {}, async () =>
    json({ assessment: assessment({ id: 'other' }) }),
  );
  await assert.rejects(client.get('patient-a', 'assessment-a'));
  const result = await client.write('patient-a', {
    kind: 'patch',
    id: 'assessment-a',
    body: { expectedVersion: 1, assessedAt: assessment().assessedAt, answers: completeAnswers },
  });
  assert.equal(result.kind, 'failed');
});

test('known conflicts are actionable; 503, malformed success and unknown failures stay uncertain', async () => {
  for (const [status, code, uncertain] of [
    [409, 'assessment_version_conflict', false],
    [422, 'assessment_incomplete', false],
    [503, 'scope_unavailable', true],
    [403, 'unknown', true],
  ] as const) {
    const client = createAssessmentClient('/api', {}, async () => json({ code }, status));
    const result = await client.write('patient-a', create);
    assert.equal(result.kind === 'failed' && result.failure.uncertain, uncertain);
  }
  const malformed = createAssessmentClient(
    '/api',
    {},
    async () => new Response('not JSON', { status: 200 }),
  );
  const result = await malformed.write('patient-a', create);
  assert.equal(result.kind === 'failed' && result.failure.uncertain, true);
});

test('PDF retry uses existing assessment ID, never create/finalize or a draft response', async () => {
  const seen: string[] = [];
  const client = createAssessmentClient('/api', {}, async (url, init) => {
    seen.push(String(url));
    assert.equal(init?.method, 'POST');
    assert.equal(init?.body, '{}');
    return json({
      assessment: finalAssessment({
        pdf: {
          status: 'failed',
          documentId: null,
          errorCode: 'render_failed',
          retryAvailable: true,
        },
      }),
    });
  });
  assert.equal((await client.retryPdf('patient-a', 'assessment-a')).status, 'final');
  assert.deepEqual(seen, ['/api/patients/patient-a/assessments/assessment-a/pdf/retry']);
  const wrong = createAssessmentClient('/api', {}, async () => json({ assessment: assessment() }));
  await assert.rejects(wrong.retryPdf('patient-a', 'assessment-a'));
});
