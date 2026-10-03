// Card paziente del Turno: solo dati reali, parti mancanti e fonti non disponibili dette.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turnoPatientCard, inCaricoNelTurno, type TurnoTherapies } from '../turnoPatients';
import { therapyCalendar, type ScadenzaTerapia } from '../dashboardTherapies';
import { prossimiAppuntamenti } from '../turnoAppointments';
import type { ClinicalSummaryEntry, Paziente, SlotAgenda } from '../../types';

const today = new Date('2026-09-27T08:00:00Z');
const cal = therapyCalendar(today);
const patient = (over: Partial<Paziente> = {}): Paziente => ({
  id: 'p1',
  medicalRecordNumber: 'm1',
  firstName: 'Anna',
  lastName: 'Rossi',
  dateOfBirth: '1942-03-14',
  sex: 'F',
  email: null,
  phone: null,
  location: { status: 'assigned', source: 'assignment', room: '104', bed: 'B', asOf: '2026-09-27' },
  ...over,
});
const summary = (over: Partial<ClinicalSummaryEntry> = {}): ClinicalSummaryEntry => ({
  patientId: 'p1',
  statoRicovero: 'ricoverato',
  hasCriticalVitals: false,
  hasHighRisk: false,
  allergieCount: 0,
  hasSevereAllergy: false,
  terapieTotali: 0,
  terapieCompletate: 0,
  consegneAperte: 0,
  ...over,
});
const row = (id: string, patientId: string, data: string, ora: string | null): ScadenzaTerapia => ({
  id,
  patientId,
  therapyId: `t-${id}`,
  fascia: 'mattina',
  nome: 'Rossi Anna',
  camera: '104',
  letto: 'B',
  farmaco: `Farmaco ${id}`,
  dose: '1 cp',
  via: 'os',
  data,
  ora,
  minuti: ora === null ? null : 10,
});
const ther = (over: Partial<TurnoTherapies> = {}): TurnoTherapies => ({
  state: 'ready',
  scadute: [],
  prossime: [],
  senzaOrario: [],
  ...over,
});

test('card shows room, age, bed and real badges in the prototype order', () => {
  const card = turnoPatientCard(
    patient(),
    summary({ allergieCount: 1, hasCriticalVitals: true, hasHighRisk: true, consegneAperte: 2 }),
    'ready',
    ther(),
    today,
  );
  assert.equal(card.nome, 'Rossi, Anna');
  assert.equal(card.camera, '104');
  assert.equal(card.sottotitolo, '84 anni · Letto B');
  assert.deepEqual(
    card.badges.map((b) => b.label),
    ['Allergia', 'Parametri critici', 'Rischio elevato', 'Consegne 2'],
  );
  assert.equal(card.prossima, 'Nessuna terapia in sospeso');
});

test('missing data is stated, never invented', () => {
  const card = turnoPatientCard(
    patient({ dateOfBirth: null, location: null }),
    summary(),
    'ready',
    ther(),
    today,
  );
  assert.equal(card.camera, '—');
  assert.equal(card.sottotitolo, 'Età non disponibile · Posto letto non assegnato');
  assert.deepEqual(card.badges, []);
});

test('without the clinical summary the card says it, instead of looking allergy-free', () => {
  const err = turnoPatientCard(patient(), undefined, 'error', ther(), today);
  assert.deepEqual(
    err.badges.map((b) => b.label),
    ['Dati clinici non disponibili'],
  );
  const loading = turnoPatientCard(patient(), undefined, 'loading', ther(), today);
  assert.deepEqual(
    loading.badges.map((b) => b.label),
    ['Dati clinici in verifica'],
  );
});

test('therapy line: unavailable or loading is said, never "nothing to do"', () => {
  assert.equal(
    turnoPatientCard(patient(), summary(), 'ready', ther({ state: 'error' }), today).prossima,
    'Terapie non disponibili',
  );
  assert.equal(
    turnoPatientCard(patient(), summary(), 'ready', ther({ state: 'loading' }), today).prossima,
    'Terapie in verifica…',
  );
});

test('therapy line follows the prototype: overdue first, then next scheduled, then time to verify', () => {
  const overdue = turnoPatientCard(
    patient(),
    summary(),
    'ready',
    ther({
      scadute: [row('a', 'p1', cal.oggi, '07:00'), row('b', 'p1', cal.oggi, '07:30')],
      prossime: [row('c', 'p1', cal.oggi, '12:00')],
    }),
    today,
  );
  // Direct access: TUTTE le dosi in ritardo (niente "(+1)"), ognuna col proprio link alla terapia.
  assert.equal(overdue.prossima, 'In ritardo: Farmaco a 1 cp · 07:00, Farmaco b 1 cp · 07:30');
  assert.equal(overdue.prossimaInRitardo, true);
  assert.equal(overdue.prossimaEtichetta, 'In ritardo');
  assert.deepEqual(
    overdue.prossimaVoci.map((v) => v.landing),
    ['a', 'b'].map((id) => ({
      tab: 'terapia-farmacologica',
      therapy: { subView: 'giornaliere', therapyId: `t-${id}`, date: cal.oggi, fascia: 'mattina' },
    })),
  );

  const next = turnoPatientCard(
    patient(),
    summary(),
    'ready',
    ther({ prossime: [row('x', 'p2', cal.oggi, '09:00'), row('a', 'p1', cal.oggi, '10:00')] }),
    today,
  );
  assert.equal(next.prossima, 'Prossima: Farmaco a 1 cp · 10:00');
  assert.equal(next.prossimaInRitardo, false);

  const domani = turnoPatientCard(
    patient(),
    summary(),
    'ready',
    ther({ prossime: [row('c', 'p1', cal.domani, '08:00')] }),
    today,
  );
  assert.equal(domani.prossima, 'Prossima: Farmaco c 1 cp · domani 08:00');

  const noTime = turnoPatientCard(
    patient(),
    summary(),
    'ready',
    ther({ senzaOrario: [row('d', 'p1', cal.domani, null), row('e', 'p1', cal.oggi, null)] }),
    today,
  );
  assert.equal(noTime.prossima, 'Da verificare: Farmaco e 1 cp · orario non indicato');
});

test('tomorrow unreadable: "nothing" is only verified for today', () => {
  assert.equal(
    turnoPatientCard(patient(), summary(), 'ready', ther({ domani: 'error' }), today).prossima,
    'Nessuna terapia oggi · domani non verificato',
  );
});

test('discharged patients are not in the shift', () => {
  assert.equal(inCaricoNelTurno(summary({ statoRicovero: 'dimesso' })), false);
  assert.equal(inCaricoNelTurno(summary({ statoRicovero: 'ricoverato' })), true);
});

test('next appointments: in progress, then not started past their time, then upcoming (facility clock)', () => {
  const slot = (id: string, ora: string, stato: SlotAgenda['stato']): SlotAgenda => ({
    id,
    ora,
    stato,
    pazienteNome: id,
    motivo: 'visita',
  });
  // 08:00Z = 10:00 a Roma (ora legale)
  const agenda = [
    slot('done', '08:00', 'completato'),
    slot('late', '09:00', 'programmato'),
    slot('now', '09:30', 'in_corso'),
    slot('next', '11:00', 'programmato'),
    slot('later', '12:00', 'programmato'),
    slot('off', '10:30', 'annullato'),
  ];
  const r = prossimiAppuntamenti(agenda, today);
  assert.deepEqual(
    r.items.map((x) => `${x.slot.id}${x.daIniziare ? '*' : ''}`),
    ['now', 'next', 'later'],
  );
  assert.equal(r.altri, 1); // 'late' (09:00, da iniziare) resta contato
  const onlyLate = prossimiAppuntamenti([slot('late', '09:00', 'programmato')], today);
  assert.deepEqual(
    onlyLate.items.map((x) => x.daIniziare),
    [true],
  );
});

test('UX: Turno badges name the allergen, critical parameter and risk', async () => {
  const { badgeLabel } = await import('../turnoPatients');
  assert.equal(
    badgeLabel('Allergia', ['Penicillina', ' Lattice ']),
    'Allergia: Penicillina, Lattice',
  );
  assert.equal(badgeLabel('Allergia', []), 'Allergia');
  assert.equal(badgeLabel('Rischio elevato', undefined), 'Rischio elevato');
});
