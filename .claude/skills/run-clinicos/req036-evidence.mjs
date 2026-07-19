// REQ-036 evidence capture: open the discharge-import modal, upload 3 docs,
// screenshot the reorder list before/after, and the back-to-documents control.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = dirname(fileURLToPath(import.meta.url));
const evid = (f) => join(OUT, '..', '..', '..', 'requirements', 'evidence', 'REQ-036', f);
const FILES = [
  'C:/Users/llavia/AppData/Local/Temp/req036/pagina1-anamnesi.txt',
  'C:/Users/llavia/AppData/Local/Temp/req036/pagina2-decorso.txt',
  'C:/Users/llavia/AppData/Local/Temp/req036/pagina3-terapia.txt',
];
const VP = { desktop: { width: 1366, height: 768 }, tablet: { width: 1024, height: 768 } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, text) {
  const el = page.getByText(text, { exact: false }).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.click();
}

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VP.desktop });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await sleep(800);
  await clickText(page, 'Pazienti');
  await sleep(800);
  await clickText(page, 'Importa dimissione');
  await sleep(600);

  // Upload 3 files into the hidden multi-file input.
  const input = page.locator('input[type="file"][multiple]');
  await input.setInputFiles(FILES);
  await page.locator('.import-modal__item').nth(2).waitFor({ timeout: 15000 });
  await sleep(500);
  await page.locator('.import-modal').screenshot({ path: evid('documents-before-reorder.png') });
  console.log('shot before-reorder; items=', await page.locator('.import-modal__item').count());

  // Read the order before reordering.
  const namesBefore = await page.locator('.import-modal__name').allInnerTexts();
  console.log('order before:', namesBefore.join(' | '));

  // Move the FIRST document down (↓) so the order changes.
  await page.locator('.import-modal__item').first().getByLabel('Giù').click();
  await sleep(900);
  const namesAfter = await page.locator('.import-modal__name').allInnerTexts();
  console.log('order after :', namesAfter.join(' | '));
  await page.locator('.import-modal').screenshot({ path: evid('documents-after-reorder.png') });

  // Start processing → the "← Torna ai documenti" back control must appear during Elaborazione.
  await clickText(page, 'Avvia elaborazione');
  // poll briefly for the back button while the job is queued/processing
  let backSeen = false;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    if (await page.locator('.import-modal__back').count()) {
      backSeen = true;
      break;
    }
  }
  console.log('back-during-processing visible:', backSeen);
  await page.locator('.import-modal').screenshot({ path: evid('return-to-documents.png') });

  // Tablet viewport of the documents list.
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: VP.tablet });
  const p2 = await ctx2.newPage();
  await p2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await clickText(p2, 'Operatore');
  await sleep(700);
  await clickText(p2, 'Pazienti');
  await sleep(700);
  await clickText(p2, 'Importa dimissione');
  await sleep(500);
  await p2.locator('input[type="file"][multiple]').setInputFiles(FILES);
  await p2.locator('.import-modal__item').nth(2).waitFor({ timeout: 15000 });
  await sleep(500);
  await p2.locator('.import-modal').screenshot({ path: evid('documents-tablet.png') });
  console.log('shot tablet');

  console.log('consoleErrors:', errors.length);
  await browser.close();
};

run().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
