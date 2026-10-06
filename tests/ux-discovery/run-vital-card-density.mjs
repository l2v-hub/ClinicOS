import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { mockApi } from './mock-api.mjs';

const out = 'artifacts/task-validation/vital-card-density';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1150, 1024, 800, 390]) {
    for (const scenario of ['missing', 'partial', 'complete']) {
      const context = await browser.newContext({ viewport: { width, height: 884 } });
      const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
      await mockApi(context, state);
      const values =
        scenario === 'partial'
          ? { spo2: '98', pa: '115/90', fc: '78', temperatura: '36' }
          : {
              fr: '16',
              spo2: '98',
              pa: '115/90',
              fc: '78',
              temperatura: '36',
              o2: 'no',
              coscienza: 'A',
            };
      await context.route('**/patients/patient-test/parameter-readings*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            readings:
              scenario === 'missing'
                ? []
                : [
                    {
                      id: 'reading-test',
                      requestId: 'request-test',
                      patientId: 'patient-test',
                      measuredAt: '2026-09-29T11:45:00Z',
                      createdAt: '2026-09-29T11:45:00Z',
                      authorOperatorId: 'reader',
                      authorName: 'Medico Test',
                      values,
                    },
                  ],
            hasMore: false,
            nextCursor: null,
          }),
        }),
      );
      const page = await context.newPage();
      await page.goto(
        'http://127.0.0.1:5187/tests/ux-turno/app.html#/dettaglio-paziente/patient-test',
      );
      await page.getByRole('button', { name: /Medico Test/ }).click();
      const grid = page.locator('.vitals-summary > div[id] > .vitals');
      await grid.waitFor();
      const inspect = async (locator) => {
        const sizes = await locator.locator('.vt').evaluateAll((cards) =>
          cards.map((card) => ({
            height: card.getBoundingClientRect().height,
            width: card.getBoundingClientRect().width,
            overflow: card.scrollWidth > card.clientWidth,
          })),
        );
        assert.equal(sizes.length, 6);
        assert.ok(
          sizes.every((card) => Math.abs(card.height - sizes[0].height) < 1),
          `${width}/${scenario}: equal heights`,
        );
        assert.ok(
          sizes.every((card) => Math.abs(card.width - sizes[0].width) < 1),
          `${width}/${scenario}: equal widths`,
        );
        assert.ok(
          sizes.every((card) => !card.overflow),
          `${width}/${scenario}: no clipped content`,
        );
        const text = await locator.innerText();
        assert.doesNotMatch(text, /non rilevato|nessuna rilevazione|non calcolabile/i);
        assert.equal(
          (text.match(/N\/A/g) ?? []).length,
          scenario === 'missing' ? 6 : scenario === 'partial' ? 2 : 0,
        );
        if (scenario !== 'missing') assert.match(text, /115\/90/);
      };
      await inspect(grid);
      await page.screenshot({ path: `${out}/${scenario}-${width}.png`, fullPage: false });
      await page
        .getByRole('button', { name: 'Espandi ultimi parametri e NEWS2', exact: true })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Ultimi parametri e NEWS2', exact: true });
      await dialog.waitFor();
      await inspect(dialog.locator('.vitals'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(state.clinicalWrites, 0);
      await context.close();
    }
  }
  console.log('PASS: equal vital cards, N/A, preserved values and expanded view at four widths');
} finally {
  await browser.close();
}
