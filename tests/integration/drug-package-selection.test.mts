import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import {
  fixtureActors,
  fixturePatientIds,
  startParameterDatabase,
  seedParameterDatabase,
  selectLocalParameterDatabase,
  closeParameterPrisma,
} from '../fixtures/parameter-database.mjs';
import { seedDrugCatalog } from '../fixtures/drug-catalog.mjs';
import { therapyFormToInput } from '../../frontend/src/components/shared/intake/therapyFormPayload.ts';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let search: typeof import('../../backend/src/services/farmaci/ricerca.js');
let confirmDraft: typeof import('../../backend/src/ai/upload/confirm-service.js').confirmDraft;
let server: Server;
let url: string;
const actor = fixtureActors.operator;
const patientId = fixturePatientIds[0];
const headers = {
  'Content-Type': 'application/json',
  'X-Operator-Id': actor.id,
  'X-Operator-Role': actor.role,
};
const selectedForm: any = {
  farmacoNome: 'TACHIPIRINA',
  drugPackageRef: '012745170',
  pharmaceuticalForm: 'compressa',
  commercialStrengthValue: '1000',
  commercialStrengthUnit: 'mg',
  allowedFractions: ['1'],
  viaSomministrazione: 'orale',
  tipo: 'periodica',
  stato: 'attiva',
  dataInizio: '2026-09-23',
  dataFine: '',
  schedules: [
    {
      time: '20:00',
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    },
  ],
  giorniSettimana: [],
  prescrittore: '',
  note: 'Istruzione sintetica',
  dataSomministrazione: '',
  orarioSomministrazione: '',
};

before(
  async () => {
    database = await startParameterDatabase();
    await seedParameterDatabase(database.db);
    selectLocalParameterDatabase(database.url);
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    await seedDrugCatalog(prisma);
    search = await import('../../backend/src/services/farmaci/ricerca.js');
    ({ confirmDraft } = await import('../../backend/src/ai/upload/confirm-service.js'));
    const [{ default: express }, { default: medications }, { default: therapies }] =
      await Promise.all([
        import('express'),
        import('../../backend/src/routes/farmaci.js'),
        import('../../backend/src/routes/patient-therapies.js'),
      ]);
    const app = express();
    app.use(express.json());
    app.use('/farmaci', medications);
    app.use('/patients', therapies);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    url = `http://127.0.0.1:${(server.address() as any).port}`;
  },
  { timeout: 60000 },
);

after(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('catalog query filters strength and form before the old 12-result limit with null active-ingredient strengths', async () => {
  for (const query of [
    'Tachipirina 1000 compresse',
    'Tachipirina1000 compresse',
    'Tachiprina 1000 compresse',
  ]) {
    const results = await search.cercaFarmaci(query, { limite: 12, client: prisma });
    assert.deepEqual(
      results.map((r) => r.aic),
      ['012745170', '012745182'],
      query,
    );
    assert.ok(results.every((r) => r.principiAttivi[0].quantita === null));
  }
  const byIngredient = await search.cercaPerPrincipioAttivo('paracetamolo 1000 compresse', {
    limite: 12,
    client: prisma,
  });
  assert.deepEqual(
    byIngredient.map((r) => r.aic),
    ['012745170', '012745182'],
  );
});

test('public route exposes stable duplicate-free continuation and rejects a cursor for a different query', async () => {
  const seen: string[] = [];
  let cursor: string | null = null;
  let firstCursor: string | null = null;
  for (let page = 0; page < 12; page++) {
    const qs = new URLSearchParams({
      q: 'Tachipirina',
      limite: '3',
      ...(cursor ? { cursor } : {}),
    });
    const response = await fetch(`${url}/farmaci/cerca?${qs}`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as any;
    assert.ok(body.pageInfo);
    seen.push(...body.esiti.map((r: any) => r.aic));
    cursor = body.pageInfo.nextCursor;
    firstCursor ??= cursor;
    if (!body.pageInfo.hasMore) break;
    assert.ok(cursor);
  }
  assert.equal(seen.length, 20);
  assert.equal(new Set(seen).size, 20);
  assert.deepEqual(seen, [...seen].sort());
  assert.ok(firstCursor);
  const invalid = await fetch(
    `${url}/farmaci/cerca?${new URLSearchParams({ q: 'altro farmaco', limite: '3', cursor: firstCursor })}`,
  );
  assert.equal(invalid.status, 400);
});

test('frontend selection survives real POST, GET, edit PUT, and an explicit switch to free text clears AIC', async () => {
  const input = therapyFormToInput(selectedForm);
  assert.equal(input.drugPackageRef, '012745170');
  const created = await fetch(`${url}/patients/${patientId}/therapies`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  assert.equal(created.status, 201, await created.clone().text());
  const therapy = (await created.json()) as any;
  const get = await fetch(`${url}/patients/${patientId}/therapies`, { headers });
  const reloaded = ((await get.json()) as any[]).find((t) => t.id === therapy.id);
  assert.equal(reloaded.drugPackageRef, '012745170');
  const mapping =
    await import('../../frontend/src/components/operator/cartella/therapyFormMapping.ts');
  const form = mapping.therapyToForm(reloaded);
  assert.equal(form.drugPackageRef, '012745170');
  const next = mapping.formToPayload(
    { ...form, note: 'Nota aggiornata' },
    patientId,
    'Operatrice QA',
  );
  const edited = await fetch(`${url}/patients/${patientId}/therapies/${therapy.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(next),
  });
  assert.equal(edited.status, 200, await edited.clone().text());
  const result = (await edited.json()) as any;
  assert.equal(result.drugPackageRef, '012745170');
  assert.equal(result.schedules[0].time, '20:00');
  assert.equal(result.schedules[0].quantityNumerator, 1);
  assert.equal(result.schedules[0].quantityDenominator, 1);
  const { applyTherapyFormChange } =
    await import('../../frontend/src/components/operator/cartella/therapyFormChange.ts');
  const free = applyTherapyFormChange(form, {
    farmacoNome: 'Preparato sintetico',
    drugPackageRef: '',
  });
  const cleared = await fetch(`${url}/patients/${patientId}/therapies/${therapy.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(mapping.formToPayload(free, patientId, 'Operatrice QA')),
  });
  assert.equal(cleared.status, 200, await cleared.clone().text());
  assert.ok(!((await cleared.json()) as any).drugPackageRef);
});

test('intake binds AIC to its saved review, persists the chosen package and rejects silent package substitution', async () => {
  const data: any = {
    terapiaImport: [
      {
        farmacoNome: 'TACHIPIRINA',
        stato: 'ok',
        reviewedTherapy: selectedForm,
        originalText: 'Fonte sintetica',
      },
    ],
  };
  const draft = await prisma.patientIntakeDraft.create({
    data: { createdById: actor.id, source: 'import', data },
  });
  const input = { ...therapyFormToInput(selectedForm), intakeSource: { type: 'import', index: 0 } };
  const payload: any = {
    patient: { firstName: 'Confezione', lastName: 'Sintetica' },
    therapies: [input],
  };
  await assert.rejects(
    confirmDraft(
      draft.id,
      { ...payload, therapies: [{ ...input, drugPackageRef: '012745182' }] },
      actor,
    ),
    /bozza salvata/,
  );
  const result = await confirmDraft(draft.id, payload, actor);
  const rows = await prisma.patientTherapy.findMany({
    where: { patientId: result.patient!.id },
    include: { schedules: true },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].drugPackageRef, '012745170');
  assert.equal(rows[0].commercialStrengthValue, 1000);
  assert.equal(rows[0].schedules[0].time, '20:00');
  assert.equal((await confirmDraft(draft.id, payload, actor)).patient!.id, result.patient!.id);
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: result.patient!.id } }), 1);
});
