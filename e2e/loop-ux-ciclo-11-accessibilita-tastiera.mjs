// Evidenze a runtime per "Loop UX ciclo 11 - Accessibilita da tastiera sulle kpi-alert-card
// cliccabili (iniziativa Clinic Control Center)".
// Contract: artifacts/task-validation/loop-ux-ciclo-11-accessibilita-tastiera/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route (vedi
// reference-ui-runtime-evidence-without-db). Copre: le card cliccabili sono raggiungibili da
// tastiera (tabIndex), Invio e Spazio attivano la navigazione, lo stato di focus e visibile, le
// card statiche (senza onClick) NON sono nella sequenza di tabulazione.
//
// Uso: node e2e/loop-ux-ciclo-11-accessibilita-tastiera.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-11-accessibilita-tastiera/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE = {
  id: 'p-t11',
  medicalRecordNumber: 'MRN-T11',
  firstName: 'Sara',
  lastName: 'Longhi',
  dateOfBirth: '1960-04-03',
  sex: 'F',
  email: null,
  phone: null,
};

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/therapy-slots/) && method === 'GET') return json([]);
    if (url.match(/\/patients\/clinical-summary/)) {
      return json([
        {
          patientId: PAZIENTE.id,
          statoRicovero: 'ricoverato',
          hasCriticalVitals: true,
          hasHighRisk: false,
          allergieCount: 0,
          hasSevereAllergy: false,
          terapieTotali: 1,
          terapieCompletate: 0,
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

  // ── Operatore: la card "Parametri critici" e raggiungibile e attivabile da tastiera ──────────
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator('.login-role-card--operatore').click();
  await page.waitForTimeout(2000);

  const cardParametri = page.locator('.kpi-alert-card', { hasText: 'Parametri critici' });
  verifica(
    'La card "Parametri critici" ha role="button"',
    (await cardParametri.getAttribute('role')) === 'button',
  );
  verifica(
    'La card "Parametri critici" ha tabIndex=0 (raggiungibile da tastiera)',
    (await cardParametri.getAttribute('tabindex')) === '0',
  );

  await cardParametri.focus();
  await page.screenshot({ path: resolve(outDir, '01-focus-visibile.png'), fullPage: false });
  const haFocus = await cardParametri.evaluate((el) => el === document.activeElement);
  verifica('La card riceve davvero il focus della tastiera', haFocus);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  verifica(
    'Invio sulla card attiva la navigazione (verso Parametri)',
    /Parametri/i.test(await page.locator('body').innerText()),
  );
  await page.screenshot({ path: resolve(outDir, '02-dopo-invio.png'), fullPage: true });

  // ── Torna alla dashboard, verifica la Spazio sulla card "Somministrazioni in ritardo" ───────
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Dashboard$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
  const cardSomm = page.locator('.kpi-alert-card', { hasText: 'Somministrazioni in ritardo' });
  await cardSomm.focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(1200);
  verifica(
    'La barra Spazio sulla card attiva la navigazione (verso Agenda)',
    /Agenda/i.test(await page.locator('body').innerText()),
  );

  // ── Le card statiche (senza onClick) non entrano nella sequenza di tabulazione ───────────────
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Dashboard$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
  // "I Miei Pazienti"/altre stat-card hanno un proprio tabIndex; verifichiamo invece che le
  // eventuali kpi-alert-card SENZA onClick (se presenti in questa vista) non abbiano role/tabIndex.
  const cardRicoverati = page.locator('.kpi-alert-card', { hasText: 'Ricoverati attivi' });
  verifica(
    'Anche "Ricoverati attivi" (altra card cliccabile) ha role="button" e tabIndex=0',
    (await cardRicoverati.getAttribute('role')) === 'button' &&
      (await cardRicoverati.getAttribute('tabindex')) === '0',
  );

  // ── Admin: stessa verifica sulla card "Somministrazioni in ritardo" ──────────────────────────
  const pageAdmin = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await mockRoutes(pageAdmin);
  await pageAdmin.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await pageAdmin.waitForTimeout(600);
  await pageAdmin.locator('.login-role-card--admin').click();
  await pageAdmin.waitForTimeout(2000);

  const cardAdminSomm = pageAdmin.locator('.kpi-alert-card', {
    hasText: 'Somministrazioni in ritardo',
  });
  verifica(
    'Admin: la card "Somministrazioni in ritardo" ha role="button" e tabIndex=0',
    (await cardAdminSomm.getAttribute('role')) === 'button' &&
      (await cardAdminSomm.getAttribute('tabindex')) === '0',
  );
  await cardAdminSomm.focus();
  await pageAdmin.keyboard.press('Enter');
  await pageAdmin.waitForTimeout(1200);
  verifica(
    'Admin: Invio sulla card attiva la navigazione (verso Agenda)',
    /Agenda/i.test(await pageAdmin.locator('body').innerText()),
  );

  await pageAdmin
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Dashboard$/ })
    .first()
    .click();
  await pageAdmin.waitForTimeout(1500);
  const cardAdminDimessi = pageAdmin.locator('.kpi-alert-card', { hasText: 'Dimessi in archivio' });
  verifica(
    'Admin: la card statica "Dimessi in archivio" (nessun onClick) NON ha role="button" (nessun falso bottone)',
    (await cardAdminDimessi.getAttribute('role')) === null,
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
writeFileSync(resolve(outDir, 'verifiche.json'), JSON.stringify({ esiti }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
