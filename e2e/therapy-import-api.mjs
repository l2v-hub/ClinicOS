// #156 deterministic API E2E: discharge therapy TEXT -> structured `terapiaImport` rows (one per
// drug) -> confirm -> PatientTherapy persisted (verified by a fresh DB read = "after refresh").
// No browser, no real key (mock extraction can't produce text, so we seed a job with a therapy
// narrative directly). Run: tsx e2e/therapy-import-api.mjs
import assert from 'node:assert/strict';
import app from '../backend/src/app.js';
import { prisma } from '../backend/src/lib/prisma.js';
import { createTestOperator } from '../backend/src/test-support/operator-fixture.js';

const OP = { 'X-Operator-Id': 'op-e2e-ther', 'X-Operator-Role': 'operatore' };
const cleanupOperator = await createTestOperator(OP['X-Operator-Id'], 'therapy-e2e@clinicos.test');
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });

const THERAPY = [
  '1. KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
  '2. CACIT VIT.D3 BS 1GR/880UI (OS) 1 Dosi ore 08:00 dal 03/07/2026 Mar Gio Sab Dom (Classe A)',
  '3. PEVARYL POLVERE INGUINE SN X 1 AL DI',
  '4. PARACETAMOLO 500 mg 1 cpr per os al bisogno per dolore dal 03/07/2026',
].join('\n');

const narrative = {
  schemaVersion: 'clinicos-discharge-narrative-v1',
  firstName: 'E2ETher',
  lastName: 'Sintetico',
  dateOfBirth: '1955-09-09',
  placeOfBirth: '',
  sex: '',
  fiscalCode: '',
  address: '',
  phone: '',
  email: '',
  allergyStatus: 'not_documented',
  allergiesText: '',
  diagnosisText: '',
  anamnesisText: '',
  hospitalCourseText: '',
  consultationsText: '',
  imagingDiagnosticsText: '',
  proceduresAndInterventionsText: '',
  therapyText: THERAPY,
  adviceAndFollowUpText: '',
  unmappedText: '',
  boldTags: [],
  sourceReferences: [],
  missingSections: [],
  warnings: [],
};

const patientIds = [],
  jobIds = [],
  draftIds = [];
let failed = false;
try {
  // #294: local re-runs against a persistent DB — free the unique CF first.
  await prisma.patient.deleteMany({ where: { codiceFiscale: 'SNTTHR55P09H501Y' } });

  // 1. Seed a review-ready import job carrying a therapy narrative.
  const job = await prisma.importJob.create({
    data: {
      maxFiles: 5,
      maxTotalBytes: 10 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 864e5),
      status: 'review_ready',
      createdById: OP['X-Operator-Id'],
      resultData: {
        _narrative: narrative,
        _sections: null,
        _full: {
          cartella: {
            farmaci: [{ nome: 'QA Extraction-only medicine', dose: '5 mg', frequenza: '08:00' }],
          },
        },
      },
    },
  });
  jobIds.push(job.id);

  // 2. Seed the intake draft from the job -> parser turns therapyText into structured terapiaImport.
  let res = await af(`${base}/intake/drafts/from-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ importJobId: job.id }),
  });
  assert.equal(res.status, 201, 'draft seeded from import (201)');
  const draft = await res.json();
  const draftId = draft.id ?? draft.draft?.id;
  draftIds.push(draftId);
  const data = draft.data ?? draft.draft?.data;
  const rows = data.terapiaImport;
  assert.ok(
    Array.isArray(rows) && rows.length === 5,
    `AC2: one row per drug (got ${rows?.length})`,
  );
  assert.deepEqual(
    rows.find((r) => r.farmacoNome === 'KEPPRA').orari,
    ['08:00', '20:00'],
    'AC4: multiple times',
  );
  assert.deepEqual(
    rows.find((r) => r.farmacoNome === 'CACIT').giorni,
    ['Mar', 'Gio', 'Sab', 'Dom'],
    'AC5: specific days',
  );
  assert.equal(
    rows.find((r) => r.farmacoNome === 'PEVARYL').stato,
    'da_verificare',
    'AC6: incomplete kept as da_verificare',
  );
  assert.equal(rows[3].tipo, 'al_bisogno');
  assert.equal(rows[4].sourceKind, 'structured');
  assert.equal(rows[4].stato, 'da_verificare');
  assert.deepEqual(rows[4].orari, []);
  assert.equal(rows[4].quantita, '');
  assert.equal(rows[4].originalText, '');
  assert.equal(data.terapia, undefined, 'terapiaImport must NOT collide with manual data.terapia');

  // Simulate an unconfirmed pre-fix draft containing only the first three detected rows.
  await prisma.patientIntakeDraft.update({
    where: { id: draftId },
    data: { data: { ...data, terapiaImport: rows.slice(0, 3) } },
  });
  const oldRead = await af(`${base}/intake/drafts/${draftId}`);
  assert.equal(oldRead.status, 200);
  const recovered = await oldRead.json();
  assert.equal(
    (recovered.data ?? recovered.draft?.data).terapiaImport.length,
    5,
    'Reopening a legacy draft recovers all retained source occurrences',
  );
  assert.equal(
    (await prisma.patientIntakeDraft.findUnique({ where: { id: draftId } })).data.terapiaImport
      .length,
    3,
    'A read must not mutate a clinical draft',
  );
  const staleSave = await af(`${base}/intake/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terapiaImport: rows.slice(0, 3) }),
  });
  assert.equal(staleSave.status, 400, 'A stale client cannot omit recovered medicines');

  // 3. Review complete rows and explicitly leave the incomplete source in the draft.
  const therapies = rows
    .map((r, index) => ({ ...r, index }))
    .filter(
      (r) =>
        ['KEPPRA', 'CACIT', 'PARACETAMOLO'].includes(r.farmacoNome) &&
        r.sourceKind !== 'structured',
    )
    .map((r) => ({
      intakeSource: { type: 'import', index: r.index },
      farmacoNome: r.farmacoNome,
      dataInizio: r.dataInizio || '2026-07-03',
      viaSomministrazione: 'orale',
      tipo: r.tipo === 'al_bisogno' ? 'al_bisogno' : 'periodica',
      stato: 'attiva',
      allowedFractions: '1',
      giorniSettimana: r.giorni?.length ? '2,4,6,7' : '',
      schedules: (r.orari || []).map((t) => ({
        time: t,
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: r.farmacoNome === 'KEPPRA' ? 'compressa' : 'dose',
      })),
      note: [
        r.classe ? `Classe ${r.classe}` : '',
        r.giorni?.length ? `Giorni: ${r.giorni.join(' ')}` : '',
        `Origine: ${r.originalText}`,
      ]
        .filter(Boolean)
        .join(' — '),
    }));
  const reviewedRows = rows.map((r, index) => {
    const therapy = therapies.find((t) => t.intakeSource.index === index);
    return therapy
      ? {
          ...r,
          stato: 'ok',
          reviewedTherapy: {
            ...therapy,
            giorniSettimana: therapy.giorniSettimana ? [2, 4, 6, 7] : [],
          },
        }
      : { ...r, excludedFromConfirm: true };
  });
  res = await af(`${base}/intake/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terapiaImport: reviewedRows }),
  });
  assert.equal(res.status, 200, 'review is saved before confirmation');
  const confirmationPayload = {
    patient: {
      firstName: 'E2ETher',
      lastName: 'Sintetico',
      dateOfBirth: '1955-09-09',
      sex: 'M',
      codiceFiscale: 'SNTTHR55P09H501Y',
    },
    cartella: { statoRicovero: 'ricoverato' },
    therapies,
  };
  const beforeCount = await prisma.patient.count();
  const omitted = await af(`${base}/intake/drafts/${draftId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...confirmationPayload, therapies: therapies.slice(0, 1) }),
  });
  assert.equal(omitted.status, 400, 'Missing included prescriptions cannot silently disappear');
  assert.equal(
    await prisma.patient.count(),
    beforeCount,
    'Rejected confirmation creates no patient',
  );
  const reopened = await af(`${base}/intake/drafts/${draftId}`);
  assert.equal(reopened.status, 200);
  const reloadedDraft = await reopened.json();
  const persistedReview = reloadedDraft.data ?? reloadedDraft.draft?.data;
  assert.equal(persistedReview.terapiaImport.length, 5);
  assert.equal(persistedReview.terapiaImport[4].excludedFromConfirm, true);
  assert.equal(
    persistedReview.terapiaImport[4].structuredSource.nome,
    'QA Extraction-only medicine',
  );
  res = await af(`${base}/intake/drafts/${draftId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmationPayload),
  });
  assert.equal(res.status, 201, 'AC8: confirm creates patient (201)');
  const confirmed = await res.json();
  const patientId = confirmed.patient?.id ?? confirmed.patientId;
  assert.ok(patientId, 'created patient id present');
  patientIds.push(patientId);

  // 4. AC9: therapies persisted — fresh DB read (= after refresh).
  const persisted = await prisma.patientTherapy.findMany({ where: { patientId } });
  assert.equal(persisted.length, 3, 'only reviewed therapies are prescribed');
  assert.equal(
    persisted.some((t) => t.farmacoNome === 'PEVARYL'),
    false,
  );
  const savedDraft = await prisma.patientIntakeDraft.findUnique({ where: { id: draftId } });
  assert.deepEqual(savedDraft.data._confirmation.deferredImportIndexes, [2, 4]);
  assert.deepEqual(savedDraft.data._confirmation.selectedSources, [
    'import:0',
    'import:1',
    'import:3',
  ]);
  assert.equal(savedDraft.data.terapiaImport[2].originalText, rows[2].originalText);
  assert.deepEqual(savedDraft.data.terapiaImport[4].structuredSource, rows[4].structuredSource);
  assert.equal(persisted.find((t) => t.farmacoNome === 'PARACETAMOLO').tipo, 'al_bisogno');
  res = await af(`${base}/intake/drafts/${draftId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmationPayload),
  });
  assert.equal(res.status, 200, 'confirmation replay succeeds');
  assert.equal((await res.json()).status, 'idempotent');
  assert.equal(await prisma.patientTherapy.count({ where: { patientId } }), 3);
  assert.ok(
    persisted.some((t) => t.farmacoNome === 'KEPPRA'),
    'KEPPRA persisted',
  );
  console.log(`therapy-import-api: OK — ${rows.length} detected, ${persisted.length} persisted`);
} catch (e) {
  failed = true;
  console.error('therapy-import-api FAILED:', e.message);
} finally {
  for (const id of patientIds) {
    await prisma.patientTherapy.deleteMany({ where: { patientId: id } }).catch(() => {});
  }
  for (const id of patientIds) {
    await prisma.patient.delete({ where: { id } }).catch(() => {});
  }
  for (const id of draftIds) {
    await prisma.patientIntakeDraft.deleteMany({ where: { id } }).catch(() => {});
  }
  for (const id of jobIds) {
    await prisma.importJob.delete({ where: { id } }).catch(() => {});
  }
  await new Promise((r) => server.close(r));
  await cleanupOperator();
  await prisma.$disconnect();
}
process.exit(failed ? 1 : 0);
