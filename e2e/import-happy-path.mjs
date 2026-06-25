// Browser happy-path E2E for the AI import flow (REQ-020).
// Drives the real SPA: Nuovo paziente -> multi-upload -> estrazione -> revisione ->
// modifica -> conferma -> paziente creato, at two viewports, capturing screenshots.
// Requires backend (:3001, AI_PROVIDER=mock) + frontend (:5173) running.
//   node e2e/import-happy-path.mjs <outDir>
import { chromium } from 'playwright';
import { writeFixtures } from './fixtures.mjs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const FRONTEND = 'http://localhost:5173';
const outDir = process.argv[2] ?? '.';
const fx = writeFixtures(resolve(tmpdir(), 'clinicos-e2e-fixtures'));
const VIEWPORTS = [{ name: 'desktop', width: 1366, height: 768 }, { name: 'tablet', width: 1024, height: 768 }];

const browser = await chromium.launch();
let failures = 0;
try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on('dialog', (d) => d.accept()); // auto-accept duplicate prompt if any
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const tag = `req020-${vp.name}`;
    try {
      await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(900);
      await page.getByText('Operatore', { exact: true }).click();
      await page.waitForTimeout(1300);
      await page.getByText('Pazienti').first().click();
      await page.waitForTimeout(900);
      await page.getByText('Importa dimissione').first().click();
      await page.waitForTimeout(700);

      // Multi-file upload (pdf + jpg).
      await page.setInputFiles('input[type=file][multiple]', [fx.pdf, fx.jpg]);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: resolve(outDir, `${tag}-1-upload.png`) });

      // Extraction -> narrative sections review (ImportSectionsReview).
      await page.getByRole('button', { name: /Avvia elaborazione/i }).click();
      const demo = page.locator('[data-testid="srev-PATIENT_DEMOGRAPHICS"]');
      // On narrow viewports the review is single-pane tabbed (Documento | Dati ClinicOS) and
      // defaults to the document; the anagrafica form lives under "Dati ClinicOS". On wide
      // viewports both panes show. Wait for the review, then activate the data pane if tabbed.
      const dataTab = page.getByRole('tab', { name: /Dati ClinicOS/i });
      await Promise.race([
        demo.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null),
        dataTab.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null),
      ]);
      if (!(await demo.isVisible().catch(() => false)) && (await dataTab.isVisible().catch(() => false))) {
        await dataTab.click().catch(() => {});
      }
      await demo.waitFor({ state: 'visible', timeout: 30000 });
      await page.screenshot({ path: resolve(outDir, `${tag}-2-review.png`) });

      // Modifica: fill the required anagrafica fields (synthetic; the mock extraction is empty).
      // Field order (ANAG_PREFILL): Nome, Cognome, Data di nascita(type=date), Sesso, ...
      await demo.locator('input[type=text]').nth(0).fill('E2E');                  // Nome
      await demo.locator('input[type=text]').nth(1).fill(`Sintetico_${vp.name}`); // Cognome (unique per viewport)
      await demo.locator('input[type=date]').first().fill('1955-09-09');          // Data di nascita
      await page.waitForTimeout(300);
      await page.screenshot({ path: resolve(outDir, `${tag}-3-prefilled.png`) });

      // Conferma -> paziente creato.
      await page.getByRole('button', { name: /Crea paziente/i }).click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: resolve(outDir, `${tag}-4-created.png`) });

      const body = (await page.textContent('body')) ?? '';
      const ok = body.includes(`Sintetico_${vp.name}`) || body.includes('E2E');
      console.log(`${tag}: created=${ok} consoleErrors=${errors.length}`);
      if (errors.length) { console.log(`${tag} first error:`, errors[0]); }
    } catch (err) {
      failures++;
      console.log(`${tag} FAILED: ${err.message}`);
      await page.screenshot({ path: resolve(outDir, `${tag}-FAIL.png`) }).catch(() => {});
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
