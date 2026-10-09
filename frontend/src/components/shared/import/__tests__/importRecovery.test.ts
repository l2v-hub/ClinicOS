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
        assert.equal(error.job, undefined);
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
  }
});
