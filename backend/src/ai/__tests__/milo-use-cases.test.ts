// Milo, casi d'uso: punti da controllare (protocollo NEWS2), camere per tipo e dimissioni previste,
// pianificazione delle domande.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';
const { attentionPoints } = await import('../gateway/clinical-attention.js');
const { roomAvailability } = await import('../gateway/care-reads.js');
const { planQuery, extractPatientName } = await import('../assistant/plan.js');
const { blocksFromResults } = await import('../assistant/blocks.js');

const reading = (id: string, measuredAt: string, values: Record<string, string>) => ({
  id,
  measuredAt,
  source: 'parametri' as const,
  values,
});
const normal = {
  pa: '125/80',
  fc: '72',
  spo2: '97',
  fr: '16',
  temperatura: '36,6',
  o2: 'no',
  coscienza: 'A',
};

test('attention points come from the protocol: score, trend, scoring parameters, missing data', () => {
  const out = attentionPoints([
    reading('r2', '2026-11-22T08:00:00.000Z', { ...normal, fc: '115', spo2: '93', fr: '22' }),
    reading('r1', '2026-11-16T08:00:00.000Z', normal),
    reading('r3', '2026-11-22T18:00:00.000Z', { pa: '150/90' }),
  ]);
  const byKey = Object.fromEntries(out.points.map((p) => [p.key, p]));
  assert.equal(byKey.news2.value, '6 — rischio medio');
  assert.match(byKey.news2.detail, /Valutazione medica urgente/);
  assert.equal(byKey.news2_trend.value, 'da 0 a 6');
  assert.equal(byKey.param_fr.value, '2 punti');
  assert.match(byKey.param_fr.detail, /FR 22 atti\/min: 2 punti NEWS2\. Era 0 punti il 16\/11\./);
  assert.ok(byKey.param_spo2 && byKey.param_fc);
  assert.equal(byKey.param_pa, undefined); // 125/80 non dà punti
  assert.match(byKey.incomplete.detail, /mancano FR, SpO₂, O₂, FC, Coscienza, TC/);
  assert.match(out.source, /NEWS2 — RCP 2017/);
  assert.match(out.disclaimer, /non sono una diagnosi/);
  // Tutto nella norma: nessun punto. Nessuna rilevazione: lo dice.
  assert.deepEqual(attentionPoints([reading('a', '2026-11-22T08:00:00.000Z', normal)]).points, []);
  assert.equal(attentionPoints([]).points[0].key, 'no_readings');
  // Mai una rilevazione completa: NEWS2 non calcolabile, con i parametri mai rilevati.
  const partial = attentionPoints([
    reading('p', '2026-11-22T08:00:00.000Z', { pa: '150/90', fc: '90' }),
  ]);
  assert.ok(partial.points.some((p) => p.key === 'no_complete' && /FR/.test(p.detail)));
});

test('room availability by type and the next planned releases (counts and dates only)', () => {
  const bed = (assignments: Array<[string, string | null]>, stato = 'libero') => ({
    stato,
    assignments: assignments.map(([startDate, endDate]) => ({ startDate, endDate })),
  });
  const out = roomAvailability(
    [
      {
        numero: '103',
        tipo: 'singola',
        stato: 'attiva',
        beds: [bed([['2026-11-10', '2026-11-26']])],
      },
      {
        numero: '104',
        tipo: 'singola',
        stato: 'attiva',
        beds: [bed([['2026-11-10', '2026-11-29']])],
      },
      { numero: '105', tipo: 'singola', stato: 'attiva', beds: [bed([])] },
      {
        numero: '202',
        tipo: 'doppia',
        stato: 'attiva',
        beds: [bed([['2026-11-10', '2026-11-25']]), bed([['2026-11-10', '2026-11-28']])],
      },
      {
        numero: '101',
        tipo: 'doppia',
        stato: 'attiva',
        beds: [bed([['2026-11-01', null]]), bed([['2026-11-01', null]])],
      },
      { numero: '900', tipo: 'doppia', stato: 'inattiva', beds: [bed([])] },
    ],
    '2026-11-23',
  );
  const singola = out.perTipo.find((t) => t.tipo === 'singola')!;
  const doppia = out.perTipo.find((t) => t.tipo === 'doppia')!;
  assert.deepEqual([singola.camere, singola.camereOccupate, singola.lettiLiberi], [3, 2, 1]);
  assert.deepEqual(singola.prossimoLettoLibero, {
    camera: '103',
    tipo: 'singola',
    data: '2026-11-26',
    lettiLiberati: 1,
    cameraLibera: true,
  });
  assert.deepEqual(
    [doppia.camere, doppia.camereOccupate, doppia.lettiOccupati, doppia.lettiLiberi],
    [2, 2, 4, 0],
  );
  assert.equal(doppia.prossimoLettoLibero?.data, '2026-11-25');
  assert.equal(doppia.prossimoLettoLibero?.cameraLibera, false);
  assert.deepEqual(
    [doppia.prossimaCameraLibera?.camera, doppia.prossimaCameraLibera?.data],
    ['202', '2026-11-28'],
  );
  assert.deepEqual(
    out.liberazioni.map((r) => `${r.data} ${r.camera}`),
    ['2026-11-25 202', '2026-11-26 103', '2026-11-28 202', '2026-11-29 104'],
  );
});

test('the use-case questions are planned to the right reads', () => {
  const ctx = { today: '2026-11-23', currentPatientId: 'p1' };
  const status = planQuery(
    "Come va il paziente Bassi mi dai i valori dell'ultima settimana. Cosa devo controllare che come dati è fondamentale indagare",
    ctx,
  );
  assert.equal(status.intent, 'patient_status');
  assert.deepEqual(
    status.tools.map((t) => [t.tool, t.args.days]),
    [
      ['get_patient_parameters', 7],
      ['get_patient_news2', 7],
    ],
  );
  const who = planQuery(
    'Chi ha fatto ultimo visita e registrazione parametri del paziente Bassi, quali sono stati i suoi turni.',
    ctx,
  );
  assert.equal(who.intent, 'care_contacts'); // non l'elenco dei turni di tutti
  assert.deepEqual(who.tools, [{ tool: 'get_patient_care_contacts', args: { patientId: 'p1' } }]);
  // Senza paziente «chi è di turno» resta la domanda sui turni.
  assert.equal(planQuery('chi è di turno domani?', { today: '2026-11-23' }).intent, 'staff_shifts');
  assert.equal(
    planQuery('Quante camere sono occupate e quando si libererà una singola e una doppia', ctx)
      .intent,
    'rooms_occupancy',
  );
  assert.equal(extractPatientName('come va il paziente bassi mi dai i valori'), 'bassi');
  assert.equal(
    extractPatientName('registra del paziente ferrioli pressione 140 su 85'),
    'ferrioli',
  );
  assert.equal(extractPatientName('come sta il paziente'), null);
});

test('blocks: attention points, who followed the patient with shifts, rooms by type', () => {
  const [care, shifts] = blocksFromResults([
    {
      tool: 'get_patient_care_contacts',
      data: [
        {
          patientId: 'p1',
          lastReading: {
            measuredAt: '2026-11-22T16:30:00.000Z',
            author: 'Marco Rinaldi',
            ruolo: 'oss',
            parametri: ['pa'],
          },
          lastVisit: {
            scheduledAt: '2026-11-22T08:30:00.000Z',
            operator: 'Stefano Galli',
            ruolo: 'medico',
            status: 'COMPLETED',
          },
          lastDoctorNote: null,
          people: [
            {
              name: 'Marco Rinaldi',
              ruolo: 'oss',
              turni: [
                { giorno: 'martedi', oraInizio: '14:00', oraFine: '21:00' },
                { giorno: 'lunedi', oraInizio: '14:00', oraFine: '21:00' },
              ],
            },
            { name: 'Stefano Galli', ruolo: 'medico', turni: null },
          ],
        },
      ],
    },
  ]) as Array<{ type: 'table'; title: string; rows: Array<Record<string, string>> }>;
  assert.equal(care.title, 'Chi ha seguito il paziente');
  assert.deepEqual(
    care.rows.map((r) => [r.cosa, r.chi, r.ruolo]),
    [
      ['Ultima rilevazione dei parametri', 'Marco Rinaldi', 'oss'],
      ['Ultima visita', 'Stefano Galli', 'medico'],
    ],
  );
  assert.deepEqual(shifts.rows, [
    { persona: 'Marco Rinaldi', ruolo: 'oss', turni: 'lun, mar 14:00–21:00' },
  ]);
  const rooms = blocksFromResults([
    {
      tool: 'query_rooms_occupancy',
      data: [
        {
          perTipo: [
            {
              tipo: 'singola',
              camere: 2,
              camereOccupate: 2,
              camereConLettiLiberi: 0,
              letti: 2,
              lettiOccupati: 2,
              lettiLiberi: 0,
              prossimoLettoLibero: {
                camera: '103',
                tipo: 'singola',
                data: '2026-11-26',
                lettiLiberati: 1,
                cameraLibera: true,
              },
              prossimaCameraLibera: null,
            },
          ],
          liberazioniPreviste: [
            {
              camera: '103',
              tipo: 'singola',
              data: '2026-11-26',
              lettiLiberati: 1,
              cameraLibera: true,
            },
          ],
        },
      ],
    },
  ]) as Array<Record<string, any>>;
  assert.equal(rooms[0].items[0].label, 'Camere singole');
  assert.equal(rooms[0].items[0].value, '2 su 2 occupate');
  assert.match(rooms[0].items[0].note, /camera 103 il 26\/11\/2026/);
  assert.deepEqual(rooms[1].rows[0], {
    data: '26/11/2026',
    camera: '103',
    tipo: 'singola',
    effetto: 'tutta la camera',
  });
});

test('«Da controllare» appears only when the question asks for the patient picture', async () => {
  const { asksPatientStatus } = await import('../assistant/plan.js');
  assert.equal(asksPatientStatus('Come va il paziente Bassi? Cosa devo controllare'), true);
  assert.equal(asksPatientStatus('come sono i parametri?'), false);
  const readings = [
    reading('r1', '2026-11-16T08:00:00.000Z', normal),
    reading('r2', '2026-11-22T08:00:00.000Z', { ...normal, fc: '115', spo2: '93', fr: '22' }),
  ];
  const overview = {
    patientId: 'p1',
    from: '2026-11-16T00:00:00.000Z',
    to: '2026-11-23T00:00:00.000Z',
    readings,
    series: [],
    attention: attentionPoints(readings),
  };
  const read = [{ tool: 'get_patient_parameters', data: [overview] }];
  const titles = (blocks: Array<{ title: string }>) => blocks.map((b) => b.title);
  assert.ok(!titles(blocksFromResults(read)).includes('Da controllare (promemoria da protocollo)'));
  assert.equal(
    titles(blocksFromResults(read, { attention: true }))[0],
    'Da controllare (promemoria da protocollo)',
  );
});
