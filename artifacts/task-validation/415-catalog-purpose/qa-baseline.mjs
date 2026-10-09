import {writeFileSync} from 'node:fs';
import {browser,makeContext,openChart,finish,out,expect} from './qa-fixture.mjs';
const ctx=await makeContext();
try {
  await openChart(ctx);await ctx.page.getByRole('tab',{name:/^Moduli/}).click();
  const catalog=ctx.page.locator('.assessment-catalog');
  await expect(catalog.getByRole('button',{name:'Apri PAINAD',exact:true})).toBeVisible();
  await expect(catalog.locator('.assessment-catalog-purpose')).toHaveCount(0);
  await expect(catalog.getByRole('button',{name:'Nuova compilazione PAINAD',exact:true})).toHaveText('＋');
  await ctx.page.screenshot({path:`${out}/screenshots/baseline-catalog.png`});
  writeFileSync(`${out}/test-results/baseline.json`,JSON.stringify({application:'288dac948c8a46e26e1bef87d6266b2497727566',purposeCount:0,iconOnly:true,synthetic:true,productionWrites:0},null,2));
  await finish(ctx,'baseline');
} finally {await ctx.context.close().catch(()=>{});await browser.close();}
