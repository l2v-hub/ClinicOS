// Evidenze a runtime per "Loop UX ciclo 7 - Terapia Farmacologica flusso piu usato".
// Contract: artifacts/task-validation/loop-ux-ciclo-7-terapia-farmacologica-flusso-piu-usato/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route (vedi
// reference-ui-runtime-evidence-without-db). Copre AC1, AC-R1, AC-R2, AC4-AC7, AC9-AC11.
//
// Uso: node e2e/loop-ux-ciclo-7-terapia-farmacologica.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-7-terapia-farmacologica-flusso-piu-usato/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE = {
  id: 'p-t7',
  medicalRecordNumber: 'MRN-T7',
  firstName: 'Elena',
  lastName: 'Ferraris',
  dateOfBirth: '1951-03-14',
  sex: 'F',
  email: null,
  phone: null,
};

// t-riconosciuto: farmaco in anagrafica -> deve mostrare l'icona documento (AC7/AC9).
// t-fantasma: farmaco fuori anagrafica -> deve mostrare la pillola "non in anagrafica".
// t-bis: bigiornaliera (mattina+sera) -> due righe distinte in Giornaliere (AC1, rowKey).
// t-bisogno: tipo al_bisogno -> badge teal, non ambra, accanto a Stato attiva (AC11).
let therapies = [
  {
    id: 't-riconosciuto',
    patientId: PAZIENTE.id,
    farmacoNome: 'TACHIPIRINA',
    dosaggio: '500 MG',
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
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 't-fantasma',
    patientId: PAZIENTE.id,
    farmacoNome: 'Farmaco Fantasma',
    dosaggio: '10 MG',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-07-01',
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
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 't-bisogno',
    patientId: PAZIENTE.id,
    farmacoNome: 'TACHIPIRINA',
    dosaggio: '1000 MG',
    viaSomministrazione: 'orale',
    tipo: 'al_bisogno',
    stato: 'attiva',
    dataInizio: '2026-07-01',
    dataFine: null,
    fasceMattina: false,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: false,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: 'Dr. Neri',
    operatoreInseritore: 'Inf. Verdi',
    note: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
];

/** Confezione riconosciuta: solo TACHIPIRINA esiste in anagrafica. */
const CONFEZIONI = [
  {
    aic: '012745028',
    denominazione: 'TACHIPIRINA',
    descrizione: '20 COMPRESSE 500 MG',
    forma: 'Compressa',
    atc: 'N02BE01',
    statoAmministrativo: 'Autorizzata',
    fornitura: 'Con ricetta',
    linkFi: null,
    linkRcp: 'https://api.aifa.gov.it/finto/rcp',
    principiAttivi: [{ nome: 'PARACETAMOLO', quantita: 500, unita: 'mg' }],
    confidenza: 1,
    criterio: 'esatto',
  },
];

function cartellaDi(p) {
  return {
    pazienteId: p.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '2',
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
}

/** /therapy-slots per la data corrente: t-riconosciuto in mattina, t-bis in mattina+sera. */
function slotsDelReparto() {
  function admin(therapyId, drugName, dose, fascia, ora) {
    return {
      administrationId: null,
      therapyId,
      drugName,
      dosage: dose,
      farmacoDose: dose,
      quantityLabel: '1 compressa',
      route: 'orale',
      scheduledTime: ora,
      status: 'pending',
      administeredAt: null,
      administeredBy: null,
      notAdministeredReason: null,
    };
  }
  const mattina = {
    id: 'ts-mattina',
    fascia: 'mattina',
    label: 'Mattina',
    ora: '08:00',
    summary: { total: 2, administered: 0, notAdministered: 0, pending: 2 },
    patients: [
      {
        patientId: PAZIENTE.id,
        firstName: PAZIENTE.firstName,
        lastName: PAZIENTE.lastName,
        room: '2',
        bed: 'A',
        administrations: [
          admin('t-riconosciuto', 'TACHIPIRINA', '500 MG', 'mattina', '08:00'),
          admin('t-bis', 'TACHIPIRINA', '500 MG', 'mattina', '08:00'),
        ],
      },
    ],
  };
  const sera = {
    id: 'ts-sera',
    fascia: 'sera',
    label: 'Sera',
    ora: '20:00',
    summary: { total: 1, administered: 0, notAdministered: 0, pending: 1 },
    patients: [
      {
        patientId: PAZIENTE.id,
        firstName: PAZIENTE.firstName,
        lastName: PAZIENTE.lastName,
        room: '2',
        bed: 'A',
        administrations: [admin('t-bis', 'TACHIPIRINA', '500 MG', 'sera', '20:00')],
      },
    ],
  };
  return [mattina, sera];
}

/** Storico: 30 righe per verificare la paginazione a 25 (AC8). */
function storicoDiReparto() {
  const righe = [];
  for (let i = 0; i < 30; i++) {
    righe.push({
      id: `h-${i}`,
      patientId: PAZIENTE.id,
      therapyId: 't-riconosciuto',
      farmacoNome: 'TACHIPIRINA',
      farmacoDose: '500 MG',
      status: i % 2 === 0 ? 'administered' : 'not_administered',
      scheduledTime: '08:00',
      administeredAt: i % 2 === 0 ? '2026-08-01T08:05:00.000Z' : null,
      administeredBy: i % 2 === 0 ? 'Inf. Verdi' : null,
      notAdministeredReason: i % 2 === 0 ? null : 'Paziente a digiuno',
      date: '2026-08-01',
    });
  }
  return righe;
}

let salvataggioFallisce = false;
const salvati = [];
const richieste = [];

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (/localhost:3001|railway|clinicos-backend/.test(url) || url.includes('/farmaci/'))
      richieste.push(`${method} ${url.replace(/^https?:\/\/[^/]+/, '')}`);

    if (url.match(/\/farmaci\/cerca/)) {
      const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '').toUpperCase();
      if (q.includes('TACHIPIRINA')) return json({ query: q, esiti: CONFEZIONI });
      return json({ query: q, esiti: [] });
    }
    if (url.match(/\/therapy-slots/) && method === 'GET') return json(slotsDelReparto());

    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PAZIENTE]);
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}$`)) && method === 'GET')
      return json(PAZIENTE);
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/cartella`)) && method === 'GET')
      return json({ patientId: PAZIENTE.id, data: cartellaDi(PAZIENTE) });
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/narrative-sections`))) return json([]);
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/medication-administrations`)))
      return json(storicoDiReparto());

    const mTherapyId = url.match(new RegExp(`/patients/${PAZIENTE.id}/therapies/([\\w-]+)$`));
    if (mTherapyId && (method === 'PUT' || method === 'DELETE')) {
      const id = mTherapyId[1];
      if (method === 'PUT') {
        const corpo = route.request().postDataJSON();
        if (salvataggioFallisce) return json({ error: 'errore simulato' }, 500);
        therapies = therapies.map((t) => (t.id === id ? { ...t, ...corpo } : t));
        return json(therapies.find((t) => t.id === id));
      }
      therapies = therapies.filter((t) => t.id !== id);
      return json({}, 200);
    }
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/therapies`))) {
      if (method === 'POST') {
        const corpo = route.request().postDataJSON();
        if (salvataggioFallisce) return json({ error: 'errore simulato' }, 500);
        const nuova = { id: `t-nuovo-${salvati.length}`, ...corpo };
        salvati.push(corpo);
        therapies = [...therapies, nuova];
        return json(nuova, 201);
      }
      return json(therapies);
    }
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
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
  page.on('console', (m) => {
    if (m.type() === 'error') erroriConsole.push(m.text().slice(0, 140));
  });
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
  await page.getByText('Ferraris').first().click();
  await page.waitForTimeout(1500);

  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Clinica$/ })
    .first()
    .click();
  await page.waitForTimeout(1000);
  const tabTerapia = page
    .locator('.teams-sidebar__item, [role="tab"], button')
    .filter({ hasText: /Terapia Farmacologica/ })
    .first();
  if ((await tabTerapia.count()) > 0) {
    await tabTerapia.click();
    await page.waitForTimeout(1200);
  } else {
    console.log('DEBUG: tab "Terapia Farmacologica" non trovata');
  }

  // ── AC7/AC9: stati del farmaco nella tabella "Farmaci attivi" ────────────────────────────
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(outDir, '01-farmaci-attivi.png'), fullPage: true });
  const iconaDocumento = page.locator('.icon-btn--inline').first();
  verifica(
    'AC7: il farmaco riconosciuto mostra l icona del documento AIFA',
    await iconaDocumento.isVisible(),
  );
  const pillolaNonTrovato = page.locator('.farmaco-non-trovato', { hasText: 'non in anagrafica' });
  verifica(
    'AC7: il farmaco fuori anagrafica mostra la pillola "non in anagrafica"',
    await pillolaNonTrovato.first().isVisible(),
  );

  // AC9: nessuna riga vada a capo per via del pulsante inline (icon-btn e' display:flex).
  // Confronto fra l'altezza della riga con icona e quella di una riga senza icona: se il
  // pulsante andasse a capo, la riga con icona sarebbe alta il doppio (testo + icona impilati).
  const rigaConIcona = page.locator('tr', { hasText: 'TACHIPIRINA' }).first();
  const rigaSenzaIcona = page.locator('tr', { hasText: 'Farmaco Fantasma' }).first();
  const boxRigaConIcona = await rigaConIcona.boundingBox();
  const boxRigaSenzaIcona = await rigaSenzaIcona.boundingBox();
  verifica(
    'AC9: il pulsante documento resta sulla stessa riga del nome farmaco (righe della tabella della stessa altezza)',
    boxRigaConIcona &&
      boxRigaSenzaIcona &&
      Math.abs(boxRigaConIcona.height - boxRigaSenzaIcona.height) <= 4,
    `rigaConIconaH=${boxRigaConIcona?.height?.toFixed(1)} rigaSenzaIconaH=${boxRigaSenzaIcona?.height?.toFixed(1)}`,
  );

  // AC11: al_bisogno non e' ambra (colore riservato a "sospesa" nella colonna Stato adiacente).
  const rigaBisogno = page.locator('tr', { hasText: 'al bisogno' }).first();
  const badgeTipo = rigaBisogno.locator('.badge').filter({ hasText: 'al bisogno' }).first();
  const classiBadge = (await badgeTipo.getAttribute('class')) ?? '';
  verifica(
    'AC11: il tipo "al bisogno" usa badge--teal, non badge--amber',
    classiBadge.includes('badge--teal') && !classiBadge.includes('badge--amber'),
    classiBadge,
  );

  // AC10: bersagli di tocco >= 44px per i sub-tab.
  const subtabBox = await page.locator('.tf-subtab').first().boundingBox();
  verifica(
    'AC10: il sub-tab ha un area di tocco di almeno 44px',
    subtabBox && subtabBox.height >= 44,
    `height=${subtabBox?.height?.toFixed(1)}`,
  );

  // ── AC6: Sospendi chiede conferma e non e' colorato come Elimina ─────────────────────────
  const pulsanteSospendi = page
    .locator('tr', { hasText: 'TACHIPIRINA' })
    .filter({ hasText: '500' })
    .first()
    .locator('button[title="Sospendi"]');
  const classiSospendi = (await pulsanteSospendi.getAttribute('class')) ?? '';
  verifica(
    'AC6: il pulsante Sospendi non ha piu la classe icon-btn--danger',
    !classiSospendi.includes('icon-btn--danger'),
    classiSospendi,
  );
  await pulsanteSospendi.click();
  await page.waitForTimeout(500);
  const dialogoSospendi = page.locator('.modal-box--confirm');
  verifica('AC6: la sospensione apre un ConfirmDialog', await dialogoSospendi.isVisible());
  const iconaTono = dialogoSospendi.locator('.confirm-dialog__icon--primary');
  verifica(
    'AC6: il dialogo usa tone="primary" (azione reversibile), non "danger"',
    await iconaTono.isVisible(),
  );
  await page.screenshot({ path: resolve(outDir, '02-sospendi-conferma.png'), fullPage: false });
  await dialogoSospendi.locator('button', { hasText: 'Sospendi terapia' }).click();
  await page.waitForTimeout(1200);
  verifica(
    'AC6: dopo conferma il dialogo si chiude',
    (await dialogoSospendi.count()) === 0 || !(await dialogoSospendi.isVisible()),
  );

  const tabSospese = page.locator('.tf-subtab', { hasText: 'Sospese' });
  await tabSospese.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(outDir, '03-sospese.png'), fullPage: true });
  verifica(
    'AC6: la terapia sospesa compare in "Sospese/concluse"',
    /TACHIPIRINA/.test(
      await page
        .locator('.clinicos-table, table')
        .first()
        .innerText()
        .catch(() => ''),
    ),
  );

  // ── AC4/AC5: validazione campo mancante + errore che segue la sotto-scheda ───────────────
  const tabProgrammazione = page.locator('.tf-subtab', { hasText: 'Programmazione' });
  await tabProgrammazione.click();
  await page.waitForTimeout(600);
  await page.locator('button.btn-success', { hasText: 'Nuova terapia' }).first().click();
  await page.waitForTimeout(800);
  const bottoneSalva = page.locator('button.btn-success', {
    hasText: /^(Salva terapia|Aggiorna)$/,
  });
  verifica(
    'AC4: il pulsante Salva e disabilitato senza il farmaco',
    await bottoneSalva.isDisabled(),
  );
  const suggerimento = page.locator('.terapia-sched-form .form-actions .form-hint');
  verifica(
    'AC4: il suggerimento nomina il campo mancante',
    /il prodotto medicinale/.test(await suggerimento.innerText().catch(() => '')),
    await suggerimento.innerText().catch(() => '(assente)'),
  );
  await page.screenshot({ path: resolve(outDir, '04-campo-mancante.png'), fullPage: false });

  const campoRicerca = page.locator('.campo-farmaco__input');
  await campoRicerca.fill('tachipirina');
  await page.waitForTimeout(1200);
  await page.locator('.campo-farmaco__lista button').first().click();
  await page.waitForTimeout(400);
  verifica('AC4: dopo la scelta il pulsante Salva si abilita', await bottoneSalva.isEnabled());

  // AC5: un salvataggio fallito lascia un errore, che sparisce cambiando sotto-scheda.
  salvataggioFallisce = true;
  await bottoneSalva.click();
  await page.waitForTimeout(800);
  const bannerErrore = page.locator('.cr-empty, div', { hasText: /Errore \d/ }).first();
  const erroreVisibilePrima = (await page.getByText(/Errore \d/).count()) > 0;
  verifica('AC5: un salvataggio fallito mostra un banner di errore', erroreVisibilePrima);
  await page.screenshot({ path: resolve(outDir, '05-errore-salvataggio.png'), fullPage: false });
  salvataggioFallisce = false;

  await page.locator('.tf-subtab', { hasText: 'Storico' }).click();
  await page.waitForTimeout(600);
  const erroreVisibileDopo = (await page.getByText(/Errore \d/).count()) > 0;
  verifica(
    'AC5: cambiando sotto-scheda il banner di errore sparisce',
    erroreVisibilePrima && !erroreVisibileDopo,
  );

  // ── AC8: paginazione a 25 righe su Storico (30 righe simulate) ───────────────────────────
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outDir, '06-storico-paginato.png'), fullPage: true });
  const righeStorico = await page.locator('.clinicos-table tbody tr, table tbody tr').count();
  verifica(
    'AC8: lo Storico mostra al massimo 25 righe per pagina su 30 disponibili',
    righeStorico > 0 && righeStorico <= 25,
    `${righeStorico} righe renderizzate`,
  );
  const paginazione = page.locator('.cdt__pagination', { hasText: /Pagina 1 di 2/ });
  verifica(
    'AC8: il controllo di paginazione riporta "Pagina 1 di 2"',
    await paginazione.isVisible(),
  );

  // ── AC1: righe univoche in "Somministrazioni giornaliere" per una terapia bigiornaliera ──
  await page.locator('.tf-subtab', { hasText: 'Giornaliere' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(outDir, '07-giornaliere.png'), fullPage: true });
  const righeGiornaliere = await page.locator('.clinicos-table tbody tr, table tbody tr').count();
  verifica(
    'AC1: la terapia bigiornaliera produce due righe distinte (mattina+sera), non deduplicate',
    righeGiornaliere === 3,
    `${righeGiornaliere} righe (attese 3: 2x t-riconosciuto/t-bis mattina + 1x t-bis sera)`,
  );
  // AC7 nelle tabelle di somministrazione: la cella porta farmacoDose, non dosaggio esatto —
  // e' esattamente il ramo di ripiego per nome che prima non funzionava.
  const iconeGiornaliere = await page
    .locator('.clinicos-table tbody .icon-btn--inline, table tbody .icon-btn--inline')
    .count();
  verifica(
    'AC7: il ripiego per nome mostra l icona documento anche nelle righe di somministrazione',
    iconeGiornaliere >= 1,
    `${iconeGiornaliere} icone`,
  );

  // Il 500 su /therapies e' iniettato di proposito per AC5 (banner di errore): escluso qui,
  // verificato esplicitamente sopra.
  const erroriInattesi = erroriConsole.filter((e) => !/500 \(Internal Server Error\)/.test(e));
  verifica(
    'nessun errore JavaScript inatteso durante lo scenario',
    erroriInattesi.length === 0,
    erroriInattesi.slice(0, 3).join(' || ') || 'console pulita (a parte il 500 iniettato per AC5)',
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
writeFileSync(
  resolve(outDir, 'verifiche.json'),
  JSON.stringify({ esiti, richieste, terapieSalvate: salvati }, null, 2),
);
process.exit(falliti.length === 0 ? 0 : 1);
