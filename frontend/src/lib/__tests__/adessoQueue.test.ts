// Coda "Da fare subito": ordine dei gruppi, ordine dentro il gruppo, etichette di tempo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdessoQueue, ADESSO_RANK, type AdessoItem } from '../adessoQueue';
import { therapyCalendar, type ScadenzaTerapia } from '../dashboardTherapies';
import type { Consegna } from '../../types';

const now = new Date('2026-09-27T08:00:00Z');
const cal = therapyCalendar(now);
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
// Ore espresse rispetto al minuto locale della struttura, così il test non dipende dal fuso.
const at = (offset: number) => hhmm(cal.minuto + offset);

const terapia = (id: string, nome: string, minuti: number | null): ScadenzaTerapia => ({
  id,
  patientId: `p-${id}`,
  nome,
  camera: '101',
  letto: 'A',
  farmaco: `Farmaco ${id}`,
  dose: '1 cp',
  via: 'os',
  data: cal.oggi,
  ora: minuti === null ? null : '08:00',
  minuti,
});
const consegna = (id: string, nome: string, scadenza: string, oraScadenza?: string): Consegna => ({
  id,
  pazienteId: `p-${id}`,
  pazienteNome: nome,
  priorita: 'urgente',
  stato: 'aperta',
  tipo: 'Medicazione',
  note: `nota ${id}`,
  scadenza,
  oraScadenza,
  operatoreAssegnato: 'X',
  creatoDA: 'Y',
  createdAt: '2026-09-27T00:00:00Z',
});
const kinds = (items: AdessoItem[]) => items.map((i) => i.kind);

test('groups come in the fixed urgency order and each group is sorted by urgency', () => {
  const items = buildAdessoQueue({
    now,
    scadute: [terapia('t1', 'Rossi', -10), terapia('t2', 'Bianchi', -95)],
    prossime: [terapia('t3', 'Verdi', 20), terapia('t4', 'Neri', 45), terapia('t5', 'Gialli', 0)],
    urgenti: [
      consegna('c1', 'Rossi', cal.oggi, at(180)),
      consegna('c2', 'Blu', cal.oggi, at(-30)),
      consegna('c3', 'Viola', cal.oggi, at(45)),
      consegna('c4', 'Grigi', '2026-09-26'),
    ],
    anomalie: [
      { patientId: 'a1', nome: 'Marroni', esito: { totale: 1, verificaIncompleta: false } },
      { patientId: 'a2', nome: 'Arancio', esito: { totale: 3, verificaIncompleta: true } },
      { patientId: 'a3', nome: 'Zero', esito: { totale: 0, verificaIncompleta: false } },
    ],
  });
  assert.deepEqual(kinds(items), [
    'terapia-ritardo',
    'terapia-ritardo',
    'consegna-scaduta',
    'consegna-scaduta',
    'consegna-imminente',
    'terapia-imminente',
    'terapia-imminente',
    'anomalia-farmaci',
    'anomalia-farmaci',
    'consegna-urgente',
  ]);
  // dentro il gruppo: il più in ritardo prima; la consegna scaduta ieri prima di quella di 30 min fa
  assert.deepEqual(
    items.slice(0, 2).map((i) => i.nome),
    ['Bianchi', 'Rossi'],
  );
  assert.deepEqual(
    items.slice(2, 4).map((i) => i.nome),
    ['Grigi', 'Blu'],
  );
  // terapie imminenti: "Adesso" (0 min) prima di 20 min; 45 min è oltre la soglia e non entra
  assert.deepEqual(
    items.slice(5, 7).map((i) => i.nome),
    ['Gialli', 'Verdi'],
  );
  assert.deepEqual(
    items.slice(7, 9).map((i) => i.nome),
    ['Arancio', 'Marroni'],
  );
  assert.ok(!items.some((i) => i.nome === 'Neri' || i.nome === 'Zero'));
  // il rank è coerente con la posizione
  for (let i = 1; i < items.length; i++)
    assert.ok(ADESSO_RANK[items[i - 1].kind] <= ADESSO_RANK[items[i].kind]);
});

test('time labels say exactly what is known', () => {
  const items = buildAdessoQueue({
    now,
    scadute: [terapia('t1', 'Rossi', -10)],
    prossime: [terapia('t2', 'Verdi', 0), terapia('t3', 'Neri', 15)],
    urgenti: [
      consegna('c1', 'A', cal.oggi, at(-30)),
      consegna('c2', 'B', cal.oggi, at(45)),
      consegna('c3', 'C', cal.oggi, at(200)),
      consegna('c4', 'D', '2026-09-26'),
      consegna('c5', 'E', '2026-09-20'),
      consegna('c6', 'F', cal.oggi),
      consegna('c7', 'G', cal.domani, '09:00'),
      consegna('c8', 'H', 'non-una-data'),
    ],
    anomalie: [{ patientId: 'a1', nome: 'I', esito: { totale: 2, verificaIncompleta: true } }],
  });
  const tempo = Object.fromEntries(items.map((i) => [i.key, i.tempo]));
  assert.equal(tempo['terapia:t1'], 'In ritardo di 10 min');
  assert.equal(tempo['terapia:t2'], 'Adesso');
  assert.equal(tempo['terapia:t3'], 'Tra 15 min');
  assert.equal(tempo['consegna:c1'], `Scaduta alle ${at(-30)}`);
  assert.equal(tempo['consegna:c2'], `Entro le ${at(45)}`);
  assert.equal(tempo['consegna:c3'], `Entro le ${at(200)}`);
  assert.equal(tempo['consegna:c4'], 'Scaduta ieri');
  assert.equal(tempo['consegna:c5'], 'Scaduta da 7 giorni');
  assert.equal(tempo['consegna:c6'], 'Entro oggi');
  assert.equal(tempo['consegna:c7'], 'Domani alle 09:00');
  assert.equal(tempo['consegna:c8'], 'Scadenza non indicata');
  const anomalia = items.find((i) => i.key === 'anomalia:a1')!;
  assert.equal(anomalia.dettaglio, '2 farmaci da verificare · verifica incompleta');
  // in rosso solo ciò che è scaduto
  assert.deepEqual(
    items
      .filter((i) => i.inRitardo)
      .map((i) => i.key)
      .sort(),
    ['consegna:c1', 'consegna:c4', 'consegna:c5', 'terapia:t1'],
  );
  // la consegna senza data resta ultima
  assert.equal(items.at(-1)!.key, 'consegna:c8');
});

test('therapy rows without a verifiable time are not queued', () => {
  const items = buildAdessoQueue({
    now,
    scadute: [terapia('t1', 'Rossi', null)],
    prossime: [terapia('t2', 'Verdi', null)],
    urgenti: [],
    anomalie: [],
  });
  assert.equal(items.length, 0);
});

test('an urgent consegna due within the hour but after midnight says "Domani"', () => {
  // 23:30 locale della struttura: una consegna alle 00:15 di domani è a 45 minuti
  const late = new Date('2026-09-27T21:30:00Z');
  const lateCal = therapyCalendar(late);
  const mins = lateCal.minuto + 45 - 1440;
  const ora = hhmm(((mins % 1440) + 1440) % 1440);
  const items = buildAdessoQueue({
    now: late,
    scadute: [],
    prossime: [],
    urgenti: [consegna('c1', 'A', lateCal.domani, ora)],
    anomalie: [],
  });
  assert.equal(items[0].kind, 'consegna-imminente');
  assert.equal(items[0].tempo, `Domani alle ${ora}`);
});

test('untimed administrations: only today, "Orario da verificare", after imminent therapies', () => {
  const items = buildAdessoQueue({
    now,
    scadute: [],
    prossime: [terapia('t1', 'Verdi', 10)],
    senzaOrario: [
      { ...terapia('n1', 'Neri', null), data: cal.oggi },
      { ...terapia('n2', 'Neri', null), data: cal.domani },
    ],
    urgenti: [],
    anomalie: [
      { patientId: 'a1', nome: 'Arancio', esito: { totale: 1, verificaIncompleta: false } },
    ],
  });
  assert.deepEqual(
    items.map((i) => `${i.kind}:${i.key}`),
    [
      'terapia-imminente:terapia:t1',
      'terapia-senza-orario:terapia:n1',
      'anomalia-farmaci:anomalia:a1',
    ],
  );
  const noTime = items[1];
  assert.equal(noTime.tempo, 'Orario da verificare');
  assert.equal(noTime.ora, null);
  assert.equal(noTime.inRitardo, false);
  assert.equal(noTime.luogo, 'Camera 101 · Letto A');
});
