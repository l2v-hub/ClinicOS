import { readFileSync } from 'node:fs';
const helper = readFileSync('artifacts/task-validation/411-patient-regimes/qa-browser.mjs', 'utf8');
const marker = 'try {\n  const ctx = await contextFor();';
if (!helper.includes(marker)) throw new Error('Reviewed helper boundary changed');
// Reuse only reviewed synthetic network setup, not implementation-authored scenario assertions.
const setup = helper.slice(0, helper.indexOf(marker));
const independent = `
try {
  const ctx = await contextFor(); await login(ctx); await sidebar(ctx, 'Pazienti');
  const { page } = ctx;
  await check('Independent native keyboard changes exact regime and chip count', async () => {
    await expect(rows(page)).toHaveCount(3);
    await control(page).focus(); await expect(control(page)).toBeFocused();
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
    await expect(control(page)).toHaveValue('ricoverato'); await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).locator('td:nth-child(2)')).toHaveText('Ricoverato');
    await expect(view(page, 'Non dimessi')).toContainText('1');
    await page.keyboard.press('ArrowDown'); await expect(control(page)).toHaveValue('day_hospital');
    await expect(rows(page)).toHaveCount(1); await expect(rows(page).locator('td:nth-child(2)')).toHaveText('Day Hospital');
    await page.screenshot({path: out + '/screenshots/native-keyboard-day-hospital.png'});
  });
  await check('Independent sex server-filter composition gives exact empty and recoverable regime intersection', async () => {
    await views(page).getByRole('button', {name: 'Filtri e ordine'}).click();
    await page.getByRole('group', {name: 'Filtra pazienti per sesso'}).getByRole('button', {name: 'Maschio', exact: true}).click();
    await expect(rows(page)).toHaveCount(0); await expect(page.getByText(/0 visualizzati su 4 pazienti caricati/)).toBeVisible();
    // Unknown rows outside the exact Day Hospital intersection do not invalidate its verified zero.
    await expect(view(page, 'Non dimessi')).toContainText('0');
    await control(page).selectOption('ambulatoriale'); await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).locator('td:nth-child(2)')).toHaveText('Ambulatoriale');
    await expect(view(page, 'Non dimessi')).toContainText('1');
    await page.screenshot({path: out + '/screenshots/sex-regime-intersection.png'});
  });
  await finish(ctx, 'independent-keyboard-sex');
  for (const state of states) {
    expect(state.httpErrors).toEqual([]); expect(state.errors).toEqual([]);
  }
  writeFileSync(out + '/test-results/browser-results.json', JSON.stringify({outcomes, states, fixtureSource: 'Reviewed qa-browser synthetic network setup; independently authored assertions; no domain writes'}, null, 2));
  writeFileSync(out + '/playwright-report/index.html', '<!doctype html><meta charset=utf-8><title>Independent411 adversarial browser</title><h1>Independent keyboard and composed-filter assertions</h1><p>' + outcomes.map(o => o.name + ': ' + o.status).join('</p><p>') + '</p>');
} finally { for (const context of contexts) await context.close().catch(() => {}); await browser.close(); }
`;
try { await import('data:text/javascript;base64,' + Buffer.from(setup + independent).toString('base64')); }
catch (error) { throw new Error(error.message, { cause: undefined }); }
