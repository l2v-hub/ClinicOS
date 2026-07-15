// Browser happy-path E2E for the AI import flow (REQ-020).
// Drives the real SPA end-to-end: Nuovo paziente -> multi-upload -> estrazione -> revisione ->
// modifica -> handoff to the IntakeWorkspace wizard (F5 #124) -> allergy state documented ->
// #235 acceptance gates (terapia + anagrafica) -> Crea paziente -> patient persisted, at two
// viewports, capturing screenshots. Creation is asserted against the backend /patients API and
// re-verified in the UI after a full reload — never against transient form text (QA-263-014).
// Requires backend (:3001, AI_PROVIDER=mock) + frontend (:5173) running.
//   node e2e/import-happy-path.mjs <outDir>
import { chromium } from 'playwright';
import { writeFixtures } from './fixtures.mjs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const FRONTEND = process.env.CLINICOS_E2E_FRONTEND ?? 'http://localhost:5173';
const API = process.env.CLINICOS_E2E_API ?? process.env.VITE_API_URL ?? 'http://localhost:3001';
const outDir = process.argv[2] ?? '.';
const fx = writeFixtures(resolve(tmpdir(), 'clinicos-e2e-fixtures'));
const VIEWPORTS = [{ name: 'desktop', width: 1366, height: 768 }, { name: 'tablet', width: 1024, height: 768 }];
// Unique per run so local reruns against a persistent DB never depend on the duplicate path.
const RUN_ID = process.env.CLINICOS_E2E_RUN_ID ?? Date.now().toString(36);

const browser = await chromium.launch();
let failures = 0;
try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on('dialog', (d) => d.accept()); // auto-accept duplicate prompt if any
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const tag = `req020-${vp.name}`;
    const lastName = `Sintetico_${vp.name}_${RUN_ID}`;
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
      await demo.locator('input[type=text]').nth(0).fill('E2E');       // Nome
      await demo.locator('input[type=text]').nth(1).fill(lastName);    // Cognome (unique per viewport+run)
      await demo.locator('input[type=date]').first().fill('1955-09-09'); // Data di nascita
      await page.waitForTimeout(300);
      await page.screenshot({ path: resolve(outDir, `${tag}-3-prefilled.png`) });

      // "Crea paziente" in the review hands off to the IntakeWorkspace wizard at step 3
      // (Clinica) — it does NOT create the patient yet (F5 #124 / QA-263-014).
      await page.getByRole('button', { name: /Crea paziente/i }).click();
      await page.locator('[data-testid="intake-step-3"]').waitFor({ state: 'visible', timeout: 30000 });

      // Step 3 (Clinica): document the allergy state explicitly — synthetic patient denies
      // allergies — and satisfy the #235 therapy acceptance gate.
      await page.locator('[data-testid="allergy-status-paziente_nega"]').click();
      await page.locator('[data-testid="allergy-denied"]').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('[data-testid="accept-therapy"] input[type=checkbox]').check();
      await page.screenshot({ path: resolve(outDir, `${tag}-4-clinica-confirmed.png`) });

      // Steps 4 (Moduli) and 5 (Documenti) -> 6 (Verifica).
      const avanti = page.locator('[data-testid="patient-intake-footer"] button.btn-primary');
      await avanti.click();
      await page.locator('[data-testid="intake-step-4"]').waitFor({ state: 'visible', timeout: 10000 });
      await avanti.click();
      await page.locator('[data-testid="intake-step-5"]').waitFor({ state: 'visible', timeout: 10000 });
      await avanti.click();
      await page.locator('[data-testid="intake-step-6"]').waitFor({ state: 'visible', timeout: 10000 });

      // Step 6 (Verifica): satisfy the #235 demographics acceptance gate; the blocking
      // checklist must clear before creation is allowed.
      await page.locator('[data-testid="accept-demographics"] input[type=checkbox]').check();
      await page.locator('[data-testid="intake-blocking-checklist"]').waitFor({ state: 'hidden', timeout: 5000 });
      await page.screenshot({ path: resolve(outDir, `${tag}-5-verifica-accepted.png`) });

      // Crea paziente (StepVerifica button — enabled only when the checklist passes).
      await page.locator('[data-testid="intake-step-6"]').getByRole('button', { name: /Crea paziente/i }).click();
      // Local persistent DBs may flag a duplicate — take the explicit "Crea comunque" path.
      const dupBtn = page.getByRole('button', { name: /Crea comunque/i });
      const header = page.locator('[data-testid="patient-intake-header"]');
      await Promise.race([
        header.waitFor({ state: 'detached', timeout: 30000 }).catch(() => null),
        dupBtn.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null),
      ]);
      if (await dupBtn.isVisible().catch(() => false)) {
        await dupBtn.click();
      }
      await header.waitFor({ state: 'detached', timeout: 30000 });

      // Persistence check 1 — backend API is authoritative (not transient form text).
      const apiRes = await fetch(`${API}/patients`);
      const patients = apiRes.ok ? await apiRes.json() : [];
      const persisted = Array.isArray(patients)
        ? patients.find((p) => p.firstName === 'E2E' && p.lastName === lastName)
        : undefined;

      // Persistence check 2 — the patient survives a full SPA reload.
      await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(900);
      await page.getByText('Operatore', { exact: true }).click();
      await page.waitForTimeout(1300);
      await page.getByText('Pazienti').first().click();
      const row = page.getByText(lastName).first();
      const visibleAfterReload = await row.waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true).catch(() => false);
      await page.screenshot({ path: resolve(outDir, `${tag}-6-created-persisted.png`) });

      const ok = Boolean(persisted) && visibleAfterReload;
      console.log(`${tag}: created=${ok} persistedId=${persisted?.id ?? 'none'} visibleAfterReload=${visibleAfterReload} consoleErrors=${errors.length}`);
      if (errors.length) { console.log(`${tag} first error:`, errors[0]); }
      // #133 AC3/AC4 + QA-263-014: a non-persisted outcome is a hard failure with an explicit
      // diagnostic (synthetic fixtures only — no PHI), never a silent pass.
      if (!ok) {
        failures++;
        console.log(`${tag} ASSERT FAILED: patient not persisted — api=${Boolean(persisted)} uiAfterReload=${visibleAfterReload}`);
        await page.screenshot({ path: resolve(outDir, `${tag}-FAIL-not-created.png`) }).catch(() => {});
      }
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
