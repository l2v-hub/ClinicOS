// Real synthetic HTTP + PostgreSQL acceptance. No patient, authorization or application API mocks.
// The only positive-response fixture supplies verified, official font bytes offline.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { prisma } from '../backend/src/lib/prisma.ts';
import { SIMULATED_IDENTITIES, ensureSimulatedIdentity } from '../backend/src/authz/simulator.ts';
import { createTherapyInTx } from '../backend/src/therapies/therapy-create.ts';
import { findTherapiesDue } from '../backend/src/therapies/due-therapy-query.ts';
import { facilityLocalMinute, facilityLocalDate } from '../frontend/src/lib/facilityTime.ts';

const front = process.env.QA_FRONTEND_URL,
  api = process.env.QA_BACKEND_URL;
for (const value of [front, api, process.env.DATABASE_URL])
  assert.ok(value && ['localhost', '127.0.0.1'].includes(new URL(value).hostname));
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/clinicos_qa_/);
// Keep this candidate run's raw media separate from every historical proof packet.
assert.ok(process.env.QA_OUTPUT_DIR && path.isAbsolute(process.env.QA_OUTPUT_DIR), 'QA_OUTPUT_DIR must be an owned private absolute directory');
const out = process.env.QA_OUTPUT_DIR;
mkdirSync(out, { recursive: true });
const baseline = process.argv.includes('--baseline'),
  now = new Date();
const today = facilityLocalDate(now),
  currentTime = `${facilityLocalMinute(now).slice(11, 13)}:00`;
const tomorrowDate = new Date(`${today}T12:00:00Z`);
tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
const tomorrow = tomorrowDate.toISOString().slice(0, 10);
const runId = randomUUID().slice(0, 8),
  results = [],
  receipts = [],
  sessions = [];
function sourceFingerprint() {
  const hash = createHash('sha256');
  for (const directory of ['frontend/src', 'backend/src', 'prisma']) {
    const files = readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:tsx?|css|sql|json|prisma)$/.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name))
      .sort();
    for (const filename of files)
      hash.update(filename).update('\0').update(readFileSync(filename)).update('\0');
  }
  for (const filename of [
    'e2e/qa-bug-batch-447-browser.mjs',
    'e2e/qa-bug-batch-447-route486-browser.mjs',
    'e2e/qa-bug-batch-447-integrated-browser.mjs',
    'e2e/qa-bug-batch-447.mjs',
    'scripts/e2e/issue-450-ingresso.mjs',
    'artifacts/task-validation/bug-batch-447/trace-privacy/redact-traces.py',
  ])
    hash.update(filename).update('\0').update(readFileSync(filename)).update('\0');
  return hash.digest('hex');
}
const sourceFingerprintBefore = sourceFingerprint();
let sourceFingerprintAfter;
const residualGates = [
  {
    issue: 486,
    status: 'DEDICATED_INDEPENDENT_QA_REQUIRED',
    reason: 'This harness covers seven clinical scenarios. Actual route caller/intake/diary/tool/exact legacy replay/discharge cases require the dedicated integrated-eight plan; no all-eight PASS is inferred.',
  },
  {
    issue: 453,
    status: 'IMPLEMENTED_PENDING_VERIFICATION',
    reason:
      'Confirmable warning approved; real clinical acceptance and final independent verification remain required.',
  },
  {
    issue: 457,
    status: 'IMPLEMENTATION_IN_PROGRESS',
    reason:
      'Explicit operator pause/continue decision approved; temporary exit implementation and final acceptance remain in progress.',
  },
];
const fontRoot = path.resolve('artifacts/task-validation/bug-batch-447/font-assets');
const fontManifest = JSON.parse(readFileSync(path.join(fontRoot, 'manifest.json'), 'utf8'));
const fontAssets = new Map();
for (const [name, record] of Object.entries(fontManifest.files)) {
  assert.equal(
    path.basename(record.path),
    record.path,
    'Font path stays within the portable bundle',
  );
  const bytes = readFileSync(path.join(fontRoot, record.path));
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    record.sha256,
    'Font source must match its recorded hash',
  );
  assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
  fontAssets.set(name, bytes);
}
assert.equal(fontAssets.size, 7);
const fontsCss = [...fontAssets.keys()]
  .map((name) => {
    const inter = name.startsWith('inter-'),
      weight = /-(\d+)-normal/.exec(name)[1];
    return `@font-face{font-family:'${inter ? 'Inter' : 'JetBrains Mono'}';font-style:normal;font-weight:${weight};font-display:swap;src:url(https://fonts.gstatic.com/clinicos-qa/${name}) format('woff2');}`;
  })
  .join('\n');
const fontProvenance = {
  packages: fontManifest.packages,
  files: Object.fromEntries(
    Object.entries(fontManifest.files).map(([name, value]) => [
      name,
      { sha256: value.sha256, version: value.version },
    ]),
  ),
  fixture: 'Verified official font bytes; no empty CSS/font response or error suppression',
};

async function eventually(check, message, timeout = 30000) {
  const until = Date.now() + timeout;
  let failure;
  while (Date.now() < until) {
    try {
      return await check();
    } catch (error) {
      failure = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`${message}: ${failure?.message ?? 'timeout'}`);
}
async function text(locator, pattern) {
  await eventually(
    async () => assert.match(await locator.innerText(), pattern),
    `Expected content ${pattern}`,
  );
}
async function count(locator, expected) {
  await eventually(
    async () => assert.equal(await locator.count(), expected),
    `Expected ${expected} matching elements`,
  );
}
async function value(locator, expected) {
  await eventually(
    async () => assert.equal(await locator.inputValue(), expected),
    `Expected input value ${expected}`,
  );
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'No horizontal document overflow',
  );
}

for (const identity of SIMULATED_IDENTITIES) await ensureSimulatedIdentity(identity);
const patients = [];
for (const [suffix, lastName] of [
  ['main', 'QA A Clinical447'],
  ['round', 'QA B Round451'],
  ['next', 'QA C RoundNext451'],
]) {
  const patient = await prisma.patient.create({
    data: {
      medicalRecordNumber: `QA447-${runId}-${suffix}`,
      firstName: 'Synthetic',
      lastName,
      dateOfBirth: new Date('1970-01-01T00:00:00Z'),
      registeredById: 'SIM-NURSE-1',
      emergencyContactName: 'QA Contact',
      emergencyContactPhone: '0000000000',
    },
  });
  await prisma.cartella.create({
    data: {
      patientId: patient.id,
      data: {
        statoRicovero: 'ricoverato',
        diagnosi: [],
        anamnesi: {},
        parametriVitali: [],
        allergie:
          suffix === 'main'
            ? [
                {
                  id: `qa-allergy-${runId}`,
                  allergene: 'QA penicillina',
                  gravita: 'grave',
                  reazione: 'QA orticaria',
                  documentato: today,
                  documentatoDa: 'QA',
                },
                {
                  id: `qa-lattice-${runId}`,
                  allergene: 'QA lattice',
                  gravita: 'moderata',
                  reazione: 'QA reazione sintetica',
                  documentato: today,
                  documentatoDa: 'QA',
                },
                {
                  id: `qa-acido-${runId}`,
                  allergene: 'QA acido acetilsalicilico',
                  gravita: 'grave',
                  reazione: 'QA reazione sintetica',
                  documentato: today,
                  documentatoDa: 'QA',
                },
              ]
            : [],
        allergieStatus: suffix === 'main' ? 'presenti' : 'assenti',
        indicatoriRischio:
          suffix === 'main'
            ? [
                {
                  id: `qa-risk-${runId}`,
                  tipo: 'caduta',
                  livello: 'alto',
                  descrizione: 'QA rischio sintetico',
                  dataValutazione: today,
                  operatore: 'QA',
                },
              ]
            : [],
        contattoEmergenzaNome: 'QA Contact',
        contattoEmergenzaTel: '0000000000',
      },
    },
  });
  patients.push(patient);
}
const [patient, roundPatient, nextPatient] = patients;
const room = await prisma.room.create({
  data: { numero: `QA44-${runId}`, reparto: 'QA reparto', beds: { create: { label: '7' } } },
  include: { beds: true },
});
await prisma.patientRoomAssignment.create({
  data: {
    patientId: patient.id,
    roomId: room.id,
    bedId: room.beds[0].id,
    startDate: today,
    createdById: 'SIM-NURSE-1',
  },
});
const aic = '999447001',
  drugName = 'QA453 COMPRESSE 5 MG';
await prisma.farmaco.create({
  data: {
    aic,
    denominazione: drugName,
    denominazioneNorm: drugName,
    descrizione: '20 COMPRESSE USO ORALE',
    statoAmministrativo: 'Autorizzata',
    forma: 'COMPRESSE',
    principiAttivi: {
      create: {
        principioAttivo: 'QA PRINCIPIO SINTETICO',
        principioAttivoNorm: 'QA PRINCIPIO SINTETICO',
        quantita: 5,
        unitaMisura: 'mg',
      },
    },
  },
});
await prisma.farmacoImport.create({
  data: { fonte: 'QA synthetic catalog', righeLette: 1, righeScritte: 1, esito: 'ok' },
});
const schedule = (time) => ({
  time,
  quantityNumerator: 1,
  quantityDenominator: 1,
  administrationUnit: 'compressa',
});
const therapy = await prisma.$transaction((tx) =>
  createTherapyInTx(tx, patient.id, {
    farmacoNome: 'QA Prescription447',
    dataInizio: today,
    commercialStrengthValue: 5,
    commercialStrengthUnit: 'mg',
    pharmaceuticalForm: 'compressa',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    schedules: [...new Set(['08:00', currentTime, '20:00'])].map(schedule),
    operatoreInseritore: 'QA',
  }),
);
const roundTherapy = await prisma.$transaction((tx) =>
  createTherapyInTx(tx, nextPatient.id, {
    farmacoNome: 'QA Giro454',
    dataInizio: today,
    commercialStrengthValue: 5,
    commercialStrengthUnit: 'mg',
    pharmaceuticalForm: 'compressa',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    schedules: [schedule(currentTime)],
    operatoreInseritore: 'QA',
  }),
);
await prisma.$transaction((tx) =>
  createTherapyInTx(tx, patient.id, {
    farmacoNome: 'QA Tomorrow Only456',
    dataInizio: tomorrow,
    commercialStrengthValue: 5,
    commercialStrengthUnit: 'mg',
    pharmaceuticalForm: 'compressa',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    schedules: [schedule('08:00')],
    operatoreInseritore: 'QA',
  }),
);
const prnTherapy = await prisma.$transaction((tx) =>
  createTherapyInTx(tx, patient.id, {
    farmacoNome: 'QA PRN457',
    dataInizio: today,
    tipo: 'al_bisogno',
    viaSomministrazione: 'orale',
    commercialStrengthValue: 5,
    commercialStrengthUnit: 'mg',
    pharmaceuticalForm: 'compressa',
    note: 'QA indicazione sintetica',
    operatoreInseritore: 'QA',
  }),
);
await prisma.medicationAdministration.create({
  data: {
    patientId: patient.id,
    farmacoNome: 'QA Refused457',
    farmacoDose: '1 compressa',
    farmacoVia: 'orale',
    date: today,
    fascia: 'mattina',
    ora: '09:00',
    stato: 'non_erogata',
    motivo: 'rifiutata_paziente',
    operatoreNome: 'Infermiere 1',
  },
});
const diary = await prisma.patientDiaryEntry.create({
  data: {
    patientId: patient.id,
    authorType: 'medico',
    authorName: 'Medico 1',
    authorId: 'SIM-DOCTOR-1',
    title: 'QA urgente447',
    content: 'QA motivo urgente: febbre sintetica',
    priority: 'urgente',
    entryDateTime: facilityLocalMinute(now),
  },
});
const handover = await prisma.consegna.create({
  data: {
    pazienteId: patient.id,
    pazienteNome: `${patient.lastName} ${patient.firstName}`,
    priorita: 'urgente',
    stato: 'aperta',
    tipo: 'Monitoraggio',
    note: 'QA consegna urgente456',
    scadenza: today,
    operatoreAssegnato: 'Infermiere 1',
    operatoreAssegnatoId: 'SIM-NURSE-1',
    creatoDA: 'Medico 1',
    creatoDaId: 'SIM-DOCTOR-1',
    createdAt: new Date(now.getTime() - 3600000),
  },
});
for (const target of [patient, roundPatient])
  await prisma.patientParameterReading.create({
    data: {
      patientId: target.id,
      requestId: `qa447-previous-${runId}`,
      measuredAt: new Date(now.getTime() - 3 * 3600000),
      values: {
        fr: '18',
        spo2: '97',
        o2: 'no',
        pa: '125/80',
        fc: '78',
        coscienza: 'A',
        temperatura: '36.8',
      },
      authorOperatorId: 'SIM-NURSE-1',
      authorName: 'Infermiere 1',
    },
  });

await prisma.patientParameterReading.createMany({
  data: Array.from({ length: 51 }, (_, index) => ({
    patientId: patient.id,
    requestId: `qa447-page2-${runId}-${index}`,
    measuredAt: now,
    values: { fr: '18' },
    authorOperatorId: 'SIM-NURSE-1',
    authorName: 'Infermiere 1',
  })),
});
const expectedTodayReadings = (
  await prisma.patientParameterReading.findMany({
    where: { patientId: patient.id },
    select: { measuredAt: true },
  })
).filter((row) => facilityLocalDate(row.measuredAt) === today).length;
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
async function session(
  role,
  route,
  { viewport = { width: 1180, height: 820 }, hasTouch = false } = {},
) {
  const context = await browser.newContext({
    viewport,
    hasTouch,
    recordVideo: { dir: path.join(out, 'video-local') },
  });
  const state = {
    role,
    context,
    page: null,
    errors: [],
    expectedErrors: [],
    auth: null,
    clinicalRequests: [],
    fault: null,
    closed: false,
  };
  sessions.push(state);
  await context.route('https://fonts.googleapis.com/**', async (request) => {
    assert.ok(
      request.request().url().includes('Inter') && request.request().url().includes('JetBrains'),
      'Only the application font stylesheet is fixture-backed',
    );
    await request.fulfill({ status: 200, contentType: 'text/css', body: fontsCss });
  });
  await context.route('https://fonts.gstatic.com/clinicos-qa/**', async (request) => {
    const asset = fontAssets.get(new URL(request.request().url()).pathname.split('/').at(-1));
    assert.ok(asset, 'Unknown font must not receive an empty success response');
    await request.fulfill({ status: 200, contentType: 'font/woff2', body: asset });
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  state.page = page;
  page.setDefaultTimeout(30000);
  page.on('request', (request) => {
    if (request.url().startsWith(api))
      state.clinicalRequests.push({
        method: request.method(),
        path: new URL(request.url()).pathname,
      });
    const authorization = request.headers().authorization;
    if (request.url().startsWith(api) && authorization?.startsWith('Bearer sim.'))
      state.auth = authorization;
  });
  page.on('pageerror', (error) =>
    state.errors.push({ kind: 'page', name: error.name, message: error.message.slice(0, 160) }),
  );
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const url = message.location().url;
    const record = {
      kind: 'console',
      path: url && /^https?:/.test(url) ? new URL(url).pathname : '',
      message: message.text().slice(0, 160),
    };
    if (
      state.fault &&
      record.path === state.fault.path &&
      new RegExp(`status of ${state.fault.status}`).test(record.message)
    )
      state.expectedErrors.push(record);
    else state.errors.push(record);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const record = {
      kind: 'http',
      status: response.status(),
      method: response.request().method(),
      path: new URL(response.url()).pathname,
    };
    if (
      state.fault &&
      record.path === state.fault.path &&
      record.status === state.fault.status &&
      record.method === (state.fault.method ?? 'POST')
    )
      state.expectedErrors.push(record);
    else state.errors.push(record);
  });
  await page.goto(`${front}/#/${route}`);
  await page.getByRole('button', { name: new RegExp(`^${role}`) }).click();
  await page.locator('.teams-sidebar').waitFor();
  await page.goto(`${front}/#/${route}`);
  await page.locator('.teams-sidebar').waitFor();
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 14px Inter'),
      document.fonts.load('700 14px Inter'),
      document.fonts.load('400 14px "JetBrains Mono"'),
    ]);
    if (!document.fonts.check('400 14px Inter') || !document.fonts.check('700 14px Inter'))
      throw new Error('Actual application fonts not loaded');
  });
  return state;
}
async function navigate(state, route) {
  await state.page.goto(`${front}/#/${route}`);
  await state.page.locator('.teams-sidebar').waitFor();
}
async function reloadAuthenticated(state, route) {
  await state.page.reload();
  await eventually(async () => {
    if (await state.page.locator('.teams-sidebar').isVisible()) return;
    const picker = state.page.getByRole('button', { name: new RegExp(`^${state.role}`) });
    if (await picker.isVisible()) {
      await picker.click();
      await state.page.locator('.teams-sidebar').waitFor();
      return;
    }
    throw new Error('Waiting for actual login or authenticated shell');
  }, 'Normal simulator re-authentication after page reload');
  await navigate(state, route);
}
async function request(state, pathname, body) {
  assert.ok(state.auth, 'Use an actual simulator session issued through the normal login');
  const response = await state.context.request.fetch(`${api}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: state.auth },
    ...(body ? { data: body } : {}),
  });
  assert.ok(
    response.ok(),
    `Authenticated QA HTTP ${body ? 'POST' : 'GET'} ${pathname} returned ${response.status()}`,
  );
  return response.json();
}
async function finish(state, issue) {
  if (state.closed) return;
  const prefix = baseline ? 'baseline' : `issue-${issue}`;
  if (state.page && !state.page.isClosed())
    await state.page.screenshot({ path: path.join(out, `${prefix}.png`), fullPage: false });
  await stopPrivateTrace(state.context, prefix);
  const video = state.page?.video();
  await state.context.close();
  state.closed = true;
  if (video) {
    await video.saveAs(path.join(out, `${prefix}.webm`));
    await video.delete(); // Only the duplicate recorder temporary file, after durable saveAs.
  }
}
async function stopPrivateTrace(context, prefix) {
  const filename = path.join(out, `${prefix}-trace.zip`);
  await context.tracing.stop({ path: filename });
  execFileSync(
    'python3',
    [
      'artifacts/task-validation/bug-batch-447/trace-privacy/redact-traces.py',
      filename,
      path.join(out, `${prefix}-trace-privacy.json`),
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}
async function scenario(issue, role, route, execute) {
  let state;
  const sessionOffset = sessions.length;
  try {
    state = await session(role, route);
    await execute(state);
    assert.deepEqual(
      state.errors,
      [],
      `Issue ${issue}: no unexpected console, page or HTTP errors`,
    );
    if (issue === 453) {
      const gate = residualGates.findIndex((item) => item.issue === issue);
      if (gate >= 0) residualGates.splice(gate, 1);
    }
    results.push({
      issue,
      status: 'PASS_SCENARIO',
      clinicalGate: residualGates.some((gate) => gate.issue === issue) ? 'pending' : null,
      expectedFaults: state.expectedErrors,
    });
  } catch (error) {
    state ??= sessions[sessionOffset];
    results.push({
      issue,
      status: 'FAILED',
      message: String(error.message).slice(0, 1400),
      stack: error.stack?.split('\n').slice(0, 12),
      errors: state?.errors ?? [],
    });
    console.error(`Issue ${issue}: ${String(error.message).slice(0, 350)}`);
  } finally {
    if (state) await finish(state, issue);
    writeFileSync(
      path.join(out, 'discovery-status.json'),
      JSON.stringify({ results, receipts }, null, 2) + '\n',
    );
  }
}
const chart = (id = patient.id) => `dettaglio-paziente/${id}`;
async function section(page, name) {
  const exactLabel = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\d+)?$`);
  await page.locator('.chart-sections').getByRole('tab', { name: exactLabel }).click();
  await page.locator('#patient-tab-panel').waitFor();
  await eventually(
    async () => assert.equal(await page.locator('#patient-tab-panel .page-loading').count(), 0),
    'All actual section loaders have completed',
  );
}
async function readTherapyRoundsPage(page) {
  const secondaryControls = page.locator('details.giro-secondary-controls');
  await secondaryControls.waitFor({ state: 'visible' });
  const summary = secondaryControls.getByText('Data, vista e ordine', { exact: true });
  await summary.waitFor({ state: 'visible' });
  if (!(await secondaryControls.evaluate((node) => node.open))) await summary.click();
  await eventually(
    async () => assert.equal(await secondaryControls.evaluate((node) => node.open), true),
    'Native secondary Giro controls are open',
  );
  await secondaryControls.getByRole('group', { name: 'Vista della terapia' }).waitFor({ state: 'visible' });
  return secondaryControls;
}
async function giveDose(page, name) {
  const row = page.locator('.giro-drug').filter({ hasText: name }).first();
  await row.getByRole('button', { name: /^Erogata:/ }).click();
  const confirmation = page.getByRole('button', { name: 'Conferma somministrazione', exact: true });
  if (await confirmation.isVisible().catch(() => false)) await confirmation.click();
  await eventually(
    async () => assert.equal(await row.getByRole('button', { name: /^Erogata:/ }).count(), 0),
    'Dose must become recorded',
  );
}
async function syntheticPatientWithChart(suffix, lastName) {
  const fixture = await prisma.patient.create({
    data: {
      medicalRecordNumber: `QA447-${runId}-${suffix}`,
      firstName: 'Synthetic',
      lastName,
      dateOfBirth: new Date('1970-01-01T00:00:00Z'),
      registeredById: 'SIM-NURSE-1',
    },
  });
  await prisma.cartella.create({
    data: {
      patientId: fixture.id,
      data: {
        statoRicovero: 'ricoverato',
        diagnosi: [],
        anamnesi: {},
        parametriVitali: [],
        allergie: [],
        allergieStatus: 'assenti',
        indicatoriRischio: [],
      },
    },
  });
  return fixture;
}
try {
  if (baseline) {
    await scenario(447, 'Infermiere 1', chart(), async ({ page }) => {
      await page.locator('.patient-record-view').waitFor();
      const geometry = await page.locator('#patient-tab-panel').boundingBox();
      receipts.push({ issue: 447, observationOnly: true, firstContentY: geometry?.y });
    });
  } else {
    await scenario(456, 'Supervisore 1', 'admin-dashboard', async (state) => {
      const { page } = state;
      await page.locator('[data-admin-attention]').waitFor();
      await eventually(
        async () =>
          assert.equal(
            await page
              .locator('[data-admin-urgency-count]')
              .getAttribute('data-admin-urgency-count'),
            '2',
          ),
        'Unified diary + handover urgency count',
      );
      await count(page.locator('[data-attention-id^="urgency:"]'), 2);
      await text(
        page
          .locator('.teams-sidebar')
          .getByRole('button', { name: /^Consegne,/ })
          .locator('.teams-sidebar__badge'),
        /^2$/,
      );
      assert.equal(
        await page.locator('.dashboard-kpi-band,.dashboard-notification-bar,.stats-grid').count(),
        0,
      );
      await text(page.locator('[data-admin-staffing]'), /Nessun orario configurato/);
      assert.ok(
        !(await page.locator('[data-admin-attention]').innerText()).includes('QA Tomorrow Only456'),
      );
      await text(page.locator('[data-admin-attention]'), /QA Prescription447/);
      await page.locator(`[data-attention-id="urgency:${diary.id}"]`).getByRole('button').click();
      await page.locator(`[data-diary-entry-id="${diary.id}"]`).waitFor();
      await page.waitForURL(new RegExp(patient.id));
      await navigate(state, 'admin-dashboard');
      await page
        .locator(`[data-attention-id="urgency:consegna:${handover.id}"]`)
        .getByRole('button')
        .click();
      await page.locator(`[data-consegna-id="${handover.id}"]`).waitFor();
      await prisma.operatorSchedule.create({
        data: {
          operatorId: 'SIM-NURSE-1',
          data: {
            turni: [
              'lunedi',
              'martedi',
              'mercoledi',
              'giovedi',
              'venerdi',
              'sabato',
              'domenica',
            ].map((giorno) => ({
              giorno,
              oraInizio: '00:00',
              oraFine: '23:59',
              disponibile: true,
            })),
            note: '',
          },
        },
      });
      await navigate(state, 'admin-dashboard');
      await page.locator('[data-on-duty="SIM-NURSE-1"]').waitFor();
      await count(page.locator('[data-on-duty="SIM-ADMIN"]'), 0);
      await text(page.locator('[data-admin-occupancy]'), /1\/1 occupati/);
      const doseRow = page
        .locator('[data-attention-id^="dose:"]')
        .filter({ hasText: 'QA Prescription447' })
        .first();
      await doseRow.getByRole('button', { name: /Apri giro/ }).click();
      await page.waitForURL(new RegExp(patient.id));
      await page.locator('.patient-record-view').waitFor();
      await navigate(state, 'admin-dashboard');
      receipts.push({
        issue: 456,
        urgentDiaryAndHandover: 2,
        tomorrowExcluded: true,
        actualShiftVerified: true,
        occupancy: '1/1',
      });
    });

    await scenario(447, 'Infermiere 1', chart(), async (state) => {
      const { page } = state;
      await page.locator('[data-patient-today]').waitFor();
      await text(page.locator('[data-patient-today]'), /QA Prescription447/);
      await text(
        page.locator('.patient-today__vitals'),
        new RegExp(`^${expectedTodayReadings} rilevazioni oggi`),
      );
      await text(page.locator('.patient-topbar-title'), new RegExp(room.numero));
      const geometry = [],
        geometryFailures = [];
      const labels = await page
        .locator('[role="tablist"][aria-label="Sezioni della cartella"] [role="tab"]')
        .evaluateAll((nodes) => nodes.map((node) => node.firstChild.textContent.trim()));
      assert.ok(labels.includes('Oggi'));
      for (const label of labels) {
        await section(page, label.trim());
        await page.evaluate(() => scrollTo(0, 0));
        const box = await page.locator('#patient-tab-panel').boundingBox();
        const actual = await page.locator('#patient-tab-panel').evaluate((panel) => {
          const candidates = [];
          const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode,
              parent = node.parentElement;
            if (
              !parent ||
              !/[\p{L}\p{N}]/u.test(node.textContent) ||
              parent.closest('.page-loading,.ds-sr-only,.sr-only,[aria-hidden="true"],script,style')
            )
              continue;
            const style = getComputedStyle(parent);
            if (style.visibility === 'hidden' || style.display === 'none') continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              let left = Math.max(0, rect.left),
                right = Math.min(innerWidth, rect.right),
                top = Math.max(0, rect.top),
                bottom = Math.min(innerHeight, rect.bottom);
              for (
                let ancestor = parent;
                ancestor && ancestor !== document.body;
                ancestor = ancestor.parentElement
              ) {
                const css = getComputedStyle(ancestor),
                  box = ancestor.getBoundingClientRect();
                if (/hidden|auto|scroll|clip/.test(css.overflowX)) {
                  left = Math.max(left, box.left);
                  right = Math.min(right, box.right);
                }
                if (/hidden|auto|scroll|clip/.test(css.overflowY)) {
                  top = Math.max(top, box.top);
                  bottom = Math.min(bottom, box.bottom);
                }
              }
              if (right - left < 2 || bottom - top < 2) continue;
              const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
              if (hit && !parent.contains(hit) && !hit.contains(parent)) continue;
              candidates.push({
                tag: parent.tagName,
                text: node.textContent.trim().slice(0, 80),
                top: rect.top,
                visibleTop: top,
              });
              break;
            }
          }
          candidates.sort((a, b) => a.top - b.top);
          const header = document.querySelector('.patient-topbar-title')?.getBoundingClientRect();
          const nav = document.querySelector('.chart-sections')?.getBoundingClientRect();
          const targets = [
            ...document.querySelectorAll('.patient-topbar-title button,.chart-sections button'),
          ]
            .filter(
              (el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0,
            )
            .map((el) => {
              const rect = el.getBoundingClientRect();
              return {
                name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 80),
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
              };
            });
          const overlaps = [];
          for (let a = 0; a < targets.length; a++)
            for (let b = a + 1; b < targets.length; b++) {
              const x = targets[a],
                y = targets[b];
              if (
                Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 &&
                Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1
              )
                overlaps.push([x.name, y.name]);
            }
          return {
            first: candidates[0],
            header: header ? { top: header.top, height: header.height } : null,
            navigation: nav ? { top: nav.top, height: nav.height } : null,
            targets,
            overlaps,
            viewportWidth: innerWidth,
            scrollY,
          };
        });
        receipts.push({ issue: 447, section: label, containerY: box?.y, actualGeometry: actual });
        geometry.push({ section: label, y: box?.y });
        try {
          assert.equal(actual.scrollY, 0, 'Literal unscrolled geometry is required');
          assert.deepEqual(actual.overlaps, [], 'Header and section controls never overlap');
          for (const target of actual.targets) {
            assert.ok(
              target.width >= 43.9 && target.height >= 43.9,
              `${label}: ${target.name} actual target ${target.width}x${target.height} must retain44px`,
            );
            assert.ok(
              target.left >= 0 && target.right <= actual.viewportWidth + 1,
              `${label}: ${target.name} remains inside viewport`,
            );
            assert.ok(
              target.scrollWidth <= target.clientWidth + 1 &&
                target.scrollHeight <= target.clientHeight + 1,
              `${label}: full control label is not clipped`,
            );
          }
          assert.ok(
            actual.first && actual.first.top <= 160,
            `${label}: first meaningful ${actual.first?.tag} top=${actual.first?.top}, required <=160`,
          );
          assert.ok(
            box && box.y <= 160,
            `${label}: first active content y=${box?.y}, required <=160 at literal1180×820`,
          );
          await text(page.locator('.patient-topbar-title'), /QA penicillina/);
          await text(page.locator('.patient-topbar-title'), /QA lattice/);
          await text(page.locator('.patient-topbar-title'), /QA acido acetilsalicilico/);
          await text(page.locator('.patient-topbar-title'), /caduta/);
          assert.equal(
            await page
              .locator('.patient-record-view > .cr-alert-band, #patient-tab-panel > .cr-alert-band')
              .count(),
            0,
            'No repeated clinical banners',
          );
        } catch (error) {
          geometryFailures.push({ section: label, error: error.message });
        }
      }
      await section(page, 'Oggi');
      await giveDose(page, 'QA Prescription447');
      await eventually(
        async () =>
          assert.equal(
            await prisma.medicationAdministration.count({
              where: { patientId: patient.id, therapyId: therapy.id, stato: 'erogata' },
            }),
            1,
          ),
        'Today action persisted exactly once',
      );
      const urgent = page.locator(`[data-today-urgency="${diary.id}"]`);
      await urgent.getByRole('button', { name: /Ho capito/ }).click();
      await eventually(
        async () =>
          assert.equal(
            await prisma.diaryEntryAcknowledgement.count({ where: { entryId: diary.id } }),
            1,
          ),
        'Diary acknowledgement persisted',
      );
      const urgentHandover = page.locator(`[data-today-urgency="consegna:${handover.id}"]`);
      await urgentHandover.getByRole('button', { name: /Ho capito/ }).click();
      await eventually(
        async () =>
          assert.equal(
            await prisma.consegnaAcknowledgement.count({ where: { consegnaId: handover.id } }),
            1,
          ),
        'Handover acknowledgement persisted',
      );
      await reloadAuthenticated(state, chart());
      await page.locator('[data-patient-today]').waitFor();
      await count(page.locator(`[data-today-urgency="${diary.id}"]`), 0);
      await count(page.locator(`[data-today-urgency="consegna:${handover.id}"]`), 0);
      const persistedDose = await prisma.medicationAdministration.findFirstOrThrow({
        where: { patientId: patient.id, therapyId: therapy.id, stato: 'erogata' },
      });
      assert.ok(persistedDose.confirmedAt && persistedDose.operatoreNome);
      const persistedRow = page
        .locator('[data-patient-today] .giro-drug--done')
        .filter({ hasText: 'QA Prescription447' })
        .filter({ hasText: `ore ${persistedDose.ora}` });
      await count(persistedRow, 1);
      await eventually(async () => {
        assert.equal(
          (await persistedRow.locator('.giro-badge--ok').innerText()).trim(),
          `${facilityLocalMinute(persistedDose.confirmedAt).slice(11)} · ${persistedDose.operatoreNome}`,
        );
        assert.equal(await persistedRow.getByRole('button', { name: /^Erogata:/ }).count(), 0);
        assert.equal(
          await prisma.medicationAdministration.count({
            where: { patientId: patient.id, therapyId: therapy.id, stato: 'erogata' },
          }),
          1,
        );
      }, 'Reload preserves the exact dose, actual administration time and actor without a duplicate action');
      for (const viewport of [
        { width: 820, height: 1180 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await noOverflow(page);
        await text(page.locator('.patient-topbar-title'), /QA penicillina/);
      }
      await page.setViewportSize({ width: 1180, height: 820 });
      const restricted = await session('OSS 1', chart());
      try {
        await restricted.page.locator('[data-patient-today]').waitFor();
        await count(
          restricted.page.getByRole('region', { name: 'Terapia di oggi', exact: true }),
          0,
        );
        await count(
          restricted.page
            .locator('.teams-sidebar')
            .getByRole('button', { name: 'Terapia', exact: true }),
          0,
        );
        await restricted.page
          .getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true })
          .click();
        await text(
          restricted.page.locator('.invio-ps-overlay [role="alert"]'),
          /ruolo non può consultare tutte le fonti/,
        );
        assert.equal(await restricted.page.locator('[data-invio-ps-print]').isEnabled(), false);
        assert.equal(
          restricted.clinicalRequests.filter((row) =>
            /\/therapies(?:\/|$)|\/medication-administrations|^\/therapy-slots/.test(row.path),
          ).length,
          0,
          'A denied role never issues therapy/history requests',
        );
        assert.deepEqual(restricted.errors, []);
      } finally {
        await finish(restricted, '447-role-negative');
      }
      receipts.push({
        issue: 447,
        geometry,
        todayDosePersisted: true,
        urgencyPersisted: true,
        roleNegative: 'OSS therapy hidden; PS print blocked without clinical fetches',
        geometryFailures,
      });
      assert.deepEqual(
        geometryFailures,
        [],
        'All cartella sections satisfy literal160px, targets44 and no overlap',
      );
    });

    await scenario(451, 'Infermiere 1', 'parametri-multipaziente', async (state) => {
      const { page } = state;
      await page.locator('.par-pick__main').filter({ hasText: roundPatient.lastName }).click();
      await text(page.locator('.par-form__name'), new RegExp(roundPatient.lastName));
      const field = page.getByRole('textbox', { name: 'Nuova rilevazione FR', exact: true });
      await eventually(
        async () =>
          assert.match(
            await field.getAttribute('placeholder'),
            /18.*3 (?:h|ore) fa|3 (?:h|ore) fa.*18/,
          ),
        'Previous value and age placeholder',
      );
      await value(field, '');
      assert.equal(
        (await page.locator('.parameter-reading-form').innerText()).includes(
          'Nessuna rilevazione precedente',
        ),
        false,
      );
      await count(page.getByRole('group', { name: 'Tastierino numerico' }), 0);
      await text(page.locator('.parameter-reading-form__news2'), /NEWS2 parziale.*mancano/);
      const newsBox = await page.locator('.parameter-reading-form__news2').boundingBox();
      assert.ok(newsBox.height < 60, 'NEWS2 remains a compact line');
      await page.getByRole('button', { name: 'Aria ambiente', exact: true }).click();
      await page.getByRole('textbox', { name: 'Nuova rilevazione TC', exact: true }).fill('39.2');
      assert.ok(
        (
          await page
            .getByRole('textbox', { name: 'Nuova rilevazione TC', exact: true })
            .getAttribute('class')
        ).includes('attention'),
      );
      const before = await prisma.patientParameterReading.count({
        where: { patientId: roundPatient.id },
      });
      const endpoint = `/patients/${roundPatient.id}/parameter-readings`;
      state.fault = { path: endpoint, status: 400 };
      let injected = 0;
      const reject = async (route) => {
        if (route.request().method() === 'POST') {
          injected++;
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'QA deliberate validation failure' }),
          });
        } else await route.continue();
      };
      await page.route(`${api}${endpoint}`, reject);
      await page.getByRole('button', { name: 'Salva rilevazione', exact: true }).click();
      await text(page.locator('.parameter-trends-error'), /QA deliberate validation failure/);
      assert.equal(injected, 1);
      assert.equal(
        await prisma.patientParameterReading.count({ where: { patientId: roundPatient.id } }),
        before,
      );
      await text(page.locator('.par-form__name'), new RegExp(roundPatient.lastName));
      await value(page.getByRole('textbox', { name: 'Nuova rilevazione TC', exact: true }), '39.2');
      await page.unroute(`${api}${endpoint}`, reject);
      await page.getByRole('button', { name: 'Salva rilevazione', exact: true }).click();
      await text(page.locator('.par-form__name'), new RegExp(nextPatient.lastName));
      const saved = await prisma.patientParameterReading.findFirst({
        where: { patientId: roundPatient.id },
        orderBy: { createdAt: 'desc' },
      });
      assert.equal(saved.values.temperatura, '39.2');
      assert.equal(saved.values.o2, 'no');
      assert.equal(saved.values.fr, undefined, 'Placeholder was never submitted');
      state.fault = null;
      await reloadAuthenticated(state, 'parametri-multipaziente');
      await page.locator('.par-pick__main').filter({ hasText: roundPatient.lastName }).click();
      await eventually(
        async () =>
          assert.match(
            await page
              .getByRole('textbox', { name: 'Nuova rilevazione TC', exact: true })
              .getAttribute('placeholder'),
            /39[.,]2/,
          ),
        'Saved value survives reload as previous observation',
      );
      // Simulate loss of a successful response after the real server commits. The form must
      // stay on this patient and retry the exact same idempotent body, producing one reading.
      await page.locator('.par-pick__main').filter({ hasText: nextPatient.lastName }).click();
      await page.getByRole('textbox', { name: 'Nuova rilevazione TC', exact: true }).fill('37.7');
      await page.getByRole('button', { name: 'Aria ambiente', exact: true }).click();
      const uncertainPath = `/patients/${nextPatient.id}/parameter-readings`,
        sentBodies = [];
      const capture = (request) => {
        if (request.method() === 'POST' && new URL(request.url()).pathname === uncertainPath)
          sentBodies.push(request.postDataJSON());
      };
      page.on('request', capture);
      state.fault = { path: uncertainPath, status: 503 };
      let lostResponses = 0;
      const loseResponse = async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        lostResponses++;
        const committed = await route.fetch();
        assert.ok(
          committed.ok(),
          'The synthetic server write actually committed before the response fault',
        );
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'QA deliberately lost response after commit' }),
        });
      };
      await page.route(`${api}${uncertainPath}`, loseResponse);
      await page.getByRole('button', { name: 'Salva rilevazione', exact: true }).click();
      await text(
        page.locator('.parameter-trends-error'),
        /QA deliberately lost response after commit/,
      );
      await text(page.locator('.par-form__name'), new RegExp(nextPatient.lastName));
      assert.equal(
        await prisma.patientParameterReading.count({ where: { patientId: nextPatient.id } }),
        1,
      );
      await page.unroute(`${api}${uncertainPath}`, loseResponse);
      await page.getByRole('button', { name: 'Riprova salvataggio', exact: true }).click();
      await text(page.locator('.parameter-single-entry__success'), /Rilevazione salvata/);
      assert.equal(lostResponses, 1);
      assert.equal(sentBodies.length, 2);
      assert.deepEqual(sentBodies[1], sentBodies[0]);
      assert.equal(
        await prisma.patientParameterReading.count({ where: { patientId: nextPatient.id } }),
        1,
      );
      const exactlyOnce = await prisma.patientParameterReading.findFirst({
        where: { patientId: nextPatient.id },
      });
      assert.equal(exactlyOnce.values.temperatura, '37.7');
      page.off('request', capture);
      state.fault = null;
      receipts.push({
        issue: 451,
        savedValues: { temperatura: saved.values.temperatura, o2: saved.values.o2 },
        nextPatientAdvanced: true,
        failedSaveDidNotAdvance: true,
        uncertainReceiptRetrySameBodyExactlyOnce: true,
        negativeFaults: state.expectedErrors,
      });
      const touch = await session('Infermiere 1', 'parametri-multipaziente', {
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
      });
      try {
        await touch.page.locator('.par-pick__main').first().click();
        await touch.page
          .getByRole('textbox', { name: 'Nuova rilevazione FR', exact: true })
          .focus();
        await touch.page.getByRole('group', { name: 'Tastierino numerico' }).waitFor();
        await noOverflow(touch.page);
        await touch.page.screenshot({ path: path.join(out, 'issue-451-touch.png') });
        assert.deepEqual(touch.errors, []);
      } finally {
        await stopPrivateTrace(touch.context, 'issue-451-touch');
        const touchVideo = touch.page.video();
        await touch.context.close();
        if (touchVideo) {
          await touchVideo.saveAs(path.join(out, 'issue-451-touch.webm'));
          await touchVideo.delete();
        }
        touch.closed = true;
      }

      // Real three-page cohort: the whole second page is already recorded today.
      // Automatic advance must traverse it rather than stopping after one cursor.
      const cohortName = `QA Paged451 ${runId}`;
      const cohort = [];
      for (let index = 0; index < 51; index++) {
        const completed = index > 0 && index < 50;
        cohort.push(
          await prisma.patient.create({
            data: {
              medicalRecordNumber: `QA451-${runId}-${index}`,
              firstName: 'Synthetic',
              lastName: `${cohortName} ${String(index).padStart(2, '0')}`,
              dateOfBirth: new Date('1970-01-01T00:00:00Z'),
              registeredById: 'SIM-NURSE-1',
              cartella: { create: { data: { statoRicovero: 'ricoverato', parametriVitali: [] } } },
              ...(completed
                ? {
                    parameterReadings: {
                      create: {
                        requestId: `qa451-completed-${runId}-${index}`,
                        measuredAt: new Date(),
                        values: { temperatura: '36.5' },
                        authorOperatorId: 'SIM-NURSE-1',
                        authorName: 'Infermiere 1',
                      },
                    },
                  }
                : {}),
            },
          }),
        );
      }
      const intermediateIds = cohort.slice(1, 50).map((item) => item.id);
      assert.equal(
        await prisma.patientParameterReading.count({
          where: { patientId: { in: intermediateIds } },
        }),
        49,
      );
      const cohortPages = [],
        pendingCohortResponses = [];
      const captureCohortPage = (response) => {
        const url = new URL(response.url());
        if (
          url.origin !== new URL(api).origin ||
          url.pathname !== '/patients/parameters/page' ||
          url.searchParams.get('q') !== cohortName
        )
          return;
        assert.ok(response.ok(), 'Real cohort page succeeds');
        pendingCohortResponses.push(
          response.json().then((body) => {
            cohortPages.push({ cursor: url.searchParams.get('cursor'), body });
          }),
        );
      };
      page.on('response', captureCohortPage);
      await page
        .getByRole('searchbox', { name: 'Cerca paziente per nome o camera', exact: true })
        .fill(cohortName);
      await text(
        page.locator('.par-patients__tools [role="status"]'),
        /24\/25 con rilevazioni oggi/,
      );
      await page.locator('.par-pick__main').filter({ hasText: cohort[0].lastName }).click();
      await text(page.locator('.par-form__name'), new RegExp(cohort[0].lastName));
      await page.getByRole('textbox', { name: 'Nuova rilevazione TC', exact: true }).fill('36.7');
      await page.getByRole('button', { name: 'Salva rilevazione', exact: true }).click();
      await text(page.locator('.par-form__name'), new RegExp(cohort[50].lastName));
      await Promise.all(pendingCohortResponses);
      const cursorPages = cohortPages.filter((entry) => entry.cursor);
      assert.equal(
        new Set(cursorPages.map((entry) => entry.cursor)).size,
        2,
        'Automatic advance crosses two real cursors',
      );
      const middlePage = cursorPages.find((entry) => entry.body.items.length === 25);
      const lastPage = cursorPages.find((entry) => entry.body.items.length === 1);
      assert.ok(middlePage && lastPage, 'Real pages have 25/25/1 membership');
      assert.ok(
        middlePage.body.items.every((item) => item.cartella.readingCount === 1),
        'Every intermediate-page patient is already recorded',
      );
      assert.equal(lastPage.body.items[0].patient.id, cohort[50].id);
      assert.equal(lastPage.body.items[0].cartella.readingCount, 0);
      page.off('response', captureCohortPage);
      assert.equal(
        await prisma.patientParameterReading.count({ where: { patientId: cohort[0].id } }),
        1,
      );
      assert.equal(
        await prisma.patientParameterReading.count({
          where: { patientId: { in: intermediateIds } },
        }),
        49,
      );
      assert.equal(
        await prisma.patientParameterReading.count({ where: { patientId: cohort[50].id } }),
        0,
      );
      await reloadAuthenticated(state, 'parametri-multipaziente');
      await page
        .getByRole('searchbox', { name: 'Cerca paziente per nome o camera', exact: true })
        .fill(cohortName);
      await page.locator('.par-pick__main').filter({ hasText: cohort[0].lastName }).click();
      await eventually(
        async () =>
          assert.match(
            await page
              .getByRole('textbox', { name: 'Nuova rilevazione TC', exact: true })
              .getAttribute('placeholder'),
            /36[.,]7/,
          ),
        'Cohort first reading persists after reload',
      );
      assert.equal(
        await prisma.patientParameterReading.count({ where: { patientId: cohort[0].id } }),
        1,
      );
      receipts.push({
        issue: 451,
        pagination: {
          cohort: cohortName,
          pageSizes: [25, 25, 1],
          crossedDistinctCursors: 2,
          completedIntermediateUnchanged: 49,
          firstPersistedExactlyOnce: true,
          selectedFinalIncomplete: cohort[50].id,
        },
      });
    });

    await scenario(452, 'Infermiere 1', 'pazienti', async (state) => {
      const { page } = state;
      await page.locator('.patient-roster tbody tr.patient-roster__row').first().waitFor();
      assert.equal((await page.locator('.patient-roster th').first().innerText()).trim(), 'Letto');
      const rows = await page.locator('.patient-roster tbody').innerText();
      assert.doesNotMatch(
        rows,
        /Anagrafica da completare|CF da completare|NEWS2 non calcolabile|Posto letto non assegnato|Non disponibile/,
      );
      assert.match(rows, /QA44-/);
      assert.match(rows, /7/);
      await count(page.locator('.patient-list-incomplete'), 1);
      assert.equal(
        await page.locator('.plist-regime-controls').count(),
        0,
        'No repeated regime explanations before primary list',
      );
      await navigate(state, chart(nextPatient.id));
      await section(page, 'Clinica');
      const empty = page.locator('.clinical-empty-row').first();
      await empty.waitFor();
      const box = await empty.boundingBox();
      assert.ok(box.height <= 70, 'Empty clinical topic is one compact row');
      assert.doesNotMatch(
        await empty.innerText(),
        /Provenienza non registrata|Non presente nel documento|Testo sorgente e revisione/,
      );
      await navigate(state, 'agenda-operatore');
      await text(page.locator('.agt-day-card'), /Nessun appuntamento in questa giornata/);
      assert.equal(
        await prisma.appointment.count(),
        0,
        'Synthetic agenda has genuinely zero appointments',
      );
      const agendaPatient = await syntheticPatientWithChart('agenda452', 'QA D Agenda452');
      const agendaTherapy = await prisma.$transaction((tx) =>
        createTherapyInTx(tx, agendaPatient.id, {
          farmacoNome: 'QA Agenda pending452',
          dataInizio: today,
          commercialStrengthValue: 5,
          commercialStrengthUnit: 'mg',
          pharmaceuticalForm: 'compressa',
          viaSomministrazione: 'orale',
          tipo: 'periodica',
          schedules: ['08:00', '20:00'].map(schedule),
          operatoreInseritore: 'QA',
        }),
      );
      assert.equal(
        await prisma.medicationAdministration.count({ where: { therapyId: agendaTherapy.id } }),
        0,
      );
      // Legacy ambiguous one-off: the imported parent candidate presents it as an untimed verification.
      // Appointment dates retain their established device-calendar policy; use its actual selected day.
      const agendaDay = await page.evaluate(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      });
      const verificationTherapy = await prisma.patientTherapy.create({ data: {
        patientId: agendaPatient.id, farmacoNome: 'QA Agenda verify452',
        viaSomministrazione: 'orale', tipo: 'una_tantum', stato: 'attiva',
        dosaggio: '',
        dataInizio: agendaDay, dataSomministrazione: agendaDay, orarioSomministrazione: null,
      } });
      const verification = () => page.getByRole('region', { name: `Terapie da verificare ${agendaDay}`, exact: true });
      const beforeAgendaWrites = await prisma.medicationAdministration.count();
      await reloadAuthenticated(state, 'agenda-operatore');
      await text(page.locator('.agt-day-card'), /Nessun appuntamento in questa giornata/);
      await count(page.locator('.agt-day-wrap'), 0);
      await text(verification(), /QA D Agenda452[\s\S]*Orario non specificato/);
      await text(verification(), /QA Agenda verify452/);
      await count(verification().getByRole('button'), 0);
      assert.doesNotMatch(await verification().innerText(), /08:00|20:00|1 compressa/);
      assert.equal(await prisma.medicationAdministration.count(), beforeAgendaWrites, 'Read-only Agenda never records a dose');
      await page.screenshot({ path: path.join(out, 'issue-452-empty-agenda-verification.png'), fullPage: true });
      await page.getByRole('button', { name: 'Nuovo appuntamento', exact: true }).waitFor();

      // The same exact scheduled doses are actionable in Giro, with their original patient identity.
      await navigate(state, 'terapie');
      await readTherapyRoundsPage(page);
      await page.getByRole('button', { name: 'Giro', exact: true }).click();
      await page.getByLabel('Data terapia', { exact: true }).fill(today);
      for (const time of ['08:00', '20:00']) {
        await page.getByRole('group', { name: 'Ora della terapia' }).getByRole('button', { name: new RegExp(`^Ore ${time}:`) }).click();
        const dose = page.locator('.giro-patient').filter({ hasText: 'QA D Agenda452' });
        await text(dose, /QA Agenda pending452/);
        await count(dose.getByRole('button', { name: /^Erogata:/ }), 1);
      }
      await page.getByRole('group', { name: 'Ora della terapia' }).getByRole('button', { name: /^Ore 08:00:/ }).click();
      await giveDose(page, 'QA Agenda pending452');
      await eventually(async () => assert.equal(await prisma.medicationAdministration.count({ where: {
        patientId: agendaPatient.id, therapyId: agendaTherapy.id, ora: '08:00', stato: 'erogata',
      } }), 1), 'Actual Giro action persists the exact patient and scheduled dose once');
      await reloadAuthenticated(state, 'agenda-operatore');
      await text(verification(), /QA Agenda verify452/);
      assert.equal(await prisma.medicationAdministration.count({ where: { therapyId: agendaTherapy.id } }), 1);
      assert.equal(await prisma.medicationAdministration.count({ where: { therapyId: verificationTherapy.id } }), 0);
      const agendaErrorPath = '/therapy-slots/page';
      state.fault = { path: agendaErrorPath, status: 503, method: 'GET' };
      const failAgenda = async (route) => route.fulfill({ status: 503, contentType: 'application/json',
        body: JSON.stringify({ error: 'QA deliberate agenda verification source failure' }) });
      await page.route(`${api}${agendaErrorPath}**`, failAgenda);
      await reloadAuthenticated(state, 'agenda-operatore');
      await page.getByRole('button', { name: 'Riprova verifiche', exact: true }).waitFor();
      await count(verification(), 0);
      await count(page.locator('.agt-day-wrap .tdose'), 0);
      await page.unroute(`${api}${agendaErrorPath}**`, failAgenda);
      state.fault = null;
      await page.getByRole('button', { name: 'Riprova verifiche', exact: true }).click();
      await text(verification(), /QA Agenda verify452/);
      await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click();
      await count(page.getByText('QA Agenda verify452', { exact: true }), 0);
      await page.getByRole('button', { name: 'Intervallo precedente', exact: true }).click();
      await text(verification(), /QA Agenda verify452/);

      // The only complete observation is beyond the first page. A separate patient's
      // failed source must keep this verified positive visible and expose one aggregate unknown.
      const completePatient = await syntheticPatientWithChart(
        'news-complete452',
        'QA E Complete452',
      );
      const failedPatient = await syntheticPatientWithChart('news-error452', 'QA F Error452');
      const completeValues = {
        fr: '18',
        spo2: '97',
        o2: 'no',
        pa: '125/80',
        fc: '78',
        coscienza: 'A',
        temperatura: '36.8',
      };
      await prisma.patientParameterReading.createMany({
        data: [
          ...Array.from({ length: 50 }, (_, index) => ({
            patientId: completePatient.id,
            requestId: `qa452-partial-${runId}-${index}`,
            measuredAt: now,
            values: { fr: '18' },
            authorOperatorId: 'SIM-NURSE-1',
            authorName: 'Infermiere 1',
          })),
          {
            patientId: completePatient.id,
            requestId: `qa452-complete-${runId}`,
            measuredAt: new Date(now.getTime() - 3600000),
            values: completeValues,
            authorOperatorId: 'SIM-NURSE-1',
            authorName: 'Infermiere 1',
          },
          {
            patientId: failedPatient.id,
            requestId: `qa452-recovered-${runId}`,
            measuredAt: now,
            values: completeValues,
            authorOperatorId: 'SIM-NURSE-1',
            authorName: 'Infermiere 1',
          },
        ],
      });
      const newsPath = `/patients/${completePatient.id}/parameter-readings`;
      const failedPath = `/patients/${failedPatient.id}/parameter-readings`;
      const pages = [],
        pageReads = [];
      const recordNewsPage = (response) => {
        const url = new URL(response.url());
        if (url.pathname !== newsPath || response.request().method() !== 'GET' || !response.ok())
          return;
        pageReads.push(
          response.json().then((body) =>
            pages.push({
              cursor: url.searchParams.get('cursor'),
              size: body.readings.length,
              hasMore: body.hasMore,
              ids: body.readings.map((reading) => reading.id),
              complete: body.readings.filter((reading) =>
                Object.keys(completeValues).every((key) => reading.values[key] !== undefined),
              ).length,
            }),
          ),
        );
      };
      page.on('response', recordNewsPage);
      state.fault = { path: failedPath, status: 503, method: 'GET' };
      let newsFailures = 0;
      const failNewsSource = async (route) => {
        if (route.request().method() !== 'GET') return route.continue();
        newsFailures++;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'QA deliberate NEWS2 source failure' }),
        });
      };
      await page.route(`${api}${failedPath}**`, failNewsSource);
      await reloadAuthenticated(state, 'pazienti');
      const completeRow = page
        .locator('.patient-roster tbody tr')
        .filter({ hasText: completePatient.lastName });
      await completeRow.scrollIntoViewIfNeeded();
      await text(completeRow.locator('.news2-chip'), /NEWS2 0.*da aggiornare/);
      await count(page.locator('.patient-roster th').filter({ hasText: /^NEWS2$/ }), 1);
      const newsUnknown = page
        .getByRole('status')
        .filter({ hasText: 'NEWS2 non verificabile per alcuni pazienti' });
      await count(newsUnknown, 1);
      await count(
        page
          .locator('.patient-roster tbody tr')
          .filter({ hasText: failedPatient.lastName })
          .locator('.news2-chip'),
        0,
      );
      assert.doesNotMatch(
        await page.locator('.patient-roster tbody').innerText(),
        /NEWS2 non calcolabile|NEWS2 non verificabile|NEWS2 assente/,
      );
      await Promise.all(pageReads);
      assert.ok(
        pages.some(
          (entry) =>
            entry.cursor === null && entry.size === 50 && entry.complete === 0 && entry.hasMore,
        ),
      );
      assert.ok(
        pages.some(
          (entry) =>
            entry.cursor !== null && entry.size === 1 && entry.complete === 1 && !entry.hasMore,
        ),
      );
      assert.ok(newsFailures >= 1, 'The separate patient actually received a controlled 503');
      await page.screenshot({ path: path.join(out, 'issue-452-news2-partial-failure.png') });
      await page.unroute(`${api}${failedPath}**`, failNewsSource);
      await page.getByRole('button', { name: 'Riprova NEWS2', exact: true }).click();
      const recoveredRow = page
        .locator('.patient-roster tbody tr')
        .filter({ hasText: failedPatient.lastName });
      await recoveredRow.scrollIntoViewIfNeeded();
      await text(recoveredRow.locator('.news2-chip'), /NEWS2 0/);
      await text(completeRow.locator('.news2-chip'), /NEWS2 0.*da aggiornare/);
      await count(newsUnknown, 0);
      await Promise.all(pageReads);
      page.off('response', recordNewsPage);
      state.fault = null;
      receipts.push({
        issue: 452,
        positiveData: {
          zeroAppointments: true,
          scheduledGiroTimes: ['08:00', '20:00'],
          untimedAgendaVerification: verificationTherapy.id,
          agendaTherapyId: agendaTherapy.id,
          newsHistoryPages: pages.map(({ ids, ...entry }) => entry),
          onlyOlderComplete: true,
          independentFailedPatient: failedPatient.id,
          controlled503: newsFailures,
          knownCompletePreserved: true,
          aggregateUnknownCount: 1,
          recoveryVerified: true,
        },
      });
      await noOverflow(page);
      for (const viewport of [
        { width: 820, height: 1180 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await noOverflow(page);
      }
      await page.setViewportSize({ width: 1180, height: 820 });
      receipts.push({
        issue: 452,
        bedFirst: true,
        missingDataPerRow: false,
        incompleteFooterCount: 1,
        compactClinicalEmpty: true,
        emptyAppointmentGrid: false,
        untimedVerificationVisible: true,
        exactScheduledActionsInGiro: true,
      });
    });

    await scenario(453, 'Medico 1', chart(), async (state) => {
      const { page } = state;
      const negativePatient = await syntheticPatientWithChart('negative453', 'QA G Negative453');
      const alternateAic = '999447002',
        alternateDrug = 'QA453 ALTERNATIVA 10 MG';
      await prisma.farmaco.create({
        data: {
          aic: alternateAic,
          denominazione: alternateDrug,
          denominazioneNorm: alternateDrug,
          descrizione: '20 COMPRESSE USO ORALE',
          statoAmministrativo: 'Autorizzata',
          forma: 'COMPRESSE',
          principiAttivi: {
            create: {
              principioAttivo: 'QA ALTRO PRINCIPIO SINTETICO',
              principioAttivoNorm: 'QA ALTRO PRINCIPIO SINTETICO',
              quantita: 10,
              unitaMisura: 'mg',
            },
          },
        },
      });
      const originalAllergies = (
        await prisma.cartella.findUnique({ where: { patientId: patient.id } })
      ).data.allergie;
      const therapyPath = `/patients/${patient.id}/therapies`;
      const sentBodies = [];
      const capture = (request) => {
        if (request.method() === 'POST' && new URL(request.url()).pathname === therapyPath)
          sentBodies.push(request.postDataJSON());
      };
      page.on('request', capture);
      const warning = page.getByTestId('therapy-allergy-warning');
      const acknowledgement = page.getByTestId('therapy-allergy-acknowledge');
      async function selectPackage(name = drugName) {
        const change = page
          .locator('.campo-farmaco__scelto')
          .getByRole('button', { name: 'Cambia', exact: true });
        if (await change.isVisible().catch(() => false)) await change.click();
        await page
          .getByRole('searchbox', { name: 'Cerca il farmaco per nome commerciale', exact: true })
          .fill('QA453');
        await page
          .locator('.campo-farmaco__lista')
          .getByRole('button')
          .filter({ hasText: name })
          .click();
        await value(
          page.getByLabel('Dosaggio commerciale', { exact: true }),
          name === alternateDrug ? '10' : '5',
        );
      }
      async function openPrescription(id) {
        await navigate(state, chart(id));
        await section(page, 'Terapia');
        await page.getByRole('tab', { name: 'Nuova terapia', exact: true }).click();
      }
      async function newPrescription(id) {
        await openPrescription(id);
        await selectPackage();
      }
      async function selectRoute() {
        await routeControl().selectOption('orale');
      }
      function routeControl() {
        return page.getByLabel('Via di somministrazione', { exact: true });
      }
      async function assertRouteBlank(message) {
        assert.equal(await routeControl().inputValue(), '', message);
      }
      async function assertUnchecked(message) {
        await eventually(
          async () => assert.equal(await acknowledgement.isChecked(), false, message),
          message,
        );
      }
      async function preset() {
        await page.getByRole('button', { name: 'Mattina e sera 08 · 20', exact: true }).click();
        await page.getByRole('button', { name: '7 giorni', exact: true }).click();
      }
      await newPrescription(negativePatient.id);
      await assertRouteBlank('AIFA package selection leaves the known-negative route blank');
      await text(warning, /Allergie assenti \(verificato\)/);
      await count(acknowledgement, 0);
      await value(page.getByLabel('Forma farmaceutica', { exact: true }), 'compressa');
      assert.equal(await page.getByLabel('Stato terapia', { exact: true }).count(), 0);
      let interactions = 0;
      async function interaction(action) {
        interactions++;
        await action();
      }
      assert.equal(
        await page.getByRole('button', { name: '1 compressa, orario 1', exact: true }).getAttribute('aria-pressed'),
        'true',
        'The selected quantity is the pressed dose chip; the custom Altro textbox is blank by design',
      );
      await interaction(selectRoute);
      await interaction(() =>
        page.getByRole('button', { name: 'Mattina e sera 08 · 20', exact: true }).click(),
      );
      await interaction(() => page.getByRole('button', { name: '7 giorni', exact: true }).click());
      const sentence = await page.locator('[data-prescription-sentence]').innerText();
      assert.match(sentence, /1 compressa alle 08:00/);
      assert.match(sentence, /1 compressa alle 20:00/);
      const responsePromise = page.waitForResponse(
        (r) =>
          r.url() === `${api}/patients/${negativePatient.id}/therapies` &&
          r.request().method() === 'POST',
      );
      await interaction(() =>
        page.getByRole('button', { name: 'Salva terapia', exact: true }).click(),
      );
      const response = await responsePromise;
      assert.ok(response.ok(), `Known-negative prescription persisted HTTP${response.status()}`);
      const payload = response.request().postDataJSON();
      assert.deepEqual(
        payload.schedules.map((s) => ({
          time: s.time,
          quantityNumerator: s.quantityNumerator,
          quantityDenominator: s.quantityDenominator,
          administrationUnit: s.administrationUnit,
        })),
        ['08:00', '20:00'].map(schedule),
      );
      assert.equal(payload.drugPackageRef, aic);
      assert.equal(payload.commercialStrengthValue, 5);
      assert.equal(payload.viaSomministrazione, 'orale');
      assert.equal(payload.stato, 'attiva');
      assert.equal(payload.dataInizio, today);
      const end = new Date(`${today}T12:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 6);
      assert.equal(payload.dataFine, end.toISOString().slice(0, 10));
      assert.equal(interactions, 4, `Known-negative actual interactions after package selection: ${interactions}`);
      const negativeInteractions = interactions;
      const negativeRows = await prisma.patientTherapy.findMany({
        where: { patientId: negativePatient.id, drugPackageRef: aic },
        include: { schedules: { orderBy: { time: 'asc' } } },
      });
      assert.equal(negativeRows.length, 1, 'Exactly one known-negative prescription is saved');
      const stored = negativeRows[0];
      assert.equal(stored.viaSomministrazione, 'orale');
      assert.equal(stored.drugPackageRef, aic);
      assert.equal(stored.commercialStrengthValue, 5);
      assert.equal(stored.dataInizio, today);
      assert.equal(stored.dataFine, end.toISOString().slice(0, 10));
      assert.deepEqual(stored.schedules.map((s) => ({
        time: s.time, quantityNumerator: s.quantityNumerator,
        quantityDenominator: s.quantityDenominator, administrationUnit: s.administrationUnit,
      })), ['08:00', '20:00'].map(schedule));
      await reloadAuthenticated(state, chart(negativePatient.id));
      await section(page, 'Terapia');
      await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).click();
      const negativePersisted = page.locator(`[data-therapy-id="${stored.id}"]`);
      await text(negativePersisted, new RegExp(drugName));
      await text(negativePersisted, /orale/);
      assert.ok(page.url().includes(negativePatient.id));

      // Positive allergy context is confirmed and saved without inventing a product/allergen match.
      await newPrescription(patient.id);
      await assertRouteBlank('AIFA package selection leaves the positive-context route blank');
      for (const allergy of originalAllergies) await text(warning, new RegExp(allergy.allergene));
      await text(warning, /grave.*QA orticaria/);
      await assertUnchecked('Positive context starts unacknowledged');
      assert.equal(
        await page.getByRole('button', { name: '1 compressa, orario 1', exact: true }).getAttribute('aria-pressed'),
        'true',
        'The selected quantity is the pressed dose chip; the custom Altro textbox is blank by design',
      );
      const previousPositiveTherapyIds = new Set(
        (
          await prisma.patientTherapy.findMany({
            where: { patientId: patient.id, drugPackageRef: aic },
            select: { id: true },
          })
        ).map(({ id }) => id),
      );
      interactions = 0;
      await interaction(selectRoute);
      await interaction(() =>
        page.getByRole('button', { name: 'Mattina e sera 08 · 20', exact: true }).click(),
      );
      await interaction(() => page.getByRole('button', { name: '7 giorni', exact: true }).click());
      const positiveSentence = await page.locator('[data-prescription-sentence]').innerText();
      assert.match(positiveSentence, /1 compressa alle 08:00/);
      assert.match(positiveSentence, /1 compressa alle 20:00/);
      const positiveResponsePromise = page.waitForResponse(
        (r) =>
          r.url() === `${api}/patients/${patient.id}/therapies` &&
          r.request().method() === 'POST',
      );
      await interaction(() => acknowledgement.check());
      await interaction(() =>
        page.getByRole('button', { name: 'Salva terapia', exact: true }).click(),
      );
      const positiveResponse = await positiveResponsePromise;
      assert.ok(
        positiveResponse.ok(),
        `Positive-allergy prescription persisted HTTP${positiveResponse.status()}`,
      );
      const savedPositiveRequestCount = sentBodies.length;
      assert.equal(savedPositiveRequestCount, 1);
      const positivePayload = positiveResponse.request().postDataJSON();
      assert.deepEqual(
        positivePayload.schedules.map((s) => ({
          time: s.time,
          quantityNumerator: s.quantityNumerator,
          quantityDenominator: s.quantityDenominator,
          administrationUnit: s.administrationUnit,
        })),
        ['08:00', '20:00'].map(schedule),
      );
      assert.equal(positivePayload.drugPackageRef, aic);
      assert.equal(positivePayload.commercialStrengthValue, 5);
      assert.equal(positivePayload.viaSomministrazione, 'orale');
      assert.equal(positivePayload.stato, 'attiva');
      assert.equal(positivePayload.dataInizio, today);
      assert.equal(positivePayload.dataFine, end.toISOString().slice(0, 10));
      assert.ok(
        interactions === 5,
        `Positive-context actual interactions after package selection: ${interactions}`,
      );
      const positiveInteractions = interactions;
      const positiveRowsForAic = await prisma.patientTherapy.findMany({
        where: { patientId: patient.id, drugPackageRef: aic },
        include: { schedules: { orderBy: { time: 'asc' } } },
      });
      const newPositiveRowsForAic = positiveRowsForAic.filter(
        ({ id }) => !previousPositiveTherapyIds.has(id),
      );
      assert.equal(newPositiveRowsForAic.length, 1, 'Exactly one new positive AIC row was saved');
      const positiveStored = newPositiveRowsForAic[0];
      assert.equal(positiveStored.drugPackageRef, aic);
      assert.equal(positiveStored.commercialStrengthValue, 5);
      assert.equal(positiveStored.viaSomministrazione, 'orale');
      assert.equal(positiveStored.stato, 'attiva');
      assert.equal(positiveStored.dataInizio, today);
      assert.equal(positiveStored.dataFine, end.toISOString().slice(0, 10));
      assert.deepEqual(
        positiveStored.schedules.map((s) => ({
          time: s.time,
          quantityNumerator: s.quantityNumerator,
          quantityDenominator: s.quantityDenominator,
          administrationUnit: s.administrationUnit,
        })),
        ['08:00', '20:00'].map(schedule),
      );
      await reloadAuthenticated(state, chart());
      await section(page, 'Terapia');
      await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).click();
      const positivePersisted = page.locator(`[data-therapy-id="${positiveStored.id}"]`);
      await text(positivePersisted, new RegExp(drugName));
      await text(positivePersisted, /orale/);
      assert.ok(page.url().includes(patient.id));

      // Start a fresh prescription for the original acknowledgement invalidation cases.
      await newPrescription(patient.id);
      await selectRoute();
      await assertUnchecked('Fresh prescription starts unacknowledged');
      await acknowledgement.check();
      await page
        .locator('.campo-farmaco__scelto')
        .getByRole('button', { name: 'Cambia', exact: true })
        .click();
      await assertUnchecked('Changing drug immediately clears acknowledgement');
      await selectPackage(alternateDrug);
      await assertUnchecked('Different actual AIC/strength cannot inherit acknowledgement');
      await acknowledgement.check();
      await selectPackage();
      await assertUnchecked('Returning to the previous package cannot reuse its acknowledgement');
      await acknowledgement.check();
      await page.getByLabel('Dosaggio commerciale', { exact: true }).fill('10');
      await assertUnchecked('Changed strength invalidates acknowledgement');
      await page.getByLabel('Dosaggio commerciale', { exact: true }).fill('5');
      await acknowledgement.check();
      await page.getByLabel('Forma farmaceutica', { exact: true }).selectOption('capsula');
      await assertUnchecked('Changed pharmaceutical form invalidates acknowledgement');
      await selectPackage();
      await preset();
      await acknowledgement.check();
      await openPrescription(negativePatient.id);
      await text(warning, /Allergie assenti \(verificato\)/);
      await count(acknowledgement, 0);
      await openPrescription(patient.id);
      await text(warning, /QA penicillina/);
      await assertUnchecked(
        'Switching away and back to a patient requires new acknowledgement before package selection',
      );
      await selectPackage();
      await selectRoute();
      await preset();
      await acknowledgement.check();

      const prescriptionBeforeAllergyEdit = await page
        .locator('.therapy-form__preview')
        .innerText();
      // A chart edit through the actual modal changes the revision without remounting the draft.
      const localAllergen = `QA local453 ${runId}`;
      await page.locator('.cr-alert-strip--allergie').click();
      const allergyDialog = page.getByRole('dialog', {
        name: 'Allergie e Intolleranze',
        exact: true,
      });
      await allergyDialog.getByRole('button', { name: 'Aggiungi allergia', exact: true }).click();
      await allergyDialog.locator('.ec-modal-add-form input').nth(0).fill(localAllergen);
      await allergyDialog
        .locator('.ec-modal-add-form input')
        .nth(1)
        .fill('QA nuova reazione locale');
      const chartSaved = page.waitForResponse(
        (r) =>
          r.url() === `${api}/patients/${patient.id}/cartella` && r.request().method() === 'PUT',
      );
      await allergyDialog.getByRole('button', { name: 'Salva', exact: true }).click();
      assert.ok(
        (await chartSaved).ok(),
        'Local allergy revision actually persisted through the authorized API',
      );
      await allergyDialog.getByRole('button', { name: 'Chiudi', exact: true }).last().click();
      await text(warning, new RegExp(localAllergen));
      await assertUnchecked('Current allergy revision immediately invalidates acknowledgement');
      for (const index of [1, 2]) {
        assert.equal(
          await page
            .getByRole('button', { name: `1 compressa, orario ${index}`, exact: true })
            .getAttribute('aria-pressed'),
          'true',
          `Allergy revision preserves the actual one-compressa dose for schedule ${index}`,
        );
      }
      assert.equal(
        await page.locator('.therapy-form__preview').innerText(),
        prescriptionBeforeAllergyEdit,
        'Allergy revision preserves the exact dose, schedule, route and civil dates summary',
      );
      assert.equal(
        await page
          .locator('.campo-farmaco__scelto')
          .innerText()
          .then((s) => s.includes(drugName)),
        true,
        'Allergy revision preserves the selected package and prescription draft',
      );
      assert.ok(
        (await prisma.cartella.findUnique({ where: { patientId: patient.id } })).data.allergie.some(
          (a) => a.allergene === localAllergen,
        ),
      );
      await acknowledgement.check();
      await reloadAuthenticated(state, chart());
      await section(page, 'Terapia');
      await page.getByRole('tab', { name: 'Nuova terapia', exact: true }).click();
      await text(warning, new RegExp(localAllergen));
      await assertUnchecked(
        'Reload never persists a previous acknowledgement, before package selection',
      );
      await selectPackage();
      await selectRoute();
      await preset();
      const cartellaPath = `/patients/${patient.id}/cartella`;
      state.fault = { path: cartellaPath, status: 503, method: 'GET' };
      let failedAllergyReads = 0;
      const failAllergySource = async (route) => {
        if (route.request().method() !== 'GET') return route.continue();
        failedAllergyReads++;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'QA deliberate allergy source failure' }),
        });
      };
      await acknowledgement.check();
      await page.route(`${api}${cartellaPath}`, failAllergySource);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await text(warning, /dato non disponibile/);
      assert.doesNotMatch(await warning.innerText(), /assenti|paziente nega/i);
      await assertUnchecked(
        'Failed allergy source cannot retain the previous acknowledgement or claim absence',
      );
      assert.ok(failedAllergyReads >= 1);
      await page.unroute(`${api}${cartellaPath}`, failAllergySource);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await text(warning, new RegExp(localAllergen));
      await assertUnchecked('Recovered actual source requires a new acknowledgement');
      state.fault = null;
      await acknowledgement.check();

      // An independently recorded allergy must be discovered by preflight, before any POST.
      const externalAllergen = `QA external453 ${runId}`;
      const beforeExternal = await prisma.cartella.findUnique({ where: { patientId: patient.id } });
      await prisma.cartella.update({
        where: { patientId: patient.id },
        data: {
          data: {
            ...beforeExternal.data,
            allergie: [
              ...beforeExternal.data.allergie,
              {
                id: `external453-${runId}`,
                allergene: externalAllergen,
                gravita: 'moderata',
                reazione: 'QA reazione esterna',
                documentato: today,
                documentatoDa: 'QA altro operatore',
              },
            ],
          },
        },
      });
      const beforePrescription = await prisma.patientTherapy.count({
        where: { patientId: patient.id },
      });
      const freshRead = page.waitForResponse(
        (r) =>
          r.url() === `${api}/patients/${patient.id}/cartella` && r.request().method() === 'GET',
      );
      await page.getByRole('button', { name: 'Salva terapia', exact: true }).click();
      assert.ok((await freshRead).ok());
      await text(warning, new RegExp(externalAllergen));
      await text(page.getByTestId('therapy-save-error'), /contesto allergie aggiornato.*conferma/);
      await assertUnchecked('New external allergy requires a new explicit acknowledgement');
      assert.equal(
        sentBodies.length,
        savedPositiveRequestCount,
        'No prescription POST before acknowledging fresh external allergy',
      );
      assert.equal(
        await prisma.patientTherapy.count({ where: { patientId: patient.id } }),
        beforePrescription,
      );
      await page.screenshot({ path: path.join(out, 'issue-453-fresh-allergy-warning.png') });
      await acknowledgement.check();

      // Lose only the response, after the real server commits the exact preset prescription.
      state.fault = { path: therapyPath, status: 503 };
      let lostResponses = 0;
      const loseResponse = async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        lostResponses++;
        const committed = await route.fetch();
        assert.ok(
          committed.ok(),
          'Warning-confirmed prescription actually committed before response loss',
        );
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'QA deliberately lost prescription response after commit',
          }),
        });
      };
      await page.route(`${api}${therapyPath}`, loseResponse);
      await page.getByRole('button', { name: 'Salva terapia', exact: true }).click();
      await text(
        page.getByTestId('therapy-save-error'),
        /QA deliberately lost prescription response after commit/,
      );
      assert.equal(
        await prisma.patientTherapy.count({ where: { patientId: patient.id } }),
        beforePrescription + 1,
      );
      await page.unroute(`${api}${therapyPath}`, loseResponse);
      const replay = page.waitForResponse(
        (r) => r.url() === `${api}${therapyPath}` && r.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Salva terapia', exact: true }).click();
      assert.ok((await replay).ok());
      await eventually(
        async () =>
          assert.equal(
            await page.getByRole('heading', { name: 'Nuova terapia', exact: true }).count(),
            0,
          ),
        'Successful replay closes the prescription form',
      );
      assert.equal(lostResponses, 1);
      assert.equal(sentBodies.length, savedPositiveRequestCount + 2);
      assert.deepEqual(
        sentBodies.at(-1),
        sentBodies.at(-2),
        'Uncertain retry preserves the exact body and requestId',
      );
      const {
        patientId: ordinaryPatientId,
        requestId: ordinaryRequestId,
        ...ordinaryBody
      } = payload;
      const {
        patientId: warningPatientId,
        requestId: warningRequestId,
        ...warningBody
      } = sentBodies.at(-2);
      assert.equal(ordinaryPatientId, negativePatient.id);
      assert.equal(warningPatientId, patient.id);
      assert.ok(ordinaryRequestId && warningRequestId);
      assert.deepEqual(
        warningBody,
        ordinaryBody,
        'Acknowledgement adds no field or alteration to the therapy API payload',
      );
      assert.equal(
        await prisma.patientTherapy.count({ where: { patientId: patient.id } }),
        beforePrescription + 1,
      );
      state.fault = null;
      page.off('request', capture);
      // Remove only this scenario's extra allergy fixtures, preserving every other chart field.
      const finalChart = await prisma.cartella.findUnique({ where: { patientId: patient.id } });
      await prisma.cartella.update({
        where: { patientId: patient.id },
        data: {
          data: {
            ...finalChart.data,
            allergie: finalChart.data.allergie.filter(
              (a) => a.allergene !== localAllergen && a.allergene !== externalAllergen,
            ),
          },
        },
      });
      await reloadAuthenticated(state, chart());
      await section(page, 'Terapia');
      await text(page.locator('#patient-tab-panel'), new RegExp(drugName));
      receipts.push({
        issue: 453,
        negativeInteractionsAfterPackageSelection: negativeInteractions,
        positiveInteractionsAfterPackageSelection: positiveInteractions,
        positiveContextSavedAndReloaded: true,
        ordinaryPatientId: negativePatient.id,
        ordinaryVerifiedAbsent: true,
        exactSchedulePayload: payload.schedules,
        sentence,
        allergyPolicy:
          'Explicit compatibility acknowledgement; actual source, no invented drug matching',
        recordedAllergens: originalAllergies.map((a) => a.allergene),
        patientSwitchInvalidates: true,
        packageSwitchAndReturnInvalidates: true,
        strengthAndFormInvalidate: true,
        localAllergyRevisionPreservesDraftAndInvalidates: true,
        reloadInvalidates: true,
        externalAllergyPreflightNoPost: true,
        failedAllergyReads,
        unknownNeverNegative: true,
        recoveredSourceRequiresAcknowledgement: true,
        noAutomaticContraindication: true,
        acknowledgementPayloadUnchanged: true,
        uncertainRetry: { lostResponses, identicalBody: true, exactlyOnePrescription: true },
      });
    });

    await scenario(454, 'Infermiere 1', 'terapie', async (state) => {
      const { page } = state;
      await page.locator('.giro-patients').waitFor();
      await count(page.locator('[data-giro-controls]'), 1);
      const active = page
        .getByRole('group', { name: 'Ora della terapia' })
        .locator('[aria-pressed="true"]');
      assert.match(await active.getAttribute('aria-label'), new RegExp(`Ore ${currentTime}`));
      assert.equal(await page.getByText('Dettagli allergie', { exact: true }).count(), 0);
      const mainGroup = page.locator('.giro-patient').filter({ hasText: patient.lastName });
      if (await mainGroup.count())
        assert.equal((await mainGroup.innerText()).split('QA penicillina').length - 1, 1);
      await giveDose(page, 'QA Giro454');
      await eventually(
        async () =>
          assert.equal(
            await prisma.medicationAdministration.count({
              where: { patientId: nextPatient.id, therapyId: roundTherapy.id, stato: 'erogata' },
            }),
            1,
          ),
        'Giro action persisted once',
      );
      await reloadAuthenticated(state, 'terapie');
      await page.locator('[data-giro-controls]').waitFor();
      const records = await request(
        state,
        `/patients/${nextPatient.id}/medication-administrations/page?limit=100`,
      );
      assert.equal(
        records.items.filter((row) => row.therapyId === roundTherapy.id && row.stato === 'erogata')
          .length,
        1,
      );
      await navigate(state, chart());
      await section(page, 'Terapia');
      const grid = page
        .locator(
          '.therapy-calendar-grid-wrap,.therapy-calendar-grid-scroll,.therapy-calendar-scroll',
        )
        .first();
      await eventually(
        async () => assert.ok((await page.locator('[data-time="08:00"]').first().count()) > 0),
        'Day calendar has actual dose rows',
      );
      await eventually(
        async () =>
          assert.ok(
            (await page
              .locator('.therapy-calendar-grid.is-day')
              .evaluate((node) => node.scrollTop)) > 0,
          ),
        'Day calendar skips empty midnight rows',
      );
      const scroll = await page
        .locator('[data-time="08:00"]')
        .first()
        .evaluate((row) => {
          let node = row.parentElement;
          while (node && node !== document.body) {
            if (
              getComputedStyle(node).overflowY === 'auto' ||
              getComputedStyle(node).overflowY === 'scroll'
            )
              return {
                scrollTop: node.scrollTop,
                height: node.clientHeight,
                top: row.getBoundingClientRect().top,
                parentTop: node.getBoundingClientRect().top,
              };
            node = node.parentElement;
          }
          return null;
        });
      assert.ok(
        scroll && scroll.scrollTop > 0,
        'Day calendar scroll receipt has a nonzero actual scroll position',
      );
      assert.ok(
        scroll.top >= scroll.parentTop - 1 && scroll.top < scroll.parentTop + scroll.height,
        'First scheduled dose is visible in the calendar scrollport',
      );
      receipts.push({
        issue: 454,
        initialCurrentTime: currentTime,
        controlRows: 1,
        actualDosePersisted: true,
        calendarScroll: scroll,
      });
    });

    await scenario(457, 'Infermiere 1', chart(), async (state) => {
      const { page } = state;
      const pendingPs = await prisma.$transaction((tx) =>
        createTherapyInTx(tx, patient.id, {
          farmacoNome: 'QA PS pending457',
          dataInizio: today,
          tipo: 'periodica',
          stato: 'attiva',
          dosaggio: '1 compressa',
          viaSomministrazione: 'orale',
          schedules: ['08:00', '20:00'].map(schedule),
        }),
      );
      const priorPs = await prisma.$transaction((tx) =>
        createTherapyInTx(tx, patient.id, {
          farmacoNome: 'QA PS prior457',
          dataInizio: today,
          tipo: 'periodica',
          stato: 'attiva',
          dosaggio: '1 compressa',
          viaSomministrazione: 'orale',
          schedules: [schedule('08:00')],
        }),
      );
      const priorBody = {
        patientId: patient.id,
        therapyId: priorPs.id,
        date: today,
        fascia: 'mattina',
        scheduledTime: '08:00',
        requestId: randomUUID(),
        expectedStato: 'da_erogare',
      };
      const priorRecord = await request(state, '/therapy-slots/confirm', priorBody);
      // Seed a given receipt through the normal authorized HTTP write if an earlier scenario
      // failed before writing; a prescription or database fixture is never treated as given.
      if (
        (await prisma.medicationAdministration.count({
          where: { patientId: patient.id, therapyId: therapy.id, stato: 'erogata' },
        })) === 0
      ) {
        const slots = await request(state, `/therapy-slots?date=${today}`);
        let key;
        for (const slot of slots)
          for (const p of slot.patients)
            for (const a of p.administrations)
              if (p.patientId === patient.id && a.therapyId === therapy.id) {
                key = {
                  patientId: patient.id,
                  therapyId: therapy.id,
                  date: today,
                  fascia: slot.fascia,
                  scheduledTime: a.scheduledTime,
                };
                break;
              }
        assert.ok(key);
        await request(state, '/therapy-slots/confirm', key);
      }
      const priorPrnBody = {
        patientId: patient.id,
        therapyId: prnTherapy.id,
        indicazione: 'QA indicazione verificata',
        requestId: randomUUID(),
      };
      const priorPrn = await request(state, '/therapy-slots/prn', priorPrnBody);
      const beforeExits =
        (await prisma.cartella.findUnique({ where: { patientId: patient.id } })).data.liberatoria
          ?.usciteLog ?? [];
      await page.getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true }).click();
      await page
        .getByRole('radio', { name: 'Metti in pausa le somministrazioni fino al rientro' })
        .check();
      await page
        .getByRole('checkbox', {
          name: 'Confermo l’uscita PS e la decisione selezionata sul giro somministrazioni.',
        })
        .check();
      await page
        .locator('.invio-ps-overlay')
        .getByRole('button', { name: 'Chiudi', exact: true })
        .click();
      await navigate(state, chart(nextPatient.id));
      await page.getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true }).click();
      assert.equal(
        await page.getByRole('radio', { checked: true }).count(),
        0,
        'Different patient cannot inherit a pending PS choice',
      );
      assert.equal(await page.locator('[data-ps-exit-submit]').isDisabled(), true);
      await page
        .locator('.invio-ps-overlay')
        .getByRole('button', { name: 'Chiudi', exact: true })
        .click();
      await navigate(state, chart());
      assert.deepEqual(
        (await prisma.cartella.findUnique({ where: { patientId: patient.id } })).data.liberatoria
          ?.usciteLog ?? [],
        beforeExits,
        'Unsubmitted choices and switching patient never register an exit',
      );
      await page.getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true }).click();
      const print = page.locator('[data-invio-ps-print]');
      await eventually(
        async () => assert.equal(await print.isEnabled(), true),
        'Print waits for complete authorized clinical context',
      );
      const reason = page.locator('[data-invio-ps-reason]');
      assert.match(await reason.inputValue(), /QA motivo urgente/);
      await reason.fill('QA motivo verificato e modificato dall’operatore');
      await text(page.locator('[data-invio-ps-vitals]'), /36[.,]8/);
      await text(page.locator('[data-invio-ps-vitals]'), /125\/80/);
      await text(page.locator('[data-invio-ps-given]'), /QA Prescription447/);
      await text(page.locator('[data-invio-ps-given]'), /QA PRN457/);
      assert.doesNotMatch(await page.locator('[data-invio-ps-given]').innerText(), /QA Refused457/);
      await text(page.locator('[data-invio-ps-contact]'), /QA Contact.*0000000000/);
      await text(page.locator('[data-invio-ps-risks]'), /caduta.*alto/);
      assert.equal(await page.locator('[data-ps-exit-submit]').isDisabled(), true);
      assert.equal(
        await page.getByRole('radio', { checked: true }).count(),
        0,
        'No therapy pause or continuation is selected automatically',
      );
      const records = await prisma.medicationAdministration.findMany({
        where: { patientId: patient.id, stato: 'erogata' },
      });
      assert.ok(records[0].confirmedAt);
      const time = facilityLocalMinute(records[0].confirmedAt).slice(11, 16);
      await text(page.locator('[data-invio-ps-given]'), new RegExp(time));
      await page.evaluate(() => {
        window.__qaPrintCalls = 0;
        window.print = () => {
          window.__qaPrintCalls++;
        };
      });
      await print.click();
      assert.equal(await page.evaluate(() => window.__qaPrintCalls), 1);
      await text(page.locator('[data-invio-ps-reason-print]'), /QA motivo verificato e modificato/);
      await page.emulateMedia({ media: 'print' });
      assert.equal(
        await reason.isVisible(),
        false,
        'Editable control is hidden in the actual print stylesheet',
      );
      assert.equal(await page.locator('[data-invio-ps-reason-print]').isVisible(), true);
      await page.pdf({
        path: path.join(out, 'issue-457-print.pdf'),
        format: 'A4',
        printBackground: true,
      });
      const pdf = readFileSync(path.join(out, 'issue-457-print.pdf'));
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
      assert.ok(pdf.length > 10000);
      await page.emulateMedia({ media: 'screen' });
      const afterExits =
        (await prisma.cartella.findUnique({ where: { patientId: patient.id } })).data.liberatoria
          ?.usciteLog ?? [];
      assert.deepEqual(afterExits, beforeExits, 'Print has no exit or clinical write side effect');
      const cartellaPath = `/patients/${patient.id}/cartella`;
      const commands = [];
      const captureExit = (r) => {
        if (
          r.method() === 'PUT' &&
          new URL(r.url()).pathname === cartellaPath &&
          r.postDataJSON()?.temporaryPsExit
        )
          commands.push(r.postDataJSON().temporaryPsExit);
      };
      page.on('request', captureExit);
      const reasonText = await reason.inputValue();
      await page
        .getByRole('radio', { name: 'Metti in pausa le somministrazioni fino al rientro' })
        .check();
      await page
        .getByRole('checkbox', {
          name: 'Confermo l’uscita PS e la decisione selezionata sul giro somministrazioni.',
        })
        .check();
      state.fault = { path: cartellaPath, status: 503, method: 'PUT' };
      let lostExitResponses = 0;
      const uncertainExit = async (route) => {
        if (route.request().method() !== 'PUT' || !route.request().postDataJSON()?.temporaryPsExit)
          return route.continue();
        const actual = await route.fetch();
        assert.ok(
          actual.ok(),
          'The first uncertain exit really commits before its response is lost',
        );
        lostExitResponses++;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'QA lost committed exit receipt' }),
        });
      };
      await page.route(`${api}${cartellaPath}`, uncertainExit);
      await page.locator('[data-ps-exit-submit]').click();
      await page
        .getByRole('button', { name: 'Riprova la stessa registrazione', exact: true })
        .waitFor();
      await page.unroute(`${api}${cartellaPath}`, uncertainExit);
      const committed = await prisma.cartella.findUnique({ where: { patientId: patient.id } });
      assert.equal(committed.data.liberatoria.usciteLog.length, beforeExits.length + 1);
      assert.equal(committed.data.liberatoria.temporaryPsExit.decision, 'pause');
      assert.equal(
        committed.data.liberatoria.compilatoAt,
        undefined,
        'Temporary exit is not signed legal consent',
      );
      await page
        .getByRole('button', { name: 'Riprova la stessa registrazione', exact: true })
        .click();
      await text(page.locator('[data-ps-exit-status]'), /Somministrazioni in pausa/);
      await text(page.locator('[data-ps-exit-receipt]'), /Uscita PS registrata/);
      assert.equal(lostExitResponses, 1);
      assert.equal(commands.length, 2);
      assert.deepEqual(
        commands[1],
        commands[0],
        'Uncertain retry keeps the exact decision and requestId',
      );
      assert.equal(commands[0].reason, reasonText);
      state.fault = null;
      const exitId = committed.data.liberatoria.temporaryPsExit.exitId;
      const pauseDoseBody = {
        patientId: patient.id,
        therapyId: pendingPs.id,
        date: today,
        fascia: 'mattina',
        scheduledTime: '08:00',
        requestId: randomUUID(),
        expectedStato: 'da_erogare',
      };
      async function http(method, pathname, body, status, auth = state.auth) {
        const response = await state.context.request.fetch(`${api}${pathname}`, {
          method,
          headers: { Authorization: auth },
          ...(body ? { data: body } : {}),
        });
        assert.equal(response.status(), status, `${method} ${pathname} expected HTTP${status}`);
        return response.json();
      }
      const scheduledBlocked = await http('POST', '/therapy-slots/confirm', pauseDoseBody, 409);
      const prnBlocked = await http(
        'POST',
        '/therapy-slots/prn',
        { ...priorPrnBody, requestId: randomUUID() },
        409,
      );
      assert.match(scheduledBlocked.error, /pausa/);
      assert.match(prnBlocked.error, /pausa/);
      const replayedDose = await request(state, '/therapy-slots/confirm', priorBody);
      const replayedPrn = await request(state, '/therapy-slots/prn', priorPrnBody);
      assert.equal(replayedDose.id, priorRecord.id);
      assert.equal(replayedPrn.id, priorPrn.id);
      assert.equal(
        await prisma.medicationAdministration.count({ where: { therapyId: priorPs.id } }),
        1,
      );
      assert.equal(
        await prisma.medicationAdministration.count({ where: { therapyId: pendingPs.id } }),
        0,
      );
      await http('PUT', cartellaPath, { data: { liberatoria: { temporaryPsExit: null } } }, 409);
      const pausedDue = await findTherapiesDue(
        today,
        { patientIds: [patient.id] },
        new Date(),
        1440,
      );
      assert.equal(
        pausedDue.overdueCount + pausedDue.dueSoonCount,
        0,
        'Paused doses do not create operational attention',
      );
      const ossSession = await state.context.request.post(`${api}/auth/simulator/session`, {
        data: { identityId: 'SIM-OSS-1' },
      });
      assert.ok(ossSession.ok());
      const ossToken = (await ossSession.json()).token;
      assert.ok(ossToken);
      await http(
        'PUT',
        cartellaPath,
        { temporaryPsExit: { action: 'return', exitId, requestId: randomUUID(), confirmed: true } },
        403,
        `Bearer ${ossToken}`,
      );
      assert.equal(
        (await prisma.cartella.findUnique({ where: { patientId: patient.id } })).data.liberatoria
          .temporaryPsExit.exitId,
        exitId,
      );
      await page
        .getByRole('dialog', { name: 'Invio in Pronto Soccorso' })
        .getByRole('button', { name: 'Chiudi', exact: true })
        .click();
      await reloadAuthenticated(state, chart());
      await text(
        page.locator('#patient-tab-panel'),
        /Somministrazioni in pausa durante l’uscita PS/,
      );
      const pendingRow = page.locator('.giro-drug').filter({ hasText: 'QA PS pending457' }).first();
      assert.equal(await pendingRow.getByRole('button', { name: /^Erogata:/ }).isDisabled(), true);
      assert.equal(
        await page
          .getByRole('button', { name: 'Somministra al bisogno', exact: true })
          .isDisabled(),
        true,
      );
      await page.screenshot({ path: path.join(out, 'issue-457-paused.png') });
      // Agenda is now read-only verification. Exercise operational pause on the actual Giro.
      await navigate(state, 'agenda-operatore');
      await count(page.locator('.therapy-modal'), 0);
      await count(page.locator('.agt-day-wrap .tdose'), 0);
      await navigate(state, 'terapie');
      const psDateTools = page.locator('.giro-secondary-controls');
      if (!(await psDateTools.evaluate((node) => node.open))) await psDateTools.locator('summary').click();
      await page.getByRole('button', { name: 'Giro', exact: true }).click();
      await page.getByLabel('Data terapia', { exact: true }).fill(today);
      await page.getByRole('group', { name: 'Ora della terapia' }).getByRole('button', { name: /^Ore 20:00:/ }).click();
      const psGiroGroup = page.locator('.giro-patient').filter({ hasText: 'QA PS pending457' });
      await text(psGiroGroup, /Somministrazioni in pausa durante l’uscita PS/);
      const psGiroDose = psGiroGroup.locator('.giro-drug').filter({ hasText: 'QA PS pending457' });
      assert.equal(await psGiroDose.getByRole('button', { name: /^Erogata:/ }).isDisabled(), true);
      assert.equal(await psGiroDose.getByRole('button', { name: /^Non erogata:/ }).isEnabled(), true);
      const otherGiroDose = page.locator('.giro-drug').filter({ hasText: 'QA Agenda pending452' }).getByRole('button', { name: /^Erogata:/ });
      await count(otherGiroDose, 1);
      assert.equal(await otherGiroDose.isEnabled(), true, 'A paused patient never disables another patient administration');
      await navigate(state, chart());
      // An actual explicit absence record remains allowed; it is never fabricated by the exit.
      const absent = await request(state, '/therapy-slots/not-administered', {
        ...pauseDoseBody,
        requestId: randomUUID(),
        motivo: 'paziente_assente',
      });
      assert.equal(absent.stato, 'non_erogata');
      // Persisted overnight fixture exercises a real return into a later facility day.
      const overnight = await prisma.cartella.findUnique({ where: { patientId: patient.id } });
      const yesterday = new Date(`${today}T12:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const departedYesterday = yesterday.toISOString();
      const updatedLog = overnight.data.liberatoria.usciteLog.map((entry) =>
        entry.id === exitId
          ? {
              ...entry,
              data: facilityLocalDate(yesterday),
              psExit: { ...entry.psExit, departedAt: departedYesterday },
            }
          : entry,
      );
      await prisma.cartella.update({
        where: { patientId: patient.id },
        data: {
          data: {
            ...overnight.data,
            liberatoria: {
              ...overnight.data.liberatoria,
              usciteLog: updatedLog,
              temporaryPsExit: {
                ...overnight.data.liberatoria.temporaryPsExit,
                departedAt: departedYesterday,
              },
            },
          },
        },
      });
      await reloadAuthenticated(state, chart());
      await page.getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true }).click();
      await text(page.locator('[data-ps-exit-status]'), /Somministrazioni in pausa/);
      await page.getByRole('checkbox', { name: /Confermo il rientro: il giro riprende/ }).check();
      await page.getByRole('button', { name: 'Registra rientro', exact: true }).click();
      await text(page.locator('[data-ps-exit-receipt]'), /Rientro registrato/);
      const returned = await prisma.cartella.findUnique({ where: { patientId: patient.id } });
      assert.equal(returned.data.liberatoria.temporaryPsExit, null);
      assert.equal(returned.data.liberatoria.usciteLog.length, beforeExits.length + 1);
      const exitEntry = returned.data.liberatoria.usciteLog.find((entry) => entry.id === exitId);
      assert.equal(facilityLocalDate(new Date(exitEntry.psExit.returnedAt)), today);
      assert.equal(
        facilityLocalDate(new Date(exitEntry.psExit.departedAt)),
        facilityLocalDate(yesterday),
      );
      assert.equal(exitEntry.psExit.returnActorId, 'SIM-NURSE-1');
      await page
        .getByRole('dialog', { name: 'Invio in Pronto Soccorso' })
        .getByRole('button', { name: 'Chiudi', exact: true })
        .click();
      await reloadAuthenticated(state, chart());
      await count(
        page.getByText('Somministrazioni in pausa durante l’uscita PS.', { exact: true }),
        0,
      );
      const remainingRow = page
        .locator('.giro-drug')
        .filter({ hasText: 'QA PS pending457' })
        .last();
      assert.equal(await remainingRow.getByRole('button', { name: /^Erogata:/ }).isEnabled(), true);
      await remainingRow.getByRole('button', { name: /^Erogata:/ }).click();
      await eventually(
        async () =>
          assert.equal(await remainingRow.getByRole('button', { name: /^Erogata:/ }).count(), 0),
        'Remaining dose records after return',
      );
      assert.equal(
        await prisma.medicationAdministration.count({
          where: { therapyId: pendingPs.id, stato: 'erogata' },
        }),
        1,
      );
      assert.equal(
        await prisma.medicationAdministration.count({
          where: { therapyId: priorPs.id, stato: 'erogata' },
        }),
        1,
        'Return does not reopen an already given dose',
      );
      await page.getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true }).click();
      await page.getByRole('radio', { name: 'Mantieni attivo il giro somministrazioni' }).check();
      await page
        .getByRole('checkbox', {
          name: 'Confermo l’uscita PS e la decisione selezionata sul giro somministrazioni.',
        })
        .check();
      await page.getByRole('button', { name: 'Registra uscita PS', exact: true }).click();
      await text(page.locator('[data-ps-exit-status]'), /Giro somministrazioni mantenuto attivo/);
      await request(state, '/therapy-slots/prn', { ...priorPrnBody, requestId: randomUUID() });
      await page
        .getByRole('checkbox', { name: 'Confermo il rientro del paziente.', exact: true })
        .check();
      await page.getByRole('button', { name: 'Registra rientro', exact: true }).click();
      await text(page.locator('[data-ps-exit-receipt]'), /Rientro registrato/);
      page.off('request', captureExit);
      assert.equal(
        (await prisma.cartella.findUnique({ where: { patientId: patient.id } })).data.liberatoria
          .usciteLog.length,
        beforeExits.length + 2,
      );
      assert.equal(
        (await prisma.patientTherapy.findUnique({ where: { id: pendingPs.id } })).stato,
        'attiva',
      );
      residualGates.splice(
        residualGates.findIndex((gate) => gate.issue === 457),
        1,
      );
      receipts.push({
        issue: 457,
        reasonEditable: true,
        actualDoseTimes: records.map((row) => facilityLocalMinute(row.confirmedAt)),
        pdfBytes: pdf.length,
        printExitWrites: 0,
        explicitPauseAndContinue: true,
        uncertainExitRetryExactlyOnce: true,
        scheduledAndPrnServerPause: true,
        priorReceiptsPreserved: true,
        explicitAbsenceRecordPreserved: true,
        unauthorizedAndTamperDenied: true,
        reloadShowsAuthoritativePause: true,
        nextDayReturnNoReopenedGivenDose: true,
        therapyPauseDecision: 'approved-and-exercised',
      });
    });
  }
} finally {
  for (const state of sessions)
    if (!state.closed) {
      try {
        await finish(state, 'interrupted');
      } catch {
        await state.context.close().catch(() => {});
      }
    }
  await browser.close();
  await prisma.$disconnect();
  sourceFingerprintAfter = sourceFingerprint();
  writeFileSync(
    path.join(out, baseline ? 'baseline-observed.json' : 'results.json'),
    JSON.stringify(
      {
        baseline,
        coverage: { canonicalIssues: [447,451,452,453,454,456,457], allEightVerified: false, dedicatedRoute486QaRequired: true },
        syntheticOnly: true,
        sourceFingerprintBefore,
        sourceFingerprintAfter,
        sourceStable: sourceFingerprintBefore === sourceFingerprintAfter,
        results,
        receipts,
        residualGates,
        fontProvenance,
      },
      null,
      2,
    ) + '\n',
  );
}
assert.ok(results.length > 0);
assert.equal(
  sourceFingerprintAfter,
  sourceFingerprintBefore,
  'Source changed during browser verification; evidence must be regenerated on the final stable source',
);
assert.equal(
  results.filter((row) => row.status === 'FAILED').length,
  0,
  'All seven migrated clinical scenarios must pass; issue486 dedicated caller/replay/discharge QA and external reviews remain required.',
);
