// #283 — La card "Consegne aperte" della dashboard apre la pagina Consegne già filtrata sulle
// aperte; con UNA sola consegna aperta la card corrispondente è evidenziata e portata in vista.
// La sidebar continua ad aprire la vista non filtrata.
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const API = 'http://localhost:3001';

test('#283 card consegne aperte: filtro applicato + focus sulla singola aperta', async ({
  page,
}) => {
  // Stato deterministico: lascia UNA sola consegna non completata (aperta), completa le altre.
  const list = (await (await page.request.get(`${API}/consegne`)).json()) as Array<{
    id: string;
    stato: string;
    pazienteNome: string;
  }>;
  const nonCompletate = list.filter((c) => c.stato !== 'completata');
  expect(nonCompletate.length, 'servono consegne seed nel DB').toBeGreaterThan(0);
  const keep = nonCompletate[0];
  for (const c of nonCompletate.slice(1)) {
    const r = await page.request.put(`${API}/consegne/${c.id}`, {
      data: { stato: 'completata' },
    });
    expect(r.ok()).toBeTruthy();
  }
  // La dashboard operatore conta solo le consegne assegnate all'utente loggato (Dr. Marco
  // Ferretti nel ruolo demo): assegna la consegna rimasta a lui.
  const r = await page.request.put(`${API}/consegne/${keep.id}`, {
    data: { stato: 'aperta', operatoreAssegnato: 'Dr. Marco Ferretti' },
  });
  expect(r.ok()).toBeTruthy();

  const g = guard(page);
  await enterAs(page, 'Operatore');

  // AC1+AC2: click sulla card → pagina Consegne filtrata "Aperte" + card focus evidenziata.
  const card = page.locator('.stat-card', { hasText: 'Consegne Aperte' });
  await expect(card).toBeVisible();
  await expect(card.locator('.stat-card__value')).toHaveText('1');
  await card.click();
  await page.waitForTimeout(800);

  await expect(page.locator('.filter-chip.active', { hasText: 'Aperte' })).toBeVisible();
  const focused = page.locator('.consegna-card--focus');
  await expect(focused).toBeVisible();
  await expect(focused).toContainText(keep.pazienteNome.split(',')[0]);
  const inViewport = await focused.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });
  expect(inViewport, 'la card focus è scrollata in vista').toBeTruthy();

  await page.screenshot({ path: `${OUT}/screenshots/283-consegna-focus.png`, fullPage: true });

  // AC3: la navigazione generica da sidebar azzera filtro e focus.
  await nav(page, 'Dashboard');
  await nav(page, 'Consegne');
  await expect(page.locator('.filter-chip.active', { hasText: 'Tutte' }).first()).toBeVisible();
  await expect(page.locator('.consegna-card--focus')).toHaveCount(0);

  await page.screenshot({
    path: `${OUT}/screenshots/283-sidebar-vista-completa.png`,
    fullPage: true,
  });
  g.assertClean();
});
