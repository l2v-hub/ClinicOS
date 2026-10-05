import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { mockApi } from './mock-api.mjs';

const out = 'artifacts/task-validation/shared-control-density';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const failures = [];
try {
  for (const [width, touch] of [
    [1150, false],
    [1024, true],
    [800, true],
    [390, true],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1004 },
      hasTouch: touch,
      isMobile: touch,
    });
    const state = {
      dashboardDensity: true,
      done: false,
      failMore: false,
      badFeed: false,
      requests: [],
      slotReads: 0,
      clinicalWrites: 0,
    };
    await mockApi(context, state);
    const page = await context.newPage();
    const afternoon = new Date();
    afternoon.setUTCHours(14, 0, 0, 0);
    await page.clock.setFixedTime(afternoon);
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto('http://127.0.0.1:5187/tests/ux-turno/app.html#/operator-dashboard');
    await page.getByRole('button', { name: /Medico Test/ }).click();
    const action = page.locator('.adesso-queue__row--terapia-ritardo .ds-btn').first();
    await action.waitFor();
    const height = touch ? 40 : 36;
    const check = async (selector, font = '14px') => {
      const controls = await page.locator(selector).evaluateAll((elements) =>
        elements
          .filter((el) => el.getClientRects().length)
          .map((el) => ({
            text: el.textContent,
            height: el.getBoundingClientRect().height,
            font: getComputedStyle(el).fontSize,
          })),
      );
      assert.ok(controls.length > 0, selector);
      for (const control of controls) {
        assert.equal(control.height, height, `${width}: ${control.text}`);
        assert.equal(control.font, font, `${width}: consistent command font`);
      }
    };
    const noOverflow = async () =>
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `overflow at ${width}`,
      );
    await check('.adesso-queue__row--terapia-ritardo .ds-btn');
    await noOverflow();
    await page.screenshot({ path: `${out}/dashboard-${width}.png`, fullPage: false });
    if (touch) await action.tap();
    else await action.click();
    await page.getByRole('tab', { name: 'Calendario', exact: true }).waitFor();
    const dialog = page.getByRole('dialog', { name: 'Terapie delle 07:00', exact: true });
    await page.getByRole('tab', { name: 'Calendario', exact: true }).waitFor();
    const dose = page
      .getByTestId('therapy-calendar-cell')
      .filter({ hasText: 'Farmaco sintetico 0' });
    await dose.waitFor();
    if (!(await dialog.isVisible())) {
      if (touch) await dose.tap();
      else await dose.click();
    }
    await dialog.waitFor();
    await check('.top-nav--chips .top-nav__item');
    await check('.patient-therapy-slot-detail--embedded .ds-btn');
    await check('.therapy-calendar-dialog__head > button', '18px');
    assert.match(await dialog.textContent(), /Farmaco sintetico 0.*1 compressa.*10 mg.*orale/s);
    assert.equal(await dialog.evaluate((el) => el.scrollWidth > el.clientWidth), false);
    await page.screenshot({ path: `${out}/therapy-${width}.png`, fullPage: false });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('data-testid')),
      'therapy-calendar-cell',
    );
    const input = page.locator('.patient-therapy-calendar__date input');
    assert.equal(
      await input.evaluate((el) => getComputedStyle(el).fontSize),
      touch ? '16px' : '14px',
    );
    await noOverflow();
    const pair = page
      .getByTestId('therapy-calendar-cell')
      .filter({ hasText: 'Farmaco sintetico 1' });
    if (touch) await pair.tap();
    else await pair.click();
    const pairDialog = page.getByRole('dialog', { name: 'Terapie delle 08:00', exact: true });
    await pairDialog.waitFor();
    await pairDialog
      .getByRole('button', { name: /^Erogata:/ })
      .first()
      .waitFor();
    assert.equal(await pairDialog.locator('.giro-drug').count(), 2);
    assert.equal(await pairDialog.getByRole('button', { name: /^Erogata:/ }).count(), 2);
    await check('.patient-therapy-slot-detail--embedded .ds-btn');
    assert.equal(await pairDialog.evaluate((el) => el.scrollWidth > el.clientWidth), false);
    await page.screenshot({ path: `${out}/two-doses-${width}.png`, fullPage: false });
    assert.equal(state.clinicalWrites, 0);
    await context.close();
  }
  assert.deepEqual(failures, []);
  console.log(
    'PASS shared controls: desktop and three touch widths, tabs, modal actions, focus return, readable doses, inputs and no clinical writes',
  );
} finally {
  await browser.close();
}
