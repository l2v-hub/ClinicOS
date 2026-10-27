import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSessionJob,
  canStartNewImport,
  ImportApiError,
  ImportSessionApi,
} from '../importSessionApi';
import { job, json } from './fixtures';
import {
  importFailureMessage,
  importRecoveryPresentation,
  isUnavailableSession,
} from '../importSessionRecovery';

const now = new Date('2026-10-09T18:00:00Z');
const presentation = (override: Partial<Parameters<typeof importRecoveryPresentation>[0]> = {}) =>
  importRecoveryPresentation({
    job: job(),
    opening: false,
    error: false,
    terminal: false,
    pendingUpload: false,
    now,
    ...override,
  });

for (const [status, expected] of [
  ['expired', 'La sessione è scaduta.'],
  ['cancelled', 'La sessione è stata eliminata.'],
  ['confirmed', 'Questa importazione è già conclusa.'],
])
  test(`verified ${status} has a distinct explanation without clinical payload`, () => {
    assert.throws(
      () => assertSessionJob({ ...job(), status }),
      (error: unknown) => {
        assert.ok(error instanceof ImportApiError);
        assert.ok(error.message.startsWith(expected));
        assert.equal(error.code, 'session_terminal');
        if (status === 'expired') assert.equal(error.job?.status, 'expired');
        else assert.equal(error.job, undefined);
        assert.equal(canStartNewImport(error), true);
        return true;
      },
    );
  });

test('only session GET normalizes masked 404; resource 404 never proves session deletion', async () => {
  const api = new ImportSessionApi(
    async () => json({ error: 'Synthetic masked resource' }, 404),
    '/jobs',
  );
  await assert.rejects(api.get('opaque'), (error: unknown) => {
    assert.ok(error instanceof ImportApiError);
    assert.match(error.message, /La sessione non è disponibile/);
    assert.doesNotMatch(error.message, /eliminata|scaduta|conclusa/);
    return true;
  });
  await assert.rejects(api.result('opaque'), (error: unknown) => {
    assert.ok(error instanceof ImportApiError);
    assert.equal(error.message, 'Synthetic masked resource');
    assert.notEqual(error.code, 'session_terminal');
    return true;
  });
});

test('temporary HTTP and network failures remain retryable, without reset authorization', async () => {
  for (const error of [
    new ImportApiError('temporarily unavailable', 503),
    new TypeError('offline'),
    new ImportApiError('denied', 403),
  ]) {
    const api = new ImportSessionApi(async () => {
      throw error;
    }, '/jobs');
    await assert.rejects(api.get('opaque'), (actual: unknown) => {
      assert.equal(actual, error);
      assert.equal(canStartNewImport(actual), false);
      return true;
    });
  }
});

test('nested missing result/page is not a terminal session; explicit closed code is terminal', () => {
  assert.equal(isUnavailableSession(new ImportApiError('missing page', 404)), false);
  assert.equal(isUnavailableSession(new ImportApiError('missing session', 404), true), true);
  assert.equal(isUnavailableSession(new ImportApiError('closed', 409, 'session_closed')), true);
  assert.match(
    importFailureMessage(new ImportApiError('closed', 409, 'session_closed')),
    /non è più modificabile/,
  );
});
test('only verified future/undated active saved pages offer qualified resumption', () => {
  const value = { ...job(), manifest: { ...job().manifest, pages: [{} as never] } };
  assert.match(
    presentation({ job: value }).footer,
    /pagine già salvate finché la sessione resta disponibile/,
  );
  assert.equal(presentation({ job: value }).closeLabel, 'Chiudi e riprendi la sessione');
  const future = { ...value, expiresAt: '2026-10-10T18:00:00Z' };
  assert.equal(
    presentation({ job: future }).expiresAt?.getTime(),
    new Date(future.expiresAt).getTime(),
  );
  for (const override of [
    { opening: true },
    { error: true },
    { terminal: true },
    { pendingUpload: true },
    { job: null },
    ...['expired', 'cancelled', 'confirmed'].map((status) => ({ job: { ...value, status } })),
    ...['invalid', now.toISOString(), '2026-10-08T18:00:00Z'].map((expiresAt) => ({
      job: { ...value, expiresAt },
    })),
  ]) {
    const ui = presentation({ job: value, ...override });
    assert.doesNotMatch(ui.footer, /pagine già salvate|Chiudendo|conserv/);
    assert.equal(ui.closeLabel, 'Chiudi importazione');
    assert.equal(ui.expiresAt, null);
  }
  assert.match(presentation().footer, /Sessione pronta/);
});
test('unknown temporary failure never promises preservation or fabricates a terminal reason', () => {
  for (const error of [new TypeError('network'), new ImportApiError('backend unavailable', 503)]) {
    assert.match(importFailureMessage(error), /Disponibilità della sessione non verificata/);
    assert.doesNotMatch(importFailureMessage(error), /conservata|eliminata|scaduta|conclusa/);
    assert.doesNotMatch(importFailureMessage(error), /non è stata avviata/);
  }
});

function expiredPractice() {
  return {
    ...job(7),
    status: 'expired',
    totalBytes: 0,
    manifest: { ...job(7).manifest, groups: [], pages: [] },
    review: { ...job().review, draftId: 'draft-one' },
  };
}

test('expired GET preserves the authoritative session snapshot for an explicit saved-practice recovery', async () => {
  const snapshot = expiredPractice();
  const api = new ImportSessionApi(async () => json(snapshot), '/jobs');
  await assert.rejects(api.get(snapshot.id), (error: unknown) => {
    assert.ok(error instanceof ImportApiError);
    assert.equal(error.status, 410);
    assert.equal(error.code, 'session_terminal');
    assert.deepEqual(error.job, snapshot);
    assert.doesNotMatch(error.message, /draft-one|job-one/);
    return true;
  });
});

test('malformed expired snapshots never authorize recovery', () => {
  for (const malformed of [
    { ...expiredPractice(), id: '' },
    { ...expiredPractice(), manifest: { ...job().manifest, revision: undefined } },
    { ...expiredPractice(), manifest: { ...job().manifest, revision: -1 } },
    { ...expiredPractice(), capabilities: undefined },
    { ...expiredPractice(), documents: null },
  ]) {
    assert.throws(
      () => assertSessionJob(malformed as never),
      (error: unknown) => {
        assert.equal(canStartNewImport(error), false);
        assert.equal(error instanceof ImportApiError && !!error.job, false);
        return true;
      },
    );
  }
});

test('explicit same-practice resume preserves caller intent across a lost-response retry', async () => {
  const snapshot = { ...expiredPractice(), id: 'opaque/job' };
  const response = { ...snapshot, status: 'uploaded', manifest: { ...job(8).manifest } };
  const requests: { path: string; init?: RequestInit }[] = [];
  const api = new ImportSessionApi(async (path, init) => {
    requests.push({ path, init });
    return json(response);
  }, '/jobs');
  const draft = { id: 'draft-one', expectedVersion: 4 };
  assert.deepEqual(await api.resumeDraft(snapshot, draft, 'same-intent'), response);
  assert.deepEqual(await api.resumeDraft(snapshot, draft, 'same-intent'), response);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.path, '/jobs/opaque%2Fjob/reopen');
    assert.equal(request.init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(request.init?.body)), {
      expectedRevision: 7,
      requestId: 'same-intent',
      resumeDraft: draft,
    });
    assert.equal(request.init?.cache, 'no-store');
  }
});

test('ordinary process retry and reopen retain their original expectedRevision-only protocol', async () => {
  for (const action of ['process', 'retry', 'reopen'] as const) {
    const api = new ImportSessionApi(async (path, init) => {
      assert.equal(path, '/jobs/job-one/' + action);
      assert.deepEqual(JSON.parse(String(init?.body)), { expectedRevision: 7 });
      return json(job(8));
    }, '/jobs');
    assert.equal((await api.action(job(7), action)).manifest.revision, 8);
  }
});

test('explicit resume preserves server refusal and performs no automatic retry or new import', async () => {
  for (const status of [401, 403, 404, 409, 503]) {
    let calls = 0;
    const api = new ImportSessionApi(async () => {
      calls++;
      return json({ error: 'Synthetic refusal', code: 'draft_version_conflict' }, status);
    }, '/jobs');
    await assert.rejects(
      api.resumeDraft(expiredPractice(), { id: 'draft-one', expectedVersion: 4 }, 'intent'),
      (error: unknown) => {
        assert.ok(error instanceof ImportApiError);
        assert.equal(error.status, status);
        assert.equal(error.code, 'draft_version_conflict');
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});

test('explicit resume refuses closed malformed or mismatched practice intent before requesting', async () => {
  let calls = 0;
  const api = new ImportSessionApi(async () => {
    calls++;
    return json(job());
  }, '/jobs');
  for (const snapshot of [
    { ...expiredPractice(), status: 'cancelled' },
    { ...expiredPractice(), status: 'confirmed' },
    { ...expiredPractice(), status: 'uploaded' },
    { ...expiredPractice(), review: { ...job().review, draftId: 'other-draft' } },
    { ...expiredPractice(), manifest: { ...job().manifest, revision: -1 } },
  ])
    await assert.rejects(
      api.resumeDraft(snapshot, { id: 'draft-one', expectedVersion: 4 }, 'intent'),
    );
  await assert.rejects(
    api.resumeDraft(expiredPractice(), { id: 'draft-one', expectedVersion: -1 }, 'intent'),
  );
  await assert.rejects(
    api.resumeDraft(expiredPractice(), { id: 'draft-one', expectedVersion: 4 }, ''),
  );
  assert.equal(calls, 0);
});

test('resume response cannot silently switch the job or saved draft', async () => {
  for (const response of [
    { ...job(8), id: 'other-job', review: { ...job().review, draftId: 'draft-one' } },
    { ...job(8), review: { ...job().review, draftId: 'other-draft' } },
  ]) {
    let calls = 0;
    const api = new ImportSessionApi(async () => {
      calls++;
      return json(response);
    }, '/jobs');
    await assert.rejects(
      api.resumeDraft(expiredPractice(), { id: 'draft-one', expectedVersion: 4 }, 'intent'),
    );
    assert.equal(calls, 1);
  }
});

test('resume serializes only draft identity/version and never caller-supplied actor fields', async () => {
  const intent = { id: 'draft-one', expectedVersion: 4, actor: 'untrusted', operatorRole: 'admin' };
  const api = new ImportSessionApi(async (_path, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), {
      expectedRevision: 7,
      requestId: 'intent',
      resumeDraft: { id: 'draft-one', expectedVersion: 4 },
    });
    return json({ ...job(8), review: { ...job().review, draftId: 'draft-one' } });
  }, '/jobs');
  await api.resumeDraft(expiredPractice(), intent, 'intent');
});
