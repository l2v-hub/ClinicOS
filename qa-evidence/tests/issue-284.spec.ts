// #284 — Agenda compatta: slot e celle ridotti (slot ora ≤48px, half ≤32px; celle admin ≤42px)
// per mostrare più fasce orarie a parità di viewport, senza perdere le interazioni.
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';

async function minHeightOf(page: import('@playwright/test').Page, sel: string): Promise<number> {
  const el = page.locator(sel).first();
  await expect(el).toBeVisible();
  return el.evaluate((n) => parseFloat(getComputedStyle(n).minHeight));
}

test('#284 agenda operatore: slot compatti e più fasce visibili', async ({ page }) => {
  const g = guard(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await enterAs(page, 'Operatore');
  await nav(page, 'Agenda');

  // AC1: nuove altezze compatte (prima: hour 64 / half 44).
  const hour = await minHeightOf(page, '.agt-slot--hour');
  const half = await minHeightOf(page, '.agt-slot--half');
  expect(hour).toBeLessThanOrEqual(48);
  expect(half).toBeLessThanOrEqual(32);

  // AC2: a 1280x800 sono visibili nel viewport più slot di quanti ne stavano con le vecchie
  // altezze (64px → al più 12 slot-ora in 800px; ora ≥ 13 slot totali visibili).
  const visibleSlots = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.agt-slot')).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0 && r.height > 0;
    }).length;
  });
  expect(visibleSlots).toBeGreaterThanOrEqual(13);

  await page.screenshot({ path: `${OUT}/screenshots/284-agenda-operatore.png`, fullPage: false });
  g.assertClean();
});

test('#284 agenda admin: celle multi-operatore compatte', async ({ page }) => {
  const g = guard(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await enterAs(page, 'Amministratore');
  await nav(page, 'Agenda');

  const cellHour = await minHeightOf(page, '.agt-admin-cell.hour');
  expect(cellHour).toBeLessThanOrEqual(42);

  await page.screenshot({ path: `${OUT}/screenshots/284-agenda-admin.png`, fullPage: false });
  g.assertClean();
});
