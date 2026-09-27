// Evidenza browser: import da lettera di dimissione → wizard (bozza dell'import) → creazione →
// si apre la cartella del paziente creato, sul modulo scelto.
// Il servizio di estrazione e le bozze sono simulati con page.route: il job ripreso dichiara una
// bozza corrente, quindi la modale entra direttamente nel wizard in modalità import
// (DischargeImportModal: review.draftId && draftSourceIsCurrent → step "workspace").
//   BASE=http://localhost:4173 node <questo file>                (con la correzione)
//   BASE=http://localhost:4175 LABEL=baseline node <questo file> (origin/main)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/import-documenti-a-fine-import-si-apre-il-paziente-creato';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const LABEL = process.env.LABEL ?? 'fix';
const roster = await (await fetch('http://localhost:3001/patients/page?limit=1')).json();
const target = roster.items[0];
const log = [];
const check = (name, ok, detail = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

const job = {
  id: 'job-e2e', status: 'review_ready', error: null, canRetry: false, totalBytes: 1000, documents: [],
  capabilities: { sessionVersion: 1, pageEditing: true, atomicReplacement: true },
  manifest: { version: 1, revision: 1, pages: [], groups: [] },
  limits: { maxPages: 30, maxSourceFiles: 30, maxGroups: 30, maxTotalBytes: 26214400, maxFileBytes: 26214400, maxFilesPerRequest: 10, maxRequestBytes: 26214400, acceptedMimeTypes: ['application/pdf'] },
  progress: { phase: 'review', totalPages: 1, completedPages: 1, failedPages: 0, totalGroups: 1, completedGroups: 1, currentPageId: null, currentGroupId: null },
  review: { manifestRevision: 1, resultHash: 'h1', unresolvedConflicts: 0, canProceed: true, draftId: 'draft-import', draftSourceIsCurrent: true },
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
await page.route(/\/ai\/extraction\/.*/, async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith('/status')) return route.fulfill({ json: { available: true, errors: [] } });
  // POST /jobs risponde { job }, GET /jobs/:id il job diretto (importSessionApi.create/get).
  if (route.request().method() === 'POST' && /\/jobs$/.test(url.pathname)) return route.fulfill({ json: { job } });
  if (/\/jobs\/[^/]+$/.test(url.pathname)) return route.fulfill({ json: job });
  return route.fulfill({ json: {} });
});
let draft = { id: 'draft-import', status: 'draft', version: 1, data: { anagrafica: { firstName: 'Teresa', lastName: 'Galli' }, _importSource: { manifestRevision: 1, resultHash: 'h1' } } };
let confirmed = false;
await page.route(/\/intake\/drafts(\/.*)?$/, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const body = req.postData() ? JSON.parse(req.postData()) : {};
  if (req.method() === 'POST' && url.pathname.endsWith('/confirm')) {
    confirmed = true;
    return route.fulfill({ json: { status: 'created', patient: { id: target.id } } });
  }
  if (req.method() === 'PATCH') {
    const { expectedDraftVersion: _v, ...patch } = body;
    draft = { ...draft, data: { ...draft.data, ...(patch.data ?? patch) }, version: draft.version + 1 };
    return route.fulfill({ json: draft });
  }
  if (req.method() === 'GET' && url.pathname.endsWith('/intake/drafts')) return route.fulfill({ json: [] });
  return route.fulfill({ json: draft });
});

await page.goto(BASE);
await page.getByText('Operatore', { exact: true }).first().click();
await page.getByRole('button', { name: 'Pazienti' }).first().click();
await page.getByRole('button', { name: /^Importa lettera di dimissione$/ }).first().click();
await page.getByText(/Passaggio \d di 5/).first().waitFor({ timeout: 20000 }).catch(async (e) => {
  await page.screenshot({ path: `${DIR}/logs/${LABEL}-bloccato.png` });
  console.log('DIALOG:', (await page.locator('[role=dialog]').first().innerText().catch(() => '')).slice(0, 400));
  throw e;
});
await page.screenshot({ path: `${DIR}/screenshots/${LABEL}-wizard-da-import.png` });
for (let i = 0; i < 6; i++) {
  for (const cb of await page.getByRole('checkbox').all()) {
    const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
    if (/confermo|accetta|nessuna terapia/.test(txt) && !(await cb.isChecked())) await cb.check();
  }
  if (await page.getByTestId('intake-module-braden').count()) await page.getByTestId('intake-module-braden').click();
  if (await page.getByText(/Passaggio 5 di 5/).count()) break;
  await page.getByRole('button', { name: /^Avanti/ }).last().click();
  await page.waitForTimeout(500);
}
for (const cb of await page.getByRole('checkbox').all()) {
  const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
  if (/confermo|accetta/.test(txt) && !(await cb.isChecked())) await cb.check();
}
await page.getByRole('button', { name: /Crea paziente|Conferma/ }).last().click();
await page.waitForTimeout(4000);
check(`${LABEL}: conferma inviata`, confirmed);
const opened = await page.locator('.patient-compact-header', { hasText: `${target.lastName}, ${target.firstName}` }).count();
check(`${LABEL}: a fine import si apre la cartella del paziente creato`, opened > 0);
const inPainad = (await page.getByText('Tutti i moduli').count()) > 0 && (await page.getByText('Scala di Braden', { exact: true }).count()) > 0;
check(`${LABEL}: la cartella si apre sul modulo scelto (Braden)`, inPainad);
await page.screenshot({ path: `${DIR}/screenshots/${LABEL}-dopo-import.png` });
await browser.close();
writeFileSync(`${DIR}/logs/playwright-${LABEL}.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
