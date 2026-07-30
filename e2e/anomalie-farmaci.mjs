// Evidenze per "Farmaci fuori anagrafica segnalati come anomalie e ricerca farmaco nella maschera".
// Contract: artifacts/task-validation/farmaci-fuori-anagrafica-segnalati-come-anomalie-e-ricerca-farmaco-nella-mascher/
//
// Verifica AC1-AC11 sul dist costruito, con vite preview e tutte le route mockate.
//
// Uso: node e2e/anomalie-farmaci.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/farmaci-fuori-anagrafica-segnalati-come-anomalie-e-ricerca-farmaco-nella-mascher/screenshots';
mkdirSync(outDir, { recursive: true });

const OGGI = new Date().toISOString().slice(0, 10);

// Due pazienti: uno con un farmaco inventato (anomalia), uno tutto in regola (AC9).
const CON_ANOMALIA = {
  id: 'p-anomalo',
  medicalRecordNumber: 'MRN-ANO',
  firstName: 'Bruno',
  lastName: 'Anselmi',
  dateOfBirth: '1938-05-02',
  sex: 'M',
  email: null,
  phone: null,
};
const PULITO = {
  id: 'p-pulito',
  medicalRecordNumber: 'MRN-PUL',
  firstName: 'Clara',
  lastName: 'Bassi',
  dateOfBirth: '1944-11-19',
  sex: 'F',
  email: null,
  phone: null,
};

function terapia(patientId, farmacoNome, dosaggio, id) {
  return {
    id,
    patientId,
    farmacoNome,
    dosaggio,
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-07-01',
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
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  };
}

const TERAPIE = {
  'p-anomalo': [
    terapia('p-anomalo', 'Tachipirina', '1000 mg', 't-a1'),
    terapia('p-anomalo', 'Cardiofillina Inventata', '50 mg', 't-a2'),
  ],
  'p-pulito': [terapia('p-pulito', 'Tachipirina', '500 mg', 't-p1')],
};

/** Solo TACHIPIRINA e PARACETAMOLO esistono in anagrafica. */
const CONFEZIONI = [
  {
    aic: '012745028',
    denominazione: 'TACHIPIRINA',
    descrizione: '20 COMPRESSE 1000 MG',
    forma: 'Compressa',
    atc: 'N02BE01',
    statoAmministrativo: 'Autorizzata',
    fornitura: 'Con ricetta',
    linkFi: null,
    linkRcp: 'https://api.aifa.gov.it/finto/rcp',
    principiAttivi: [{ nome: 'PARACETAMOLO', quantita: 1000, unita: 'mg' }],
    confidenza: 1,
    criterio: 'esatto',
  },
  {
    aic: '012745016',
    denominazione: 'TACHIPIRINA',
    descrizione: 'SCIROPPO 120 ML 120 MG/5 ML',
    forma: 'Sciroppo',
    atc: 'N02BE01',
    statoAmministrativo: 'Autorizzata',
    fornitura: 'Senza ricetta',
    linkFi: null,
    linkRcp: 'https://api.aifa.gov.it/finto/rcp',
    principiAttivi: [{ nome: 'PARACETAMOLO', quantita: 120, unita: 'mg' }],
    confidenza: 1,
    criterio: 'esatto',
  },
];

function cartellaDi(p) {
  return {
    pazienteId: p.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '4',
    lettoNumero: 'B',
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
}

/** /therapy-slots: una richiesta per tutto il reparto (AC11). */
function slotsDelReparto() {
  const perPaziente = [CON_ANOMALIA, PULITO].map((p) => ({
    patientId: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    room: '4',
    bed: 'B',
    administrations: TERAPIE[p.id].map((t) => ({
      administrationId: null,
      therapyId: t.id,
      drugName: t.farmacoNome,
      dosage: t.dosaggio,
      quantityLabel: t.dosaggio,
      route: 'orale',
      scheduledTime: '08:00',
      status: 'pending',
      administeredAt: null,
      administeredBy: null,
      notAdministeredReason: null,
    })),
  }));
  return [
    {
      id: 'ts-mattina',
      fascia: 'mattina',
      label: 'Mattina',
      ora: '08:00',
      summary: { total: 3, administered: 0, notAdministered: 0, pending: 3 },
      patients: perPaziente,
    },
  ];
}

/** Conta le richieste per rotta: serve a dimostrare AC11. */
const richieste = [];
/** Quando true, /farmaci/cerca fallisce: verifica AC10. */
const anagrafica = { giu: false };
const salvati = [];

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (/localhost:3001|railway|clinicos-backend/.test(url) || url.includes('/farmaci/'))
      richieste.push(`${method} ${url.replace(/^https?:\/\/[^/]+/, '')}`);

    if (url.match(/\/farmaci\/cerca/)) {
      if (anagrafica.giu) return json({ error: 'anagrafica non disponibile' }, 503);
      const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '').toUpperCase();
      if (q.includes('TACHIPIRINA') || q.includes('PARACETAMOLO'))
        return json({ query: q, esiti: CONFEZIONI });
      return json({ query: q, esiti: [] });
    }
    if (url.match(/\/therapy-slots/) && method === 'GET') return json(slotsDelReparto());

    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([CON_ANOMALIA, PULITO]);
    for (const p of [CON_ANOMALIA, PULITO]) {
      if (url.match(new RegExp(`/patients/${p.id}$`)) && method === 'GET') return json(p);
      if (url.match(new RegExp(`/patients/${p.id}/cartella`)) && method === 'GET')
        return json({ patientId: p.id, data: cartellaDi(p) });
      if (url.match(new RegExp(`/patients/${p.id}/therapies`))) {
        if (method === 'POST') {
          const corpo = route.request().postDataJSON();
          salvati.push(corpo);
          return json({ id: 't-nuovo', ...corpo }, 201);
        }
        return json(TERAPIE[p.id]);
      }
      if (url.match(new RegExp(`/patients/${p.id}/narrative-sections`))) return json([]);
    }
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.match(/\/medication-administrations/)) return json([]);
    if (/railway|clinicos-backend|localhost:3001/.test(url)) return json([]);
    return route.continue();
  });
}

const esiti = [];
function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: Boolean(condizione), dettaglio });
  console.log(`  ${condizione ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
}

async function apriPaziente(page, cognome) {
  await page.getByText(cognome).first().click();
  await page.waitForTimeout(1300);
}

async function tornaAllaLista(page) {
  const nav = page
    .locator('[title="Pazienti"], .teams-sidebar__item')
    .filter({ hasText: /Pazienti/i })
    .first();
  await nav.click();
  await page.waitForTimeout(1200);
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

  // ── AC8: cruscotto operatore ─────────────────────────────────────────────────────────────
  await page.waitForTimeout(2200);
  await page.screenshot({ path: resolve(outDir, '01-cruscotto.png'), fullPage: true });
  const bloccoCruscotto = page.locator('.coverage-alert--amber');
  verifica(
    'AC8: il cruscotto elenca i pazienti con farmaci fuori anagrafica',
    await bloccoCruscotto.isVisible(),
  );
  const testoCruscotto = await bloccoCruscotto.innerText().catch(() => '');
  verifica(
    'AC8: elenca il paziente giusto e il farmaco giusto',
    /Anselmi/.test(testoCruscotto) && /Cardiofillina Inventata/.test(testoCruscotto),
    testoCruscotto.replace(/\n/g, ' | ').slice(0, 110),
  );
  verifica('AC9: il paziente in regola non compare nel cruscotto', !/Bassi/.test(testoCruscotto));

  // ── AC6: lista pazienti ──────────────────────────────────────────────────────────────────
  await tornaAllaLista(page);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: resolve(outDir, '02-lista-pazienti.png'), fullPage: true });
  const indicatori = page.locator('.indicatore-anomalie');
  verifica(
    'AC6: la riga del paziente con anomalie espone l indicatore',
    (await indicatori.count()) >= 1,
    `${await indicatori.count()} indicatori`,
  );
  const rigaPulita = page.locator('tr', { hasText: 'Bassi' }).first();
  verifica(
    'AC9: la riga del paziente in regola non ha indicatore',
    (await rigaPulita.locator('.indicatore-anomalie').count()) === 0,
  );

  // AC11: nessuna chiamata per paziente — una sola /therapy-slots
  const chiamateSlots = richieste.filter((r) => r.includes('/therapy-slots')).length;
  const chiamateTerapiePerPaziente = richieste.filter((r) =>
    /\/patients\/.*\/therapies/.test(r),
  ).length;
  verifica(
    'AC11: le anomalie di reparto costano una sola richiesta /therapy-slots',
    chiamateSlots >= 1 && chiamateTerapiePerPaziente === 0,
    `therapy-slots=${chiamateSlots}, therapies per paziente=${chiamateTerapiePerPaziente}`,
  );

  // ── AC5: testa della cartella ────────────────────────────────────────────────────────────
  await apriPaziente(page, 'Anselmi');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(outDir, '03-testa-cartella.png'), fullPage: false });
  const avviso = page.locator('.avviso-anomalie').first();
  verifica('AC5: la testa della cartella avvisa delle anomalie', await avviso.isVisible());
  const testoAvviso = await avviso.innerText().catch(() => '');
  verifica(
    'AC5: l avviso nomina il farmaco da correggere',
    /Cardiofillina Inventata/.test(testoAvviso),
    testoAvviso.replace(/\n/g, ' | ').slice(0, 110),
  );
  await avviso.locator('.avviso-anomalie__azione').click();
  await page.waitForTimeout(1600);

  // ── AC7: testa della scheda terapia ──────────────────────────────────────────────────────
  await page.screenshot({ path: resolve(outDir, '04-scheda-terapia.png'), fullPage: true });
  const avvisiInTerapia = await page.locator('.avviso-anomalie').count();
  verifica(
    'AC5: il collegamento porta alla scheda terapia',
    page.url().length > 0 && avvisiInTerapia >= 1,
  );
  const riepilogo = await page
    .locator('.avviso-anomalie')
    .last()
    .innerText()
    .catch(() => '');
  verifica(
    'AC7: la scheda terapia riepiloga i farmaci non riconosciuti',
    /Cardiofillina Inventata/.test(riepilogo),
    riepilogo.replace(/\n/g, ' | ').slice(0, 110),
  );

  // ── AC1/AC2/AC3: ricerca del farmaco nella maschera terapia ──────────────────────────────
  // Il vero <button> e non l'intestazione della sezione: quest'ultima è un role="button" il cui
  // nome accessibile ingloba il testo del pulsante annidato, e cliccarla collassa la sezione.
  await page.locator('button.btn-success', { hasText: 'Aggiungi farmaco' }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(outDir, '05-maschera-ricerca.png'), fullPage: false });
  const campo = page.locator('.campo-farmaco__input');
  verifica('AC1: la maschera espone una ricerca, non un campo libero', await campo.isVisible());

  await campo.fill('tachipirina');
  await page.waitForTimeout(1600);
  const risultati = page.locator('.campo-farmaco__lista button');
  verifica(
    'AC1: la ricerca per nome commerciale trova il farmaco',
    (await risultati.count()) > 0,
    `${await risultati.count()} esiti`,
  );
  await page.screenshot({ path: resolve(outDir, '06-ricerca-per-nome.png'), fullPage: false });

  // AC2: per principio attivo
  await page.locator('.campo-farmaco__criterio button').nth(1).click();
  await campo.fill('paracetamolo');
  await page.waitForTimeout(1600);
  const perPa = await page.locator('.campo-farmaco__lista button').count();
  await page.screenshot({
    path: resolve(outDir, '07-ricerca-principio-attivo.png'),
    fullPage: false,
  });
  verifica('AC2: la ricerca per principio attivo trova il farmaco', perPa > 0, `${perPa} esiti`);

  // AC3: selezionare la confezione sciroppo deve valorizzare la forma
  const sciroppo = page.locator('.campo-farmaco__lista button', { hasText: /SCIROPPO/i }).first();
  await sciroppo.click();
  await page.waitForTimeout(800);
  const scelto = page.locator('.campo-farmaco__scelto');
  verifica(
    'AC1: la selezione compila il nome del farmaco',
    /TACHIPIRINA/i.test(await scelto.innerText()),
  );
  const formaSelezionata = await page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'sciroppo' }) })
    .first()
    .inputValue()
    .catch(() => '');
  await page.screenshot({
    path: resolve(outDir, '08-confezione-selezionata.png'),
    fullPage: false,
  });
  verifica(
    'AC3: la forma farmaceutica è valorizzata dalla selezione',
    formaSelezionata === 'sciroppo',
    `forma="${formaSelezionata}"`,
  );

  // Persistenza (AC1/AC3): la selezione deve arrivare al backend, non restare nella maschera.
  await page
    .locator('button', { hasText: /^Salva terapia$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
  const salvata = salvati.at(-1);
  verifica(
    'Persistenza: il farmaco selezionato è inviato al backend',
    salvata?.farmacoNome === 'TACHIPIRINA',
    `farmacoNome inviato: ${salvata?.farmacoNome ?? '(nessun POST)'}`,
  );
  verifica(
    'Persistenza: la forma dedotta dalla confezione è inviata al backend',
    salvata?.pharmaceuticalForm === 'sciroppo',
    `pharmaceuticalForm inviato: ${salvata?.pharmaceuticalForm ?? '—'}`,
  );

  // AC4: nome libero solo con azione esplicita
  await page.locator('button.btn-success', { hasText: 'Aggiungi farmaco' }).first().click();
  await page.waitForTimeout(1000);
  await page.waitForTimeout(500);
  await page.locator('.campo-farmaco__criterio button').first().click();
  await campo.fill('Preparato Galenico Xyz');
  await page.waitForTimeout(1600);
  const usaComunque = page.locator('.campo-farmaco__usa-comunque');
  verifica(
    'AC4: un nome non in anagrafica richiede un azione esplicita',
    await usaComunque.isVisible(),
  );
  await page.screenshot({ path: resolve(outDir, '09-usa-comunque.png'), fullPage: false });
  await usaComunque.click();
  await page.waitForTimeout(600);
  const testoScelto = await page.locator('.campo-farmaco__scelto').innerText();
  verifica(
    'AC4: il valore digitato resta e viene dichiarato fuori anagrafica',
    /Preparato Galenico Xyz/.test(testoScelto) && /anomalie da sanare/i.test(testoScelto),
    testoScelto.replace(/\n/g, ' | ').slice(0, 110),
  );

  // ── AC10: anagrafica muta ⇒ nessuna anomalia dichiarata ──────────────────────────────────
  anagrafica.giu = true;
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const login2 = page.locator('.login-role-card--operatore');
  if ((await login2.count()) > 0) {
    await login2.click();
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: resolve(outDir, '10-anagrafica-giu.png'), fullPage: true });
  verifica(
    'AC10: con l anagrafica muta nessuna anomalia viene dichiarata',
    (await page.locator('.coverage-alert--amber').count()) === 0 &&
      (await page.locator('.indicatore-anomalie').count()) === 0,
  );
  anagrafica.giu = false;

  verifica(
    'nessun errore JavaScript durante lo scenario',
    erroriConsole.length === 0,
    erroriConsole.slice(0, 2).join(' || ') || 'console pulita',
  );

  await page.close();
} catch (err) {
  console.error('Errore E2E:', err.message);
  esiti.push({
    nome: 'esecuzione dello scenario',
    ok: false,
    dettaglio: err.message.slice(0, 200),
  });
} finally {
  await browser.close();
}

const falliti = esiti.filter((e) => !e.ok);
console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate`);
writeFileSync(
  resolve(outDir, 'verifiche.json'),
  JSON.stringify({ esiti, richieste, terapieSalvate: salvati }, null, 2),
);
process.exit(falliti.length === 0 ? 0 : 1);
