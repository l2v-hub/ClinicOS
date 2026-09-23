import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAssessmentClient, AssessmentApiError } from '../assessments/assessmentClient';
import { parseAttestationPage } from '../assessments/assessmentAttestations';
import { assessment } from './assessments.fixtures';
import { attestation, attestationsPage, transfersAssessment } from './transfers.fixtures';

test('current is read from a type-filtered endpoint, preserves clinical date, and rejects draft/wrong module', async () => {
  const urls: string[] = [];
  const final = transfersAssessment({ status: 'final' });
  const client = createAssessmentClient('/api', {}, async (url) => {
    urls.push(String(url));
    return Response.json({ assessment: final });
  });
  assert.equal(
    (await client.current('patient-a', 'postural_transfers'))?.assessedAt,
    final.assessedAt,
  );
  assert.match(urls[0], /\/assessments\/current\?type=postural_transfers$/);
  for (const invalid of [assessment(), transfersAssessment()]) {
    const bad = createAssessmentClient('/api', {}, async () =>
      Response.json({ assessment: invalid }),
    );
    await assert.rejects(bad.current('patient-a', 'postural_transfers'));
  }
  const empty = createAssessmentClient('/api', {}, async () => Response.json({ assessment: null }));
  assert.equal(await empty.current('patient-a', 'postural_transfers'), null);
});

test('history filters type before pagination and structured 422 paths survive to the UI', async () => {
  const client = createAssessmentClient('/api', {}, async (url, init) => {
    if (init?.method === 'POST')
      return Response.json(
        { code: 'assessment_incomplete', missingPaths: ['aids.rollator.ownership', 'walking'] },
        { status: 422 },
      );
    const query = new URL(String(url), 'https://synthetic.invalid').searchParams;
    assert.equal(query.get('type'), 'postural_transfers');
    assert.equal(query.get('cursor'), 'opaque');
    assert.equal(query.get('limit'), '25');
    return Response.json({
      items: [transfersAssessment()],
      pageInfo: { loadedCount: 1, hasMore: false, nextCursor: null },
    });
  });
  await client.page('patient-a', { type: 'postural_transfers', cursor: 'opaque' });
  const result = await client.write('patient-a', {
    kind: 'finalize',
    id: 'transfers-a',
    body: { expectedVersion: 1, requestId: 'synthetic-request' },
  });
  assert.deepEqual(result.kind === 'failed' && result.failure.missingPaths, [
    'aids.rollator.ownership',
    'walking',
  ]);
});

test('personal confirmation response loss replays exact assessment/hash/kind and checks authenticated actor receipt', async () => {
  const bodies: string[] = [];
  const urls: string[] = [];
  const client = createAssessmentClient(
    '/api',
    { 'X-Operator-Id': 'operator-a' },
    async (url, init) => {
      urls.push(String(url));
      bodies.push(String(init?.body));
      if (bodies.length === 1) throw new Error('response lost');
      return Response.json({ attestation: attestation(), replayed: true });
    },
  );
  const body = Object.freeze({
    kind: 'physiotherapist_confirmation' as const,
    snapshotSha256: 'a'.repeat(64),
  });
  await assert.rejects(client.attest('patient-a', 'transfers-a', body, 'operator-a'));
  const receipt = await client.attest('patient-a', 'transfers-a', body, 'operator-a');
  assert.equal(receipt.replayed, true);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(urls[0], '/api/patients/patient-a/assessments/transfers-a/attestations');
  await assert.rejects(client.attest('patient-a', 'transfers-a', body, 'operator-b'));
  const forbidden = createAssessmentClient('/api', {}, async () =>
    Response.json({ code: 'assessment_attestation_forbidden' }, { status: 403 }),
  );
  await assert.rejects(
    forbidden.attest('patient-a', 'transfers-a', body),
    (error) => error instanceof AssessmentApiError && !error.failure.uncertain,
  );
});

test('attestation page binds counts/events to exact snapshot, rejects malformed cursors and fabricated actor/hash', () => {
  const page = attestationsPage();
  assert.equal(parseAttestationPage(page, 'transfers-a', 'a'.repeat(64)), page);
  for (const bad of [
    attestationsPage({ assessmentId: 'other' }),
    attestationsPage({ snapshotSha256: 'b'.repeat(64) }),
    attestationsPage({ items: [attestation({ snapshotSha256: 'b'.repeat(64) })] }),
    attestationsPage({ pageInfo: { loadedCount: 1, hasMore: true, nextCursor: null } }),
    attestationsPage({ counts: { physiotherapist_confirmation: -1, operator_acknowledgement: 0 } }),
  ])
    assert.throws(() => parseAttestationPage(bad, 'transfers-a', 'a'.repeat(64)));
});
