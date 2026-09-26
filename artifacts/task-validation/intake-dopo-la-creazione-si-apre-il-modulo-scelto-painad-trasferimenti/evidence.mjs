// Evidenza browser: wizard "Nuovo paziente" → passaggio Moduli → scelta del modulo → creazione.
// Verifica il tab su cui si apre la cartella. Bozza e conferma simulate con page.route; la
// conferma restituisce un paziente che esiste nello stub (:3001).
//   BASE=http://localhost:4173 node <questo file>        (con la correzione)
//   BASE=http://localhost:4174 LABEL=baseline node ...   (origin/main senza correzione)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/intake-dopo-la-creazione-si-apre-il-modulo-scelto-painad-trasferimenti';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const LABEL = process.env.LABEL ?? 'fix';
const CASES = [
  { module: 'painad', tab: 'Scala PAINAD' },
  { module: 'postural_transfers', tab: 'Trasferimenti posturali' },
  { module: 'braden', tab: 'Scala di Braden' },
];
const roster = await (await fetch('http://localhost:3001/patients/page?limit=1')).json();
const target = roster.items[0];
const log = [];
const check = (name, ok, detail = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch();
for (const c of CASES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  let draft = { id: 'draft-e2e', status: 'draft', data: {}, version: 1 };
  await page.route(/\/intake\/drafts(\/.*)?$/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (req.method() === 'GET' && url.pathname.endsWith('/intake/drafts')) return route.fulfill({ json: [] });
    if (req.method() === 'POST' && url.pathname.endsWith('/confirm'))
      return route.fulfill({ json: { status: 'created', patient: { id: target.id } } });
    if (req.method() === 'POST') return route.fulfill({ status: 201, json: draft });
    if (req.method() === 'PATCH') {
      const { expectedDraftVersion: _v, ...patch } = body;
      draft = { ...draft, data: { ...draft.data, ...(patch.data ?? patch) }, version: draft.version + 1 };
      return route.fulfill({ json: draft });
    }
    return route.fulfill({ json: draft });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Pazienti' }).first().click();
  await page.getByRole('button', { name: /Nuovo paziente/ }).first().click();
  await page.getByText(/Passaggio 1 di 5/).first().waitFor();
  await page.getByLabel(/^Nome\s*\*?$/).first().fill('Teresa');
  await page.getByLabel(/^Cognome\s*\*?$/).first().fill('Galli');
  await page.waitForTimeout(600);
  for (let i = 0; i < 6; i++) {
    for (const cb of await page.getByRole('checkbox').all()) {
      const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
      if (/confermo|accetta|nessuna terapia/.test(txt) && !(await cb.isChecked())) await cb.check();
    }
    if (await page.getByTestId(`intake-module-${c.module}`).count()) {
      await page.getByTestId(`intake-module-${c.module}`).click();
      await page.waitForTimeout(300);
    }
    if (await page.getByText(/Passaggio 5 di 5/).count()) break;
    await page.getByRole('button', { name: /^Avanti/ }).last().click();
    await page.waitForTimeout(500);
  }
  for (const cb of await page.getByRole('checkbox').all()) {
    const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
    if (/confermo|accetta/.test(txt) && !(await cb.isChecked())) await cb.check();
  }
  await page.getByRole('button', { name: /Crea paziente|Conferma/ }).last().click();
  await page.locator('.patient-compact-header', { hasText: `${target.lastName}, ${target.firstName}` }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  // Il gruppo Moduli apre un catalogo con dettaglio (link "← Tutti i moduli" + titolo del modulo),
  // non un tab di terzo livello: si verifica di essere DENTRO il modulo scelto.
  const inModule = (await page.getByText('Tutti i moduli').count()) > 0;
  const title = (await page.getByText(c.tab, { exact: true }).count()) > 0;
  const group = (await page.getByRole('tab', { selected: true }).allInnerTexts()).map((t) => t.trim());
  check(`${LABEL}: scelto ${c.module} → si apre "${c.tab}"`, inModule && title, `gruppo=${JSON.stringify(group)} dentroModulo=${inModule} titolo=${title}`);
  await page.screenshot({ path: `${DIR}/screenshots/${LABEL}-${c.module}.png` });
  await page.close();
}
await browser.close();
writeFileSync(`${DIR}/logs/playwright-${LABEL}.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
