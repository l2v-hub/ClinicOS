// Evidenze a runtime per "Loop UX ciclo 8 - Parametri Vitali, salvataggio raggruppato e valori
// implausibili". Contract: artifacts/task-validation/loop-ux-ciclo-8-parametri-vitali-salvataggio-raggruppato/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route (vedi
// reference-ui-runtime-evidence-without-db). Copre AC-R1 (raggruppamento realmente attivo nel
// browser, nessuna perdita dati su cambio mese/uscita dal tab) e AC-R2 (indicatore implausibile +
// tooltip visibili).
//
// Uso: node e2e/loop-ux-ciclo-8-parametri-vitali.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-8-parametri-vitali-salvataggio-raggruppato/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE = {
  id: 'p-t8',
  medicalRecordNumber: 'MRN-T8',
  firstName: 'Marco',
  lastName: 'Guidotti',
  dateOfBirth: '1948-02-20',
  sex: 'M',
  email: null,
  phone: null,
};

// "Oggi" nell'ambiente di test e' il 2026-08-08: la vista di default della griglia e' Agosto 2026.
const MESE = 8;
const ANNO = 2026;

function cartellaIniziale() {
  return {
    pazienteId: PAZIENTE.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '5',
    lettoNumero: 'C',
    anamnesi: {},
    diagnosi: [],
    terapie: [],
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
    esamiEmatici: [],
    esamiStrumentali: [],
    consulenze: [],
    dimissione: null,
    parametriMensili: [
      {
        id: 'pm-1',
        mese: MESE,
        anno: ANNO,
        giorni: [{ giorno: 3, fc: '72', spo2: '97' }],
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  };
}

/** Stato server mutabile: ogni PUT sostituisce l'intera cartella, come nel vero backend. */
let cartellaCorrente = cartellaIniziale();
const putRequests = [];

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PAZIENTE]);
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}$`)) && method === 'GET')
      return json(PAZIENTE);
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/cartella`))) {
      if (method === 'GET') return json({ patientId: PAZIENTE.id, data: cartellaCorrente });
      if (method === 'PUT') {
        const body = route.request().postDataJSON();
        putRequests.push({ t: Date.now(), body: body.data });
        cartellaCorrente = { ...cartellaCorrente, ...body.data };
        return json({ ok: true });
      }
    }
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/narrative-sections`))) return json([]);
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.match(/\/therapy-slots/) && method === 'GET') return json([]);
    if (/railway|clinicos-backend|localhost:3001/.test(url)) return json([]);
    return route.continue();
  });
}

const esiti = [];
function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: Boolean(condizione), dettaglio });
  console.log(`  ${condizione ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
}

function giornoNellaGrigliaOggi() {
  return cartellaCorrente.parametriMensili.find((m) => m.mese === MESE && m.anno === ANNO);
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const erroriConsole = [];
  page.on('pageerror', (e) => erroriConsole.push(e.message.slice(0, 140)));
  await mockRoutes(page);

  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
  const login = page.locator('.login-role-card--operatore');
  if ((await login.count()) > 0) {
    await login.click();
    await page.waitForTimeout(1400);
  }

  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Pazienti$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page.getByText('Guidotti').first().click();
  await page.waitForTimeout(1500);

  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Clinica$/ })
    .first()
    .click();
  await page.waitForTimeout(800);
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Parametri Vitali$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(outDir, '01-griglia-parametri.png'), fullPage: true });

  const rigaGiorno3 = page
    .locator('tbody tr')
    .filter({ has: page.locator('td.parametri-day-col', { hasText: /^3$/ }) });
  verifica(
    'Setup: la griglia carica i dati esistenti (giorno 3, FC 72)',
    /72/.test(await rigaGiorno3.innerText()),
  );

  // ── AC-R1: tre celle modificate in rapida sequenza (Tab) = 1 sola PUT, non 3 ────────────────
  const rigaGiorno5 = page
    .locator('tbody tr')
    .filter({ has: page.locator('td.parametri-day-col', { hasText: /^5$/ }) });
  // PA e' la prima colonna della griglia.
  const cellaPA = rigaGiorno5.locator('td.vitale-inline-cell').nth(0);
  await cellaPA.click();
  await page.waitForTimeout(200);
  await page.keyboard.type('120/80');
  await page.keyboard.press('Tab'); // -> FC
  await page.waitForTimeout(120);
  await page.keyboard.type('88');
  await page.keyboard.press('Tab'); // -> SpO2
  await page.waitForTimeout(120);
  await page.keyboard.type('97');
  await page.keyboard.press('Tab'); // -> Temperatura, chiude l'editing sulla cella precedente
  await page.waitForTimeout(150);

  verifica(
    'AC-R1: subito dopo i tre Tab, zero richieste PUT sono ancora partite (in attesa del debounce)',
    putRequests.length === 0,
    `${putRequests.length} PUT`,
  );
  await page.screenshot({
    path: resolve(outDir, '02-tre-celle-appena-confermate.png'),
    fullPage: false,
  });
  const testoRigaSubito = await rigaGiorno5.innerText();
  verifica(
    'AC-R1: i tre valori sono gia visibili in griglia prima che la PUT parta (overlay locale)',
    /120\/80/.test(testoRigaSubito) && /88/.test(testoRigaSubito) && /97/.test(testoRigaSubito),
    testoRigaSubito.replace(/\n/g, ' | ').slice(0, 120),
  );

  await page.waitForTimeout(1000); // supera gli 800ms di debounce
  verifica(
    'AC-R1: dopo la pausa, e partita ESATTAMENTE 1 PUT per tutte e tre le celle (non 3)',
    putRequests.length === 1,
    `${putRequests.length} PUT`,
  );
  const giornoInviato5 = putRequests
    .at(-1)
    ?.body.parametriMensili.find((m) => m.mese === MESE && m.anno === ANNO)
    ?.giorni.find((g) => g.giorno === 5);
  verifica(
    'AC-R1: il payload della PUT unica contiene tutti e tre i valori fusi in un solo record',
    giornoInviato5?.pa === '120/80' && giornoInviato5?.fc === '88' && giornoInviato5?.spo2 === '97',
    JSON.stringify(giornoInviato5),
  );
  verifica(
    'AC-R1: il giorno 3 preesistente non e stato toccato dal flush del giorno 5',
    giornoNellaGrigliaOggi()?.giorni.find((g) => g.giorno === 3)?.fc === '72',
  );
  const toastVisibile = await page
    .locator('.app-toast--success')
    .isVisible()
    .catch(() => false);
  verifica('AC-R1: il toast di conferma appare dopo il flush raggruppato', toastVisibile);

  // ── AC-R1: flush immediato su cambio mese (non aspetta il debounce) ─────────────────────────
  putRequests.length = 0;
  const cellaGiorno7Fc = page
    .locator('tbody tr')
    .filter({ has: page.locator('td.parametri-day-col', { hasText: /^7$/ }) })
    .locator('td.vitale-inline-cell')
    .nth(1); // FC
  await cellaGiorno7Fc.click();
  await page.waitForTimeout(150);
  await page.keyboard.type('75');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  verifica(
    'Setup: la modifica del giorno 7 e ancora in coda (nessuna PUT ancora)',
    putRequests.length === 0,
  );

  const prevMeseBtn = page.locator('button', { hasText: '‹' }).first();
  await prevMeseBtn.click(); // cambia mese PRIMA che scada il debounce di 800ms
  await page.waitForTimeout(300);
  verifica(
    'AC-R1: cambiare mese prima dello scadere del debounce forza un flush immediato (non perde la modifica)',
    putRequests.length === 1 &&
      putRequests[0].body.parametriMensili
        .find((m) => m.mese === MESE && m.anno === ANNO)
        ?.giorni.find((g) => g.giorno === 7)?.fc === '75',
    `${putRequests.length} PUT`,
  );
  await nextMeseBack();
  async function nextMeseBack() {
    const nextBtn = page.locator('button', { hasText: '›' }).first();
    await nextBtn.click();
    await page.waitForTimeout(500);
  }

  // ── AC-R1: flush immediato uscendo dal tab (smontaggio) ─────────────────────────────────────
  putRequests.length = 0;
  const cellaGiorno10Fc = page
    .locator('tbody tr')
    .filter({ has: page.locator('td.parametri-day-col', { hasText: /^10$/ }) })
    .locator('td.vitale-inline-cell')
    .nth(1);
  await cellaGiorno10Fc.click();
  await page.waitForTimeout(150);
  await page.keyboard.type('65');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Diagnosi$/ })
    .first()
    .click();
  await page.waitForTimeout(400);
  verifica(
    'AC-R1: uscire dal tab (smontaggio) prima dello scadere del debounce forza comunque il flush',
    putRequests.length === 1 &&
      putRequests[0].body.parametriMensili
        .find((m) => m.mese === MESE && m.anno === ANNO)
        ?.giorni.find((g) => g.giorno === 10)?.fc === '65',
    `${putRequests.length} PUT`,
  );

  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Parametri Vitali$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);

  // ── AC-R2: valore implausibile -> indicatore + tooltip; valore plausibile -> nessuno ────────
  putRequests.length = 0;
  const rigaGiorno12 = page
    .locator('tbody tr')
    .filter({ has: page.locator('td.parametri-day-col', { hasText: /^12$/ }) });
  const cellaFcImplausibile = rigaGiorno12.locator('td.vitale-inline-cell').nth(1); // FC
  await cellaFcImplausibile.click();
  await page.waitForTimeout(150);
  await page.keyboard.type('999');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const classiCellaImplausibile = (await cellaFcImplausibile.getAttribute('class')) ?? '';
  verifica(
    'AC-R2: FC=999 (fuori 20-300) riceve la classe out-of-range',
    classiCellaImplausibile.includes('out-of-range'),
    classiCellaImplausibile,
  );
  const titleImplausibile = (await cellaFcImplausibile.getAttribute('title')) ?? '';
  verifica(
    'AC-R2: il tooltip spiega che il valore va verificato',
    /verificare/i.test(titleImplausibile),
    titleImplausibile,
  );
  await page.screenshot({ path: resolve(outDir, '03-valore-implausibile.png'), fullPage: false });

  const cellaSpo2Plausibile = rigaGiorno12.locator('td.vitale-inline-cell').nth(2); // SpO2
  await cellaSpo2Plausibile.click();
  await page.waitForTimeout(150);
  await page.keyboard.type('96');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const classiCellaPlausibile = (await cellaSpo2Plausibile.getAttribute('class')) ?? '';
  verifica(
    'AC-R2: SpO2=96 (plausibile) NON riceve la classe out-of-range',
    !classiCellaPlausibile.includes('out-of-range'),
    classiCellaPlausibile,
  );

  // ── AC-R2: tooltip sul valore troncato (colonna NOTE) ────────────────────────────────────────
  const cellaNote = rigaGiorno12.locator('td.vitale-inline-cell').last(); // NOTE e l'ultima colonna
  await cellaNote.click();
  await page.waitForTimeout(150);
  const notaLunga = 'Paziente rifiuta la terapia delle 12, richiamare il medico di reparto';
  await page.keyboard.type(notaLunga);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const titleNota = (await cellaNote.getAttribute('title')) ?? '';
  verifica(
    'AC-R2: il valore troncato (colonna NOTE) espone il testo completo in title',
    titleNota === notaLunga,
    titleNota,
  );
  const testoVisualizzatoNota = (await cellaNote.innerText()).trim();
  verifica(
    'AC-R2: a schermo il valore resta troncato con ellissi (non rompe il layout della cella)',
    testoVisualizzatoNota.length < notaLunga.length && testoVisualizzatoNota.endsWith('…'),
    testoVisualizzatoNota,
  );

  await page.waitForTimeout(1000); // lascia scadere il debounce residuo prima di chiudere

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
writeFileSync(resolve(outDir, 'verifiche.json'), JSON.stringify({ esiti, putRequests }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
