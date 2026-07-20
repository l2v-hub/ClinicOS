// Fase 1b — CRUD operatori reale + qualifica (admin "Gestione Operatori").
// AC2: gli operatori vengono dal backend (non mock) e persistono dopo reload.
// AC3: la qualifica è impostabile dal form e persiste.
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
const EMAIL = `e2e-1b-${STAMP}@clinicos.demo`;
const COGNOME = `Fase1b${STAMP}`;

async function gotoOperatori(page: import('@playwright/test').Page) {
  await enterAs(page, 'Amministratore');
  await nav(page, 'Operatori');
  await expect(page.getByText('Gestione Operatori').first()).toBeVisible();
}

test('operatore con qualifica: crea, modifica, persiste dopo reload', async ({ page }) => {
  const g = guard(page);
  await gotoOperatori(page);

  // Dati reali dal backend (seed), non più MOCK_OPERATORI (che conteneva "Ferretti Marco")
  await expect(page.getByText('Bianchi Laura').first()).toBeVisible();
  await expect(page.getByText('Ferretti')).toHaveCount(0);

  // ── Crea nuovo operatore con qualifica ──
  await page.getByRole('button', { name: 'Nuovo Operatore' }).click();
  await page.getByPlaceholder('Nome', { exact: true }).fill('Elena');
  await page.getByPlaceholder('Cognome').fill(COGNOME);
  const selects = page.locator('.op-form-grid select');
  await selects.nth(0).selectOption('infermiere');
  await page.getByPlaceholder('Es. OSS, Fisioterapista, Specialista…').fill('OSS');
  await page.getByPlaceholder('Reparto', { exact: true }).fill('Reparto QA');
  await page.getByPlaceholder('email@clinicos.it').fill(EMAIL);
  await page.getByRole('button', { name: 'Crea operatore' }).click();

  // Riga creata con ruolo · qualifica dal server
  const row = page.locator('tr', { hasText: `${COGNOME} Elena` });
  await expect(row).toBeVisible();
  await expect(row.getByText('Infermiere · OSS')).toBeVisible();

  // ── Persistenza dopo reload (stato ricaricato dal backend) ──
  await page.reload();
  await gotoOperatori(page);
  const rowAfterReload = page.locator('tr', { hasText: `${COGNOME} Elena` });
  await expect(rowAfterReload).toBeVisible();
  await expect(rowAfterReload.getByText('Infermiere · OSS')).toBeVisible();

  // ── Modifica qualifica dal form ──
  await rowAfterReload.locator('.icon-btn--edit').click();
  const qualifica = page.getByPlaceholder('Es. OSS, Fisioterapista, Specialista…');
  await expect(qualifica).toHaveValue('OSS');
  await qualifica.fill('OSS Specializzato');
  await page.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(rowAfterReload.getByText('Infermiere · OSS Specializzato')).toBeVisible();

  // ── Persistenza della modifica dopo reload ──
  await page.reload();
  await gotoOperatori(page);
  const rowFinal = page.locator('tr', { hasText: `${COGNOME} Elena` });
  await expect(rowFinal).toBeVisible();
  await expect(rowFinal.getByText('Infermiere · OSS Specializzato')).toBeVisible();

  await page.screenshot({
    path: `${OUT}/screenshots/operatori-qualifica-final.png`,
    fullPage: true,
  });
  g.assertClean();
});
