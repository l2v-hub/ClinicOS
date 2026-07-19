// Synthetic discharge-import verification against the DEPLOYED app (prod).
// Drives Operatore -> Pazienti -> Importa -> upload SYNTHETIC pdf -> Avvia -> REVIEW.
// Stops at the review step (does NOT click "Crea paziente") => no prod patient write.
// Screenshots the narrative review at desktop + tablet (synthetic data only).
//   node e2e/prod-import-verify.mjs <pdfPath> <outDir>
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.PROD_URL ?? 'https://clinicos-eosin.vercel.app';
const pdf = process.argv[2];
const outDir = process.argv[3] ?? '.';
const VPS = [
  { n: 'desktop', width: 1366, height: 768 },
  { n: 'tablet', width: 1024, height: 768 },
];

async function clickFirst(page, names) {
  for (const re of names) {
    const el = page.getByRole('button', { name: re }).first();
    try {
      if ((await el.count()) && (await el.isVisible())) {
        await el.click();
        return true;
      }
    } catch {
      /* try text */
    }
    const t = page.getByText(re).first();
    try {
      if ((await t.count()) && (await t.isVisible())) {
        await t.click();
        return true;
      }
    } catch {
      /* next */
    }
  }
  return false;
}

const browser = await chromium.launch();
const report = {};
try {
  for (const vp of VPS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on('dialog', (d) => d.accept());
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(800);
    await page.getByText('Operatore', { exact: true }).click();
    await page.waitForTimeout(1500);
    await clickFirst(page, [/Pazienti/i]);
    await page.waitForTimeout(800);
    await clickFirst(page, [/Importa dimissione/i, /Importa lettera/i, /Importa/i]);
    await page.waitForTimeout(800);

    await page.setInputFiles('input[type=file][multiple]', [pdf]);
    await page.waitForTimeout(1200);
    // PHI-safe: screenshot ONLY the modal card (synthetic data); never the page (real list behind).
    const card = page.locator('.modal-card.import-modal');
    await card.screenshot({ path: resolve(outDir, `before-upload-${vp.n}.png`) });

    await clickFirst(page, [/Avvia elaborazione/i, /Elabora/i, /Processa/i]);

    // Wait for the REAL AI pipeline to reach the narrative review. The "2. Revisione" step tab is
    // always in the DOM, so poll for the ACTUAL review content (sections-review testid / Crea paziente).
    let reached = false,
      failed = false;
    for (let i = 0; i < 110; i++) {
      // up to ~220s
      await page.waitForTimeout(2000);
      if (
        (await page.locator('[data-testid="sections-review"]').count()) ||
        ((await page.textContent('body')) ?? '').includes('Crea paziente')
      ) {
        reached = true;
        break;
      }
      const b = (await page.textContent('body')) ?? '';
      if (b.includes('non riuscita') || b.includes('Estrazione completata ma')) {
        failed = true;
        break;
      }
    }
    await page.waitForTimeout(1500);
    await card.screenshot({ path: resolve(outDir, `review-${vp.n}.png`) });
    // Scroll the review panel WITHIN the card and capture more PHI-safe shots. The modal card has
    // an opaque white background, so cropping to it never reveals the (real) list behind the overlay.
    if (reached) {
      const sr = page.locator('[data-testid="sections-review"]');
      for (let s = 1; s <= 2; s++) {
        try {
          await sr.evaluate((el, dy) => {
            (el.closest('.import-modal') ?? el).scrollBy(0, dy);
            el.scrollBy?.(0, dy);
            window.scrollBy(0, dy);
          }, 620);
        } catch {
          /* ok */
        }
        await page.waitForTimeout(500);
        await card.screenshot({ path: resolve(outDir, `review-${vp.n}-${s}.png`) });
      }
    }

    const body = (await page.textContent('body')) ?? '';
    report[`${vp.n}_failed`] = failed;
    report[`${vp.n}_dateBoldDecorso`] = body.includes('03/02/2024');
    report[vp.n] = {
      reachedReview: reached,
      hasCreatePatient: body.includes('Crea paziente'),
      hasNarrativeTestId: !!(await page.locator('[data-testid="sections-review"]').count()),
      mentionsAnamnesi: body.includes('Anamnesi'),
      mentionsDiagnosi: body.includes('Diagnosi'),
      mentionsTerapia: body.includes('Terapia'),
      // legacy table symptom: a "Diagnosi (N)" structured count header
      legacyDiagnosiCount: /Diagnosi\s*\(\d+\)/.test(body),
      consoleErrors: errs.slice(0, 6),
    };
    // Do NOT create the patient — close without writing to prod.
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
