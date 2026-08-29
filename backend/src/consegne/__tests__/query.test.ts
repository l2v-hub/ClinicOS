import assert from 'node:assert/strict';
import test from 'node:test';
import { ConsegnaInputError, encodeConsegnaCursor, parseConsegnaFeedQuery } from '../query.js';
import { parseConsegnaCreateBody, parseConsegnaPatchBody } from '../write-validation.js';

test('consegne feed defaults to 20 and binds a keyset cursor to filters', () => {
  const filters = { status: 'aperta' as const, q: 'Rossi' };
  const cursor = encodeConsegnaCursor(
    { createdAt: new Date('2026-08-29T12:00:00.000Z'), id: 'handover-1' },
    filters,
  );
  const parsed = parseConsegnaFeedQuery({ status: 'aperta', q: 'Rossi', cursor });
  assert.equal(parsed.limit, 20);
  assert.deepEqual(parsed.cursor, {
    createdAt: new Date('2026-08-29T12:00:00.000Z'),
    id: 'handover-1',
  });
  assert.throws(
    () => parseConsegnaFeedQuery({ status: 'completata', q: 'Rossi', cursor }),
    ConsegnaInputError,
  );
});

test('consegne feed rejects malformed or unbounded queries', () => {
  for (const query of [
    { limit: '21' },
    { limit: '10foo' },
    { status: 'open' },
    { priority: 'critical' },
    { patientId: '../foreign' },
    { q: 'x'.repeat(101) },
    { q: '---' },
    { cursor: 'not+base64' },
    { offset: '0' },
  ]) {
    assert.throws(() => parseConsegnaFeedQuery(query), ConsegnaInputError);
  }
});

test('consegne writes reject spoofed identities and validate bounded fields', () => {
  assert.throws(
    () =>
      parseConsegnaCreateBody({
        pazienteId: 'patient-1',
        note: 'Controllare la pressione',
        creatoDA: 'spoof',
      }),
    /Campo non consentito: creatoDA/,
  );
  const create = parseConsegnaCreateBody({
    pazienteId: 'patient-1',
    priorita: 'urgente',
    tipo: 'Monitoraggio',
    note: ' Controllare la pressione ',
    scadenza: '2026-08-29',
    oraScadenza: '09:30',
    operatoreAssegnatoId: 'operator-1',
  });
  assert.equal(create.note, 'Controllare la pressione');
  assert.equal(create.priorita, 'urgente');
  assert.deepEqual(parseConsegnaPatchBody({ stato: 'in_corso' }), { stato: 'in_corso' });
  for (const body of [
    { note: 'x'.repeat(4_001) },
    { scadenza: '2026-02-31' },
    { oraScadenza: '25:00' },
    { stato: 'done' },
    {},
  ]) {
    assert.throws(() => parseConsegnaPatchBody(body), ConsegnaInputError);
  }
});
