// Browser happy-path E2E for the AI import flow (REQ-020).
// Drives the real SPA end-to-end: Nuovo paziente -> multi-upload -> estrazione ->
// revisione -> "Crea paziente" -> IntakeWorkspace wizard (step 3..5, therapy +
// demographics acceptance gates, explicit allergy status #265) -> conferma ->
// paziente creato -> API persistence check -> UI reload check.
// Runs at two viewports, capturing screenshots and a Playwright trace per viewport.
// Requires backend (:3001, AI_PROVIDER=mock + mock runtime) + frontend (:5173) running.
//   node e2e/import-happy-path.mjs <outDir>
import { chromium } from 'playwright';
import { writeFixtures } from './fixtures.mjs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Overridable for local runs where the default ports are taken by a dev stack;
// CI uses the defaults (frontend :5173, backend :3001).
const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173';
const BACKEND = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
// Clinical routes require an operator identity (requireOperator middleware); this script
// calls the API directly (outside the SPA, which attaches these itself) for setup/verification.
const OPERATOR_HEADERS = { 'X-Operator-Id': 'SEED-OP-001', 'X-Operator-Role': 'operatore' };
const outDir = process.argv[2] ?? '.';
const fx = writeFixtures(resolve(tmpdir(), 'clinicos-e2e-fixtures'));
// #265: each viewport exercises a different explicit allergy status; both must persist.
const VIEWPORTS = [
  {
    name: 'desktop',
    width: 1366,
    height: 768,
    allergyStatus: 'paziente_nega',
    allergyLabel: 'Paziente nega allergie',
    // #294: CF sintetico valido, distinto per viewport (chiave univoca a DB).
    cf: 'SNTDSK55P09H501W',
  },
  {
    name: 'tablet',
    width: 1024,
    height: 768,
    allergyStatus: 'assenti',
    allergyLabel: 'Allergie assenti (verificato)',
    cf: 'SNTTBL55P09H501B',
  },
];

// #294: local re-runs against a persistent DB — free the unique CFs first via the
// test-only delete route (CI DBs are fresh, this is a no-op there).
async function searchPatients(q) {
  const res = await fetch(`${BACKEND}/patients/page/search`, {
    method: 'POST',
    headers: { ...OPERATOR_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, limit: '20' }),
  });
  if (!res.ok) throw new Error(`Patient search failed (${res.status})`);
  const page = await res.json();
  if (!Array.isArray(page.items)) throw new Error('Patient search returned an invalid page');
  return page.items;
}
async function freeCfs() {
  try {
    for (const vp of VIEWPORTS) {
      for (const p of await searchPatients(vp.cf)) {
        if (p.codiceFiscale !== vp.cf) continue;
        await fetch(`${BACKEND}/patients/${p.id}`, {
          method: 'DELETE',
          headers: OPERATOR_HEADERS,
        }).catch(() => {});
      }
    }
  } catch {
    /* best-effort */
  }
}

/** Navigate from the SPA root to the operator patient list. */
async function gotoPatientList(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(900);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1300);
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(900);
}

await freeCfs();
const browser = await chromium.launch();
let failures = 0;
try {
  for (const [index, vp] of VIEWPORTS.entries()) {
    // Each complete login/reload verifies the seeded medication catalogue. Keep two
    // independent journeys outside the same public-search rate-limit window.
    if (index > 0) await new Promise((done) => setTimeout(done, 61_000));
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    page.on('dialog', (d) => d.accept());
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    // AC: no relevant backend 4xx/5xx. A 409 on confirm is the *explicit* duplicate branch —
    // recorded separately and only tolerated when the UI then handles it via "Crea comunque".
    const httpFailures = [];
    let duplicate409 = 0;
    page.on('response', (r) => {
      if (r.status() < 400 || !r.url().startsWith(BACKEND)) return;
      if (r.status() === 409 && r.url().includes('/confirm')) {
        duplicate409++;
        return;
      }
      httpFailures.push(`${r.status()} ${r.url()}`);
    });
    const tag = `req020-${vp.name}`;
    const lastName = `Sintetico_${vp.name}`;
    try {
      await gotoPatientList(page);
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
      if (
        !(await demo.isVisible().catch(() => false)) &&
        (await dataTab.isVisible().catch(() => false))
      ) {
        await dataTab.click().catch(() => {});
      }
      await demo.waitFor({ state: 'visible', timeout: 30000 });
      await page.screenshot({ path: resolve(outDir, `${tag}-2-review.png`) });

      // Modifica: fill the required anagrafica fields (synthetic; the mock extraction is empty).
      // Field order (ANAG_PREFILL): Nome, Cognome, Data di nascita(type=date), Sesso,
      // Codice fiscale, Indirizzo, Telefono, Email — text inputs: 0=Nome 1=Cognome 2=Sesso 3=CF.
      await demo.locator('input[type=text]').nth(0).fill('E2E'); // Nome
      await demo.locator('input[type=text]').nth(1).fill(lastName); // Cognome (unique per viewport)
      await demo.locator('input[type=date]').first().fill('1955-09-09'); // Data di nascita
      await demo.locator('input[type=text]').nth(3).fill(vp.cf); // #294: CF (chiave univoca)
      await page.waitForTimeout(300);
      await page.screenshot({ path: resolve(outDir, `${tag}-3-prefilled.png`) });

      // "Crea paziente" hands off to the IntakeWorkspace, now a single page with a section index
      // (HMI 1): every section is on the same page.
      await page.getByRole('button', { name: /Crea paziente/i }).click();
      await page
        .locator('[data-testid="intake-section-terapia"]')
        .waitFor({ state: 'visible', timeout: 15000 });

      // #265: the allergy selection must actually update the draft. Before the fix the button
      // rendered but aria-checked never flipped and the "non documentato" hint never cleared.
      const statusBtn = page.locator(`[data-testid="allergy-status-${vp.allergyStatus}"]`);
      await statusBtn.click();
      await page.waitForFunction(
        (s) =>
          document
            .querySelector(`[data-testid="allergy-status-${s}"]`)
            ?.getAttribute('aria-checked') === 'true',
        vp.allergyStatus,
        { timeout: 5000 },
      );
      const undocumented = await page
        .locator('[data-testid="allergy-undocumented"]')
        .isVisible()
        .catch(() => false);
      if (undocumented)
        throw new Error(
          'allergy status selected but "non documentato" hint still shown — draft not updated',
        );

      // #235 gate: explicit therapy acceptance (empty therapy in the mock fixture).
      // Conferma = interruttore nella testata della sezione Terapia (aria-pressed).
      await page.locator('[data-testid="accept-therapy"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="accept-therapy"]')?.getAttribute('aria-pressed') ===
          'true',
        null,
        { timeout: 5000 },
      );
      await page.waitForTimeout(700); // allow the debounced autosave to flush
      await page.screenshot({ path: resolve(outDir, `${tag}-4-step3-clinica.png`) });

      // #235 gate: explicit demographics acceptance (header toggle of the Anagrafica section),
      // then "Crea paziente" from the section index once nothing required is missing.
      await page.locator('[data-testid="accept-demographics"]').click();
      await page.waitForTimeout(700); // allow the debounced autosave to flush
      await page
        .locator('[data-testid="intake-missing"]', { hasText: 'Pronto per la creazione' })
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.screenshot({ path: resolve(outDir, `${tag}-5-riepilogo.png`) });
      await page
        .locator('.intake-index__actions')
        .getByRole('button', { name: /Crea paziente/i })
        .click();

      // Outcome: wizard closes on success, or the explicit duplicate branch appears (AC4).
      const wizardHeader = page.locator('[data-testid="patient-intake-header"]');
      const dupBtn = page.getByRole('button', { name: /Crea comunque/i });
      await Promise.race([
        wizardHeader.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => null),
        dupBtn.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
      ]);
      let dupHandled = false;
      if (await dupBtn.isVisible().catch(() => false)) {
        console.log(`${tag}: duplicate detected — confirming explicitly via "Crea comunque"`);
        await page.screenshot({ path: resolve(outDir, `${tag}-6-duplicate.png`) });
        await dupBtn.click();
        await wizardHeader.waitFor({ state: 'hidden', timeout: 20000 });
        dupHandled = true;
      } else if (duplicate409 > 0) {
        throw new Error('confirm returned 409 but the duplicate branch UI never appeared');
      }
      await wizardHeader.waitFor({ state: 'hidden', timeout: 5000 });
      await page.waitForTimeout(1200); // list refresh
      await page.screenshot({ path: resolve(outDir, `${tag}-7-created.png`) });

      // ── API persistence (AC2/AC5): the patient exists and the cartella carries the status ──
      const patients = await searchPatients(vp.cf);
      const created = patients.find((p) => p.firstName === 'E2E' && p.lastName === lastName);
      if (!created)
        throw new Error(`API check failed: patient E2E ${lastName} not found in /patients`);
      const cartellaRes = await fetch(`${BACKEND}/patients/${created.id}/cartella`, {
        headers: OPERATOR_HEADERS,
      });
      if (!cartellaRes.ok)
        throw new Error(
          `API check failed: GET /patients/${created.id}/cartella -> ${cartellaRes.status}`,
        );
      const cartella = await cartellaRes.json();
      const persisted = cartella?.data?.allergieStatus;
      if (persisted !== vp.allergyStatus) {
        throw new Error(
          `API check failed: cartella.allergieStatus=${JSON.stringify(persisted)} — expected '${vp.allergyStatus}'`,
        );
      }
      // AC3: the explicit-absent statuses must not co-exist with a recorded allergy list.
      const allergie = Array.isArray(cartella?.data?.allergie) ? cartella.data.allergie : [];
      if (vp.allergyStatus !== 'presenti' && allergie.length > 0) {
        throw new Error(
          `API check failed: status '${vp.allergyStatus}' with ${allergie.length} allergie recorded — ambiguous clinical state`,
        );
      }
      console.log(
        `${tag}: API persistence OK — patient ${created.id} allergieStatus='${persisted}'`,
      );

      // ── UI after reload (AC2/AC5): list shows the patient; detail shows the status ──
      await gotoPatientList(page);
      await page.getByText(lastName).first().waitFor({ state: 'visible', timeout: 15000 });
      await page.getByText(lastName).first().click();
      await page.getByRole('tab', { name: /^Clinica/ }).click();
      const savedStatus = page.locator(`[data-testid="allergy-status-${vp.allergyStatus}"]`);
      await savedStatus.waitFor({ state: 'visible', timeout: 15000 });
      if ((await savedStatus.getAttribute('aria-checked')) !== 'true')
        throw new Error('Saved allergy status is not selected after reload');
      await page
        .locator(
          `[data-testid="${vp.allergyStatus === 'assenti' ? 'allergy-none' : 'allergy-denied'}"]`,
        )
        .waitFor({ state: 'visible', timeout: 15000 });
      await page.screenshot({ path: resolve(outDir, `${tag}-8-reload-detail.png`) });
      console.log(`${tag}: UI-after-reload OK — detail shows '${vp.allergyLabel}'`);

      // The handled duplicate branch legitimately produces ONE browser console entry for the
      // expected 409 confirm response ("Failed to load resource ... 409"); every other console
      // error still fails the run.
      const relevantErrors = errors.filter((t) => !(dupHandled && /\b409\b/.test(t)));
      if (relevantErrors.length) {
        throw new Error(`console errors detected (${relevantErrors.length}): ${relevantErrors[0]}`);
      }
      if (httpFailures.length) {
        throw new Error(`relevant backend HTTP failures: ${httpFailures.join(' | ')}`);
      }
      console.log(`${tag}: created=true consoleErrors=0 httpFailures=0`);
    } catch (err) {
      failures++;
      console.log(`${tag} FAILED: ${err.message}`);
      await page.screenshot({ path: resolve(outDir, `${tag}-FAIL.png`) }).catch(() => {});
    } finally {
      await context.tracing.stop({ path: resolve(outDir, `${tag}-trace.zip`) }).catch(() => {});
      await context.close();
    }
  }
} finally {
  await browser.close();
}
// AC5: missing persistence (or any failed gate above) terminates non-zero.
process.exit(failures ? 1 : 0);
