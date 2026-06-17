// REQ-040 visual evidence: open the global Assistente ClinicOS panel on a patient, ask a sourced
// question (allergies), a refused question (diagnosis), and capture desktop + tablet.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = dirname(fileURLToPath(import.meta.url));
const evid = (f) => join(OUT, '..', '..', '..', 'requirements', 'evidence', 'REQ-040', f);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (page, text) => { const el = page.getByText(text, { exact: false }).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); await el.click(); };

async function openPanelOnPatient(page) {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await click(page, 'Operatore'); await sleep(700);
  await click(page, 'Pazienti'); await sleep(800);
  await click(page, 'Forlano'); await sleep(900);            // demo patient detail
  await page.locator('.ai-fab').click(); await sleep(500);
}
async function ask(page, q) {
  await page.locator('.ai-asst__input').fill(q);
  await page.getByRole('button', { name: 'Invia' }).click();
}

const run = async () => {
  const browser = await chromium.launch();
  const errors = [];

  // desktop
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await openPanelOnPatient(page);
  await page.locator('.ai-drawer').screenshot({ path: evid('ai-assistant-global-panel.png') });

  await ask(page, 'Quali allergie sono documentate?');
  await page.locator('.ai-asst__source').first().waitFor({ timeout: 15000 });
  await sleep(400);
  await page.locator('.ai-drawer').screenshot({ path: evid('ai-allergy-answer-with-source.png') });

  await ask(page, 'Che diagnosi ha questo paziente?');
  await page.locator('.ai-asst__refusal').first().waitFor({ timeout: 15000 });
  await sleep(300);
  await page.locator('.ai-drawer').screenshot({ path: evid('ai-diagnosis-refused.png') });

  await ask(page, 'Mostra le pippe inesistenti del 1800');
  await sleep(1500);
  await page.locator('.ai-drawer').screenshot({ path: evid('ai-no-result.png') });
  await ctx.close();

  // tablet
  const ctx2 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const p2 = await ctx2.newPage();
  await openPanelOnPatient(p2);
  await ask(p2, 'Quali allergie sono documentate?');
  await p2.locator('.ai-asst__source').first().waitFor({ timeout: 15000 }).catch(() => {});
  await sleep(400);
  await p2.locator('.ai-drawer').screenshot({ path: evid('ai-tablet-panel.png') });
  await ctx2.close();

  console.log('REQ-040 panel screenshots done; consoleErrors:', errors.length);
  await browser.close();
};
run().catch((e) => { console.error('FAIL', e); process.exit(1); });
