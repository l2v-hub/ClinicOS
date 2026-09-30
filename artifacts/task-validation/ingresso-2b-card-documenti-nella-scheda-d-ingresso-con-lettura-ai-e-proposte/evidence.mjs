// Evidenza browser: card Documenti nella scheda d'ingresso (lettura AI, campi AI, proposte).
// Stub :3001 per il resto dell'app; bozze (/intake/drafts*) e job AI (/ai/extraction/jobs*) sono
// simulati con page.route, con le stesse regole di unione del backend (campo vuoto → AI;
// campo dell'operatore diverso → proposta; finale → _aiMerge.final).
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/ingresso-2b-card-documenti-nella-scheda-d-ingresso-con-lettura-ai-e-proposte';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') =>
  console.log(log.at(-1) ?? '') || log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
// Valori "letti" dalla lettera simulata.
const AI = {
  'anagrafica.lastName': 'Galli',
  'anagrafica.firstName': 'Teresa',
  'anagrafica.dateOfBirth': '1939-02-05',
  'anagrafica.sex': 'F',
};
const CLINICAL = ['Galli', 'Teresa', 'Rossi', '1939'];

function baseJob(id) {
  return {
    id,
    status: 'uploaded',
    totalBytes: 0,
    documents: [],
    capabilities: { sessionVersion: 1, pageEditing: true, atomicReplacement: true },
    manifest: {
      version: 1,
      revision: 1,
      groups: [
        {
          id: 'g1',
          label: 'Lettera 1',
          sortOrder: 0,
          status: 'pending',
          pageCount: 0,
          completedPages: 0,
          error: null,
          pdfUrl: null,
        },
      ],
      pages: [],
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
      phase: 'documents',
      totalPages: 0,
      completedPages: 0,
      failedPages: 0,
      totalGroups: 1,
      completedGroups: 0,
      currentPageId: null,
      currentGroupId: null,
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

const get = (data, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), data);
function set(data, path, value) {
  const keys = path.split('.');
  let o = data;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys.at(-1)] = value;
}
function merge(d, mode, ctx) {
  const data = d.data;
  if (mode === 'letter' && data._aiMerge?.groups?.g1 === ctx.resultHash) return; // già unita
  data._fieldOrigin ??= {};
  data._fieldProposals ??= [];
  for (const [path, ai] of Object.entries(AI)) {
    const cur = get(data, path);
    const origin = data._fieldOrigin[path];
    const isAiValue = origin?.by === 'ai' && cur === origin.value;
    if (cur === undefined || cur === '' || cur === null) {
      set(data, path, ai);
      data._fieldOrigin[path] = { by: 'ai', value: ai };
    } else if (isAiValue) {
      if (mode === 'final') set(data, path, ai);
    } else if (cur !== ai && !data._fieldProposals.some((p) => p.path === path)) {
      data._fieldProposals.push({
        id: `fp-${path}`,
        path,
        value: ai,
        current: cur,
        groupIds: ['g1'],
        status: 'pending',
      });
    }
  }
  data._aiMerge ??= {};
  if (mode === 'final') {
    data._aiMerge.final = ctx.resultHash;
    data._importSource = { manifestRevision: ctx.manifestRevision, resultHash: ctx.resultHash };
  } else data._aiMerge.groups = { ...(data._aiMerge.groups ?? {}), g1: ctx.resultHash };
}

const browser = await chromium.launch();

async function openIntake(width, opts = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    hasTouch: width < 1024,
    isMobile: width < 1024,
  });
  const page = await context.newPage();
  const S = {
    drafts: new Map(),
    job: null,
    calls: { link: [], merge: [], decide: [], patch: [], unlink: [], confirm: [], upload: 0 },
    urls: [],
    console: [],
    conflictOnce: opts.conflictOnce ?? false,
    processLimitOnce: opts.processLimitOnce ?? false,
  };
  page.on('request', (r) => S.urls.push(r.url()));
  page.on('console', (m) => S.console.push(m.text()));

  await page.route(/\/ai\/extraction\/jobs(\/.*)?(\?.*)?$/, async (route) => {
    const req = route.request();
    const parts = new URL(req.url()).pathname.split('/').filter(Boolean); // ai extraction jobs [id] [action]
    const id = parts[3];
    const action = parts[4];
    if (req.method() === 'POST' && !id) {
      S.job = baseJob('job-1');
      return route.fulfill({ status: 201, json: { job: S.job } });
    }
    if (!S.job || id !== S.job.id) return route.fulfill({ status: 404, json: { error: 'no' } });
    if (req.method() === 'GET' && !action) {
      S.gets = (S.gets ?? 0) + 1;
      return route.fulfill({ json: S.job });
    }
    if (action === 'files') {
      S.calls.upload++;
      const meta = JSON.parse(
        (req.postData() || '').match(/name="metadata"\r\n\r\n([\s\S]*?)\r\n--/)?.[1] ?? '{}',
      );
      const n = S.job.manifest.pages.length + 1;
      S.job.manifest.pages.push({
        id: `pg${n}`,
        documentId: `doc${n}`,
        sourcePageNumber: 1,
        groupId: 'g1',
        sortOrder: n - 1,
        status: 'pending',
        canRetry: false,
        errorCode: null,
        error: null,
      });
      S.job.manifest.revision += 1;
      S.job.status = 'uploaded';
      S.job.manifest.groups[0].pageCount = S.job.manifest.pages.length;
      S.job.progress.totalPages = S.job.manifest.pages.length;
      const clientFileId = meta.items?.[0]?.clientFileId ?? 'c';
      return route.fulfill({
        json: {
          job: S.job,
          outcomes: [
            {
              filename: 'pagina.png',
              status: 'accepted',
              documentId: `doc${n}`,
              clientFileId,
              pageIds: [`pg${n}`],
            },
          ],
        },
      });
    }
    if (action === 'process') {
      if (S.processLimitOnce) {
        S.processLimitOnce = false;
        return route.fulfill({
          status: 429,
          json: { error: 'limite', code: 'extraction_cost_limit' },
        });
      }
      S.job.status = 'processing';
      S.job.progress.phase = 'reading';
      return route.fulfill({ json: S.job });
    }
    if (action === 'cancel') {
      S.job.status = 'cancelled';
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ status: 404, json: {} });
  });

  await page.route(/\/intake\/drafts(\/.*)?(\?.*)?$/, async (route) => {
    const req = route.request();
    const parts = new URL(req.url()).pathname.split('/').filter(Boolean);
    const id = parts[2];
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (req.method() === 'POST' && !id) {
      const d = {
        id: `d${S.drafts.size + 1}`,
        version: 1,
        status: 'draft',
        data: {},
        importJobId: null,
      };
      S.drafts.set(d.id, d);
      return route.fulfill({ status: 201, json: d });
    }
    const d = S.drafts.get(id);
    if (!d) return route.fulfill({ status: 404, json: { error: 'non trovata' } });
    const stale = () =>
      body.expectedDraftVersion !== undefined && body.expectedDraftVersion !== d.version;
    if (req.method() === 'GET') return route.fulfill({ json: d });
    if (req.method() === 'PATCH') {
      const { expectedDraftVersion, ...patch } = body;
      S.calls.patch.push(patch);
      if (stale())
        return route.fulfill({
          status: 409,
          json: { error: 'versione', code: 'draft_version_conflict', draft: d },
        });
      d.data = { ...d.data, ...patch };
      d.version += 1;
      return route.fulfill({ json: d });
    }
    if (parts[3] === 'import-job' && req.method() === 'POST') {
      S.calls.link.push(body);
      if (stale())
        return route.fulfill({
          status: 409,
          json: { error: 'versione', code: 'draft_version_conflict' },
        });
      d.importJobId = body.importJobId;
      d.version += 1;
      return route.fulfill({ json: d });
    }
    if (parts[3] === 'import-job' && req.method() === 'DELETE') {
      S.calls.unlink.push(body);
      d.importJobId = null;
      if (S.job) S.job.status = 'cancelled';
      d.version += 1;
      return route.fulfill({ json: d });
    }
    if (parts[3] === 'merge-import') {
      S.calls.merge.push(body);
      if (S.conflictOnce) {
        S.conflictOnce = false;
        d.version += 1; // un altro salvataggio è arrivato prima
        return route.fulfill({
          status: 409,
          json: { error: 'versione', code: 'draft_version_conflict' },
        });
      }
      if (stale())
        return route.fulfill({
          status: 409,
          json: { error: 'versione', code: 'draft_version_conflict' },
        });
      merge(d, body.manifestRevision !== undefined ? 'final' : 'letter', body);
      d.version += 1;
      return route.fulfill({ json: d });
    }
    if (parts[3] === 'field-proposals') {
      S.calls.decide.push({ pid: parts[4], ...body });
      const p = d.data._fieldProposals.find((x) => x.id === parts[4]);
      if (body.action === 'apply') {
        set(d.data, p.path, p.value);
        d.data._fieldOrigin[p.path] = { by: 'operator', value: p.value };
        p.status = 'applied';
      } else p.status = 'kept';
      d.version += 1;
      return route.fulfill({ json: d });
    }
    if (parts[3] === 'confirm') {
      S.calls.confirm.push(body);
      if ((d.data._fieldProposals ?? []).some((p) => p.status === 'pending'))
        return route.fulfill({
          status: 409,
          json: { error: 'proposte', code: 'field_proposals_pending' },
        });
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
  await page.waitForTimeout(600);
  return { context, page, S };
}
const card = (page) => page.getByTestId('intake-documents-card');
const count = (page) => page.getByTestId('intake-documents-count').innerText();
async function letterReady(S) {
  S.job.manifest.groups[0].resultHash = 'L1-hash';
  S.job.manifest.groups[0].status = 'completed';
  S.job.manifest.groups[0].completedPages = 1;
  S.job.manifest.pages.forEach((p) => (p.status = 'completed'));
  S.job.progress.completedPages = S.job.manifest.pages.length;
}
function reviewReady(S) {
  S.job.status = 'review_ready';
  S.job.progress.completedGroups = 1;
  S.job.review = {
    manifestRevision: S.job.manifest.revision,
    resultHash: 'final-hash',
    unresolvedConflicts: 0,
    canProceed: true,
    draftId: null,
    draftSourceIsCurrent: false,
  };
}
const waitFor = async (fn, ms = 12000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

// ── Flusso principale a 1180 ──────────────────────────────────────────────────────────────
{
  const { context, page, S } = await openIntake(1180);
  check('Card Documenti in cima alla scheda', (await card(page).count()) === 1);

  // L'operatore scrive il cognome PRIMA che l'AI legga: non va sovrascritto.
  const lastName = page.locator('[data-demographic-field="lastName"]').first();
  await lastName.fill('Rossi');
  await page.waitForTimeout(1500);

  await page.getByTestId('intake-documents-file-input').setInputFiles({
    name: 'pagina.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  const linked = await waitFor(
    async () => S.calls.link.length === 1 && S.job?.status === 'processing',
  );
  const c0 = await count(page).catch(() => '');
  const status0 = await page
    .getByTestId('intake-documents-status')
    .innerText()
    .catch(() => '');
  check(
    'AC1 un file: job creato e collegato (una sola chiamata import-job con expectedDraftVersion), "0/1 pagine lette", frase AI',
    linked &&
      typeof S.calls.link[0]?.expectedDraftVersion === 'number' &&
      !!S.calls.link[0]?.requestId &&
      /0\/1 pagine lette/.test(c0) &&
      /puoi già scrivere/.test(status0),
    `link=${JSON.stringify(S.calls.link[0])} count="${c0}"`,
  );
  // durante la lettura si scrive ancora
  const cf = page.locator('[data-demographic-field="codiceFiscale"]').first();
  const canType = await cf.isEditable().catch(() => false);
  check('AC1 durante la lettura i campi restano scrivibili', canType);
  await card(page)
    .screenshot({ path: `${DIR}/screenshots/ac1-lettura-in-corso.png`, timeout: 5000 })
    .catch(() => {});

  // Lettera pronta → unione per lettera
  await letterReady(S);
  const merged = await waitFor(
    async () =>
      S.calls.merge.length >= 1 && (await page.getByTestId('intake-ai-badge').count()) > 0,
  );
  const firstName = await page.locator('[data-ai-field="anagrafica.firstName"]').first();
  const fnInput = await firstName
    .locator('input')
    .first()
    .inputValue()
    .catch(() => '');
  const lnValue = await lastName.inputValue();
  const fnAi = await firstName
    .evaluate((el) => el.classList.contains('intake-field--ai'))
    .catch(() => false);
  check(
    'AC2 lettera pronta: merge-import per lettera, campi vuoti riempiti con stile AI e badge',
    merged && S.calls.merge[0]?.groupId === 'g1' && fnInput === 'Teresa' && fnAi,
    `merge=${JSON.stringify(S.calls.merge[0])} nome="${fnInput}"`,
  );
  check(
    'AC2 il cognome scritto dall’operatore NON cambia',
    lnValue === 'Rossi',
    `cognome="${lnValue}"`,
  );
  const prop = page.locator(
    '[data-testid="intake-field-proposal"][data-proposal-path="anagrafica.lastName"]',
  );
  check(
    'AC2 compare la proposta per il cognome ("L’AI ha letto Galli")',
    (await prop.count()) === 1 && /Galli/.test(await prop.innerText()),
    (await prop.innerText().catch(() => '')).replace(/\s+/g, ' '),
  );
  // L'elenco dei passaggi mancanti è un <details>: si apre per leggerlo come farebbe l'operatore.
  const details = page.getByTestId('intake-missing').first();
  await details
    .locator('summary')
    .click()
    .catch(() => {});
  const missing = await details.innerText().catch(() => '');
  const createDisabled = await page
    .getByRole('button', { name: /Crea paziente/ })
    .first()
    .isDisabled()
    .catch(() => false);
  check(
    'AC3 con proposte aperte "Crea paziente" è bloccato e il motivo è visibile',
    /proposta dei documenti da decidere/i.test(missing) && createDisabled,
    `${missing.replace(/\s+/g, ' ').slice(0, 200)} · disabilitato=${createDisabled}`,
  );
  await page
    .getByTestId('intake-field-proposals')
    .screenshot({ path: `${DIR}/screenshots/ac2-proposta.png`, timeout: 5000 })
    .catch(() => {});
  await page
    .locator('[data-intake-section="anagrafica"], [data-testid="intake-section-anagrafica"]')
    .first()
    .screenshot({ path: `${DIR}/screenshots/ac2-campi-ai.png`, timeout: 5000 })
    .catch(() => {});

  // Tieni il mio
  await prop.getByTestId('intake-proposal-keep').click();
  const kept = await waitFor(async () => S.calls.decide.length === 1);
  check(
    'AC3 "Tieni il mio": decide keep con requestId ed expectedDraftVersion, il valore resta',
    kept &&
      S.calls.decide[0].action === 'keep' &&
      !!S.calls.decide[0].requestId &&
      typeof S.calls.decide[0].expectedDraftVersion === 'number' &&
      (await lastName.inputValue()) === 'Rossi' &&
      (await prop.count()) === 0,
    JSON.stringify(S.calls.decide[0]),
  );

  // Finale
  reviewReady(S);
  const fin = await waitFor(async () =>
    S.calls.merge.some((m) => m.manifestRevision !== undefined),
  );
  await page.waitForTimeout(3500);
  const finals = S.calls.merge.filter((m) => m.manifestRevision !== undefined);
  const c1 = await count(page).catch(() => '');
  check(
    'AC4 revisione pronta: un’unica unione finale, "1/1 pagine lette"',
    fin &&
      finals.length === 1 &&
      finals[0].resultHash === 'final-hash' &&
      /1\/1 pagine lette/.test(c1),
    `finali=${finals.length} count="${c1}"`,
  );
  check(
    'AC5 dopo l’unione finale (_importSource) il documento non si può più scollegare',
    (await page.getByTestId('intake-documents-unlink').count()) === 0,
  );
  await card(page)
    .screenshot({ path: `${DIR}/screenshots/ac4-lettura-completata.png`, timeout: 5000 })
    .catch(() => {});

  // Chiavi riservate mai nel PATCH (dopo aver scritto ancora)
  await cf.fill('GLLTRS39B45A794P');
  await page.waitForTimeout(2000);
  const reserved = S.calls.patch.filter((p) =>
    ['_fieldOrigin', '_fieldProposals', '_aiMerge'].some((k) => k in p),
  );
  check(
    'AC5 nessun PATCH contiene _fieldOrigin/_fieldProposals/_aiMerge',
    S.calls.patch.length > 0 && reserved.length === 0,
    `patch=${S.calls.patch.length} conChiaviRiservate=${reserved.length}`,
  );

  // Persistenza: ricarico la bozza dal server (nuova apertura della stessa bozza non è esposta dallo
  // stub; si verifica che lo stato server contenga campi AI e proposta decisa).
  const d = [...S.drafts.values()][0];
  check(
    'Persistenza: la bozza sul server ha i campi AI, la proposta decisa e il job collegato',
    d.data._fieldOrigin?.['anagrafica.firstName']?.by === 'ai' &&
      d.data._fieldProposals?.[0]?.status === 'kept' &&
      d.importJobId === 'job-1' &&
      d.data.anagrafica?.lastName === 'Rossi',
    JSON.stringify({ origin: Object.keys(d.data._fieldOrigin ?? {}), job: d.importJobId }),
  );

  const leakUrl = S.urls.filter((u) => CLINICAL.some((w) => decodeURIComponent(u).includes(w)));
  const leakConsole = S.console.filter((t) => CLINICAL.some((w) => t.includes(w)));
  check(
    'Privacy: nessun dato clinico negli URL',
    leakUrl.length === 0,
    leakUrl.slice(0, 2).join(' '),
  );
  check(
    'Privacy: nessun dato clinico in console',
    leakConsole.length === 0,
    leakConsole.slice(0, 2).join(' '),
  );
  await context.close();
}

// ── "Usa questo valore" + conflitto di versione sull'unione ───────────────────────────────
{
  const { context, page, S } = await openIntake(1180, { conflictOnce: true });
  const lastName = page.locator('[data-demographic-field="lastName"]').first();
  await lastName.fill('Rossi');
  await page.waitForTimeout(1500);
  await page
    .getByTestId('intake-documents-file-input')
    .setInputFiles({ name: 'pagina.png', mimeType: 'image/png', buffer: PNG });
  await waitFor(async () => S.job?.status === 'processing');
  await letterReady(S);
  const ok = await waitFor(
    async () => (await page.getByTestId('intake-field-proposal').count()) === 1,
  );
  const letters = S.calls.merge.filter((m) => m.groupId);
  check(
    'AC4 409 di versione sull’unione: bozza ricaricata e UN solo nuovo tentativo, nessuna doppia unione',
    ok && letters.length === 2 && [...S.drafts.values()][0].data._aiMerge?.groups?.g1 === 'L1-hash',
    `unioniLettera=${letters.length}`,
  );
  await page.getByTestId('intake-proposal-apply').click();
  await waitFor(async () => S.calls.decide.length === 1);
  await page.waitForTimeout(800);
  const v = await lastName.inputValue();
  const lnAi = await page.locator('[data-ai-field="anagrafica.lastName"]').count();
  const focused = await page.evaluate(() => {
    const a = document.activeElement;
    return a
      ? `${a.tagName}${a.getAttribute('data-demographic-field') ? ':' + a.getAttribute('data-demographic-field') : ''}`
      : 'none';
  });
  check(
    'AC3 "Usa questo valore": decide apply, il campo prende il valore letto e resta dell’operatore (come il backend: by operator)',
    S.calls.decide[0]?.action === 'apply' && v === 'Galli' && lnAi === 0,
    `cognome="${v}" stileAI=${lnAi}`,
  );
  check(
    'A11y: dopo l’ultima proposta il focus va sul campo deciso, non su BODY',
    focused === 'INPUT:lastName',
    `focus=${focused}`,
  );

  // Scollegamento (prima della finale): conferma e valori conservati
  await page.getByTestId('intake-documents-unlink').click();
  await page.getByRole('button', { name: 'Scollega', exact: true }).click();
  const un = await waitFor(async () => S.calls.unlink.length === 1);
  await page.waitForTimeout(600);
  check(
    'AC5 scollega: DELETE import-job dopo conferma, i valori restano',
    un &&
      (await lastName.inputValue()) === 'Galli' &&
      typeof S.calls.unlink[0]?.expectedDraftVersion === 'number',
    JSON.stringify(S.calls.unlink[0]),
  );
  await context.close();
}

// ── Limite di letture AI, poi "Riprova lettura" riuscito: il vecchio errore sparisce ──────
{
  const { context, page, S } = await openIntake(1180, { processLimitOnce: true });
  await page
    .getByTestId('intake-documents-file-input')
    .setInputFiles({ name: 'pagina.png', mimeType: 'image/png', buffer: PNG });
  const limited = await waitFor(async () =>
    /limite di letture/i.test(
      await page
        .getByTestId('intake-documents-error')
        .innerText()
        .catch(() => ''),
    ),
  );
  check('Errori: il limite di letture AI è spiegato in chiaro', limited);
  await page.getByTestId('intake-documents-retry-reading').click();
  const reading = await waitFor(async () => S.job?.status === 'processing');
  await page.waitForTimeout(600);
  const errAfter = await page.getByTestId('intake-documents-error').count();
  check(
    'Errori: dopo un nuovo tentativo riuscito il messaggio di limite non resta a schermo',
    reading && errAfter === 0,
    `inLettura=${reading} errore=${errAfter}`,
  );
  await context.close();
}

// ── AC6: scheda a mano senza documenti invariata ─────────────────────────────────────────
{
  const { context, page, S } = await openIntake(1180);
  await page.waitForTimeout(3000);
  check(
    'AC6 senza documenti: nessun job creato, nessun polling, nessuna unione',
    S.job === null &&
      S.calls.merge.length === 0 &&
      !S.urls.some((u) => u.includes('/ai/extraction/jobs')),
  );
  await context.close();
}

// ── AC7: larghezze ────────────────────────────────────────────────────────────────────────
for (const width of [390, 768, 1024, 1180, 1440]) {
  const { context, page } = await openIntake(width);
  const m = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="intake-documents-card"]');
    const ctrls = [
      ...c.querySelectorAll(
        'button, label[role=button], [data-testid$="-camera"], [data-testid$="-upload"]',
      ),
    ].filter((e) => e.offsetParent);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: ctrls
        .map((e) => ({
          t: e.textContent.trim().slice(0, 20),
          h: Math.round(e.getBoundingClientRect().height),
        }))
        .filter((x) => x.h < 44),
    };
  });
  const touch = width < 1024;
  check(
    `AC7 ${width}px: nessuno scorrimento orizzontale${touch ? ', controlli ≥ 44px' : ''}`,
    m.overflow <= 0 && (!touch || m.small.length === 0),
    JSON.stringify(m),
  );
  await card(page)
    .screenshot({ path: `${DIR}/screenshots/ac7-${width}.png`, timeout: 5000 })
    .catch(() => {});
  await context.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
