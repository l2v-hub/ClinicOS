// Diario terapia (PR 1) — AC2 senza database: gate, validazione pura e privacy dei log.
// Le verifiche che richiedono Postgres (404 fuori ambito, 400 senza scritture, anteprima 200,
// idempotenza) stanno in patient-diary-therapy-db.test.ts e girano nel job `gate` della CI.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';

// Il client Prisma viene solo costruito dagli import, mai interrogato da questi test.
process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';

const routeUrl = new URL('../patient-diary.ts', import.meta.url);
const writeServiceUrl = new URL('../../patients/diary-write-service.ts', import.meta.url);
let server: Server;
let base = '';
let service: typeof import('../../patients/diary-therapy-service.js');

before(async () => {
  service = await import('../../patients/diary-therapy-service.js');
  const { default: router } = await import('../patient-diary.js');
  const app = express();
  app.use(express.json());
  app.use('/patients', router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const info = server.address();
      base = `http://127.0.0.1:${typeof info === 'object' && info ? info.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('AC2: anteprima e creazione senza operatore rispondono 401, no-store', async () => {
  for (const path of ['therapy-preview', 'with-therapy']) {
    const res = await fetch(`${base}/patients/p1/diary/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Ramipril 5 mg' }),
    });
    assert.equal(res.status, 401, path);
    assert.match(res.headers.get('cache-control') ?? '', /no-store/);
  }
});

test('AC2: le nuove route stanno dietro lo stesso gate del diario', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const gate = source.indexOf("router.use('/:patientId/diary', requirePatientScope)");
  assert.ok(gate > 0);
  assert.ok(source.indexOf('router.use(requireOperator)') < gate);
  assert.ok(source.indexOf("'/:patientId/diary/therapy-preview'") > gate);
  assert.ok(source.indexOf("'/:patientId/diary/with-therapy'") > gate);
});

test('AC2: la creazione valida tutto prima di toccare il database', async () => {
  // Composition moved verbatim from the route to the shared write service (Tool Layer phase 1).
  const source = await readFile(writeServiceUrl, 'utf8');
  const block = source.split('export async function createPatientDiaryEntryWithTherapy(')[1] ?? '';
  const route = (await readFile(routeUrl, 'utf8')).split("'/:patientId/diary/with-therapy'")[1];
  assert.match(route ?? '', /createPatientDiaryEntryWithTherapy\(patientId, req\.body/);
  const validation = block.indexOf('prepareDiaryTherapyInput(');
  assert.ok(validation > 0);
  assert.ok(block.indexOf('parseDiaryCreateBody(body.entry)') < validation);
  assert.ok(validation < block.indexOf('authoritativeDiaryAuthor(actor)'));
  assert.ok(validation < block.indexOf('createDiaryEntryWithTherapy('));
});

test('Privacy: anteprima in sola lettura, nessun testo clinico nei log', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const preview =
    source.split("'/:patientId/diary/therapy-preview'")[1]?.split('// POST ')[0] ?? '';
  assert.doesNotMatch(preview, /prisma\.|console\./);
  const create = source.split("'/:patientId/diary/with-therapy'")[1] ?? '';
  for (const call of create.match(/console\.(log|error)\([\s\S]*?\);/g) ?? []) {
    assert.doesNotMatch(call, /\btext\b|content|body|farmacoNome|entry\)|therapy\)/, call);
  }
});

test('AC2: terapia non valida → errore di validazione, senza database', () => {
  assert.throws(
    () => service.prepareDiaryTherapyInput({ farmacoNome: 'Ramipril' }, 'op'),
    /Campi obbligatori/,
  );
  assert.throws(() => service.prepareDiaryTherapyInput(null, 'op'), /therapy obbligatoria/);
  assert.throws(
    () =>
      service.prepareDiaryTherapyInput(
        { farmacoNome: 'Ramipril', dataInizio: '2026-09-30', schedules: [{ time: '25:00' }] },
        'op',
      ),
    /HH:MM/,
  );
});

test('distinct same-band times are accepted without losing schedules', () => {
  const input = service.prepareDiaryTherapyInput(
    {
      farmacoNome: 'Ramipril',
      dataInizio: '2026-09-30',
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
        {
          time: '10:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
    },
    'op',
  );
  assert.deepEqual(
    input.schedules?.map((s) => s.time),
    ['08:00', '10:00'],
  );
});

test('AC2: operatoreInseritore è sempre quello del server', () => {
  const input = service.prepareDiaryTherapyInput(
    {
      farmacoNome: 'Ramipril',
      dataInizio: '2026-09-30',
      operatoreInseritore: 'Falso',
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
        {
          time: '20:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
    },
    'Operatore Vero',
  );
  assert.equal(input.operatoreInseritore, 'Operatore Vero');
});

test('requestId: obbligatorio e limitato a caratteri sicuri', () => {
  assert.equal(service.parseTherapyRequestId('req-12345678'), 'req-12345678');
  for (const bad of [undefined, '', 'short', 'x'.repeat(129), 'con spazio 123', 42]) {
    assert.throws(() => service.parseTherapyRequestId(bad), service.DiaryTherapyInputError);
  }
});

test('Audit: solo nomi di campi, mai valori né chiavi arbitrarie', () => {
  const fields = service.diaryTherapyAuditFields(
    {
      title: null,
      content: 'Ramipril 5 mg',
      priority: 'normale',
      status: 'aperta',
      entryDateTime: '2026-09-29T10:00',
      category: 'terapia',
    },
    {
      farmacoNome: 'Ramipril',
      dataInizio: '2026-09-30',
      operatoreInseritore: 'Operatore',
      ['Mario Rossi' as 'note']: 'x',
    } as never,
  );
  assert.ok(fields.includes('entry.content'));
  assert.ok(fields.includes('therapy.farmacoNome'));
  assert.ok(!fields.includes('entry.title'));
  assert.ok(fields.every((f) => /^(entry|therapy)\.[A-Za-z]+$/.test(f)));
  assert.ok(!fields.some((f) => /Ramipril|Mario|Operatore/.test(f)));
});

// ── Correzioni QA: mai inventare ────────────────────────────────────────────────────────────

const unit = { quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' };
const baseTherapy = { farmacoNome: 'Ramipril', dataInizio: '2026-09-30' };
const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
};

test('schedule_required: nessun orario né fascia esplicita → 400, mai la mattina di default', () => {
  assert.equal(
    codeOf(() => service.prepareDiaryTherapyInput(baseTherapy, 'op')),
    'schedule_required',
  );
  assert.equal(
    codeOf(() => service.prepareDiaryTherapyInput({ ...baseTherapy, schedules: [] }, 'op')),
    'schedule_required',
  );
  assert.equal(
    codeOf(() => service.prepareDiaryTherapyInput({ ...baseTherapy, fasceMattina: false }, 'op')),
    'schedule_required',
  );
});

test('fasce esplicite: quelle non indicate diventano false (niente mattina di default)', () => {
  const input = service.prepareDiaryTherapyInput({ ...baseTherapy, fasceSera: true }, 'op');
  assert.equal(input.fasceSera, true);
  assert.equal(input.fasceMattina, false);
  assert.equal(input.fascePranzo, false);
  assert.equal(input.fascePomeriggio, false);
  assert.equal(input.fasceNotte, false);
});

test('unit_required: un orario senza unita\' → 400 (il default sarebbe "compressa")', () => {
  assert.equal(
    codeOf(() =>
      service.prepareDiaryTherapyInput(
        {
          ...baseTherapy,
          schedules: [{ time: '08:00', quantityNumerator: 1, quantityDenominator: 1 }],
        },
        'op',
      ),
    ),
    'unit_required',
  );
});

test('fascia_conflict: lo stesso orario ripetuto, anche con unità diverse', () => {
  for (const schedules of [
    [
      { ...unit, time: '08:00' },
      { ...unit, time: '08:00' },
    ],
    [
      { ...unit, time: '08:00' },
      { ...unit, time: '08:00', administrationUnit: 'ml' },
    ],
  ]) {
    assert.equal(
      codeOf(() => service.prepareDiaryTherapyInput({ ...baseTherapy, schedules }, 'op')),
      'fascia_conflict',
    );
  }
});

test('intent_not_prescription: sospensione, somministrazione fatta e modifica non creano terapie', () => {
  const entry = {
    title: null,
    content: '',
    priority: 'normale' as const,
    status: 'aperta' as const,
    entryDateTime: '2026-09-29T10:00',
    category: null,
  };
  for (const [content, intent, message] of [
    ['Sospendere Ramipril 5 mg', 'sospensione', /sospensione: usa la sezione Terapia/],
    ['Ramipril 5 mg somministrato alle 8', 'somministrazione', /registrala dal giro terapia/],
    ['Aumentare Ramipril a 10 mg ore 8', 'modifica', /modifica di una terapia esistente/],
    ['- Sosp. Ramipril', 'sospensione', /sospensione/],
    ['Ramipril 5 mg sospeso', 'sospensione', /sospensione/],
    ['Tachipirina 1000 mg somministrata', 'somministrazione', /giro terapia/],
    ['Eseguito Clexane 4000 UI sc', 'somministrazione', /giro terapia/],
    ['Ramipril da 5 mg a 10 mg', 'modifica', /modifica/],
    ['Sostituire Ramipril con Enalapril', 'modifica', /modifica/],
    ['PA ridotta, sospendere Ramipril 5 mg', 'sospensione', /sospensione/],
    ['Pz agitato: sospendere Aloperidolo 2 mg ore 20', 'sospensione', /sospensione/],
    ['Ore 10 somministrata Tachipirina 1000 mg 1 cpr per os', 'somministrazione', /giro terapia/],
    ['Ramipril 5 mg 1 cpr per os ore 8 sospeso', 'sospensione', /sospensione/],
    ['Ramipril da 5 a 10 mg 1 cpr per os ore 8', 'modifica', /modifica/],
    ['Ramipril 5 mg 1 cpr per os ore 8 -> 10 mg', 'modifica', /modifica/],
    ['Tachipirina 1000 mg 1 cpr per os ore 8 già data', 'somministrazione', /giro terapia/],
    ['Ramipril 5 mg 1 cpr per os ore 8 rifiutato', 'somministrazione', /giro terapia/],
    ['Ramipril 5 mg 1 cpr per os ore 8, sospeso da oggi', 'sospensione', /sospensione/],
    ['Ramipril 5 mg: sospendere', 'sospensione', /sospensione/],
    ['Ramipril 5 mg 1 cpr per os ore 8 STOP', 'sospensione', /sospensione/],
    ['Ramipril 5 mg 1 cpr per os ore 8 annullato', 'sospensione', /sospensione/],
    ['Revocare Ramipril', 'sospensione', /sospensione/],
    ['Ramipril 5 mg 1 cpr per os ore 8 (sospeso)', 'sospensione', /sospensione/],
    ['Ramipril 5 mg 1 cpr per os ore 8 [SOSPESO]', 'sospensione', /sospensione/],
    ['Ramipril 5 mg 1 cpr per os ore 8 rifiuta', 'somministrazione', /giro terapia/],
    ['Ramipril 5 mg 1 cpr per os ore 8 somm.', 'somministrazione', /giro terapia/],
    ['Ramipril 5 mg 1 cpr per os ore 8 - fatto', 'somministrazione', /giro terapia/],
  ] as const) {
    try {
      service.assertPrescriptionEntry({ ...entry, content });
      assert.fail(`nessun blocco per "${content}"`);
    } catch (error) {
      assert.ok(error instanceof service.DiaryTherapyInputError, content);
      assert.equal(error.code, 'intent_not_prescription');
      assert.equal(error.intent, intent);
      assert.match(error.message, message);
    }
  }
  // Falsi blocchi: queste voci DEVONO poter creare la terapia (solo avviso + da_verificare).
  for (const content of [
    'Ramipril 5 mg ore 8',
    'Amoxicillina 1 g 1 cpr ore 8 e 20 per 7 giorni poi sospendere',
    'Paracetamolo 1000 mg 1 cpr al bisogno',
    'Amoxicillina sospensione orale 5 ml ore 8',
    'PA ridotta, si inizia Ramipril 5 mg 1 cpr per os ore 8',
    'Diuresi ridotta: Lasix 25 mg 1 cpr per os ore 8',
    'Dolore aumentato: Paracetamolo 1000 mg 1 cpr per os ore 8',
    'Paziente portato in reparto, si prescrive Ramipril 5 mg 1 cpr per os ore 8',
    'Ha preso poco cibo. Ramipril 5 mg 1 cpr per os ore 8',
    'Ramipril 5 mg 1 cpr per os ore 8 dopo aver assunto la colazione',
    'Ramipril 5 mg 1 cpr per os ore 8 (portato da casa)',
    'Febbre, stop antipiretici esterni: Paracetamolo 1000 mg 1 cpr per os ore 8',
    'Fatto ECG, si inizia Ramipril 5 mg 1 cpr per os ore 8',
    'Eseguito prelievo. Ramipril 5 mg 1 cpr per os ore 8',
    'Tolto CVC, Ceftriaxone 2 g ev ore 8',
    'Eliminato catetere, Ramipril 5 mg 1 cpr per os ore 8',
    'Sospesa alimentazione, Pantoprazolo 40 mg 1 cpr per os ore 8',
    'Ridotta mobilità: Enoxaparina 4000 UI sc ore 20',
    'Scala di Braden 12, Enoxaparina 4000 UI sc ore 20',
    'Ramipril 5 mg 1 cpr per os ore 8. Lasix sospeso',
    'Ramipril 5 mg 1 cpr per os ore 8 per PA aumentata',
    'Paracetamolo 1000 mg 1 cpr per os ore 8 se dolore aumentato',
    'Lasix 25 mg 1 cpr per os ore 8 per diuresi ridotta',
    'Ramipril 5 mg 1 cpr per os ore 8, sospesa alimentazione',
    'Ramipril 5 mg 1 cpr per os ore 8 sospeso?',
    'Ramipril 5 mg 1 cpr per os ore 8 non più',
    'Ramipril 5 mg 1 cpr per os ore 8 da non somministrare',
    // testo_non_classificato: avviso, mai blocco.
    'Ramipril 5 mg 1 cpr per os ore 8 terminato',
    'Ramipril 5 mg 1 cpr per os ore 8 inserito per errore',
    'Ramipril 5 mg 1 cpr per os ore 8 ✓',
    'Si somministra Tachipirina 1000 mg 1 cpr per os ore 10',
    'Tachipirina 1000 mg 1 cpr per os al bisogno, allergia',
    'Ramipril 5 mg / 10 mg 1 cpr per os ore 8',
    'Somministro Ramipril 5 mg 1 cpr per os ore 8',
    'Amoxicillina 500 mg/1 g 1 cpr per os ore 8',
  ]) {
    assert.equal(
      codeOf(() => service.assertPrescriptionEntry({ ...entry, content })),
      undefined,
    );
  }
});

// Payload costruiti come `therapyFormToInput` (frontend/src/components/shared/intake/
// therapyFormPayload.ts): schedules [] fuori da periodica, giorniSettimana '', drugPackageRef null.
function formPayload(tipo: 'periodica' | 'una_tantum' | 'al_bisogno', extra = {}) {
  return {
    farmacoNome: 'Ramipril',
    drugPackageRef: null,
    dataInizio: '2026-09-30',
    viaSomministrazione: 'orale',
    tipo,
    stato: 'attiva',
    allowedFractions: '1',
    schedules: tipo === 'periodica' ? [{ ...unit, time: '08:00' }] : [],
    giorniSettimana: '',
    ...(tipo === 'una_tantum'
      ? { dataSomministrazione: '2026-09-30', orarioSomministrazione: '10:00' }
      : {}),
    ...extra,
  };
}

test('schedule_required per tipo: periodica vuole orari, una_tantum data+ora, al_bisogno no', () => {
  for (const tipo of ['periodica', 'una_tantum', 'al_bisogno'] as const) {
    const input = service.prepareDiaryTherapyInput(formPayload(tipo), 'op');
    assert.equal(input.tipo, tipo);
  }
  assert.equal(
    codeOf(() =>
      service.prepareDiaryTherapyInput(formPayload('periodica', { schedules: [] }), 'op'),
    ),
    'schedule_required',
  );
  for (const missing of [
    { dataSomministrazione: '' },
    { orarioSomministrazione: '' },
    { orarioSomministrazione: '25:00' },
    { dataSomministrazione: undefined, orarioSomministrazione: undefined },
  ]) {
    assert.equal(
      codeOf(() => service.prepareDiaryTherapyInput(formPayload('una_tantum', missing), 'op')),
      'schedule_required',
      JSON.stringify(missing),
    );
  }
  // Ora una tantum: H:MM e HH:MM accettate, salvate come HH:MM.
  for (const [raw, saved] of [
    ['8:30', '08:30'],
    ['08:30', '08:30'],
  ] as const) {
    const input = service.prepareDiaryTherapyInput(
      formPayload('una_tantum', { orarioSomministrazione: raw }),
      'op',
    );
    assert.equal(input.orarioSomministrazione, saved);
  }
  // Senza schedules: al bisogno e una tantum non ricevono la mattina di default.
  const prn = service.prepareDiaryTherapyInput(
    { farmacoNome: 'Paracetamolo', dataInizio: '2026-09-30', tipo: 'al_bisogno' },
    'op',
  );
  assert.deepEqual(prn.schedules, []);
});

test('replay: stesso contenuto → uguale; contenuto o campi chiave diversi → diverso', () => {
  const entry = {
    title: null,
    content: 'Ramipril 5 mg ore 8',
    priority: 'normale' as const,
    status: 'aperta' as const,
    entryDateTime: '2026-09-29T10:00',
    category: null,
  };
  const therapy = {
    ...baseTherapy,
    viaSomministrazione: 'orale',
    schedules: [{ ...unit, time: '08:00' }],
  };
  const saved = {
    entry: {
      content: entry.content,
      entryDateTime: entry.entryDateTime,
      title: null,
      priority: 'normale',
    },
    therapy: {
      drugPackageRef: null,
      allowedFractions: null,
      tipo: 'periodica',
      stato: 'attiva',
      note: null,
      prescrittore: null,
      giorniSettimana: null,
      dataSomministrazione: null,
      orarioSomministrazione: null,
      farmacoNome: 'Ramipril',
      dataInizio: '2026-09-30',
      dataFine: null,
      viaSomministrazione: 'orale',
      dosaggio: '—',
      commercialStrengthValue: null,
      commercialStrengthUnit: null,
      pharmaceuticalForm: null,
      fasceMattina: true,
      fascePranzo: false,
      fascePomeriggio: false,
      fasceSera: false,
      fasceNotte: false,
      schedules: [{ ...unit, time: '08:00' }],
    },
  } as never;
  assert.equal(service.replayMatches(saved, entry, therapy), true);
  // Stessa normalizzazione del salvataggio: '' = null, tutti i giorni = null.
  assert.equal(
    service.replayMatches(saved, entry, { ...therapy, note: '', giorniSettimana: '1,2,3,4,5,6,7' }),
    true,
  );
  assert.equal(service.replayMatches(saved, { ...entry, content: 'altro' }, therapy), false);
  for (const changedEntry of [
    { ...entry, entryDateTime: '2026-09-29T11:00' },
    { ...entry, title: 'Nuova terapia' },
    { ...entry, priority: 'urgente' as const },
  ]) {
    assert.equal(
      service.replayMatches(saved, changedEntry, therapy),
      false,
      JSON.stringify(changedEntry),
    );
  }
  for (const changed of [
    { ...therapy, farmacoNome: 'Enalapril' },
    { ...therapy, dosaggio: '10 mg' },
    { ...therapy, viaSomministrazione: 'ev' },
    { ...therapy, dataInizio: '2026-10-01' },
    { ...therapy, dataFine: '2026-10-10' },
    { ...therapy, schedules: [{ ...unit, time: '09:00' }] },
    { ...therapy, schedules: [{ ...unit, time: '08:00', quantityDenominator: 2 }] },
    { ...therapy, schedules: [{ ...unit, time: '08:00', administrationUnit: 'capsula' }] },
    { ...therapy, giorniSettimana: '1,3,5' },
    { ...therapy, stato: 'sospesa' },
    { ...therapy, tipo: 'al_bisogno' },
    { ...therapy, note: 'dopo colazione' },
    { ...therapy, prescrittore: 'Dr. Rossi' },
    { ...therapy, drugPackageRef: '012345678' },
    { ...therapy, allowedFractions: '1,1/2' },
  ]) {
    assert.equal(service.replayMatches(saved, entry, changed), false, JSON.stringify(changed));
  }
});

test("Privacy: i log della creazione riportano solo nome e codice dell'errore", async () => {
  const source = await readFile(routeUrl, 'utf8');
  const create = source.split("'/:patientId/diary/with-therapy'")[1] ?? '';
  const errorLogs = create.match(/console\.error\([\s\S]*?\);/g) ?? [];
  // The route now has a single catch (validation moved to patients/diary-write-service.ts, which
  // does not log at all).
  assert.ok(errorLogs.length >= 1);
  const service = await readFile(writeServiceUrl, 'utf8');
  assert.doesNotMatch(service, /console\./);
  for (const call of errorLogs) assert.match(call, /\.\.\.safeErrorTag\(error\)\);$/, call);
});
