import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isTabId,
  parsePatientTargetHash,
  patientTargetHash,
  storedTarget,
} from '../patientTargetHash';
import { navHistoryState } from '../navHistory';
import type { PatientTarget } from '../patientTarget';

test('legacy #/dettaglio-paziente/<id> still opens the chart (overview)', () => {
  assert.deepEqual(parsePatientTargetHash('#/dettaglio-paziente/abc-123'), {
    patientId: 'abc-123',
  });
  assert.equal(patientTargetHash({ patientId: 'abc-123' }), '#/dettaglio-paziente/abc-123');
  assert.equal(
    patientTargetHash({ patientId: 'abc-123', tab: 'panoramica' }),
    '#/dettaglio-paziente/abc-123',
  );
});

test('section, sub-view and item survive a round trip through the hash', () => {
  const targets: PatientTarget[] = [
    { patientId: 'p1', tab: 'parametri' },
    {
      patientId: 'p1',
      tab: 'terapia-farmacologica',
      therapy: { subView: 'giornaliere', therapyId: 't-1', date: '2026-10-03', fascia: 'mattina' },
    },
    { patientId: 'p1', tab: 'consegne', consegnaId: 'c-9' },
    { patientId: 'p1', tab: 'diario', diaryEntryId: 'e-1' },
    { patientId: 'p1', tab: 'documenti', documentId: 'doc-1', pageNumber: 4 },
    { patientId: 'p1', tab: 'tinetti', assessmentId: 'as-1' },
    { patientId: 'p1', tab: 'diagnosi', anchor: 'allergie' },
  ];
  for (const target of targets) {
    const hash = patientTargetHash(target);
    assert.ok(hash.startsWith('#/dettaglio-paziente/p1'), hash);
    assert.deepEqual(parsePatientTargetHash(hash), target, hash);
  }
  assert.equal(
    patientTargetHash(targets[1]),
    '#/dettaglio-paziente/p1/terapia-farmacologica?sv=giornaliere&t=t-1&d=2026-10-03&f=mattina',
  );
});

test('the URL carries only opaque ids; unknown or malformed parts are dropped, not guessed', () => {
  assert.equal(parsePatientTargetHash('#/pazienti'), null);
  assert.equal(parsePatientTargetHash('#/dettaglio-paziente/'), null);
  assert.deepEqual(parsePatientTargetHash('#/dettaglio-paziente/p1/inventato?c=x'), {
    patientId: 'p1',
    consegnaId: 'x',
  });
  assert.deepEqual(
    parsePatientTargetHash('#/dettaglio-paziente/p1/terapia-farmacologica?sv=boh&d=ieri&t=t1'),
    { patientId: 'p1', tab: 'terapia-farmacologica', therapy: { therapyId: 't1' } },
  );
  // Therapy params outside the Terapia section are ignored; page without document too.
  assert.deepEqual(parsePatientTargetHash('#/dettaglio-paziente/p1/parametri?t=t1&p=3'), {
    patientId: 'p1',
    tab: 'parametri',
  });
  // Ids are URL-encoded both ways.
  const odd = { patientId: 'a/b c' };
  assert.deepEqual(parsePatientTargetHash(patientTargetHash(odd)), odd);
  assert.equal(isTabId('consegne'), true);
  assert.equal(isTabId('constructor'), false);
});

test('history.state keeps the item next to the section so Back restores both', () => {
  const target: PatientTarget = { patientId: 'p1', tab: 'consegne', consegnaId: 'c1' };
  assert.deepEqual(storedTarget(target), { consegnaId: 'c1' });
  assert.equal(storedTarget({ patientId: 'p1', tab: 'parametri' }), undefined);
  const state = navHistoryState(
    {
      navKey: 'dettaglio-paziente',
      pazienteId: 'p1',
      patientTab: 'consegne',
      patientTarget: storedTarget(target),
    },
    { navKey: 'operator-dashboard' },
    { 'operator-dashboard': 'Il mio turno' },
  );
  assert.deepEqual(state, {
    navKey: 'dettaglio-paziente',
    pazienteId: 'p1',
    patientTab: 'consegne',
    patientTarget: { consegnaId: 'c1' },
    prevNavKey: 'operator-dashboard',
    prevLabel: 'Il mio turno',
  });
});
