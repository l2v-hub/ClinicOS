// Diario terapia (PR 1) — AC2/AC3 su Postgres reale (solo CI, job `gate`: Postgres di servizio
// su 127.0.0.1, mai il DB di produzione). Dati sintetici marcati, rimossi in `after`.
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';
import { prisma } from '../../lib/prisma.js';
import patientDiaryRouter from '../patient-diary.js';

const marker = `diary-therapy-${Date.now()}`;
const drug = (key: string) => `ZZ${marker}-${key}`;
const failContent = `${marker}-fail-diary-insert`;
const triggerFn = `test_fail_diary_${Date.now()}`;
let server: Server;
let base = '';
let operatorAId = '';
let operatorBId = '';
let patientAId = '';
let patientBId = '';
const consegnaId = `${marker}-consegna`;
const originalAuthMode = process.env.AUTH_MODE;
const originalNodeEnv = process.env.NODE_ENV;

function headers(operatorId: string): Record<string, string> {
  return {
    'X-Operator-Id': operatorId,
    'X-Operator-Role': 'operatore',
    'Content-Type': 'application/json',
  };
}

function body(requestId: string, farmacoNome: string, overrides: Record<string, unknown> = {}) {
  return {
    requestId,
    entry: {
      content: `${farmacoNome} 5 mg 1 cp ore 8 e 20 per os dal 30/09`,
      entryDateTime: '2026-09-29T10:00',
      category: 'ignorata',
    },
    therapy: {
      farmacoNome,
      dataInizio: '2026-09-30',
      viaSomministrazione: 'orale',
      operatoreInseritore: 'Autore Falso',
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
    ...overrides,
  };
}

async function post(path: string, operatorId: string, payload: unknown) {
  return fetch(`${base}/patients/${path}`, {
    method: 'POST',
    headers: headers(operatorId),
    body: JSON.stringify(payload),
  });
}

// Una istruzione per chiamata: il driver pg non accetta piu' comandi in una query parametrica.
async function dropFailTrigger() {
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${triggerFn} ON "PatientDiaryEntry"`);
  await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${triggerFn}()`);
}

async function counts(patientId: string) {
  const [therapies, entries] = await Promise.all([
    prisma.patientTherapy.count({ where: { patientId } }),
    prisma.patientDiaryEntry.count({ where: { patientId } }),
  ]);
  return { therapies, entries };
}

before(async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1', 'synthetic loopback only');
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  const [a, b] = await Promise.all(
    ['a', 'b'].map((key) =>
      prisma.user.create({
        data: {
          email: `${marker}-${key}@example.test`,
          passwordHash: 'test-only',
          fullName: `Operatore ${key.toUpperCase()}`,
          operator: { create: { ruolo: 'medico' } },
        },
        include: { operator: true },
      }),
    ),
  );
  operatorAId = a.operator!.id;
  operatorBId = b.operator!.id;
  const [pa, pb] = await Promise.all(
    [operatorAId, operatorBId].map((registeredById, index) =>
      prisma.patient.create({
        data: {
          medicalRecordNumber: `${marker}-mrn-${index}`,
          firstName: 'Paziente',
          lastName: `Diario${index}`,
          dateOfBirth: new Date('1950-01-01'),
          registeredById,
        },
      }),
    ),
  );
  patientAId = pa.id;
  patientBId = pb.id;

  const app = express();
  app.use(express.json());
  app.use('/patients', patientDiaryRouter);
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
  await dropFailTrigger();
  // L'audit e' fire-and-forget: attende le scritture in volo prima di ripulire.
  await new Promise((resolve) => setTimeout(resolve, 300));
  await prisma.aiAuditEvent.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
  await prisma.consegna.deleteMany({ where: { id: consegnaId } });
  await prisma.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
  if (originalAuthMode === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = originalAuthMode;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

test('AC2: paziente fuori ambito o inesistente → 404 su anteprima e creazione, nessuna scrittura', async () => {
  const before = await counts(patientBId);
  const preview = await post(`${patientBId}/diary/therapy-preview`, operatorAId, {
    text: 'Ramipril 5 mg',
  });
  assert.equal(preview.status, 404);
  const create = await post(
    `${patientBId}/diary/with-therapy`,
    operatorAId,
    body(`${marker}-scope`, drug('scope')),
  );
  assert.equal(create.status, 404);
  const missing = await post(
    `missing-${marker}/diary/with-therapy`,
    operatorAId,
    body(`${marker}-missing`, drug('missing')),
  );
  assert.equal(missing.status, 404);
  assert.deepEqual(await counts(patientBId), before);
});

test('AC2: anteprima 200 con la forma attesa', async () => {
  const res = await post(`${patientAId}/diary/therapy-preview`, operatorAId, {
    text: 'Ramipril 5 mg 1 cp ore 8 e 20 per os dal 30/09',
    entryDateTime: '2026-09-29T10:00',
  });
  assert.equal(res.status, 200, await res.clone().text());
  assert.match(res.headers.get('cache-control') ?? '', /no-store/);
  const json = (await res.json()) as {
    row: Record<string, unknown>;
    intent: string;
    inferred: string[];
    ambiguous: string[];
    fasciaConflicts: string[];
    source: string;
  };
  assert.deepEqual(Object.keys(json).sort(), [
    'ambiguous',
    'fasciaConflicts',
    'inferred',
    'intent',
    'prescriptionRange',
    'row',
    'source',
  ]);
  assert.equal(json.source, 'deterministic');
  assert.equal(json.intent, 'prescrizione');
  assert.equal(json.row.stato, 'da_verificare');
  assert.deepEqual(json.ambiguous, []);
  assert.equal(json.row.farmacoNome, 'RAMIPRIL');
  assert.deepEqual(json.row.orari, ['08:00', '20:00']);
  assert.equal(json.row.dataInizio, '2026-09-30');
  assert.equal(json.row.unitaSomministrazione, '');
  assert.deepEqual(json.inferred, ['dataInizio']);
  assert.deepEqual(json.fasciaConflicts, []);
});

test('AC2: terapia non valida, voce non valida o conflitto di fascia → 400 senza voce né terapia', async () => {
  const before = await counts(patientAId);
  const invalidTherapy = body(`${marker}-invalid-1`, drug('invalid'));
  delete (invalidTherapy.therapy as Record<string, unknown>).dataInizio;
  const conflict = body(`${marker}-invalid-2`, drug('conflict'));
  (conflict.therapy as Record<string, unknown>).schedules = [
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
  ];
  const invalidEntry = body(`${marker}-invalid-3`, drug('entry'));
  (invalidEntry.entry as Record<string, unknown>).content = '   ';
  const badRequestId = body('x', drug('reqid'));
  const suspension = body(`${marker}-invalid-4`, drug('suspension'));
  (suspension.entry as Record<string, unknown>).content = `Sospendere ${drug('suspension')} 5 mg`;
  const noSchedule = body(`${marker}-invalid-5`, drug('noschedule'));
  delete (noSchedule.therapy as Record<string, unknown>).schedules;
  const noUnit = body(`${marker}-invalid-6`, drug('nounit'));
  (noUnit.therapy as Record<string, unknown>).schedules = [
    { time: '08:00', quantityNumerator: 1, quantityDenominator: 1 },
  ];
  const sameTime = body(`${marker}-invalid-7`, drug('sametime'));
  (sameTime.therapy as Record<string, unknown>).schedules = [
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    },
    { time: '08:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'ml' },
  ];

  const administered = body(`${marker}-invalid-8`, drug('administered'));
  (administered.entry as Record<string, unknown>).content =
    `${drug('administered')} 5 mg somministrato alle 8`;
  const modified = body(`${marker}-invalid-9`, drug('modified'));
  (modified.entry as Record<string, unknown>).content = `Aumentare ${drug('modified')} a 10 mg`;
  const periodicEmpty = body(`${marker}-invalid-10`, drug('periodic-empty'));
  (periodicEmpty.therapy as Record<string, unknown>).schedules = [];
  const oneShotNoTime = body(`${marker}-invalid-11`, drug('oneshot-notime'));
  Object.assign(oneShotNoTime.therapy as Record<string, unknown>, {
    tipo: 'una_tantum',
    schedules: [],
    dataSomministrazione: '2026-09-30',
  });

  const expectedCodes: Array<[Record<string, unknown>, string | undefined]> = [
    [invalidTherapy, undefined],
    [conflict, 'fascia_conflict'],
    [invalidEntry, undefined],
    [badRequestId, 'request_id_invalid'],
    [suspension, 'intent_not_prescription'],
    [noSchedule, 'schedule_required'],
    [noUnit, 'unit_required'],
    [sameTime, 'fascia_conflict'],
    [administered, 'intent_not_prescription'],
    [modified, 'intent_not_prescription'],
    [periodicEmpty, 'schedule_required'],
    [oneShotNoTime, 'schedule_required'],
  ];
  for (const [payload, code] of expectedCodes) {
    const res = await post(`${patientAId}/diary/with-therapy`, operatorAId, payload);
    assert.equal(res.status, 400, JSON.stringify(payload.requestId));
    const json = (await res.json()) as { code?: string };
    if (code) assert.equal(json.code, code, JSON.stringify(payload.requestId));
  }
  const conflictRes = await post(`${patientAId}/diary/with-therapy`, operatorAId, conflict);
  const conflictJson = (await conflictRes.json()) as { code: string; fasciaConflicts: string[] };
  assert.equal(conflictJson.code, 'fascia_conflict');
  assert.deepEqual(conflictJson.fasciaConflicts, ['mattina: 08:00, 10:00']);
  assert.deepEqual(await counts(patientAId), before);
});

test('AC3: creazione collegata, poi stesso requestId → 200 con la stessa coppia e una sola terapia', async () => {
  const requestId = `${marker}-replay`;
  const first = await post(
    `${patientAId}/diary/with-therapy`,
    operatorAId,
    body(requestId, drug('replay')),
  );
  assert.equal(first.status, 201, await first.clone().text());
  const created = (await first.json()) as {
    entry: Record<string, unknown>;
    therapy: Record<string, unknown> & { schedules: unknown[] };
  };
  assert.equal(created.entry.category, 'terapia');
  assert.equal(created.entry.therapyId, created.therapy.id);
  assert.equal(created.entry.therapyRequestId, requestId);
  assert.equal(created.entry.authorName, 'Operatore A');
  assert.notEqual(created.therapy.operatoreInseritore, 'Autore Falso');
  assert.equal(created.therapy.schedules.length, 2);

  const again = await post(
    `${patientAId}/diary/with-therapy`,
    operatorAId,
    body(requestId, drug('replay')),
  );
  assert.equal(again.status, 200, await again.clone().text());
  const replay = (await again.json()) as typeof created;
  assert.equal(replay.entry.id, created.entry.id);
  assert.equal(replay.therapy.id, created.therapy.id);
  assert.equal(await prisma.patientTherapy.count({ where: { farmacoNome: drug('replay') } }), 1);

  // Stesso requestId, contenuto diverso: 409, nessuna nuova scrittura.
  const differentContent = body(requestId, drug('replay'));
  (differentContent.entry as Record<string, unknown>).content = 'Contenuto diverso';
  const differentSchedule = body(requestId, drug('replay'));
  (differentSchedule.therapy as Record<string, unknown>).schedules = [
    {
      time: '09:00',
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    },
  ];
  const differentDrug = body(requestId, drug('replay-other'));
  const differentTime = body(requestId, drug('replay'));
  (differentTime.entry as Record<string, unknown>).entryDateTime = '2026-09-29T11:00';
  const differentNote = body(requestId, drug('replay'));
  (differentNote.therapy as Record<string, unknown>).note = 'dopo colazione';
  const differentDays = body(requestId, drug('replay'));
  (differentDays.therapy as Record<string, unknown>).giorniSettimana = '1,3,5';
  const differentTitle = body(requestId, drug('replay'));
  (differentTitle.entry as Record<string, unknown>).title = 'Nuova terapia';
  const differentPriority = body(requestId, drug('replay'));
  (differentPriority.entry as Record<string, unknown>).priority = 'urgente';
  const differentPackage = body(requestId, drug('replay'));
  (differentPackage.therapy as Record<string, unknown>).drugPackageRef = '012345678';
  const before409 = await counts(patientAId);
  for (const payload of [
    differentContent,
    differentSchedule,
    differentDrug,
    differentTime,
    differentNote,
    differentDays,
    differentTitle,
    differentPriority,
    differentPackage,
  ]) {
    const res = await post(`${patientAId}/diary/with-therapy`, operatorAId, payload);
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { code: string }).code, 'request_id_reused');
  }
  assert.deepEqual(await counts(patientAId), before409);

  // Audit PHI-safe: solo nomi di campi, esiti ok e deduped.
  let events: Array<{ outcome: string; fields: string[]; kind: string; channel: string }> = [];
  for (let i = 0; i < 20 && events.length < 2; i++) {
    events = await prisma.aiAuditEvent.findMany({
      where: { requestId, actionType: 'diary_therapy_create' },
    });
    if (events.length < 2) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepEqual(events.map((e) => e.outcome).sort(), ['deduped', 'ok']);
  for (const event of events) {
    assert.equal(event.kind, 'create');
    assert.equal(event.channel, 'ui');
    assert.ok(event.fields.every((f) => /^(entry|therapy)\.[A-Za-z]+$/.test(f)));
  }
});

test('AC3: doppio POST in parallelo con lo stesso requestId → una sola terapia', async () => {
  const requestId = `${marker}-parallel`;
  const responses = await Promise.all(
    [0, 1, 2].map(() =>
      post(`${patientAId}/diary/with-therapy`, operatorAId, body(requestId, drug('parallel'))),
    ),
  );
  const statuses = responses.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 200, 201]);
  const ids = new Set(
    await Promise.all(
      responses.map(async (r) => ((await r.json()) as { entry: { id: string } }).entry.id),
    ),
  );
  assert.equal(ids.size, 1);
  assert.equal(await prisma.patientTherapy.count({ where: { farmacoNome: drug('parallel') } }), 1);
  assert.equal(
    await prisma.patientDiaryEntry.count({
      where: { patientId: patientAId, therapyRequestId: requestId },
    }),
    1,
  );
});

test('AC3: se la voce di diario fallisce non resta nessuna terapia (transazione atomica)', async () => {
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION ${triggerFn}() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW."content" = '${failContent}' THEN RAISE EXCEPTION 'test: diary insert failure'; END IF;
      RETURN NEW;
    END $$;`);
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER ${triggerFn} BEFORE INSERT ON "PatientDiaryEntry" FOR EACH ROW EXECUTE FUNCTION ${triggerFn}();`,
  );
  try {
    const before = await counts(patientAId);
    const payload = body(`${marker}-atomic`, drug('atomic'));
    (payload.entry as Record<string, unknown>).content = failContent;
    const res = await post(`${patientAId}/diary/with-therapy`, operatorAId, payload);
    assert.equal(res.status, 500);
    assert.equal(await prisma.patientTherapy.count({ where: { farmacoNome: drug('atomic') } }), 0);
    assert.deepEqual(await counts(patientAId), before);
  } finally {
    await dropFailTrigger();
  }
});

test('AC3: la lettura del diario espone therapy.stato (anche sospesa); cancellata → therapyId null', async () => {
  const requestId = `${marker}-read`;
  const res = await post(
    `${patientAId}/diary/with-therapy`,
    operatorAId,
    body(requestId, drug('read')),
  );
  assert.equal(res.status, 201, await res.clone().text());
  const { entry, therapy } = (await res.json()) as {
    entry: { id: string };
    therapy: { id: string };
  };
  await prisma.consegna.create({
    data: {
      id: consegnaId,
      pazienteId: patientAId,
      pazienteNome: 'Paziente Diario0',
      note: 'Consegna sintetica',
      scadenza: '2026-09-29',
      operatoreAssegnato: 'Operatore A',
      operatoreAssegnatoId: operatorAId,
      creatoDA: 'Operatore A',
      creatoDaId: operatorAId,
    },
  });
  await prisma.patientTherapy.update({ where: { id: therapy.id }, data: { stato: 'sospesa' } });

  type FeedEntry = {
    id: string;
    sourceType: string;
    therapy: { id: string; farmacoNome: string; stato: string } | null;
  };
  const read = async () => {
    const page = await fetch(`${base}/patients/${patientAId}/diary?limit=100`, {
      headers: headers(operatorAId),
    });
    assert.equal(page.status, 200, await page.clone().text());
    return ((await page.json()) as { entries: FeedEntry[] }).entries;
  };

  const entries = await read();
  const linked = entries.find((e) => e.id === entry.id);
  assert.deepEqual(linked?.therapy, {
    id: therapy.id,
    farmacoNome: drug('read'),
    stato: 'sospesa',
  });
  const handover = entries.find((e) => e.sourceType === 'consegna');
  assert.ok(handover, 'la consegna compare nel diario');
  assert.equal(handover.therapy, null);

  await prisma.patientTherapy.delete({ where: { id: therapy.id } });
  const row = await prisma.patientDiaryEntry.findUnique({ where: { id: entry.id } });
  assert.ok(row, 'la voce clinica resta');
  assert.equal(row.therapyId, null);
  assert.equal(row.therapyRequestId, requestId);
  const afterDelete = (await read()).find((e) => e.id === entry.id);
  assert.equal(afterDelete?.therapy, null);

  // Replay dopo la cancellazione: 200 con la voce esistente e therapy null, nessuna nuova terapia.
  const replay = await post(
    `${patientAId}/diary/with-therapy`,
    operatorAId,
    body(requestId, drug('read')),
  );
  assert.equal(replay.status, 200);
  const replayJson = (await replay.json()) as { entry: { id: string }; therapy: unknown };
  assert.equal(replayJson.entry.id, entry.id);
  assert.equal(replayJson.therapy, null);
  assert.equal(await prisma.patientTherapy.count({ where: { farmacoNome: drug('read') } }), 0);
});

test('Migrazione: voci senza terapia (colonne nuove a NULL) convivono con quelle collegate', async () => {
  // Voci "vecchie": come quelle gia' in produzione prima della migrazione, therapyId e
  // therapyRequestId restano NULL. Piu' NULL per lo stesso paziente non violano l'indice unico.
  const legacyIds = [1, 2, 3].map((n) => `${marker}-legacy-${n}`);
  await prisma.patientDiaryEntry.createMany({
    data: legacyIds.map((id, index) => ({
      id,
      patientId: patientAId,
      authorType: 'infermiere',
      authorName: 'Voce storica',
      content: `Voce storica ${index}`,
      entryDateTime: `2026-09-2${index}T08:00`,
    })),
  });
  const legacyRows = await prisma.patientDiaryEntry.findMany({
    where: { id: { in: legacyIds } },
    select: { therapyId: true, therapyRequestId: true },
  });
  assert.equal(legacyRows.length, 3);
  assert.ok(legacyRows.every((r) => r.therapyId === null && r.therapyRequestId === null));

  const res = await post(
    `${patientAId}/diary/with-therapy`,
    operatorAId,
    body(`${marker}-after-legacy`, drug('after-legacy')),
  );
  assert.equal(res.status, 201, await res.clone().text());
  // Un'altra voce normale dopo il flusso: ancora NULL, ancora ammessa.
  const plain = await fetch(`${base}/patients/${patientAId}/diary`, {
    method: 'POST',
    headers: headers(operatorAId),
    body: JSON.stringify({ content: 'Voce normale', entryDateTime: '2026-09-29T11:00' }),
  });
  assert.equal(plain.status, 201, await plain.clone().text());

  const page = await fetch(`${base}/patients/${patientAId}/diary?limit=100`, {
    headers: headers(operatorAId),
  });
  const entries = ((await page.json()) as { entries: Array<{ id: string; therapy: unknown }> })
    .entries;
  for (const id of legacyIds) {
    assert.equal(entries.find((e) => e.id === id)?.therapy, null, id);
  }
  assert.equal(
    (await prisma.patientDiaryEntry.count({
      where: { patientId: patientAId, therapyRequestId: null },
    })) >= 4,
    true,
  );
});

test('QA2-3: una tantum (data+ora) e al bisogno senza orari si creano, senza fasce inventate', async () => {
  const oneShot = body(`${marker}-oneshot`, drug('oneshot'));
  (oneShot.entry as Record<string, unknown>).content =
    `${drug('oneshot')} 1 g 1 fiala ev una tantum`;
  Object.assign(oneShot.therapy as Record<string, unknown>, {
    tipo: 'una_tantum',
    stato: 'attiva',
    schedules: [],
    giorniSettimana: '',
    drugPackageRef: null,
    allowedFractions: '1',
    dataSomministrazione: '2026-09-30',
    orarioSomministrazione: '8:30',
  });
  const prn = body(`${marker}-prn`, drug('prn'));
  (prn.entry as Record<string, unknown>).content = `${drug('prn')} 1000 mg 1 cpr al bisogno`;
  Object.assign(prn.therapy as Record<string, unknown>, {
    tipo: 'al_bisogno',
    stato: 'attiva',
    schedules: [],
    giorniSettimana: '',
    drugPackageRef: null,
    allowedFractions: '1',
    note: 'se febbre > 38',
  });
  for (const [payload, tipo] of [
    [oneShot, 'una_tantum'],
    [prn, 'al_bisogno'],
  ] as const) {
    const res = await post(`${patientAId}/diary/with-therapy`, operatorAId, payload);
    assert.equal(res.status, 201, await res.clone().text());
    const { therapy } = (await res.json()) as {
      therapy: Record<string, unknown> & { schedules: unknown[] };
    };
    assert.equal(therapy.tipo, tipo);
    assert.deepEqual(therapy.schedules, []);
    if (tipo === 'una_tantum') assert.equal(therapy.orarioSomministrazione, '08:30');
    for (const flag of [
      'fasceMattina',
      'fascePranzo',
      'fascePomeriggio',
      'fasceSera',
      'fasceNotte',
    ]) {
      assert.equal(therapy[flag], false, `${tipo} ${flag}`);
    }
    // Replay identico: 200.
    const again = await post(`${patientAId}/diary/with-therapy`, operatorAId, payload);
    assert.equal(again.status, 200, await again.clone().text());
  }
});

test('QA3-D: una menzione non blocca — "PA ridotta, si inizia ..." crea voce e terapia', async () => {
  const payload = body(`${marker}-mention`, drug('mention'));
  (payload.entry as Record<string, unknown>).content =
    `PA ridotta, si inizia ${drug('mention')} 5 mg 1 cpr per os ore 8`;
  const res = await post(`${patientAId}/diary/with-therapy`, operatorAId, payload);
  assert.equal(res.status, 201, await res.clone().text());
  const blocked = body(`${marker}-lead-verb`, drug('lead-verb'));
  (blocked.entry as Record<string, unknown>).content = `- Sosp. ${drug('lead-verb')}`;
  const res2 = await post(`${patientAId}/diary/with-therapy`, operatorAId, blocked);
  assert.equal(res2.status, 400);
  const json = (await res2.json()) as { code: string; intent: string };
  assert.equal(json.code, 'intent_not_prescription');
  assert.equal(json.intent, 'sospensione');
  assert.equal(await prisma.patientTherapy.count({ where: { farmacoNome: drug('lead-verb') } }), 0);
});

test('QA4: clausole — una menzione in un altro inciso crea, un participio in coda blocca', async () => {
  const preview = await post(`${patientAId}/diary/therapy-preview`, operatorAId, {
    text: 'Ricoverato dal 25/09, Ramipril 5 mg 1 cpr per os ore 8',
    entryDateTime: '2026-09-29T10:00',
  });
  assert.equal(preview.status, 200);
  const json = (await preview.json()) as {
    row: { farmacoNome: string; dataInizio: string; note: string };
    prescriptionRange: { start: number; end: number } | null;
  };
  assert.equal(json.row.farmacoNome, 'RAMIPRIL');
  assert.equal(json.row.dataInizio, '');
  assert.equal(json.row.note, 'Ricoverato dal 25/09');
  assert.ok(json.prescriptionRange && json.prescriptionRange.start > 0);

  const creates = body(`${marker}-qa4-ok`, drug('qa4-ok'));
  (creates.entry as Record<string, unknown>).content =
    `Fatto ECG, si inizia ${drug('qa4-ok')} 5 mg 1 cpr per os ore 8`;
  const ok = await post(`${patientAId}/diary/with-therapy`, operatorAId, creates);
  assert.equal(ok.status, 201, await ok.clone().text());

  const blocked = body(`${marker}-qa4-tail`, drug('qa4-tail'));
  (blocked.entry as Record<string, unknown>).content =
    `${drug('qa4-tail')} 5 mg 1 cpr per os ore 8 sospeso`;
  const res = await post(`${patientAId}/diary/with-therapy`, operatorAId, blocked);
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as { intent: string }).intent, 'sospensione');
  assert.equal(await prisma.patientTherapy.count({ where: { farmacoNome: drug('qa4-tail') } }), 0);
});

test('QA5: tutto o niente anche via route — una parola non classificata svuota i campi', async () => {
  const res = await post(`${patientAId}/diary/therapy-preview`, operatorAId, {
    text: 'Febbre Tachipirina 1000 mg 1 cpr per os ore 8',
    entryDateTime: '2026-09-29T10:00',
  });
  assert.equal(res.status, 200);
  const { row } = (await res.json()) as {
    row: { farmacoNome: string; dosaggio: string; orari: string[]; note: string; stato: string };
  };
  assert.equal(row.farmacoNome, '');
  assert.equal(row.dosaggio, '');
  assert.deepEqual(row.orari, []);
  assert.equal(row.note, 'Febbre Tachipirina 1000 mg 1 cpr per os ore 8');
  assert.equal(row.stato, 'da_verificare');
});
