// #156 deterministic API E2E: discharge therapy TEXT -> structured `terapiaImport` rows (one per
// drug) -> confirm -> PatientTherapy persisted (verified by a fresh DB read = "after refresh").
// No browser, no real key (mock extraction can't produce text, so we seed a job with a therapy
// narrative directly). Run: tsx e2e/therapy-import-api.mjs
import assert from 'node:assert/strict';
import app from '../backend/src/app.js';
import { prisma } from '../backend/src/lib/prisma.js';

const OP = { 'X-Operator-Id': 'op-e2e-ther', 'X-Operator-Role': 'operatore' };
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });

const THERAPY = [
  'KEPPRA CPR RIV 500 MGR (OS) 1 Cpr ore 08:00 e alle 20:00 dal 03/07/2026 (Classe A)',
  'CACIT VIT.D3 BS 1GR/880UI (OS) 1 Dosi ore 08:00 dal 03/07/2026 Mar Gio Sab Dom (Classe A)',
  'PEVARYL POLVERE INGUINE SN X 1 AL DI',
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
      resultData: { _narrative: narrative, _sections: null },
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
    Array.isArray(rows) && rows.length === 3,
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
  assert.equal(data.terapia, undefined, 'terapiaImport must NOT collide with manual data.terapia');

  // 3. Map detected rows -> TherapyCreateInput and confirm -> patient + PatientTherapy persisted.
  const therapies = rows
    .filter((r) => r.farmacoNome)
    .map((r) => ({
      farmacoNome: r.farmacoNome,
      dataInizio: r.dataInizio || '2026-07-03',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      stato: 'attiva',
      allowedFractions: '1',
      schedules: (r.orari || []).map((t) => ({
        time: t,
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: '',
      })),
      note: [
        r.classe ? `Classe ${r.classe}` : '',
        r.giorni?.length ? `Giorni: ${r.giorni.join(' ')}` : '',
        `Origine: ${r.originalText}`,
      ]
        .filter(Boolean)
        .join(' — '),
    }));
  res = await af(`${base}/intake/drafts/${draftId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient: {
        firstName: 'E2ETher',
        lastName: 'Sintetico',
        dateOfBirth: '1955-09-09',
        sex: 'M',
        // #294: CF sintetico valido — chiave univoca obbligatoria alla creazione.
        codiceFiscale: 'SNTTHR55P09H501Y',
      },
      cartella: { statoRicovero: 'ricoverato' },
      therapies,
    }),
  });
  assert.equal(res.status, 201, 'AC8: confirm creates patient (201)');
  const confirmed = await res.json();
  const patientId = confirmed.patient?.id ?? confirmed.patientId;
  assert.ok(patientId, 'created patient id present');
  patientIds.push(patientId);

  // 4. AC9: therapies persisted — fresh DB read (= after refresh).
  const persisted = await prisma.patientTherapy.findMany({ where: { patientId } });
  assert.ok(persisted.length >= 3, `AC9: therapies persisted (got ${persisted.length})`);
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
  await prisma.$disconnect();
}
process.exit(failed ? 1 : 0);
