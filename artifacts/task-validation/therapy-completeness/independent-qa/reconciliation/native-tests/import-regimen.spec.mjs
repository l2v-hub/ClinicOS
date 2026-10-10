import { test, expect } from 'playwright/test';
import { guard } from './fixtures.mjs';
for (const [name, viewport] of [['desktop', { width: 1256, height: 1032 }], ['mobile', { width: 390, height: 844 }]]) {
  test(`${name}: numbered name and PRN source survive browser-only draft reload`, async ({ page }, info) => {
    await page.setViewportSize(viewport); const log = await guard(page);
    await page.goto('/qa-therapy?intake');
    const review = page.getByTestId('discharge-therapy-review');
    await expect(review).toBeVisible();
    const rows = review.locator('.discharge-therapy-review__item');
    await expect(rows).toHaveCount(2);
    const alfa = rows.filter({ hasText: '1. Alfa CPR' });
    const beta = rows.filter({ hasText: 'Beta CPR' });
    await expect(alfa.getByText('ALFA', { exact: true }).first()).toBeVisible();
    await expect(beta.getByText('BETA', { exact: true }).first()).toBeVisible();
    await expect(beta.getByRole('radio', { name: /Al bisogno/ })).toBeChecked();
    await expect(beta.getByTestId('discharge-original-text')).toContainText('massimo 2 volte al giorno');
    await expect(beta.getByRole('button', { name: 'Ho verificato questa terapia', exact: true })).toBeDisabled();
    const notes = beta.getByLabel('Note e indicazioni', { exact: true });
    await expect(notes).toHaveValue(/massimo 2 volte al giorno.*1 Cpr/);
    await notes.fill((await notes.inputValue()) + ' — verifica sintetica');
    await page.reload();
    await expect(notes).toHaveValue(/verifica sintetica/);
    await expect(beta.getByRole('radio', { name: /Al bisogno/ })).toBeChecked();
    await expect(beta.getByTestId('discharge-original-text')).toContainText('Beta CPR 10 MG (OS) 1 Cpr al bisogno massimo 2 volte al giorno');
    await beta.screenshot({ path: info.outputPath(`${name}-prn-source-review.png`) });
    expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
  });
}
