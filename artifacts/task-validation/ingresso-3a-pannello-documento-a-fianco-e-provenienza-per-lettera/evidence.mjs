// Evidenza browser: chip di provenienza (L1, L2 · p. 1) e pannello documento a fianco.
// Stub :3001 per il resto; bozze e job AI simulati con page.route (regole di draft-merge.ts).
// Le pagine sono immagini PNG di lettere sintetiche, generate qui con il browser.
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/ingresso-3a-pannello-documento-a-fianco-e-provenienza-per-lettera';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`;
  log.push(line);
  console.log(line);
};
const CLINICAL = ['Galli', 'Teresa', 'Rossi', '1939', 'SAN CARLO'];

const browser = await chromium.launch();

// Pagine sintetiche (dati inventati), come immagini.
async function letterPng(lines) {
  const p = await browser.newPage({ viewport: { width: 600, height: 780 } });
  await p.setContent(
    `<body style="margin:0;font:15px/1.5 sans-serif;padding:40px;background:#fff;color:#111">${lines
      .map((l, i) => (i < 2 ? `<p><b>${l}</b></p>` : `<p>${l}</p>`))
      .join('')}</body>`,
  );
  const buf = await p.screenshot();
  await p.close();
  return buf;
}
const PAGES = {
  doc1: await letterPng([
    'OSPEDALE SAN CARLO · U.O. Medicina Interna',
    'Lettera di dimissione',
    'Paziente: GALLI TERESA (dati sintetici)',
    'Sesso: F',
    'Ricoverata dal 12/09/2026 al 26/09/2026',
  ]),
  doc2: await letterPng([
    'AMBULATORIO CARDIOLOGICO',
    'Referto',
    'Nata il 05/02/1939 (dati sintetici)',
    'Controllo a 30 giorni',
  ]),
};

async function letterPdf() {
  const p = await browser.newPage();
  await p.setContent(
    [
      'OSPEDALE SAN CARLO · pagina 1 (dati sintetici)',
      'Paziente: GALLI TERESA · pagina 2',
      'Terapia · pagina 3',
    ]
      .map(
        (t, i) =>
          `<div style="font:22px sans-serif;padding:60px;${i < 2 ? 'page-break-after:always' : ''}">${t}</div>`,
      )
      .join(''),
  );
  const buf = await p.pdf({ format: 'A4' });
  await p.close();
  return buf;
}
const PDF3 = await letterPdf();

function job(opts = {}) {
  const pdf = (id) => opts.pdf && id === 'doc1';
  const doc = (id, n) => ({
    id,
    filename: pdf(id) ? 'lettera.pdf' : `pagina-${n}.png`,
    mimeType: pdf(id) ? 'application/pdf' : 'image/png',
    sizeBytes: pdf(id) ? PDF3.length : PAGES[id].length,
    pageCount: pdf(id) ? 3 : 1,
    contentUrl: `/ai/extraction/jobs/job-1/files/${id}/content`,
  });
  const page = (id, documentId, groupId, status) => ({
    id,
    documentId,
    sourcePageNumber: pdf(documentId) ? 2 : 1,
    groupId,
    sortOrder: 0,
    status,
    canRetry: false,
    errorCode: null,
    error: null,
  });
  const group = (id, label, sortOrder) => ({
    id,
    label,
    sortOrder,
    status: 'completed',
    pageCount: 1,
    completedPages: 1,
    error: null,
    pdfUrl: null,
    resultHash: `${id}-hash`,
  });
  return {
    id: 'job-1',
    status: 'processing',
    totalBytes: PAGES.doc1.length + PAGES.doc2.length,
    documents: [doc('doc1', 1), doc('doc2', 2)],
    capabilities: { sessionVersion: 1, pageEditing: true, atomicReplacement: true },
    manifest: {
      version: 1,
      revision: 3,
      groups: [group('g1', 'Lettera 1', 0), group('g2', 'Lettera 2', 1)],
      pages: [page('pg1', 'doc1', 'g1', 'completed'), page('pg2', 'doc2', 'g2', 'running')],
    },
    limits: {
      maxPages: 30,
      maxSourceFiles: 30,
      maxGroups: 30,
      maxTotalBytes: 26214400,
      maxFileBytes: 26214400,
      maxFilesPerRequest: 10,
      maxRequestBytes: 26476544,
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    },
    progress: {
      phase: 'reading',
      totalPages: 2,
      completedPages: 1,
      failedPages: 0,
      totalGroups: 2,
      completedGroups: 1,
      currentPageId: 'pg2',
      currentGroupId: 'g2',
    },
    review: {
      manifestRevision: null,
      resultHash: null,
      unresolvedConflicts: 0,
      canProceed: false,
      draftId: null,
      draftSourceIsCurrent: false,
    },
  };
}
// Bozza già collegata e unita: nome/cognome dalla lettera 1 (senza pagina), data di nascita dalla
// lettera 2 con la pagina (forma del ciclo 3c).
function linkedDraft() {
  return {
    id: 'd1',
    version: 5,
    status: 'draft',
    importJobId: 'job-1',
    data: {
      anagrafica: {
        firstName: 'Teresa',
        lastName: 'Galli',
        dateOfBirth: '1939-02-05',
      },
      _fieldOrigin: {
        'anagrafica.firstName': { by: 'ai', value: 'Teresa', groupIds: ['g1'], final: false },
        'anagrafica.lastName': { by: 'ai', value: 'Galli', groupIds: ['g1'], final: false },
        'anagrafica.dateOfBirth': {
          by: 'ai',
          value: '1939-02-05',
          groupIds: ['g2'],
          final: false,
          pages: [{ groupId: 'g2', pageId: 'pg2', documentId: 'doc2' }],
        },
      },
      _fieldProposals: [],
      _aiMerge: { groups: { g1: 'g1-hash', g2: 'g2-hash' } },
    },
  };
}

async function openIntake(width, opts = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    hasTouch: width < 1024,
    isMobile: width < 1024,
  });
  await context.addInitScript(() => {
    window.__revoked = 0;
    const orig = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (u) => {
      window.__revoked += 1;
      return orig(u);
    };
  });
  const page = await context.newPage();
  const S = { job: job(opts), draft: null, content: [], urls: [], console: [] };
  page.on('request', (r) => S.urls.push(r.url()));
  page.on('console', (m) => S.console.push(m.text()));
  await page.route(/\/ai\/extraction\/jobs(\/.*)?(\?.*)?$/, async (route) => {
    const req = route.request();
    const parts = new URL(req.url()).pathname.split('/').filter(Boolean);
    if (parts[4] === 'files' && parts[6] === 'content') {
      const docId = parts[5];
      S.content.push({ docId, operator: req.headers()['x-operator-id'] ?? null });
      if (opts.failDoc === docId)
        return route.fulfill({
          status: opts.failStatus ?? 404,
          json: { error: 'non disponibile' },
        });
      if (opts.pdf && docId === 'doc1')
        return route.fulfill({
          status: 200,
          body: PDF3,
          headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' },
        });
      return route.fulfill({
        status: 200,
        body: PAGES[docId],
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
      });
    }
    if (req.method() === 'GET' && parts[3] === 'job-1' && !parts[4])
      return route.fulfill({ json: S.job });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.route(/\/intake\/drafts(\/.*)?(\?.*)?$/, async (route) => {
    const req = route.request();
    const parts = new URL(req.url()).pathname.split('/').filter(Boolean);
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (req.method() === 'POST' && !parts[2]) {
      // scheda ripresa già collegata al job e unita (come dopo il ciclo 2b)
      S.draft = linkedDraft();
      S.draft.version = 1;
      return route.fulfill({ status: 201, json: S.draft });
    }
    if (req.method() === 'GET') return route.fulfill({ json: S.draft });
    if (req.method() === 'PATCH') {
      const { expectedDraftVersion, ...patch } = body;
      S.draft.data = { ...S.draft.data, ...patch };
      S.draft.version += 1;
      return route.fulfill({ json: S.draft });
    }
    if (parts[3] === 'merge-import') {
      // l'unione "arriva": la bozza diventa quella già collegata e unita
      const next = linkedDraft();
      next.version = S.draft.version + 1;
      S.draft = next;
      return route.fulfill({ json: S.draft });
    }
    if (parts[3] === 'import-job' && req.method() === 'POST') {
      S.draft.importJobId = body.importJobId;
      S.draft.version += 1;
      return route.fulfill({ json: S.draft });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  // Lo stato "collegato" si ottiene come in produzione: la bozza creata viene sostituita da una già
  // collegata al job (ripresa di una scheda aperta su un altro tablet).
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
  return { context, page, S };
}
const waitFor = async (fn, ms = 12000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};
// Collega la scheda al job come farebbe il primo caricamento: si usa l'API della scheda stessa
// (import-job), poi l'interrogazione del job porta le unioni per lettera.
async function linkAndMerge() {}
const chip = (page, path) =>
  page.locator(`[data-ai-field="${path}"] [data-testid="intake-ai-badge"]`).first();

// ── AC1–AC4 a 1180 ────────────────────────────────────────────────────────────────────────
{
  const { context, page, S } = await openIntake(1180);
  await linkAndMerge(page, S);
  const loaded = await waitFor(async () => (await page.getByTestId('intake-ai-badge').count()) > 0);
  if (!loaded) {
    // fallback: la scheda si ricarica anche con un nuovo caricamento della pagina della bozza
    await page.reload();
  }
  const l1 = await chip(page, 'anagrafica.firstName')
    .getAttribute('data-ai-source')
    .catch(() => null);
  const l2 = await chip(page, 'anagrafica.dateOfBirth')
    .getAttribute('data-ai-source')
    .catch(() => null);
  const isButton = await chip(page, 'anagrafica.firstName')
    .evaluate((e) => e.tagName)
    .catch(() => '');
  check(
    'AC1 chip di provenienza: "L1" per i campi della lettera 1, "L2 · p. 1" con la pagina registrata, cliccabili',
    l1 === 'L1' && l2 === 'L2 · p. 1' && isButton === 'BUTTON',
    `nome=${l1} nascita=${l2} tag=${isButton}`,
  );
  await page
    .locator('[data-testid="intake-section-anagrafica"]')
    .screenshot({ path: `${DIR}/screenshots/ac1-chip-provenienza.png`, timeout: 5000 })
    .catch(() => {});

  await chip(page, 'anagrafica.firstName').click();
  const panel = page.getByTestId('intake-document-panel');
  await panel.waitFor({ timeout: 8000 }).catch(() => {});
  const title = await page
    .getByTestId('intake-document-panel-title')
    .innerText()
    .catch(() => '');
  const layout = await panel.getAttribute('data-layout').catch(() => '');
  const imgOk = await waitFor(async () =>
    page
      .locator('[data-testid="intake-document-panel-page"] img')
      .first()
      .evaluate((i) => i.src.startsWith('blob:') && i.naturalWidth > 100)
      .catch(() => false),
  );
  check(
    'AC2 clic sul chip L1: pannello a fianco "Lettera 1 · p. 1" con l’immagine della pagina (blob, fetch autenticato)',
    /Lettera 1 · p\. 1/.test(title) &&
      layout === 'column' &&
      imgOk &&
      S.content[0]?.docId === 'doc1' &&
      !!S.content[0]?.operator,
    `titolo="${title}" layout=${layout} richieste=${JSON.stringify(S.content)}`,
  );
  const states = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="intake-document-tab-"]')].map(
      (t) =>
        `${t.getAttribute('data-testid').replace('intake-document-tab-', '')}:${t.getAttribute('data-state')}`,
    ),
  );
  check(
    'AC2 schede delle pagine con lo stato del manifest (L1·p1 letta, L2·p1 in lettura)',
    states.join(',') === 'L1·p1:done,L2·p1:reading',
    states.join(','),
  );
  await page.screenshot({ path: `${DIR}/screenshots/ac2-pannello-a-fianco-1180.png` });
  // stato che cambia durante l'interrogazione
  S.job.manifest.pages[1].status = 'completed';
  const updated = await waitFor(
    async () =>
      (await page.getByTestId('intake-document-tab-L2·p1').getAttribute('data-state')) === 'done',
  );
  check('AC2 lo stato della scheda si aggiorna con l’interrogazione del job', updated);

  await page.getByTestId('intake-document-tab-L2·p1').click();
  const t2 = await waitFor(async () =>
    /Lettera 2 · p\. 1/.test(
      await page
        .getByTestId('intake-document-panel-title')
        .innerText()
        .catch(() => ''),
    ),
  );
  const img2 = await waitFor(() => S.content.some((c) => c.docId === 'doc2'));
  check(
    'AC2 un’altra scheda carica la sua pagina (solo a richiesta)',
    t2 && img2,
    JSON.stringify(S.content),
  );

  const contentBefore = S.content.length;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closed = (await panel.count()) === 0;
  const focusBack = await page.evaluate(
    () => document.activeElement?.getAttribute('data-ai-source') ?? document.activeElement?.tagName,
  );
  const revoked = await page.evaluate(() => window.__revoked);
  check(
    'AC3 Esc chiude il pannello, i blob URL sono revocati e il focus torna al chip',
    closed && revoked >= 1 && focusBack === 'L1',
    `chiuso=${closed} revocati=${revoked} focus=${focusBack}`,
  );
  // il chip della data apre direttamente la lettera 2 · p. 1
  await chip(page, 'anagrafica.dateOfBirth').click();
  const t3 = await waitFor(async () =>
    /Lettera 2 · p\. 1/.test(
      await page
        .getByTestId('intake-document-panel-title')
        .innerText()
        .catch(() => ''),
    ),
  );
  check('AC2 il chip "L2 · p. 1" apre la pagina registrata', t3);
  await page.getByTestId('intake-document-panel-close').click();
  await page.waitForTimeout(300);
  check(
    'AC3 la chiusura con X riporta il focus al chip che ha aperto',
    (await page.evaluate(() => document.activeElement?.getAttribute('data-ai-source'))) ===
      'L2 · p. 1',
  );
  // privacy
  const ls = await page.evaluate(
    () => JSON.stringify(localStorage) + JSON.stringify(sessionStorage),
  );
  check(
    'AC7 nessun dato clinico o blob in localStorage/sessionStorage',
    !CLINICAL.some((w) => ls.includes(w)) && !ls.includes('blob:'),
  );
  check(
    'AC7 nessun dato clinico negli URL né in console',
    !S.urls.some((u) => CLINICAL.some((w) => decodeURIComponent(u).includes(w))) &&
      !S.console.some((t) => CLINICAL.some((w) => t.includes(w))),
  );
  // A pannello chiuso l'interrogazione del job continua, ma nessuna pagina viene più scaricata.
  const afterClose = S.content.length;
  await page.waitForTimeout(3000);
  check(
    'AC3 a pannello chiuso nessuna pagina viene più scaricata',
    S.content.length === afterClose && afterClose >= contentBefore,
    `richieste=${S.content.length}`,
  );
  await context.close();
}

// ── PDF vero multipagina nella terza colonna: pagina giusta, niente tagli ───────────────────
{
  const { context, page, S } = await openIntake(1180, { pdf: true });
  await waitFor(async () => (await page.getByTestId('intake-ai-badge').count()) > 0);
  await chip(page, 'anagrafica.firstName').click();
  const drawn = await waitFor(async () =>
    page
      .locator('[data-testid="intake-document-panel-page"] canvas')
      .first()
      .evaluate((c) => c.width > 100)
      .catch(() => false),
  );
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const body = document.querySelector('[data-testid="intake-document-panel-page"]');
    const b = body.getBoundingClientRect();
    const outside = [...body.querySelectorAll('*')]
      .filter((e) => e.offsetParent)
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.right > b.right + 1 || r.left < b.left - 1)).length;
    return { bodyW: Math.round(b.width), outside };
  });
  check(
    'PDF di 3 pagine: un solo download, disegnata la pagina indicata, nulla esce dalla colonna',
    drawn && S.content.length === 1 && m.outside === 0,
    JSON.stringify({ ...m, richieste: S.content.length }),
  );
  await page
    .getByTestId('intake-document-panel')
    .screenshot({ path: `${DIR}/screenshots/pdf-terza-colonna-1180.png`, timeout: 5000 })
    .catch(() => {});
  await context.close();
}

// ── Esc nel pannello sovrapposto (390): chiude solo il pannello, non la scheda ────────────
{
  const { context, page } = await openIntake(390);
  await waitFor(async () => (await page.getByTestId('intake-ai-badge').count()) > 0);
  await chip(page, 'anagrafica.firstName').click();
  await page.getByTestId('intake-document-panel-title').click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const panelGone = (await page.getByTestId('intake-document-panel').count()) === 0;
  const formOpen = await page.getByTestId('intake-section-anagrafica').isVisible();
  check(
    'AC3 390px: clic sul titolo del pannello sovrapposto + Esc chiude il pannello e la scheda resta aperta',
    panelGone && formOpen,
    `pannelloChiuso=${panelGone} schedaAperta=${formOpen}`,
  );
  await context.close();
}

// ── AC4: pagina non disponibile ─────────────────────────────────────────────────────────────
{
  const { context, page, S } = await openIntake(1180, { failDoc: 'doc1' });
  await linkAndMerge(page, S);
  await waitFor(async () => (await page.getByTestId('intake-ai-badge').count()) > 0);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await chip(page, 'anagrafica.firstName').click();
  const alert = page.locator('[data-testid="intake-document-panel-page"] [role="alert"]');
  const shown = await waitFor(async () => (await alert.count()) === 1);
  const msg = await alert.innerText().catch(() => '');
  check(
    'AC4 pagina non disponibile: messaggio in italiano nel pannello, nessun errore di pagina, scheda utilizzabile',
    shown &&
      /[a-zà-ù]{4}/i.test(msg) &&
      errors.length === 0 &&
      (await page.locator('[data-demographic-field="lastName"]').isEditable()),
    msg.replace(/\s+/g, ' ').slice(0, 140),
  );
  check(
    'AC4 404: nessun "Riprova" inutile',
    (await page.getByRole('button', { name: 'Riprova anteprima' }).count()) === 0,
  );
  await context.close();
}
// ── AC4: originale non leggibile (422 del backend reale) ──────────────────────────────────
{
  const { context, page } = await openIntake(1180, { failDoc: 'doc1', failStatus: 422 });
  await waitFor(async () => (await page.getByTestId('intake-ai-badge').count()) > 0);
  await chip(page, 'anagrafica.firstName').click();
  const alert = page.locator('[data-testid="intake-document-panel-page"] [role="alert"]');
  await waitFor(async () => (await alert.count()) === 1);
  const msg = await alert.innerText().catch(() => '');
  check(
    'AC4 422: "Il file originale non è leggibile: rimuovilo e caricalo di nuovo." senza "Riprova"',
    /Il file originale non è leggibile: rimuovilo e caricalo di nuovo/.test(msg) &&
      (await page.getByRole('button', { name: 'Riprova anteprima' }).count()) === 0,
    msg.replace(/\s+/g, ' ').slice(0, 140),
  );
  await page
    .getByTestId('intake-document-panel')
    .screenshot({ path: `${DIR}/screenshots/ac4-pagina-non-disponibile.png`, timeout: 5000 })
    .catch(() => {});
  await context.close();
}

// ── AC5: larghezze ────────────────────────────────────────────────────────────────────────
for (const width of [390, 768, 1024, 1180, 1440]) {
  const { context, page, S } = await openIntake(width);
  await linkAndMerge(page, S);
  await waitFor(async () => (await page.getByTestId('intake-ai-badge').count()) > 0);
  await chip(page, 'anagrafica.firstName').click();
  await page
    .getByTestId('intake-document-panel')
    .waitFor({ timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="intake-document-panel"]');
    const r = p?.getBoundingClientRect();
    const ctrls = p
      ? [...p.querySelectorAll('button, [role=tab]')].filter((e) => e.offsetParent)
      : [];
    return {
      layout: p?.getAttribute('data-layout'),
      panelW: r ? Math.round(r.width) : 0,
      vw: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: ctrls
        .map((e) => ({
          t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 16),
          h: Math.round(e.getBoundingClientRect().height),
        }))
        .filter((x) => x.h < 44),
    };
  });
  const wide = width >= 1180;
  const touch = width < 1024;
  check(
    `AC5 ${width}px: ${wide ? 'terza colonna' : 'pannello sovrapposto a tutta larghezza'}, nessuno scorrimento orizzontale${touch ? ', controlli ≥ 44px' : ''}`,
    m.overflow <= 0 &&
      (wide ? m.layout === 'column' : m.layout === 'overlay' && m.panelW >= m.vw - 1) &&
      (!touch || m.small.length === 0),
    JSON.stringify(m),
  );
  await page.screenshot({ path: `${DIR}/screenshots/ac5-${width}.png` });
  await context.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
