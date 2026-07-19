// BUG-045 (#67) + BUG-046 (#68) verification on the DEPLOYED app, synthetic 2-page letter.
// Drives to the review step (no patient write), then reads the ANAMNESIS section text and
// asserts BOTH pages merged into one block, the page-2 text did NOT bleed into Terapia, and
// the repeated anagraphic header did NOT bleed into the clinical section.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.PROD_URL ?? 'https://clinicos-eosin.vercel.app';
const pdf = process.argv[2];
const outDir = process.argv[3] ?? '.';

async function clickFirst(page, names) {
  for (const re of names) {
    const el = page.getByRole('button', { name: re }).first();
    try {
      if ((await el.count()) && (await el.isVisible())) {
        await el.click();
        return true;
      }
    } catch {
      /* */
    }
    const t = page.getByText(re).first();
    try {
      if ((await t.count()) && (await t.isVisible())) {
        await t.click();
        return true;
      }
    } catch {
      /* */
    }
  }
  return false;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  await clickFirst(page, [/Pazienti/i]);
  await page.waitForTimeout(800);
  await clickFirst(page, [/Importa dimissione/i, /Importa lettera/i, /Importa/i]);
  await page.waitForTimeout(800);
  await page.setInputFiles('input[type=file][multiple]', [pdf]);
  await page.waitForTimeout(1000);
  await clickFirst(page, [/Avvia elaborazione/i]);

  let reached = false;
  for (let i = 0; i < 110; i++) {
    await page.waitForTimeout(2000);
    if (
      (await page.locator('[data-testid="sections-review"]').count()) ||
      ((await page.textContent('body')) ?? '').includes('Crea paziente')
    ) {
      reached = true;
      break;
    }
    if (((await page.textContent('body')) ?? '').includes('non riuscita')) break;
  }
  await page.waitForTimeout(1200);

  const anam =
    (await page
      .locator('[data-testid="srev-ANAMNESIS"]')
      .textContent()
      .catch(() => '')) ?? '';
  const ther =
    (await page
      .locator('[data-testid="srev-DISCHARGE_HOME_THERAPY"]')
      .textContent()
      .catch(() => '')) ?? '';
  await page
    .locator('.modal-card.import-modal')
    .screenshot({ path: resolve(outDir, 'multipage-review.png') })
    .catch(() => {});
  const anamLoc = page.locator('[data-testid="srev-ANAMNESIS"]');
  if (await anamLoc.count())
    await anamLoc.screenshot({ path: resolve(outDir, 'multipage-anamnesi.png') }).catch(() => {});

  console.error('=== RAW ANAMNESI TEXT ===\n' + JSON.stringify(anam.slice(0, 900)));
  console.log(
    JSON.stringify(
      {
        reached,
        anamnesi_hasPaginaUno: /pagina uno/i.test(anam),
        anamnesi_hasPaginaDue: /pagina due/i.test(anam), // continuation merged into ONE block
        anamnesi_mergedBothPages: /pagina uno/i.test(anam) && /pagina due/i.test(anam),
        anamnesi_noHeaderBleed: !/codice fiscale/i.test(anam) && !/cartella/i.test(anam),
        therapy_hasFarmaco: /Farmaco-di-prova/i.test(ther),
        therapy_noPaginaDueBleed: !/pagina due/i.test(ther), // page-2 text stayed in Anamnesi, not Terapia
        anamLen: anam.length,
        therLen: ther.length,
      },
      null,
      2,
    ),
  );
  await page.close();
} finally {
  await browser.close();
}
