import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConsegnaFeedUrl, mergeConsegnaPage } from '../consegneFeed.js';
import type { Consegna } from '../../types.js';

const row = (id: string): Consegna => ({
  id,
  pazienteId: 'p1',
  pazienteNome: 'Rossi, Ada',
  priorita: 'normale',
  stato: 'aperta',
  tipo: 'Monitoraggio',
  note: 'nota',
  scadenza: '2026-08-29',
  operatoreAssegnato: '',
  creatoDA: 'op1',
  createdAt: '2026-08-29T00:00:00.000Z',
});

test('consegne feed URL is bounded and encodes server filters plus cursor', () => {
  const url = buildConsegnaFeedUrl(
    '/api',
    { status: 'aperta', priority: 'urgente', patientId: 'p/1', q: 'Rossi Ada' },
    'cursor-token',
  );
  assert.equal(
    url,
    '/api/consegne?limit=20&status=aperta&priority=urgente&patientId=p%2F1&q=Rossi+Ada&cursor=cursor-token',
  );
});

test('consegne load-more deduplicates records', () => {
  assert.deepEqual(
    mergeConsegnaPage([row('a'), row('b')], [row('b'), row('c')], true).map((item) => item.id),
    ['a', 'b', 'c'],
  );
});
