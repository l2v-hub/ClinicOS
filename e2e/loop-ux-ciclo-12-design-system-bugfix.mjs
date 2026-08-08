// Evidenze a runtime per "Loop UX ciclo 12 - Design system globale, primo giro di correzioni CSS
// oggettive (empty-state-card duplicata, btn-icon fantasma, colori badge hardcoded, CSS var morte)".
// Contract: artifacts/task-validation/loop-ux-ciclo-12-design-system-bugfix/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route.
// Copre: la empty-state-card ora usa la versione tratteggiata/flex (non piu' quella solida
// silenziosamente vincente), i badge blue/green/amber hanno i colori dei token reali (non piu'
// gli hex hardcoded precedenti), i bottoni icona in Esami&Consulenze sono visibilmente stilizzati.
//
// Uso: node e2e/loop-ux-ciclo-12-design-system-bugfix.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ?? 'artifacts/task-validation/loop-ux-ciclo-12-design-system-bugfix/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE = {
  id: 'p-t12',
  medicalRecordNumber: 'MRN-T12',
  firstName: 'Nadia',
  lastName: 'Ferri',
  dateOfBirth: '1962-06-18',
  sex: 'F',
  email: null,
  phone: null,
};

function cartellaCon(esami) {
  return {
    pazienteId: PAZIENTE.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '4',
    lettoNumero: 'A',
    anamnesi: {},
    diagnosi: [],
    terapie: [
      {
        id: 't-1',
        patientId: PAZIENTE.id,
        farmacoNome: 'TACHIPIRINA',
        dosaggio: '500 MG',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: '2026-08-01',
        dataFine: null,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        orarioSpecifico: null,
        prescrittore: 'Dr. Neri',
        operatoreInseritore: 'Inf. Verdi',
        note: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
      },
      {
        id: 't-2',
        patientId: PAZIENTE.id,
        farmacoNome: 'LASIX',
        dosaggio: '20 MG',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'sospesa',
        dataInizio: '2026-08-01',
        dataFine: null,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        orarioSpecifico: null,
        prescrittore: 'Dr. Neri',
        operatoreInseritore: 'Inf. Verdi',
        note: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
      },
    ],
    farmaci: [],
    allergie: [],
    noteClinica: [],
    visite: [],
    parametriVitali: [],
    interventi: [],
    pianoCura: {},
    indicatoriRischio: [],
    documentiConsegnati: [],
    diarioInfermieristico: [],
    diarioMedico: [],
    medicazioniFerite: [],
    contenzioni: [],
    valutazioniBraden: [],
    valutazioniTinetti: [],
    valutazioniNRS: [],
    esamiEmatici: esami,
    esamiStrumentali: [],
    consulenze: [],
    dimissione: null,
  };
}

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/cartella`)) && method === 'GET') {
      return json({
        patientId: PAZIENTE.id,
        data: cartellaCon([
          {
            id: 'e-1',
            tipo: 'Emocromo',
            data: '2026-08-05',
            ora: '09:00',
            operatore: 'Dr. Neri',
            esito: 'nella norma',
            allegati: null,
            note: null,
          },
        ]),
      });
    }
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PAZIENTE]);
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/therapies`)) && method === 'GET') {
      return json(cartellaCon([]).terapie);
    }
    if (url.match(/\/therapy-slots/)) return json([]);
    if (url.match(/\/patients\/settings/)) return json({ allowDelete: false });
    if (url.match(/\/patients\/.*\/narrative-sections/)) return json([]);
    if (/railway|clinicos-backend|localhost:3001/.test(url)) return json([]);
    return route.continue();
  });
}

const esiti = [];
function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: Boolean(condizione), dettaglio });
  console.log(`  ${condizione ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
}

function toRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const erroriConsole = [];
  page.on('pageerror', (e) => erroriConsole.push(e.message.slice(0, 140)));
  await mockRoutes(page);

  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator('.login-role-card--operatore').click();
  await page.waitForTimeout(1500);
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Pazienti$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page.getByText('Ferri').first().click();
  await page.waitForTimeout(1500);

  // ── Badge blue/green/amber: colori dai token reali, non piu' hex hardcoded ──────────────────
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Clinica$/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Terapia Farmacologica$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  // "Programmazione" elenca TUTTE le terapie (attive+sospese) con badge Stato (green/amber) e
  // Tipo (blue) nella stessa tabella.
  await page.locator('.tf-subtab', { hasText: 'Programmazione' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(outDir, '01-badge-colori.png'), fullPage: true });

  const badgeGreen = page.locator('.badge--green').first();
  const badgeAmber = page.locator('.badge--amber').first();
  const badgeBlue = page.locator('.badge--blue').first();
  const colGreen = await badgeGreen.evaluate((el) => getComputedStyle(el).backgroundColor);
  const colAmber = await badgeAmber.evaluate((el) => getComputedStyle(el).backgroundColor);
  const colBlue = await badgeBlue.evaluate((el) => getComputedStyle(el).backgroundColor);
  verifica(
    'badge--green usa il token --emerald (#16a37b), non il vecchio hex #0e8a63',
    colGreen === toRgb('#16a37b'),
    colGreen,
  );
  verifica(
    'badge--amber usa il token --amber (#c77700), non il vecchio hex #92400e',
    colAmber === toRgb('#c77700'),
    colAmber,
  );
  verifica(
    'badge--blue usa il token --blue (#2f6bed), non il vecchio hex #1d4fc4',
    colBlue === toRgb('#2f6bed'),
    colBlue,
  );

  // ── Esami & Consulenze: i bottoni icona Modifica/Elimina sono visibilmente stilizzati ───────
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Esami & Consulenze$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(outDir, '02-esami-bottoni-icona.png'), fullPage: true });
  const bottoneModifica = page.locator('.icon-btn.icon-btn--edit').first();
  verifica(
    'Il bottone Modifica in Esami&Consulenze usa la classe icon-btn corretta (non piu btn-icon fantasma)',
    (await bottoneModifica.count()) > 0,
  );
  if ((await bottoneModifica.count()) > 0) {
    const bg = await bottoneModifica.evaluate((el) => getComputedStyle(el).backgroundColor);
    const border = await bottoneModifica.evaluate((el) => getComputedStyle(el).borderStyle);
    verifica(
      'Il bottone Modifica ha uno stile reale applicato (non trasparente/senza bordo come una classe fantasma)',
      bg !== 'rgba(0, 0, 0, 0)' || border !== 'none',
      `bg=${bg} border=${border}`,
    );
  }

  // ── Empty state card: ora usa la versione tratteggiata/flex, non piu quella solida ──────────
  // Il trigger reale e' pazienti.length === 0 (nessun paziente registrato, non solo zero
  // risultati di ricerca) - serve una sessione con /patients che risponde []. Nuova pagina con un
  // mock dedicato.
  const pageVuota = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await pageVuota.route('**/*', async (route) => {
    const url = route.request().url();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.match(/\/patients(\?|$)/) && route.request().method() === 'GET') return json([]);
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
    if (url.match(/\/therapy-slots/)) return json([]);
    if (/railway|clinicos-backend|localhost:3001/.test(url)) return json([]);
    return route.continue();
  });
  await pageVuota.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await pageVuota.waitForTimeout(600);
  await pageVuota.locator('.login-role-card--operatore').click();
  await pageVuota.waitForTimeout(1500);
  await pageVuota
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Pazienti$/ })
    .first()
    .click();
  await pageVuota.waitForTimeout(1200);
  await pageVuota.screenshot({ path: resolve(outDir, '03-empty-state-card.png'), fullPage: true });
  const emptyCardPage = pageVuota;
  const emptyCard = emptyCardPage.locator('.empty-state-card').first();
  if ((await emptyCard.count()) > 0) {
    const display = await emptyCard.evaluate((el) => getComputedStyle(el).display);
    const borderStyle = await emptyCard.evaluate((el) => getComputedStyle(el).borderStyle);
    verifica(
      'La empty-state-card usa display:flex (versione app-additions.css, non piu quella solida di App.css)',
      display === 'flex',
      display,
    );
    verifica(
      'La empty-state-card ha il bordo tratteggiato (dashed), non piu solido',
      borderStyle === 'dashed',
      borderStyle,
    );
  } else {
    verifica(
      'La empty-state-card e visibile con zero pazienti registrati',
      false,
      'elemento non trovato',
    );
  }

  verifica(
    'nessun errore JavaScript durante lo scenario',
    erroriConsole.length === 0,
    erroriConsole.slice(0, 3).join(' || ') || 'console pulita',
  );

  await page.close();
  await pageVuota.close();
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
