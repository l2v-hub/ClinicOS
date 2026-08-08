import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectTherapiesDue,
  dayKey,
  isConsegnaOpen,
  isConsegnaOverdue,
  matchesOperator,
  minutesFromMidnight,
  partitionByOperator,
  sortConsegne,
  type ConsegnaRow,
  type TherapySlotView,
} from '../assistant/facility-signals.js';

// Istante di riferimento sempre esplicito: i fixture non dipendono dall'ora in cui gira la suite.
// Le date di scadenza sono derivate dall'istante con `dayKey`, la stessa funzione usata in
// produzione, cosi' i confronti restano validi in qualunque fuso orario esegua la suite.
const at = (hh: number, mm: number) => new Date(2026, 7, 8, hh, mm, 0);
const giorniPrima = (d: Date, n: number) => dayKey(new Date(d.getTime() - n * 86_400_000));

function slots(
  admins: Array<{ time: string; status: 'pending' | 'administered' | 'not_administered' }>,
): TherapySlotView[] {
  return [
    {
      fascia: 'mattina',
      patients: [
        {
          patientId: 'p1',
          firstName: 'Mario',
          lastName: 'Rossi',
          room: '101',
          bed: 'A',
          administrations: admins.map((a, i) => ({
            therapyId: `t${i}`,
            drugName: `Farmaco${i}`,
            scheduledTime: a.time,
            status: a.status,
          })),
        },
      ],
    },
  ];
}

// ── somministrazioni: stessa regola dell'UI (useRiepilogoSomministrazioni) ────────────────────
test('in ritardo = dose pending il cui orario è già passato', () => {
  const { overdue } = collectTherapiesDue(
    slots([{ time: '08:00', status: 'pending' }]),
    at(10, 0),
    0,
  );
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].minutesLate, 120);
  assert.equal(overdue[0].patientName, 'Rossi Mario');
});

test('esattamente all’orario previsto NON è ancora in ritardo (confronto stretto, come l’UI)', () => {
  const { overdue, dueSoon } = collectTherapiesDue(
    slots([{ time: '10:00', status: 'pending' }]),
    at(10, 0),
    120,
  );
  assert.equal(overdue.length, 0);
  assert.equal(dueSoon.length, 1);
  assert.equal(dueSoon[0].minutesUntil, 0);
});

test('un minuto dopo l’orario previsto è in ritardo', () => {
  const { overdue } = collectTherapiesDue(
    slots([{ time: '10:00', status: 'pending' }]),
    at(10, 1),
    0,
  );
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].minutesLate, 1);
});

test('dosi già erogate o marcate non erogate non contano mai come in ritardo', () => {
  const { overdue, dueSoon } = collectTherapiesDue(
    slots([
      { time: '08:00', status: 'administered' },
      { time: '08:00', status: 'not_administered' },
    ]),
    at(12, 0),
    120,
  );
  assert.equal(overdue.length, 0);
  assert.equal(dueSoon.length, 0);
});

test('un orario illeggibile non conta come in ritardo (nessun falso allarme)', () => {
  const { overdue, dueSoon } = collectTherapiesDue(
    slots([{ time: 'mattina', status: 'pending' }]),
    at(23, 0),
    120,
  );
  assert.equal(overdue.length, 0);
  assert.equal(dueSoon.length, 0);
});

test('la finestra limita le dosi "in arrivo": oltre l’orizzonte non sono "adesso"', () => {
  const { dueSoon } = collectTherapiesDue(
    slots([
      { time: '11:00', status: 'pending' },
      { time: '20:00', status: 'pending' },
    ]),
    at(10, 0),
    120,
  );
  assert.equal(dueSoon.length, 1);
  assert.equal(dueSoon[0].scheduledTime, '11:00');
});

test('i ritardi sono ordinati dal più grave, le dosi in arrivo dalla più imminente', () => {
  const { overdue, dueSoon } = collectTherapiesDue(
    slots([
      { time: '09:00', status: 'pending' },
      { time: '06:00', status: 'pending' },
      { time: '11:30', status: 'pending' },
      { time: '10:30', status: 'pending' },
    ]),
    at(10, 0),
    120,
  );
  assert.deepEqual(
    overdue.map((o) => o.scheduledTime),
    ['06:00', '09:00'],
  );
  assert.deepEqual(
    dueSoon.map((o) => o.scheduledTime),
    ['10:30', '11:30'],
  );
});

test('minutesFromMidnight accetta ore non zero-paddate e rifiuta il resto', () => {
  assert.equal(minutesFromMidnight('8:30'), 510);
  assert.equal(minutesFromMidnight('08:30'), 510);
  assert.ok(Number.isNaN(minutesFromMidnight('')));
  assert.ok(Number.isNaN(minutesFromMidnight('8.30')));
});

// ── consegne: prima definizione server-side di "scaduta" ──────────────────────────────────────
const consegna = (over: Partial<ConsegnaRow> = {}): ConsegnaRow => ({
  id: 'c1',
  pazienteId: 'p1',
  pazienteNome: 'Rossi Mario',
  priorita: 'normale',
  stato: 'aperta',
  tipo: 'Monitoraggio',
  note: 'controllo medicazione',
  scadenza: dayKey(at(10, 0)),
  oraScadenza: null,
  operatoreAssegnato: '',
  ...over,
});

test('consegna aperta = tutto ciò che non è completata', () => {
  assert.equal(isConsegnaOpen(consegna({ stato: 'aperta' })), true);
  assert.equal(isConsegnaOpen(consegna({ stato: 'in_corso' })), true);
  assert.equal(isConsegnaOpen(consegna({ stato: 'completata' })), false);
});

test('una consegna completata non è mai scaduta, nemmeno se il termine è passato', () => {
  const now = at(10, 0);
  assert.equal(
    isConsegnaOverdue(consegna({ stato: 'completata', scadenza: giorniPrima(now, 7) }), now),
    false,
  );
});

test('senza ora, il termine è l’intera giornata: oggi non è scaduta, ieri sì', () => {
  const sera = at(23, 30);
  assert.equal(isConsegnaOverdue(consegna({ scadenza: dayKey(sera) }), sera), false);
  assert.equal(isConsegnaOverdue(consegna({ scadenza: giorniPrima(sera, 1) }), sera), true);
});

test('con ora esplicita: prima no, esattamente al termine no, dopo sì', () => {
  const c = (now: Date) => consegna({ scadenza: dayKey(now), oraScadenza: '10:00' });
  assert.equal(isConsegnaOverdue(c(at(9, 59)), at(9, 59)), false);
  assert.equal(isConsegnaOverdue(c(at(10, 0)), at(10, 0)), false);
  assert.equal(isConsegnaOverdue(c(at(10, 1)), at(10, 1)), true);
});

test('una scadenza futura non è scaduta e una data illeggibile non allarma', () => {
  const now = at(10, 0);
  assert.equal(isConsegnaOverdue(consegna({ scadenza: giorniPrima(now, -30) }), now), false);
  assert.equal(isConsegnaOverdue(consegna({ scadenza: 'domani' }), now), false);
});

test('le consegne si ordinano per priorità e poi per termine più vicino', () => {
  const rows = [
    consegna({ id: 'a', priorita: 'normale', oraScadenza: '08:00' }),
    consegna({ id: 'b', priorita: 'urgente', oraScadenza: '18:00' }),
    consegna({ id: 'c', priorita: 'alta', oraScadenza: '09:00' }),
    consegna({ id: 'd', priorita: 'urgente', oraScadenza: '09:00' }),
  ];
  assert.deepEqual(
    sortConsegne(rows).map((r) => r.id),
    ['d', 'b', 'c', 'a'],
  );
});

// ── priorità morbida per nome operatore (mai un filtro) ───────────────────────────────────────
test('il nome dell’operatore combacia a meno di maiuscole, accenti e ordine', () => {
  assert.equal(matchesOperator('Anna Bianchi', 'anna bianchi'), true);
  assert.equal(matchesOperator('BIANCHI ANNA', 'Anna Bianchi'), true);
  assert.equal(matchesOperator('Niccolò Verdi', 'niccolo verdi'), true);
  assert.equal(matchesOperator('Anna Bianchi', 'Marco Rossi'), false);
  assert.equal(matchesOperator('', 'Anna Bianchi'), false);
});

test('nessuna consegna viene scartata: chi non combacia finisce in coda, non fuori', () => {
  const rows = [
    consegna({ id: 'mia', operatoreAssegnato: 'Anna Bianchi' }),
    consegna({ id: 'altrui', operatoreAssegnato: 'Marco Rossi' }),
    consegna({ id: 'senza', operatoreAssegnato: '' }),
  ];
  const { mine, others } = partitionByOperator(rows, 'Anna Bianchi');
  assert.deepEqual(
    mine.map((r) => r.id),
    ['mia'],
  );
  assert.deepEqual(
    others.map((r) => r.id),
    ['altrui', 'senza'],
  );
  assert.equal(mine.length + others.length, rows.length);
});

test('senza nome operatore nulla viene promosso, ma nulla viene perso', () => {
  const rows = [consegna({ id: 'x', operatoreAssegnato: 'Anna Bianchi' })];
  const { mine, others } = partitionByOperator(rows, undefined);
  assert.equal(mine.length, 0);
  assert.equal(others.length, 1);
});
