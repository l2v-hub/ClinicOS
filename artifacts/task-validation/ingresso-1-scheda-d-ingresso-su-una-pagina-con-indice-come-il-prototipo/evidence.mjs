// Evidenza browser: scheda d'ingresso su una pagina con indice (HMI 1). Stub :3001; le bozze
// d'ingresso (/intake/drafts) sono simulate con page.route (lo stub non le implementa).
//   BASE=http://localhost:4182 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/ingresso-1-scheda-d-ingresso-su-una-pagina-con-indice-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4182';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const ROW = {
  farmacoNome: 'Farmaco sintetico',
  forma: 'CPR',
  dosaggio: '20 MG',
  viaSomministrazione: 'OS',
  quantita: '1/2 Cpr',
  orari: ['08:00', '20:00'],
  giorni: ['Lun', 'Mer'],
  dataInizio: '2026-09-15',
  classe: '',
  note: '',
  originalText: 'Fixture sintetica',
  stato: 'ok',
};
const SEEDED = {
  anagrafica: { firstName: 'Teresa', lastName: 'Galli', dateOfBirth: '1939-02-05', sex: 'F' },
  terapiaImport: [ROW],
  _importedFields: ['anagrafica', 'terapia', 'allergie'],
  allergie: [{ allergene: 'Penicillina', gravita: 'grave' }],
  allergieStatus: 'presenti',
  _importProposals: [
    {
      id: 'pr1',
      groupId: 'g1',
      inputHash: 'h1',
      row: { ...ROW, farmacoNome: 'Farmaco proposto' },
      status: 'pending',
    },
  ],
};

const browser = await chromium.launch();
/** confirmMode: 'ok' | 'duplicate' | 'allergy' */
async function openIntake(width, { seed = null, confirmMode = 'ok' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const drafts = new Map();
  const calls = { patch: [], confirm: [] };
  let confirmCount = 0;
  await page.route(/\/intake\/drafts(\/.*)?(\?.*)?$/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const parts = url.pathname.split('/').filter(Boolean); // intake, drafts, [id], [action]
    const id = parts[2];
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (req.method() === 'POST' && !id) {
      const d = {
        id: `d${drafts.size + 1}`,
        version: 1,
        status: 'draft',
        data: seed ? structuredClone(seed) : {},
      };
      drafts.set(d.id, d);
      return route.fulfill({ status: 201, json: d });
    }
    const d = drafts.get(id);
    if (!d) return route.fulfill({ status: 404, json: { error: 'non trovata' } });
    if (req.method() === 'GET') return route.fulfill({ json: d });
    if (req.method() === 'PATCH') {
      const { expectedDraftVersion, ...patch } = body;
      calls.patch.push(patch);
      d.data = { ...d.data, ...patch };
      d.version += 1;
      return route.fulfill({ json: d });
    }
    if (parts[3] === 'confirm') {
      calls.confirm.push(body);
      confirmCount += 1;
      if (confirmMode === 'duplicate' && !body.confirmDuplicate)
        return route.fulfill({ status: 409, json: { status: 'duplicate', error: 'duplicate' } });
      if (confirmMode === 'allergy' && !body.confirmAllergyConflict)
        return route.fulfill({
          status: 422,
          json: { error: 'Rilevate allergie contrastanti nel documento' },
        });
      d.status = 'confirmed';
      return route.fulfill({ json: { status: 'created', patient: { id: 'p001' } } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).first().click();
  await page.waitForTimeout(700);
  await page.locator('.nps-option').nth(2).click();
  await page.waitForSelector('[data-testid="intake-section-anagrafica"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  return { page, calls, drafts, confirms: () => confirmCount };
}
const idx = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.intake-index__item')].map((b) => ({
      label: b.querySelector('.intake-index__label').textContent,
      status: b.querySelector('.ds-sr-only').textContent.replace(/^: /, ''),
      current: b.getAttribute('aria-current'),
    })),
  );
const missingText = (page) => page.locator('[data-testid="intake-missing"]').first().textContent();

// ── AC1–AC3: pagina unica, indice, conteggio, conferme, creazione ─────────────────────────
{
  const { page, calls } = await openIntake(1180);
  const first = await idx(page);
  const sections = await page.locator('[data-intake-section]').count();
  const nav = await page
    .locator('.intake-page')
    .getByRole('button', { name: /^(Avanti|← Indietro|Indietro)/ })
    .count();
  check(
    'AC1 una pagina: 8 sezioni, indice con 8 voci e stato, nessun Avanti/Indietro',
    sections === 8 && first.length === 8 && nav === 0 && first[0].current === 'location',
    JSON.stringify(first),
  );
  await page.screenshot({ path: `${DIR}/screenshots/pagina-unica-1180.png` });
  // indice → sezione
  await page.locator('.intake-index__item', { hasText: 'Parametri iniziali' }).click();
  await page.waitForTimeout(700);
  const afterJump = await idx(page);
  const inView = await page.evaluate(() => {
    const s = document.querySelector('[data-intake-section="parametri"]').getBoundingClientRect();
    const b = document.querySelector('[data-testid="patient-intake-body"]').getBoundingClientRect();
    return s.top >= b.top - 2 && s.top < b.top + 80;
  });
  check(
    "AC1 un clic nell'indice porta alla sezione e aria-current la segue",
    inView && afterJump.find((i) => i.current === 'location')?.label === 'Parametri iniziali',
    JSON.stringify(afterJump.map((i) => i.current)),
  );
  // conteggio mancanti iniziale e collegamento al campo
  const m0 = await missingText(page);
  const createDisabled0 = await page.getByRole('button', { name: /Crea paziente/ }).isDisabled();
  await page.locator('[data-testid="intake-missing"] summary').click();
  await page.getByRole('button', { name: /Dati anagrafici da correggere/ }).click();
  await page.waitForTimeout(500);
  const focused = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-demographic-field'),
  );
  check(
    'AC2 "Mancano 3 passaggi obbligatori", "Crea paziente" disattivato; il passaggio porta al campo da correggere',
    /Mancano 3 passaggi obbligatori/.test(m0) && createDisabled0 && focused === 'firstName',
    JSON.stringify({ m0, createDisabled0, focused }),
  );
  await page.locator('[data-demographic-field="firstName"]').fill('Teresa');
  await page.locator('[data-demographic-field="lastName"]').fill('Galli');
  await page.waitForTimeout(700);
  const title = await page.locator('#patient-intake-dialog-title').textContent();
  // conferme: interruttori canonici
  const demo = page.locator('[data-testid="accept-demographics"]');
  const ther = page.locator('[data-testid="accept-therapy"]');
  const before = [
    await demo.getAttribute('aria-pressed'),
    await ther.getAttribute('aria-pressed'),
    await ther.textContent(),
  ];
  await demo.click();
  await ther.click();
  await page.waitForTimeout(900);
  const after = [
    await demo.getAttribute('aria-pressed'),
    await ther.getAttribute('aria-pressed'),
    await demo.getAttribute('class'),
  ];
  const lastAccepted = [...calls.patch].reverse().find((p) => p._accepted)?._accepted;
  const m1 = await missingText(page);
  const status = await idx(page);
  check(
    'AC3 conferme come interruttori ds-btn (aria-pressed) salvate nella bozza; indice e conteggio si aggiornano',
    before[0] === 'false' &&
      before[1] === 'false' &&
      /nessuna terapia da inserire/.test(before[2]) &&
      after[0] === 'true' &&
      after[1] === 'true' &&
      /ds-btn ds-btn--secondary/.test(after[2]) &&
      lastAccepted?.demographics === true &&
      lastAccepted?.therapy === true &&
      /Pronto per la creazione/.test(m1) &&
      status.find((s) => s.label === 'Anagrafica').status === 'completata' &&
      status.find((s) => s.label === 'Terapia').status === 'completata',
    JSON.stringify({ before, after, lastAccepted, m1 }),
  );
  check(
    'AC1 intestazione "Nuovo ingresso · Galli Teresa"',
    title === 'Nuovo ingresso · Galli Teresa',
    title,
  );
  // modulo da aprire dopo la creazione
  await page.locator('.intake-index__item', { hasText: 'Moduli da pianificare' }).click();
  await page.locator('[data-testid^="intake-module-"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Crea paziente/ }).click();
  await page.waitForTimeout(2500);
  const landed = await page.evaluate(() => ({
    hash: location.hash,
    open: !!document.querySelector('.intake-page'),
  }));
  check(
    'AC2 "Crea paziente" conferma come prima (nome, cognome) e atterra sul paziente creato',
    calls.confirm.length === 1 &&
      calls.confirm[0].patient.firstName === 'Teresa' &&
      calls.confirm[0].patient.lastName === 'Galli' &&
      landed.hash.startsWith('#/dettaglio-paziente/p001') &&
      !landed.open,
    JSON.stringify({ confirm: calls.confirm[0]?.patient, landed }),
  );
  await page.close();
}

// ── Bozza d'import (seed simulato): campi nelle sezioni giuste, proposta in attesa ───────────
{
  const { page, calls } = await openIntake(1180, { seed: SEEDED });
  const st = await idx(page);
  const m = await missingText(page);
  const inTerapia = await page.locator('[data-intake-section="terapia"]').textContent();
  const inAllergie = await page.locator('[data-intake-section="allergie"]').textContent();
  const name = await page.locator('[data-demographic-field="firstName"]').inputValue();
  check(
    "AC4/import: i dati importati stanno nelle loro sezioni (anagrafica, allergie, terapia) e la proposta d'import blocca",
    name === 'Teresa' &&
      /Farmaco sintetico/.test(inTerapia) &&
      /Farmaco proposto/.test(inTerapia) &&
      /Penicillina/.test(inAllergie) &&
      /proposta d'import da decidere/.test(
        await page.locator('[data-testid="intake-missing"]').innerHTML(),
      ) &&
      /Mancano 3/.test(m),
    JSON.stringify({ m, st: st.map((s) => `${s.label}:${s.status}`) }),
  );
  await page.screenshot({ path: `${DIR}/screenshots/bozza-da-import-1180.png` });
  // "Salva bozza e chiudi" salva e chiude; riaprendo la bozza si ritrova uguale
  await page.locator('[data-testid="accept-demographics"]').click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Salva bozza e chiudi' }).click();
  await page.waitForTimeout(1200);
  const closed = !(await page.locator('.intake-page').count());
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).first().click();
  await page.waitForTimeout(700);
  await page.locator('.nps-option').nth(2).click();
  await page.waitForSelector('[data-testid="intake-section-anagrafica"]');
  await page.waitForTimeout(500);
  const reopened = await page
    .locator('[data-testid="accept-demographics"]')
    .getAttribute('aria-pressed');
  check(
    'AC4 "Salva bozza e chiudi" chiude; riaprendo, la bozza torna con la conferma anagrafica',
    closed && reopened === 'true' && calls.patch.some((p) => p._accepted?.demographics === true),
    JSON.stringify({ closed, reopened }),
  );
  await page.close();
}

// ── AC4: duplicato e allergie contrastanti ──────────────────────────────────────────────────
for (const mode of ['duplicate', 'allergy']) {
  const { page, calls } = await openIntake(1180, {
    seed: {
      anagrafica: { firstName: 'Anna', lastName: 'Rossi' },
      _accepted: { demographics: true, therapy: true },
    },
    confirmMode: mode,
  });
  await page.getByRole('button', { name: /Crea paziente/ }).click();
  await page.waitForTimeout(1200);
  const warn = await page
    .locator('.import-modal__warning')
    .textContent()
    .catch(() => '');
  const action = mode === 'duplicate' ? 'Crea comunque' : 'Conferma comunque';
  await page.getByRole('button', { name: action }).click();
  await page.waitForTimeout(2000);
  const second = calls.confirm[1] ?? {};
  check(
    `AC4 ${mode === 'duplicate' ? 'duplicato: avviso e "Crea comunque"' : 'allergie contrastanti: avviso e "Conferma comunque"'} confermano come prima`,
    (mode === 'duplicate'
      ? /Paziente duplicato rilevato/.test(warn) && second.confirmDuplicate === true
      : /Allergie contrastanti/.test(warn) && second.confirmAllergyConflict === true) &&
      (await page.evaluate(() => location.hash)).startsWith('#/dettaglio-paziente/p001'),
    JSON.stringify({
      warn: warn.slice(0, 80),
      second: { d: second.confirmDuplicate, a: second.confirmAllergyConflict },
    }),
  );
  await page.close();
}

// ── QA: errore di autosalvataggio visibile sotto i 1024px; interruttori mai tagliati a 390 ─────
{
  const { page } = await openIntake(768);
  await page.route(/\/intake\/drafts\/[^/]+$/, (route) =>
    route.request().method() === 'PATCH' ? route.abort() : route.fallback(),
  );
  await page.locator('[data-demographic-field="firstName"]').fill('Anna');
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="patient-intake-step-summary"]');
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent,
      state: el.getAttribute('data-state'),
      role: el.getAttribute('role'),
      visible: r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none',
    };
  });
  check(
    'QA 768: un salvataggio fallito si vede e si annuncia nell\'intestazione, senza "Bozza salvata"',
    s.state === 'error' &&
      s.role === 'status' &&
      s.visible &&
      /Bozza non salvata/.test(s.text) &&
      !/salvata alle/.test(s.text),
    JSON.stringify(s),
  );
  await page.close();
}
{
  const { page } = await openIntake(390);
  const fit = await page.evaluate(() =>
    ['accept-demographics', 'accept-therapy'].map((id) => {
      const b = document.querySelector(`[data-testid="${id}"]`);
      const card = b.closest('.intake-section').getBoundingClientRect();
      const r = b.getBoundingClientRect();
      return {
        id,
        inside: r.left >= card.left - 0.5 && r.right <= card.right + 0.5,
        clipped: b.scrollWidth > b.clientWidth + 1,
        h: Math.round(r.height),
      };
    }),
  );
  check(
    'QA 390: gli interruttori di conferma stanno nella loro card e il testo non è tagliato (va a capo)',
    fit.every((f) => f.inside && !f.clipped && f.h >= 48),
    JSON.stringify(fit),
  );
  await page.screenshot({ path: `${DIR}/screenshots/interruttori-390.png`, fullPage: false });
  await page.close();
}

// ── AC5: larghezze, indice in alto e azioni in basso sotto i 1024px ─────────────────────────
for (const width of [390, 768, 1024, 1440]) {
  const { page } = await openIntake(width);
  const s = await page.evaluate(() => {
    const act = document.querySelector('.intake-index__actions').getBoundingClientRect();
    const nav = document.querySelector('.intake-index__nav').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      actionsBottom: Math.round(act.bottom),
      actionsVisible: act.top >= 0 && act.bottom <= innerHeight + 1,
      navTop: Math.round(nav.top),
      h: innerHeight,
    };
  });
  check(
    `AC5 ${width}: nessuno scorrimento orizzontale; azioni sempre visibili${width < 1024 ? ' in basso, indice in alto' : " nell'indice"}`,
    s.overflow <= 0 &&
      s.actionsVisible &&
      (width >= 1024 || (s.actionsBottom >= s.h - 1 && s.navTop < 200)),
    JSON.stringify(s),
  );
  await page.screenshot({ path: `${DIR}/screenshots/pagina-unica-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
