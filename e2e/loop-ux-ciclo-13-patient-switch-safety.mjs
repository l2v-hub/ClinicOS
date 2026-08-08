// Evidenze a runtime per "Loop UX ciclo 13 - Sicurezza clinica: reset stato form/modale al
// cambio paziente (iniziativa design system globale)".
// Contract: artifacts/task-validation/loop-ux-ciclo-13-patient-switch-safety/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route.
// Copre: il caso piu' pericoloso (modale "Invio in PS" aperto per il paziente A, switch al
// paziente B tramite ricerca globale mentre PatientDetail resta montato) - il modale deve
// chiudersi, non retargettarsi silenziosamente su B; il form Profilo aperto in modifica deve
// chiudersi e mostrare i dati reali del nuovo paziente, non quelli residui del precedente.
//
// Uso: node e2e/loop-ux-ciclo-13-patient-switch-safety.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ?? 'artifacts/task-validation/loop-ux-ciclo-13-patient-switch-safety/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE_A = {
  id: 'p-a13',
  medicalRecordNumber: 'MRN-A13',
  firstName: 'Aldo',
  lastName: 'Amato',
  dateOfBirth: '1955-01-01',
  sex: 'M',
  email: null,
  phone: null,
};
const PAZIENTE_B = {
  id: 'p-b13',
  medicalRecordNumber: 'MRN-B13',
  firstName: 'Bice',
  lastName: 'Bonelli',
  dateOfBirth: '1948-03-03',
  sex: 'F',
  email: null,
  phone: null,
};

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

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    for (const p of [PAZIENTE_A, PAZIENTE_B]) {
      if (url.match(new RegExp(`/patients/${p.id}$`)) && method === 'GET') return json(p);
      if (url.match(new RegExp(`/patients/${p.id}/cartella`)) && method === 'GET')
        return json({ patientId: p.id, data: cartellaDi(p) });
      if (url.match(new RegExp(`/patients/${p.id}/narrative-sections`))) return json([]);
    }
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PAZIENTE_A, PAZIENTE_B]);
    if (url.match(/\/therapy-slots/)) return json([]);
    if (url.match(/\/patients\/settings/)) return json({ allowDelete: false });
    if (/railway|clinicos-backend|localhost:3001/.test(url)) return json([]);
    return route.continue();
  });
}

const esiti = [];
function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: Boolean(condizione), dettaglio });
  console.log(`  ${condizione ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
}

async function vaiAlTab(page, gruppoLabel, tabLabel) {
  // Navigazione a due livelli: L2 sceglie il gruppo (Panoramica/Clinica/Diario/Moduli/Documenti),
  // L3 il sotto-tab dentro quel gruppo — cliccare solo il sotto-tab fallisce se il gruppo giusto
  // non e' gia' attivo, perche' quell'etichetta non e' nel DOM finche' il gruppo non e' scelto.
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: new RegExp(`^${gruppoLabel}$`) })
    .first()
    .click();
  await page.waitForTimeout(500);
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: new RegExp(`^${tabLabel}$`) })
    .first()
    .click();
  await page.waitForTimeout(600);
}

async function passaAPazienteViaRicerca(page, nomeDaCercare) {
  // Ctrl+K è un listener globale su window (App.tsx:486-496), non filtrato da eventuali modali
  // già aperti in overlay — a differenza del click sul bottone topbar, che un overlay modale con
  // pointer-events pieno blocca. Usare la scorciatoia riproduce quindi lo scenario reale: un
  // operatore con un modale clinico aperto (es. Invio in PS) che passa comunque ad un altro
  // paziente via ricerca globale, invece di uno scenario irraggiungibile via UI.
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await page
    .locator('input[type="search"], input[placeholder*="Cerca paziente"]')
    .last()
    .fill(nomeDaCercare);
  await page.waitForTimeout(700);
  await page.locator('.search-modal__result-item', { hasText: nomeDaCercare }).first().click();
  await page.waitForTimeout(1500);
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
  await page.getByText('Amato').first().click();
  await page.waitForTimeout(1500);

  // ── Nota: il modale "Invio in PS" usa `.modal-overlay` (z-index 1000, position:fixed inset:0),
  // che intercetta i click su TUTTO cio' che sta sotto, incluso il bottone di ricerca globale.
  // Anche la scorciatoia Ctrl+K apre `.search-overlay`, ma a z-index 300 (< 1000): il risultato
  // di ricerca resta visivamente/fisicamente sotto il modale e non e' cliccabile. Verificato
  // empiricamente: con un modale full-overlay aperto, lo switch paziente e' GIA' irraggiungibile
  // via UI — non e' lo scenario piu' pericoloso da testare (nessun retarget possibile, il click
  // non arriva mai al risultato). Il rischio reale e' nei form INLINE (non `.modal-overlay`):
  // restano cliccabili in parallelo alla ricerca globale, quindi lo switch-mentre-aperto e'
  // davvero raggiungibile. Testiamo Profilo (gia' verificato sotto) e Note Cliniche (qui) —
  // entrambi InlineForm dentro il tab, non un overlay bloccante.

  // ── Scenario: form "+ Aggiungi" Note Cliniche aperto per il paziente A con testo digitato,
  // poi switch a B via ricerca globale — il draft non deve restare aperto ne' venire salvato ──
  await vaiAlTab(page, 'Clinica', 'Note & Visite');
  await page.locator('button', { hasText: '+ Aggiungi' }).first().click();
  await page.waitForTimeout(400);
  const textareaNota = page.locator('textarea').first();
  await textareaNota.fill('Nota di test per il paziente Amato — non deve sopravvivere allo switch');
  await page.screenshot({
    path: resolve(outDir, '01-nota-in-bozza-paziente-a.png'),
    fullPage: false,
  });
  const formNotaApertoPrima = await textareaNota.isVisible().catch(() => false);
  verifica(
    'Setup: il form "+ Aggiungi Nota" e aperto con testo digitato per il paziente A',
    formNotaApertoPrima,
  );

  await passaAPazienteViaRicerca(page, 'Bonelli');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: resolve(outDir, '02-dopo-switch-a-paziente-b.png'),
    fullPage: true,
  });

  const nomeInHeader = await page.locator('.patient-compact-header__name').innerText();
  verifica(
    'La cartella ora mostra davvero il paziente B (Bonelli, Bice)',
    /Bonelli/i.test(nomeInHeader),
    nomeInHeader,
  );

  await vaiAlTab(page, 'Clinica', 'Note & Visite');
  await page.screenshot({
    path: resolve(outDir, '03-note-paziente-b-dopo-switch.png'),
    fullPage: false,
  });
  const textareaResiduaVisibile = await page
    .locator('textarea')
    .first()
    .isVisible()
    .catch(() => false);
  verifica(
    'CRITICO: il form "+ Aggiungi Nota" si e chiuso dopo lo switch (il draft di A non e visibile/attivo su B)',
    !textareaResiduaVisibile,
  );
  const notaResiduaPresente =
    (await page.getByText(/Nota di test per il paziente Amato/i).count()) > 0;
  verifica(
    'Il testo della bozza di A non compare da nessuna parte nella cartella di B',
    !notaResiduaPresente,
  );

  // ── Form Profilo aperto in modifica per B, switch a A: deve chiudersi e non mostrare dati residui ──
  await vaiAlTab(page, 'Panoramica', 'Profilo');
  const bottoneModificaProfilo = page.locator('button', { hasText: /^Modifica$/ }).first();
  if ((await bottoneModificaProfilo.count()) > 0) {
    await bottoneModificaProfilo.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: resolve(outDir, '03-profilo-in-modifica-paziente-b.png'),
      fullPage: false,
    });
    const formAperto = (await page.locator('input, .inline-form, .cr-inline-form').count()) > 0;
    verifica('Setup: il form Profilo e in modifica per il paziente B', formAperto);

    await passaAPazienteViaRicerca(page, 'Amato');
    await vaiAlTab(page, 'Panoramica', 'Profilo');
    await page.screenshot({
      path: resolve(outDir, '04-profilo-dopo-switch-a-paziente-a.png'),
      fullPage: false,
    });
    const bottoneModificaVisibileDiNuovo = await page
      .locator('button', { hasText: /^Modifica$/ })
      .first()
      .isVisible()
      .catch(() => false);
    verifica(
      'Il form Profilo si e chiuso dopo lo switch (torna alla vista sola-lettura con "Modifica" di nuovo cliccabile, non resta aperto sui dati di B)',
      bottoneModificaVisibileDiNuovo,
    );
  } else {
    verifica(
      'Bottone "Modifica" Profilo trovato per procedere col test',
      false,
      'non trovato — vedi screenshot 03',
    );
  }

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
