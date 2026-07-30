// Evidenze oggettive per "Foglio farmaco AIFA in-app con sezioni evidenziate e ricerca farmaco".
// Contract: artifacts/task-validation/foglio-farmaco-aifa-in-app-con-sezioni-evidenziate-e-ricerca-farmaco-quando-non/
//
// Verifica AC1-AC5, AC8, AC9 sul dist costruito, con vite preview e tutte le route mockate.
// Il PDF di AIFA e' servito da un file locale: la fonte reale e' stata osservata rispondere 503
// per una decina di minuti, e un'evidenza che dipende da un servizio terzo non e' un'evidenza.
//
// Uso: node e2e/foglio-farmaco-aifa.mjs [frontendUrl] [outDir] [pdfPath]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/foglio-farmaco-aifa-in-app-con-sezioni-evidenziate-e-ricerca-farmaco-quando-non/screenshots';
const pdfPath = process.argv[4] ?? resolve(outDir, '..', 'fixtures', 'rcp-tachipirina.pdf');

mkdirSync(outDir, { recursive: true });
mkdirSync(resolve(pdfPath, '..'), { recursive: true });

// L'RCP reale della Tachipirina: 48 pagine, sei RCP concatenati. Scaricato una volta e riusato.
const AIFA_RCP =
  'https://api.aifa.gov.it/aifa-bdf-eif-be/1.0.0/organizzazione/219/farmaci/012745/stampati?ts=RCP';

if (!existsSync(pdfPath)) {
  console.log('Fixture PDF assente, la scarico una volta da AIFA…');
  const risposta = await fetch(AIFA_RCP, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!risposta.ok) {
    console.error(`AIFA ha risposto ${risposta.status}: impossibile creare la fixture.`);
    process.exit(1);
  }
  writeFileSync(pdfPath, Buffer.from(await risposta.arrayBuffer()));
  console.log('Fixture salvata:', pdfPath);
}
const PDF = readFileSync(pdfPath);

const PATIENT = {
  id: 'p-aifa',
  medicalRecordNumber: 'MRN-AIFA',
  firstName: 'Giovanni',
  lastName: 'Baldini',
  dateOfBirth: '1941-03-12',
  sex: 'M',
  email: null,
  phone: null,
};

// Due righe che coprono i due esiti richiesti: farmaco in anagrafica e farmaco assente.
const THERAPIES = [
  {
    id: 't-1',
    patientId: PATIENT.id,
    farmacoNome: 'Tachipirina',
    dosaggio: '1000 mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-07-01',
    dataFine: null,
    fasceMattina: true,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: true,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: 'Dr. Neri',
    operatoreInseritore: 'Inf. Verdi',
    note: null,
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  // Terza riga senza dosaggio: nulla su cui riconoscere la formulazione fra i sei RCP del PDF.
  // È il caso in cui evidenziare una posologia sarebbe pericoloso (AC9).
  {
    id: 't-3',
    patientId: PATIENT.id,
    farmacoNome: 'Tachipirina',
    dosaggio: '',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-07-03',
    dataFine: null,
    fasceMattina: false,
    fascePranzo: true,
    fascePomeriggio: false,
    fasceSera: false,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: 'Dr. Neri',
    operatoreInseritore: 'Inf. Verdi',
    note: null,
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: '2026-07-03T08:00:00.000Z',
    updatedAt: '2026-07-03T08:00:00.000Z',
  },
  {
    id: 't-2',
    patientId: PATIENT.id,
    farmacoNome: 'Cardiofillina galenica',
    dosaggio: '50 mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-07-02',
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
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: '2026-07-02T08:00:00.000Z',
    updatedAt: '2026-07-02T08:00:00.000Z',
  },
];

/** Confezioni come le restituisce GET /farmaci/cerca, con i link AIFA veri. */
const CONFEZIONI_TACHIPIRINA = [
  {
    aic: '012745016',
    denominazione: 'TACHIPIRINA',
    descrizione: 'SCIROPPO 120 ML 120 MG/5 ML',
    forma: 'Sciroppo',
    atc: 'N02BE01',
    statoAmministrativo: 'Autorizzata',
    fornitura: 'Senza ricetta',
    linkFi: AIFA_RCP.replace('ts=RCP', 'ts=FI'),
    linkRcp: AIFA_RCP,
    principiAttivi: [{ nome: 'PARACETAMOLO', quantita: 120, unita: 'mg' }],
    confidenza: 1,
    criterio: 'esatto',
  },
  {
    aic: '012745028',
    denominazione: 'TACHIPIRINA',
    descrizione: '20 COMPRESSE 1000 MG',
    forma: 'Compressa',
    atc: 'N02BE01',
    statoAmministrativo: 'Autorizzata',
    fornitura: 'Con ricetta',
    linkFi: AIFA_RCP.replace('ts=RCP', 'ts=FI'),
    linkRcp: AIFA_RCP,
    principiAttivi: [{ nome: 'PARACETAMOLO', quantita: 1000, unita: 'mg' }],
    confidenza: 1,
    criterio: 'esatto',
  },
];

const CARTELLA = {
  pazienteId: PATIENT.id,
  statoRicovero: 'ricoverato',
  cameraNumero: '7',
  lettoNumero: 'A',
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
};

/** URL verso AIFA osservati: serve a provare che nessun dato di paziente li raggiunge (AC6). */
const urlVersoAifa = [];

/** Quando true, AIFA risponde 503 come e' stato osservato fare per una decina di minuti (AC5). */
const aifa = { giu: false };

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.includes('api.aifa.gov.it')) {
      urlVersoAifa.push(url);
      if (aifa.giu) {
        return route.fulfill({
          status: 503,
          headers: { 'content-type': 'text/html', 'access-control-allow-origin': '*' },
          body: '<html><body>Service Unavailable</body></html>',
        });
      }
      // Gli stessi header con cui AIFA serve il documento: sono loro a imporre il download.
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/octet-stream',
          'content-disposition': 'attachment; filename=RCP_000219_012745.pdf',
          'access-control-allow-origin': '*',
        },
        body: PDF,
      });
    }

    if (url.match(/\/farmaci\/cerca/)) {
      const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '').toUpperCase();
      if (q.includes('TACHIPIRINA') || q.includes('PARACETAMOLO'))
        return json({ query: q, esiti: CONFEZIONI_TACHIPIRINA });
      return json({ query: q, esiti: [] });
    }

    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PATIENT]);
    if (url.match(/\/patients\/p-aifa$/) && method === 'GET') return json(PATIENT);
    if (url.match(/\/patients\/p-aifa\/cartella/) && method === 'GET')
      return json({ patientId: PATIENT.id, data: CARTELLA });
    if (url.match(/\/patients\/p-aifa\/therapies/) && method === 'GET') return json(THERAPIES);
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.match(/\/patients\/p-aifa\/narrative-sections/)) return json([]);
    if (url.match(/\/medication-administrations/)) return json([]);
    if (url.match(/\/therapy-slots/)) return json([]);

    // Nessuna chiamata deve raggiungere il backend reale: un test che interroga la produzione
    // non è riproducibile e sporca dati veri. Tutto ciò che punta lì risponde vuoto.
    if (/railway\.app|clinicos-backend/.test(url)) return json([]);
    return route.continue();
  });
}

/** Chiude qualunque overlay aperto e attende che spariscano tutti. */
async function chiudiSovrapposizioni(page) {
  for (let i = 0; i < 4; i++) {
    if ((await page.locator('.modal-overlay').count()) === 0) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

const esiti = [];
function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: Boolean(condizione), dettaglio });
  console.log(`  ${condizione ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
}

const browser = await chromium.launch({ headless: true });

try {
  const contesto = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await contesto.newPage();

  // AC1: nessun file scaricato. Ogni download che partisse finirebbe qui.
  const download = [];
  page.on('download', (d) => download.push(d.suggestedFilename()));

  // Gli errori di console sono la traccia piu' diretta di un guasto dentro un effetto React:
  // senza raccoglierli, un TypeError silenzioso si manifesta solo come funzione che non funziona.
  const erroriConsole = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erroriConsole.push(m.text().slice(0, 160));
  });
  page.on('pageerror', (e) => erroriConsole.push(`pageerror: ${e.message.slice(0, 160)}`));

  await mockRoutes(page);
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);

  const loginCard = page.locator('.login-role-card--operatore');
  if ((await loginCard.count()) > 0) {
    await loginCard.click();
    await page.waitForTimeout(1200);
  }

  const nav = page
    .locator('[title="Pazienti"], .teams-sidebar__item')
    .filter({ hasText: /Pazienti/i })
    .first();
  if ((await nav.count()) > 0) await nav.click();
  await page.waitForTimeout(1200);

  await page.getByText('Baldini').first().click();
  await page.waitForTimeout(1200);

  const clinica = page.getByText('Clinica', { exact: true }).first();
  if ((await clinica.count()) > 0) {
    await clinica.click();
    await page.waitForTimeout(600);
  }
  const tabTerapia = page.getByText(/Terapia farmacologica/i).first();
  if ((await tabTerapia.count()) > 0) {
    await tabTerapia.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: resolve(outDir, '01-scheda-terapia.png'), fullPage: true });

  // ── AC3: il farmaco non in anagrafica e' segnalato ─────────────────────────────────────
  const indicatore = page.locator('.farmaco-non-trovato');
  verifica(
    'AC3: il farmaco assente dall anagrafica e segnalato sulla riga',
    (await indicatore.count()) > 0,
    `${await indicatore.count()} indicatori`,
  );

  // ── AC1/AC2/AC8: apertura del documento ────────────────────────────────────────────────
  const iconaDocumento = page.getByLabel(/dose prescritta 1000 mg/i).first();
  verifica(
    'AC1: la riga in anagrafica espone l azione documento',
    (await iconaDocumento.count()) > 0,
  );
  await iconaDocumento.click();

  const visore = page.locator('.visore-farmaco');
  await visore.waitFor({ state: 'visible', timeout: 20000 });
  // Il rendering di 48 pagine di PDF non e' istantaneo.
  await page.waitForTimeout(6000);
  await page.screenshot({ path: resolve(outDir, '02-visore-aperto.png'), fullPage: false });

  verifica('AC1: il documento si apre dentro ClinicOS', await visore.isVisible());
  verifica(
    'AC1: nessun file e stato scaricato',
    download.length === 0,
    download.length ? `download: ${download.join(', ')}` : 'nessun download',
  );
  // Contare gli elementi canvas non basta: esistono nel DOM anche quando il rendering fallisce.
  // È così che un TypeError nella trasformazione delle coordinate è passato inosservato una volta.
  const pixelDisegnati = await page.evaluate(() => {
    const tela = document.querySelector('.visore-farmaco__tela canvas');
    if (!(tela instanceof HTMLCanvasElement) || !tela.width) return 0;
    const dati = tela.getContext('2d')?.getImageData(0, 0, tela.width, tela.height).data;
    if (!dati) return 0;
    // Un PDF reso ha testo scuro su bianco: senza pixel scuri la pagina è vuota.
    let scuri = 0;
    for (let i = 0; i < dati.length; i += 4) if (dati[i] < 128) scuri++;
    return scuri;
  });
  verifica(
    'AC1: il PDF e effettivamente disegnato',
    pixelDisegnati > 1000,
    `${pixelDisegnati} pixel di testo`,
  );

  const evidenze = await page.locator('.visore-farmaco__evidenza').count();
  const sezioni = await page.locator('.visore-farmaco__salto').allInnerTexts();
  verifica('AC2: le sezioni cliniche sono evidenziate', evidenze > 0, `${evidenze} rettangoli`);
  verifica(
    'AC2: 4.1, 4.2 e 4.3 sono raggiungibili',
    ['4.1', '4.2', '4.3'].every((n) => sezioni.some((s) => s.startsWith(n))),
    sezioni.join(' | ') || 'nessuna sezione',
  );

  const testaVisore = await page
    .locator('.visore-farmaco__scelta')
    .innerText()
    .catch(() => '');
  verifica(
    'AC8: la formulazione mostrata e dichiarata',
    /Formulazione/i.test(testaVisore),
    testaVisore.split('\n')[0]?.slice(0, 80),
  );
  const selettore = page.locator(
    '.visore-farmaco__select, .visore-farmaco__scelta--richiesta button',
  );
  verifica('AC8: le altre formulazioni sono elencate', (await selettore.count()) > 0);

  await page.locator('.visore-farmaco .icon-btn').last().click();
  await page.waitForTimeout(600);

  // ── AC4: la ricerca si apre dalla riga non risolta ─────────────────────────────────────
  await indicatore.first().click();
  const modale = page.locator('.ricerca-farmaco-modale');
  await modale.waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: resolve(outDir, '03-ricerca-aperta.png'), fullPage: false });
  verifica('AC4: la ricerca si apre dalla riga non risolta', await modale.isVisible());

  // Ricerca per principio attivo: il caso in cui l'operatore non conosce il nome commerciale.
  await page.locator('.ricerca-farmaco__criterio button').nth(1).click();
  await page.locator('.ricerca-farmaco__campo input').fill('paracetamolo');
  await page.waitForTimeout(1500);
  const risultati = await page.locator('.ricerca-farmaco__riga').count();
  await page.screenshot({
    path: resolve(outDir, '04-ricerca-principio-attivo.png'),
    fullPage: false,
  });
  verifica(
    'AC4: la ricerca per principio attivo trova il farmaco',
    risultati > 0,
    `${risultati} esiti`,
  );

  // ── AC6: nessun dato di paziente negli URL verso AIFA ──────────────────────────────────
  const sospetti = urlVersoAifa.filter((u) => /p-aifa|Baldini|Giovanni|1941/i.test(u));
  verifica(
    'AC6: nessun identificativo di paziente negli URL verso AIFA',
    sospetti.length === 0,
    `${urlVersoAifa.length} richieste verso AIFA, ${sospetti.length} sospette`,
  );

  // ── AC9: formulazione non deducibile → nessuna evidenziazione, si chiede di scegliere ───
  await chiudiSovrapposizioni(page);
  // La riga senza dosaggio e' la seconda con l'icona del documento.
  const bottoniDocumento = page.getByLabel(/dose non specificata/i);
  const quantiBottoni = await bottoniDocumento.count();
  verifica(
    'la riga senza dosaggio espone il documento',
    quantiBottoni >= 1,
    `${quantiBottoni} bottoni documento`,
  );
  await bottoniDocumento.first().click();
  await visore.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: resolve(outDir, '05-formulazione-ambigua.png'), fullPage: false });

  const richiesta = page.locator('.visore-farmaco__scelta--richiesta');
  const evidenzeAmbigue = await page.locator('.visore-farmaco__evidenza').count();
  verifica(
    'AC9: senza formulazione riconoscibile viene chiesto di scegliere',
    await richiesta.isVisible(),
  );
  verifica(
    'AC9: nessuna sezione e evidenziata finche la formulazione e ambigua',
    evidenzeAmbigue === 0,
    `${evidenzeAmbigue} rettangoli`,
  );
  const scelte = await page.locator('.visore-farmaco__scelta--richiesta button').count();
  verifica(
    'AC9: le formulazioni sono elencate per la scelta',
    scelte >= 2,
    `${scelte} formulazioni`,
  );

  // Scegliendo una formulazione l'evidenziazione compare: la scelta e' esplicita, non indovinata.
  await page.locator('.visore-farmaco__scelta--richiesta button').first().click();
  await page.waitForTimeout(4000);
  const evidenzeDopoScelta = await page.locator('.visore-farmaco__evidenza').count();
  await page.screenshot({ path: resolve(outDir, '06-dopo-scelta-operatore.png'), fullPage: false });
  verifica(
    'AC9: dopo la scelta dell operatore le sezioni sono evidenziate',
    evidenzeDopoScelta > 0,
    `${evidenzeDopoScelta} rettangoli`,
  );

  // ── AC5: fonte AIFA irraggiungibile → messaggio distinto + link diretto ─────────────────
  await chiudiSovrapposizioni(page);
  aifa.giu = true;
  await page
    .getByLabel(/dose prescritta 1000 mg/i)
    .first()
    .click();
  await visore.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(3000);
  const errore = page.locator('.visore-farmaco__stato--errore');
  const testoErrore = await errore.innerText().catch(() => '');
  await page.screenshot({ path: resolve(outDir, '07-aifa-irraggiungibile.png'), fullPage: false });
  verifica(
    'AC5: con AIFA giu il messaggio distingue il guasto della fonte',
    /banca dati AIFA non risponde|fonte a non essere raggiungibile/i.test(testoErrore),
    testoErrore.split('\n')[0]?.slice(0, 90),
  );
  verifica(
    'AC5: viene offerto il link diretto come ripiego',
    (await errore.locator('a[href*="aifa.gov.it"]').count()) > 0,
  );
  aifa.giu = false;

  // ── AC4 (secondo contorno): la pagina dedicata usa lo stesso componente di ricerca ─────
  await chiudiSovrapposizioni(page);
  const voceFarmaci = page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Farmaci$/ })
    .first();
  await voceFarmaci.click();
  await page.waitForTimeout(900);
  const pagina = page.locator('.page-anagrafica-farmaci');
  verifica('AC4: esiste la pagina dedicata all anagrafica farmaci', await pagina.isVisible());

  await page.locator('.ricerca-farmaco__campo input').fill('tachipirina');
  await page.waitForTimeout(1500);
  const esitiPagina = await page.locator('.ricerca-farmaco__riga').count();
  await page.screenshot({ path: resolve(outDir, '08-pagina-dedicata.png'), fullPage: true });
  verifica(
    'AC4: la pagina dedicata cerca con lo stesso componente',
    esitiPagina > 0,
    `${esitiPagina} esiti`,
  );

  // Il 503 dell'AC5 e' provocato di proposito: escluderlo, altrimenti il controllo segnala
  // come difetto lo scenario che ha appena verificato.
  const ignorati = erroriConsole.filter((e) => !/503|Service Unavailable|stampati/i.test(e));
  verifica(
    'nessun errore JavaScript inatteso durante lo scenario',
    ignorati.length === 0,
    ignorati.slice(0, 3).join(' || ') || 'console pulita',
  );

  await page.close();
} catch (err) {
  console.error('Errore E2E:', err.message);
  esiti.push({ nome: 'esecuzione dello scenario', ok: false, dettaglio: err.message });
} finally {
  await browser.close();
}

const falliti = esiti.filter((e) => !e.ok);
console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate`);
writeFileSync(resolve(outDir, 'verifiche.json'), JSON.stringify({ esiti }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
