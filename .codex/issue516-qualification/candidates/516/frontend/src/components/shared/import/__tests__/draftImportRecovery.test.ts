import assert from 'node:assert/strict';
import test from 'node:test';
import type { DraftResponse } from '../../intake/intakeDraftApi';
import { expiredDraftRecovery, draftResumeIntent } from '../draftImportRecovery';
import { assertSessionJob, ImportApiError, ImportSessionApi } from '../importSessionApi';
import { job, json } from './fixtures';

function source() {
  const value = job(7);
  value.status = 'expired';
  value.totalBytes = 0;
  value.manifest.groups = [];
  value.review.draftId = 'draft-one';
  return value;
}
function draft(): DraftResponse {
  return { id: 'draft-one', status: 'draft', version: 4, importJobId: 'job-one', data: {} };
}
function expiry(value = source()): unknown {
  try {
    assertSessionJob(value);
  } catch (error) {
    return error;
  }
  throw new Error('Fixture must produce an authoritative expiry');
}

test('only the exact incomplete saved draft and validated cleared source qualify', () => {
  const value = source();
  assert.deepEqual(expiredDraftRecovery(draft(), expiry(value)), {
    job: value,
    draft: { id: 'draft-one', expectedVersion: 4 },
  });
});

test('uncertain, unavailable or forged terminal responses do not authorize revival', () => {
  for (const error of [
    new TypeError('offline'),
    new ImportApiError('denied', 403),
    new ImportApiError('missing', 404),
    new ImportApiError('unavailable', 503),
    new ImportApiError('unavailable', 503, 'session_terminal', source()),
    new ImportApiError('expired without snapshot', 410, 'session_terminal'),
    new ImportApiError('wrong code', 410, 'other', source()),
    new ImportApiError('cancelled', 410, 'session_terminal', { ...source(), status: 'cancelled' }),
    new ImportApiError('confirmed', 410, 'session_terminal', { ...source(), status: 'confirmed' }),
  ])
    assert.equal(expiredDraftRecovery(draft(), error), null);
});

test('closed, unversioned and differently linked drafts cannot resume by name or appearance', () => {
  for (const value of [
    null,
    { ...draft(), id: 'draft-two' },
    { ...draft(), importJobId: 'job-two' },
    { ...draft(), importJobId: null },
    { ...draft(), status: 'confirmed' },
    { ...draft(), confirmedPatientId: 'patient-one' },
    { ...draft(), version: undefined },
    { ...draft(), version: -1 },
    { ...draft(), version: 1.5 },
  ])
    assert.equal(expiredDraftRecovery(value, expiry()), null);
});

test('malformed protocol and retained source are never presented as cleared recovery', () => {
  for (const mutate of [
    (value: ReturnType<typeof source>) => {
      Object.assign(value.capabilities, { sessionVersion: 2 });
    },
    (value: ReturnType<typeof source>) => {
      value.manifest.revision = -1;
    },
    (value: ReturnType<typeof source>) => {
      value.totalBytes = 1;
    },
    (value: ReturnType<typeof source>) => {
      value.manifest.groups = job().manifest.groups;
    },
    (value: ReturnType<typeof source>) => {
      value.review.draftId = 'other-draft';
    },
  ]) {
    const value = source();
    mutate(value);
    assert.equal(
      expiredDraftRecovery(draft(), new ImportApiError('expired', 410, 'session_terminal', value)),
      null,
    );
  }
});

test('lost-response retry replays the same API key, body and resources exactly', async () => {
  const candidate = expiredDraftRecovery(draft(), expiry())!;
  let generated = 0;
  const intent = draftResumeIntent(candidate, null, () => `intent-${++generated}`);
  const requests: unknown[] = [];
  const api = new ImportSessionApi(async (path, init) => {
    requests.push({ path, body: JSON.parse(String(init?.body)) });
    if (requests.length === 1) throw new TypeError('lost response');
    return json({ ...source(), status: 'uploaded' });
  }, '/jobs');
  await assert.rejects(
    api.resumeDraft(intent.job, intent.draft, intent.requestId),
    /lost response/,
  );
  const retry = draftResumeIntent(candidate, intent, () => `intent-${++generated}`);
  assert.equal(retry, intent);
  assert.equal(generated, 1);
  assert.equal((await api.resumeDraft(retry.job, retry.draft, retry.requestId)).id, 'job-one');
  assert.deepEqual(requests[0], requests[1]);
});

test('changed state cannot silently replace an uncertain intent; explicit reset creates a new one', () => {
  const candidate = expiredDraftRecovery(draft(), expiry())!;
  const previous = draftResumeIntent(candidate, null, () => 'first');
  const updated = { ...candidate, draft: { ...candidate.draft, expectedVersion: 5 } };
  assert.throws(() => draftResumeIntent(updated, previous), /pratica è cambiata/);
  const next = draftResumeIntent(updated, null, () => 'second');
  assert.equal(next.requestId, 'second');
  assert.equal(next.draft.expectedVersion, 5);
  assert.equal(previous.draft.expectedVersion, 4);
  candidate.job.manifest.revision = 99;
  assert.equal(previous.job.manifest.revision, 7);
});
