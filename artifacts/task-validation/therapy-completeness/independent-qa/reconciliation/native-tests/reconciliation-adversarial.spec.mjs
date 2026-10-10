import { test, expect } from 'playwright/test';
import { guard } from './fixtures.mjs';
for(const [name,viewport] of [['desktop',{width:1256,height:1032}],['mobile',{width:390,height:844}]]) {
 test(`${name}: partial state edit cannot acknowledge extraction and untouched same-name variant stays blank`,async({page},info)=>{
  await page.setViewportSize(viewport);const log=await guard(page);
  await page.goto('/qa-therapy?reconcile');
  const rows=page.getByTestId('discharge-therapy-row');await expect(rows).toHaveCount(3);
  const low=rows.nth(1),high=rows.nth(2);
  const state=low.getByLabel('Stato terapia',{exact:true});
  await expect(state).toHaveValue('');await state.selectOption('sospesa');
  await expect(low.getByRole('button',{name:'Ho verificato questa terapia',exact:true})).toBeDisabled();
  await page.reload();await expect(state).toHaveValue('sospesa');
  await expect(low.getByLabel('Data inizio *',{exact:true})).toHaveValue('');
  await expect(high.getByLabel('Stato terapia',{exact:true})).toHaveValue('');
  await expect(high.getByTestId('structured-therapy-source')).toContainText('50 mg');
  const source=low.getByTestId('structured-therapy-source');await expect(source).toBeVisible();
  await expect(source).toContainText('25 mg');await expect(source).toContainText('<script>syntheticOnly</script>');
  await expect(source.locator('script,img,iframe')).toHaveCount(0);
  await expect(low.getByRole('button',{name:'Ho verificato questa terapia',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'QA: riepilogo',exact:true}).click();
  const sources=page.getByTestId('structured-therapy-source');await expect(sources).toHaveCount(3);
  await expect(sources.nth(1)).toContainText('25 mg');await expect(sources.nth(2)).toContainText('50 mg');
  expect(await page.evaluate(()=>globalThis.syntheticOnly)).toBeUndefined();
  await sources.nth(1).scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath(`${name}-partial-review-not-authorized.png`)});
  expect(log.errors).toEqual([]);expect(log.blocked).toEqual([]);
 });
}
