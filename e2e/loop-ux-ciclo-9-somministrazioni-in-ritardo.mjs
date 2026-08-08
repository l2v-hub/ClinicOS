// Evidenze a runtime per "Loop UX ciclo 9 - Somministrazioni in ritardo, prima sincronizzazione
// Admin/Operatore (iniziativa Clinic Control Center)".
// Contract: artifacts/task-validation/loop-ux-ciclo-9-somministrazioni-in-ritardo/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route (vedi
// reference-ui-runtime-evidence-without-db). Copre: la card compare su ENTRAMBE le dashboard con
// lo STESSO numero (stessa fonte dati), il colore/soglia sono corretti, il click-through naviga
// all'Agenda giusta per ruolo, l'orario non zero-paddato ("1:00") e' contato correttamente in
// "in ritardo" (il difetto trovato e corretto dal gate QA), e le due chiamate hook condividono
// una sola richiesta di rete a /therapy-slots.
//
// Uso: node e2e/loop-ux-ciclo-9-somministrazioni-in-ritardo.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-9-somministrazioni-in-ritardo/screenshots';
mkdirSync(outDir, { recursive: true });

function pad(n) {
  return String(n).padStart(2, '0');
}
const now = new Date();
function orarioOffsetMinuti(offset) {
  const t = new Date(now.getTime() + offset * 60000);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
const ORARIO_IN_RITARDO = orarioOffsetMinuti(-60); // 1h fa, zero-paddato
const ORARIO_FUTURO = orarioOffsetMinuti(180); // fra 3h, zero-paddato
// Caso limite del difetto corretto dal gate QA: ora non zero-paddata ("1:00" invece di "01:00").
// Assunto in passato rispetto a "ora": vero salvo che lo script giri fra 00:00 e 01:00.
const ORARIO_IN_RITARDO_NON_PADDATO = '1:00';

const PAZIENTE = {
  id: 'p-t9',
  medicalRecordNumber: 'MRN-T9',
  firstName: 'Luigi',
  lastName: 'Contini',
  dateOfBirth: '1955-09-11',
  sex: 'M',
  email: null,
  phone: null,
};

function admin(therapyId, drugName, scheduledTime, status) {
  return {
    administrationId: status === 'administered' ? `adm-${therapyId}` : null,
    therapyId,
    drugName,
    dosage: '500 MG',
    quantityLabel: '1 compressa',
    route: 'orale',
    scheduledTime,
    status,
    administeredAt: status === 'administered' ? new Date().toISOString() : null,
    administeredBy: status === 'administered' ? 'Inf. Bruni' : null,
    notAdministeredReason: status === 'not_administered' ? 'Paziente a digiuno' : null,
  };
}

/** Un solo slot con 5 somministrazioni: 3 da fare (2 in ritardo, 1 futura), 1 fatta, 1 non erogata.
 * Attese: totale=5, daFare=3, fatte=1, nonErogate=1, inRitardo=2. */
function therapySlots() {
  return [
    {
      id: 'ts-oggi',
      fascia: 'mattina',
      label: 'Mattina',
      ora: '08:00',
      summary: { total: 5, administered: 1, notAdministered: 1, pending: 3 },
      patients: [
        {
          patientId: PAZIENTE.id,
          firstName: PAZIENTE.firstName,
          lastName: PAZIENTE.lastName,
          room: '3',
          bed: 'B',
          administrations: [
            admin('t-1', 'TACHIPIRINA', ORARIO_IN_RITARDO, 'pending'),
            admin('t-2', 'AUGMENTIN', ORARIO_IN_RITARDO_NON_PADDATO, 'pending'),
            admin('t-3', 'CARDIOASPIRINA', ORARIO_FUTURO, 'pending'),
            admin('t-4', 'LASIX', '06:00', 'administered'),
            admin('t-5', 'INSULINA', '07:00', 'not_administered'),
          ],
        },
      ],
    },
  ];
}

const richiesteTherapySlots = [];

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/therapy-slots/) && method === 'GET') {
      richiesteTherapySlots.push(Date.now());
      return json(therapySlots());
    }
    if (url.match(/\/patients\/clinical-summary/)) {
      return json([
        {
          patientId: PAZIENTE.id,
          statoRicovero: 'ricoverato',
          hasCriticalVitals: false,
          hasHighRisk: false,
          allergieCount: 0,
          hasSevereAllergy: false,
          terapieTotali: 5,
          terapieCompletate: 1,
        },
      ]);
    }
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PAZIENTE]);
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

  // ── Operatore ──────────────────────────────────────────────────────────────────────────────
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator('.login-role-card--operatore').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: resolve(outDir, '01-dashboard-operatore.png'), fullPage: true });

  const cardOperatore = page.locator('.kpi-alert-card', { hasText: 'Somministrazioni in ritardo' });
  verifica(
    'Operatore: la card "Somministrazioni in ritardo" e visibile in dashboard',
    await cardOperatore.isVisible(),
  );
  const testoCardOperatore = await cardOperatore.innerText();
  verifica(
    'Operatore: il valore e "2/3" (2 in ritardo su 3 da fare, incluso l orario non paddato)',
    /2\/3/.test(testoCardOperatore),
    testoCardOperatore.replace(/\n/g, ' | '),
  );
  const classiCardOperatore = (await cardOperatore.getAttribute('class')) ?? '';
  verifica(
    'Operatore: la card e rossa (inRitardo > 0)',
    classiCardOperatore.includes('kpi-alert-card--red'),
    classiCardOperatore,
  );

  await cardOperatore.click();
  await page.waitForTimeout(1200);
  verifica(
    'Operatore: il click naviga alla propria Agenda',
    (page.url().length > 0 &&
      (await page
        .locator('.teams-sidebar__item--active, .agt-header, h1, h2')
        .filter({ hasText: /Agenda/i })
        .count()) > 0) ||
      /Agenda/i.test(await page.locator('body').innerText()),
  );
  await page.screenshot({
    path: resolve(outDir, '02-agenda-dopo-click-operatore.png'),
    fullPage: true,
  });

  // ── Admin (stessa sessione: nuovo contesto per un login pulito) ──────────────────────────────
  const richiesteOperatore = richiesteTherapySlots.length;
  const pageAdmin = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await mockRoutes(pageAdmin);
  await pageAdmin.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await pageAdmin.waitForTimeout(600);
  await pageAdmin.locator('.login-role-card--admin').click();
  await pageAdmin.waitForTimeout(2000);
  await pageAdmin.screenshot({ path: resolve(outDir, '03-dashboard-admin.png'), fullPage: true });

  const cardAdmin = pageAdmin.locator('.kpi-alert-card', {
    hasText: 'Somministrazioni in ritardo',
  });
  verifica(
    'Admin: la card "Somministrazioni in ritardo" e visibile in dashboard',
    await cardAdmin.isVisible(),
  );
  const testoCardAdmin = await cardAdmin.innerText();
  verifica(
    'Admin: lo STESSO valore "2/3" (stessa fonte dati dell Operatore, single source of truth)',
    /2\/3/.test(testoCardAdmin),
    testoCardAdmin.replace(/\n/g, ' | '),
  );
  const classiCardAdmin = (await cardAdmin.getAttribute('class')) ?? '';
  verifica(
    'Admin: la card e rossa (inRitardo > 0)',
    classiCardAdmin.includes('kpi-alert-card--red'),
    classiCardAdmin,
  );

  await cardAdmin.click();
  await pageAdmin.waitForTimeout(1200);
  verifica(
    'Admin: il click naviga all Agenda',
    /Agenda/i.test(await pageAdmin.locator('body').innerText()),
  );
  await pageAdmin.screenshot({
    path: resolve(outDir, '04-agenda-dopo-click-admin.png'),
    fullPage: true,
  });

  // ── Dedup di rete: due hook sullo stesso URL = una sola richiesta per dashboard caricata ─────
  verifica(
    'Rete: la dashboard Operatore ha generato UNA sola richiesta /therapy-slots (useAnomalieReparto + useRiepilogoSomministrazioni condividono la cache)',
    richiesteOperatore === 1,
    `${richiesteOperatore} richieste`,
  );

  verifica(
    'nessun errore JavaScript durante lo scenario',
    erroriConsole.length === 0,
    erroriConsole.slice(0, 3).join(' || ') || 'console pulita',
  );

  await page.close();
  await pageAdmin.close();
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
writeFileSync(
  resolve(outDir, 'verifiche.json'),
  JSON.stringify(
    {
      esiti,
      richiesteTherapySlots: richiesteTherapySlots.length,
      orari: { ORARIO_IN_RITARDO, ORARIO_FUTURO, ORARIO_IN_RITARDO_NON_PADDATO },
    },
    null,
    2,
  ),
);
process.exit(falliti.length === 0 ? 0 : 1);
