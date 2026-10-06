import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { mockApi } from './mock-api.mjs';

const out = 'artifacts/task-validation/clinical-section-controls';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1150, 800, 390]) {
    const touch = width < 1150;
    const context = await browser.newContext({
      viewport: { width, height: 884 },
      hasTouch: touch,
      isMobile: touch,
    });
    const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
    await mockApi(context, state);
    await context.route('**/patients/patient-test/narrative-sections', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sections: [
            {
              sectionKey: 'ALLERGIES',
              title: 'Allergie',
              originalText: 'Testo sintetico da verificare',
              reviewedText: '',
              displayText: 'Testo sintetico da verificare',
              annotations: [],
              sourceReferences: [{ fileName: 'Fonte sintetica.pdf', pageFrom: 2 }],
              reviewStatus: 'pending',
            },
          ],
        }),
      }),
    );
    const page = await context.newPage();
    await page.goto(
      'http://127.0.0.1:5187/tests/ux-turno/app.html#/dettaglio-paziente/patient-test/diagnosi',
    );
    await page.getByRole('button', { name: /Medico Test/ }).click();
    const narrative = page.getByTestId('narr-ALLERGIES');
    await narrative.waitFor();
    await page.getByRole('button', { name: /Chiudi tutte le sezioni/ }).click();
    const toggles = await page
      .locator('.cts__header-left > button, .narrative-section__head > button')
      .evaluateAll((buttons) =>
        buttons.map((button) => ({
          height: button.getBoundingClientRect().height,
          width: button.getBoundingClientRect().width,
          font: getComputedStyle(button).fontSize,
          glyph: button.textContent,
          expanded: button.getAttribute('aria-expanded'),
          controls: button.getAttribute('aria-controls'),
        })),
      );
    assert.ok(toggles.length >= 5);
    assert.ok(
      toggles.every(
        (toggle) => toggle.height === (touch ? 40 : 36) && toggle.width === toggle.height,
      ),
    );
    assert.ok(
      toggles.every(
        (toggle) =>
          toggle.font === toggles[0].font &&
          toggle.glyph === '▸' &&
          toggle.expanded === 'false' &&
          toggle.controls,
      ),
    );
    assert.equal(await page.locator('.cts__chevron, .cts__header[role="button"]').count(), 0);
    await page.screenshot({ path: `${out}/collapsed-${width}.png`, fullPage: false });
    const diagnosis = page
      .locator('.cts')
      .filter({ has: page.getByText('Diagnosi / Lista Problemi', { exact: true }) });
    await diagnosis.getByRole('button', { name: '+ Aggiungi', exact: true }).click();
    const description = diagnosis.getByLabel('Descrizione *', { exact: true });
    await description.waitFor();
    await description.fill('Diagnosi sintetica non salvata');
    await diagnosis
      .getByRole('button', { name: 'Comprimi Diagnosi / Lista Problemi', exact: true })
      .press('Enter');
    assert.equal(await description.isVisible(), false);
    await diagnosis
      .getByRole('button', { name: 'Espandi Diagnosi / Lista Problemi', exact: true })
      .press('Space');
    assert.equal(await description.inputValue(), 'Diagnosi sintetica non salvata');
    await diagnosis.getByRole('button', { name: 'Annulla', exact: true }).click();
    await narrative.getByRole('button', { name: 'Modifica', exact: true }).click();
    const draft = narrative.locator('textarea');
    await draft.waitFor();
    await draft.fill('Nota sintetica non salvata');
    await page.getByRole('button', { name: /Chiudi tutte le sezioni/ }).click();
    assert.equal(await draft.isVisible(), false);
    await page.getByRole('button', { name: /Apri tutte le sezioni/ }).click();
    assert.equal(await draft.inputValue(), 'Nota sintetica non salvata');
    await narrative.getByRole('button', { name: 'Annulla', exact: true }).click();
    await narrative.getByRole('button', { name: 'Comprimi Allergie', exact: true }).click();
    await narrative.getByRole('button', { name: 'Visualizza fonte', exact: true }).click();
    assert.equal(
      await narrative
        .getByRole('button', { name: 'Comprimi Allergie', exact: true })
        .getAttribute('aria-expanded'),
      'true',
    );
    assert.equal(state.clinicalWrites, 0);
    await context.close();
  }
  console.log(
    'PASS: consistent clinical controls, keyboard toggles, visible editors/source and retained drafts at three widths',
  );
} finally {
  await browser.close();
}
