// Evidenza browser: "Nuovo paziente" apre la scelta unica (documenti o a mano).
// Servizio AI e bozze intake simulati con page.route (lo stub API non li espone).
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-ingresso-paziente-unificato-documenti-o-a-mano';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const job = {
  id: 'job-e2e',
  status: 'draft',
  error: null,
  canRetry: false,
  totalBytes: 0,
  documents: [],
  capabilities: { sessionVersion: 1, pageEditing: true, atomicReplacement: true },
  manifest: { version: 1, revision: 1, pages: [], groups: [] },
  limits: {
    maxPages: 30,
    maxSourceFiles: 30,
    maxGroups: 30,
    maxTotalBytes: 26214400,
    maxFileBytes: 26214400,
    maxFilesPerRequest: 10,
    maxRequestBytes: 26214400,
    acceptedMimeTypes: ['application/pdf'],
  },
  progress: {
    phase: 'documents',
    totalPages: 0,
    completedPages: 0,
    failedPages: 0,
    totalGroups: 0,
    completedGroups: 0,
    currentPageId: null,
    currentGroupId: null,
  },
  review: null,
};

async function openPage(width, aiAvailable) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.route(/\/ai\/extraction\/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/status')) {
      return route.fulfill({
        json: aiAvailable
          ? { available: true, provider: 'x', model: 'y', errors: [] }
          : { available: false, provider: 'x', model: 'y', errors: ['chiave non configurata'] },
      });
    }
    if (route.request().method() === 'POST' && /\/jobs$/.test(url.pathname))
      return route.fulfill({ json: { job } });
    if (/\/jobs\/[^/]+$/.test(url.pathname)) return route.fulfill({ json: job });
    return route.fulfill({ json: {} });
  });
  const draft = { id: 'draft-manual', status: 'draft', version: 1, data: {} };
  await page.route(/\/intake\/drafts(\/.*)?$/, (route) =>
    route.fulfill({
      json:
        route.request().method() === 'GET' && route.request().url().endsWith('/intake/drafts')
          ? []
          : draft,
    }),
  );
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  // sotto i 1024 px la barra laterale è un cassetto da aprire col menu
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.getByRole('button', { name: 'Nuovo paziente' }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  return page;
}
const chooser = (page) =>
  page
    .getByRole('dialog', { name: 'Nuovo paziente' })
    .filter({ hasText: 'Come vuoi inserire il paziente?' });

const browser = await chromium.launch();

for (const width of [1280, 768, 390]) {
  const page = await openPage(width, true);
  const overflowBefore = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.getByRole('button', { name: 'Nuovo paziente' }).first().click();
  const dlg = chooser(page);
  await dlg.waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.new-patient-chooser__option')];
    return {
      labels: opts.map((o) => o.querySelector('strong')?.textContent),
      heights: opts.map((o) => Math.round(o.getBoundingClientRect().height)),
      focused:
        document.activeElement?.querySelector?.('strong')?.textContent ??
        document.activeElement?.textContent?.slice(0, 20),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inView: opts.every((o) => {
        const r = o.getBoundingClientRect();
        return r.left >= 0 && r.right <= window.innerWidth;
      }),
    };
  });
  check(
    `${width}: la scelta propone "Da documenti" poi "A mano"`,
    m.labels.join(',') === 'Da documenti,A mano',
    JSON.stringify(m.labels),
  );
  check(
    `${width}: opzioni alte almeno 48 px e dentro lo schermo`,
    m.heights.every((h) => h >= 48) && m.inView,
    JSON.stringify(m.heights),
  );
  check(
    `${width}: focus iniziale su "Da documenti"`,
    m.focused === 'Da documenti',
    String(m.focused),
  );
  // a 768 px la barra superiore sfora già di 30 px (preesistente): la scelta non deve aggiungerne
  check(`${width}: la scelta non aggiunge scorrimento orizzontale`, m.overflow <= Math.max(0, overflowBefore), `overflow=${m.overflow}, prima=${overflowBefore}`);
  await page.screenshot({ path: `${DIR}/screenshots/scelta-${width}.png` });

  if (width === 1280) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const closed = (await chooser(page).count()) === 0;
    const back = await page.evaluate(() => document.activeElement?.textContent?.trim());
    check(
      'Esc chiude la scelta e il focus torna su "Nuovo paziente"',
      closed && /Nuovo paziente/.test(back ?? ''),
      String(back),
    );

    await page.getByRole('button', { name: 'Nuovo paziente' }).first().click();
    await chooser(page)
      .getByRole('button', { name: /Da documenti/ })
      .click();
    const imp = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: 'Importa lettere di dimissione' }) });
    const impOk = await imp.waitFor({ timeout: 8000 }).then(
      () => true,
      () => false,
    );
    check(
      '"Da documenti" apre l\'import delle lettere di dimissione',
      impOk && (await chooser(page).count()) === 0,
    );
    await page.screenshot({ path: `${DIR}/screenshots/da-documenti.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const impClosed = (await imp.count()) === 0;

    await page.getByRole('button', { name: 'Nuovo paziente' }).first().click();
    await chooser(page)
      .getByRole('button', { name: /A mano/ })
      .click();
    const step = page.getByText(/Anagrafica · Passaggio 1 di 5/);
    const manOk = await step.waitFor({ timeout: 8000 }).then(
      () => true,
      () => false,
    );
    check(
      '"A mano" apre il wizard manuale al passo Anagrafica',
      manOk && (await chooser(page).count()) === 0,
      `import chiuso prima: ${impClosed}`,
    );
    await page.screenshot({ path: `${DIR}/screenshots/a-mano.png` });
  }
  await page.close();
}

// Servizio AI non disponibile: documenti disattivata con il motivo, "A mano" utilizzabile.
{
  const page = await openPage(1280, false);
  await page.getByRole('button', { name: 'Nuovo paziente' }).first().click();
  const dlg = chooser(page);
  await dlg.waitFor({ timeout: 5000 });
  const docs = dlg.getByRole('button', { name: /Da documenti/ });
  const disabled = await docs.isDisabled();
  const reason = await docs.innerText();
  const focused = await page.evaluate(
    () => document.activeElement?.querySelector?.('strong')?.textContent,
  );
  check(
    'AI non disponibile: "Da documenti" disattivata e spiega il motivo',
    disabled && /Servizio AI non disponibile: chiave non configurata/.test(reason),
    reason.replace(/\n/g, ' | '),
  );
  check('AI non disponibile: focus iniziale su "A mano"', focused === 'A mano', String(focused));
  await page.screenshot({ path: `${DIR}/screenshots/scelta-ai-non-disponibile.png` });
  await dlg.getByRole('button', { name: /A mano/ }).click();
  const manOk = await page
    .getByText(/Anagrafica · Passaggio 1 di 5/)
    .waitFor({ timeout: 8000 })
    .then(
      () => true,
      () => false,
    );
  check('AI non disponibile: "A mano" apre comunque il wizard', manOk);
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
