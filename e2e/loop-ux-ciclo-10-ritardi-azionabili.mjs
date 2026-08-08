// Evidenze a runtime per "Loop UX ciclo 10 - Somministrazioni in ritardo, elenco azionabile
// per paziente (iniziativa Clinic Control Center, continuazione ciclo 9)".
// Contract: artifacts/task-validation/loop-ux-ciclo-10-ritardi-azionabili/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route (vedi
// reference-ui-runtime-evidence-without-db). Copre: ordinamento per ritardo-massimo-per-paziente
// (non per numero di dosi), raggruppamento corretto per paziente, click-through al paziente
// specifico, pluralizzazione corretta, tetto a 5 con "+N altre" cliccabile.
//
// Uso: node e2e/loop-ux-ciclo-10-ritardi-azionabili.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ?? 'artifacts/task-validation/loop-ux-ciclo-10-ritardi-azionabili/screenshots';
mkdirSync(outDir, { recursive: true });

function pad(n) {
  return String(n).padStart(2, '0');
}
const now = new Date();
function orarioOffsetMinuti(offset) {
  const t = new Date(now.getTime() + offset * 60000);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

function admin(therapyId, patientId, drugName, offsetMinuti, status = 'pending') {
  return {
    administrationId: null,
    therapyId,
    drugName,
    dosage: '500 MG',
    quantityLabel: '1 compressa',
    route: 'orale',
    scheduledTime: orarioOffsetMinuti(offsetMinuti),
    status,
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
    __patientId: patientId, // solo per costruire lo slot, rimosso sotto
  };
}

function paziente(id, first, last) {
  return {
    id,
    medicalRecordNumber: `MRN-${id}`,
    firstName: first,
    lastName: last,
    dateOfBirth: '1950-01-01',
    sex: 'M',
    email: null,
    phone: null,
  };
}

// ── Scenario 1: ordinamento per ritardo-massimo, non per numero di dosi ──────────────────────
// A: 1 dose a -70min (il piu' grave). B: 3 dosi a -5/-6/-7min (piu' dosi, ma tutte lievi).
// C: 1 dose a -40min (secondo per gravita'). Attesa: ordine A, C, B.
const PAZ_A = paziente('pa', 'Aldo', 'Neri');
const PAZ_B = paziente('pb', 'Bruna', 'Villa');
const PAZ_C = paziente('pc', 'Carla', 'Rossi');

function slotsScenario1() {
  const admins = [
    admin('t-a1', 'pa', 'TACHIPIRINA', -70),
    admin('t-b1', 'pb', 'AUGMENTIN', -5),
    admin('t-b2', 'pb', 'LASIX', -6),
    admin('t-b3', 'pb', 'INSULINA', -7),
    admin('t-c1', 'pc', 'CARDIOASPIRINA', -40),
  ];
  return costruisciSlot([PAZ_A, PAZ_B, PAZ_C], admins);
}

// ── Scenario 2: 7 pazienti in ritardo -> tetto a 5 + "+2 altre" ──────────────────────────────
function slotsScenario2() {
  const pazienti7 = Array.from({ length: 7 }, (_, i) =>
    paziente(`p${i}`, `Nome${i}`, `Cognome${i}`),
  );
  const admins = pazienti7.map((p, i) => admin(`t-${i}`, p.id, 'TACHIPIRINA', -(10 + i * 5)));
  return costruisciSlot(pazienti7, admins);
}

function costruisciSlot(pazientiList, admins) {
  const byPatient = new Map(
    pazientiList.map((p) => [
      p.id,
      {
        patientId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        room: '1',
        bed: 'A',
        administrations: [],
      },
    ]),
  );
  for (const a of admins) {
    const { __patientId, ...pulito } = a;
    byPatient.get(__patientId).administrations.push(pulito);
  }
  return [
    {
      id: 'ts-oggi',
      fascia: 'mattina',
      label: 'Mattina',
      ora: '08:00',
      summary: {
        total: admins.length,
        administered: 0,
        notAdministered: 0,
        pending: admins.length,
      },
      patients: [...byPatient.values()],
    },
  ];
}

let scenarioAttivo = 1;
let pazientiScenario = [PAZ_A, PAZ_B, PAZ_C];

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/therapy-slots/) && method === 'GET') {
      return json(scenarioAttivo === 1 ? slotsScenario1() : slotsScenario2());
    }
    if (url.match(/\/patients\/clinical-summary/)) {
      return json(
        pazientiScenario.map((p) => ({
          patientId: p.id,
          statoRicovero: 'ricoverato',
          hasCriticalVitals: false,
          hasHighRisk: false,
          allergieCount: 0,
          hasSevereAllergy: false,
          terapieTotali: 1,
          terapieCompletate: 0,
        })),
      );
    }
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json(pazientiScenario);
    if (url.match(/\/admin\/rooms/)) return json([]);
    if (url.match(/\/consegne/)) return json([]);
    if (url.match(/\/appointments/)) return json([]);
    if (url.match(/\/operators\/schedules/)) return json([]);
    if (url.match(/\/operators(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/notes/)) return json([]);
    if (/railway|clinicos-backend|localhost:3001/.test(url)) return json([]);
    return route.continue();
  });
}

const esiti = [];
function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: Boolean(condizione), dettaglio });
  console.log(`  ${condizione ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const erroriConsole = [];
  page.on('pageerror', (e) => erroriConsole.push(e.message.slice(0, 140)));
  await mockRoutes(page);

  // ── Scenario 1: ordinamento + click-through + pluralizzazione ───────────────────────────────
  scenarioAttivo = 1;
  pazientiScenario = [PAZ_A, PAZ_B, PAZ_C];
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator('.login-role-card--operatore').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: resolve(outDir, '01-banner-ordinamento.png'), fullPage: true });

  const banner = page.locator('.coverage-alert', { hasText: 'somministrazioni in ritardo' });
  verifica('Il banner rosso "somministrazioni in ritardo" e visibile', await banner.isVisible());
  const titoloBanner = await banner.locator('strong').innerText();
  verifica(
    'Pluralizzazione corretta: "3 pazienti" non "3 pazientei"',
    titoloBanner.includes('3 pazienti') && !titoloBanner.includes('pazientei'),
    titoloBanner,
  );

  const righe = banner.locator('.anomalie-reparto__riga');
  const nomiInOrdine = await righe.locator('.anomalie-reparto__nome').allInnerTexts();
  verifica(
    'Ordine: Aldo Neri (1 dose, 70 min) prima di Carla Rossi (1 dose, 40 min) prima di Bruna Villa (3 dosi, max 7 min) — per gravita, non per numero di dosi',
    nomiInOrdine[0] === 'Neri Aldo' &&
      nomiInOrdine[1] === 'Rossi Carla' &&
      nomiInOrdine[2] === 'Villa Bruna',
    nomiInOrdine.join(' | '),
  );
  const badgePrimaRiga = await righe.nth(0).locator('.badge--red').innerText();
  verifica(
    'Il badge della prima riga mostra "+70 min"',
    badgePrimaRiga.includes('70'),
    badgePrimaRiga,
  );
  const dettaglioTerzaRiga = await righe.nth(2).locator('.anomalie-reparto__farmaci').innerText();
  verifica(
    'La riga di Bruna Villa elenca tutte e tre le dosi in ritardo (raggruppamento corretto per paziente)',
    /AUGMENTIN/.test(dettaglioTerzaRiga) &&
      /LASIX/.test(dettaglioTerzaRiga) &&
      /INSULINA/.test(dettaglioTerzaRiga),
    dettaglioTerzaRiga,
  );

  // Click-through: la riga di Carla Rossi deve aprire la SUA cartella, non un'altra.
  await righe.nth(1).click();
  await page.waitForTimeout(1500);
  const nomeInIntestazione = await page
    .locator('.patient-compact-header__name')
    .innerText()
    .catch(() => '');
  verifica(
    'Il click sulla riga apre la cartella del paziente corretto (Rossi, non Neri ne Villa)',
    /Rossi/i.test(nomeInIntestazione) && !/Neri|Villa/i.test(nomeInIntestazione),
    nomeInIntestazione,
  );
  await page.screenshot({ path: resolve(outDir, '02-click-through-paziente.png'), fullPage: true });

  // ── Scenario 2: tetto a 5 + "+2 altre" cliccabile ────────────────────────────────────────────
  scenarioAttivo = 2;
  pazientiScenario = Array.from({ length: 7 }, (_, i) =>
    paziente(`p${i}`, `Nome${i}`, `Cognome${i}`),
  );
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  const loginCard = page.locator('.login-role-card--operatore');
  if ((await loginCard.count()) > 0) {
    await loginCard.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: resolve(outDir, '03-tetto-a-5.png'), fullPage: true });

  const banner2 = page.locator('.coverage-alert', { hasText: 'somministrazioni in ritardo' });
  const righe2 = banner2.locator('.anomalie-reparto__riga');
  verifica(
    'Il tetto mostra esattamente 5 righe su 7 pazienti in ritardo',
    (await righe2.count()) === 5,
    `${await righe2.count()} righe`,
  );
  const bottonePiuAltre = banner2.locator('.link-btn', { hasText: '+2 altre' });
  verifica('Il bottone "+2 altre" compare (7 - 5 = 2 nascosti)', await bottonePiuAltre.isVisible());

  await bottonePiuAltre.click();
  await page.waitForTimeout(1200);
  verifica(
    'Il click su "+2 altre" naviga all Agenda (nessun vicolo cieco)',
    /Agenda/i.test(await page.locator('body').innerText()),
  );

  verifica(
    'nessun errore JavaScript durante lo scenario',
    erroriConsole.length === 0,
    erroriConsole.slice(0, 3).join(' || ') || 'console pulita',
  );

  await page.close();
} catch (err) {
  console.error('Errore E2E:', err.message);
  esiti.push({
    nome: 'esecuzione dello scenario',
    ok: false,
    dettaglio: err.message.slice(0, 300),
  });
} finally {
  await browser.close();
}

const falliti = esiti.filter((e) => !e.ok);
console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate`);
writeFileSync(resolve(outDir, 'verifiche.json'), JSON.stringify({ esiti }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
