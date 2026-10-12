// #446: il Turno per lavoro (capability), «Niente in sospeso» solo se tutte le fonti dicono niente,
// giro parametri con i critici prima, urgenze contate dalla stessa coda del badge.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nienteInSospeso, ordineGiro, turnoVariant, type GiroPaziente } from '../turnoVariant';
import { urgentToTakeCharge } from '../turnoUnread';
import type { UnreadDiaryEntry, UnreadDiaryPage } from '../diaryUnreadQueue';

test('446 the Turno variant follows capabilities, administration first', () => {
  assert.equal(
    turnoVariant({ administer: true, prescribe: true, recordVitals: true }),
    'infermiere',
  );
  assert.equal(turnoVariant({ administer: false, prescribe: true, recordVitals: true }), 'medico');
  assert.equal(turnoVariant({ administer: false, prescribe: false, recordVitals: true }), 'oss');
  assert.equal(
    turnoVariant({ administer: false, prescribe: false, recordVitals: false }),
    'infermiere',
  );
});

test('446 «Niente in sospeso» needs every source loaded and empty', () => {
  const giro = { fatti: 5, totale: 5, completo: true };
  assert.equal(nienteInSospeso({ daLeggere: 0, critici: 0, giro }), true);
  assert.equal(nienteInSospeso({ daLeggere: 2, critici: 0, giro }), false);
  assert.equal(nienteInSospeso({ daLeggere: 0, critici: 1, giro }), false);
  assert.equal(nienteInSospeso({ daLeggere: 0, critici: 0, giro: { ...giro, fatti: 0 } }), false);
  assert.equal(
    nienteInSospeso({ daLeggere: 0, critici: 0, giro: { ...giro, completo: false } }),
    false,
  );
  // fonte non ancora arrivata: mai «niente»
  assert.equal(nienteInSospeso({ daLeggere: null, critici: 0, giro }), false);
  assert.equal(nienteInSospeso({ daLeggere: 0, critici: null, giro }), false);
  assert.equal(nienteInSospeso({ daLeggere: 0, critici: 0, giro: null }), false);
});

test('446 the vitals round puts critical patients first, then those not measured, keeping ward order', () => {
  const p = (patientId: string, rilevatoOggi: boolean, critico: boolean): GiroPaziente => ({
    patientId,
    nome: patientId,
    luogo: null,
    rilevatoOggi,
    critico,
  });
  assert.deepEqual(
    ordineGiro([
      p('a', true, false),
      p('b', false, false),
      p('c', true, true),
      p('d', false, false),
    ]).map((x) => x.patientId),
    ['c', 'b', 'd', 'a'],
  );
});

test("446 urgencies to take charge come from the badge queue, never the reader's own", () => {
  const row = (
    id: string,
    priority: UnreadDiaryEntry['priority'],
    canAcknowledge: boolean,
    isAuthor: boolean,
  ) =>
    ({
      id,
      priority,
      urgency: { state: 'active', canAcknowledge, isAuthor },
    }) as unknown as UnreadDiaryEntry;
  const page = {
    entries: [
      row('1', 'urgente', true, false),
      row('2', 'urgente', false, true),
      row('3', 'normale', true, false),
    ],
    hasMore: true,
  } as unknown as UnreadDiaryPage;
  const result = urgentToTakeCharge(page);
  assert.deepEqual(
    result.rows.map((r) => r.id),
    ['1'],
  );
  assert.equal(result.atLeast, true);
  assert.deepEqual(urgentToTakeCharge(null).rows, []);
});
