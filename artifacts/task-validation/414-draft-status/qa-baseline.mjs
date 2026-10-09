import {writeFileSync} from 'node:fs';
import {browser,makeContext,openChart,finish,out,expect} from './qa-fixture.mjs';
const ctx=await makeContext();
try {
  await openChart(ctx);await ctx.page.getByRole('tab',{name:/^Moduli/}).click();
  await ctx.page.getByRole('button',{name:'Apri PAINAD',exact:true}).click();
  await ctx.page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true}).click();
  await ctx.page.locator('.painad-metadata summary').click();
  await expect(ctx.page.locator('.painad-metadata')).toContainText('Salvala sul server');
  await ctx.page.screenshot({path:`${out}/screenshots/baseline-technical-hint.png`});
  await ctx.page.getByRole('button',{name:'Chiudi · conserva compilazione',exact:true}).click();
  await expect(ctx.page.locator('.assessment-local')).toContainText('Draft');
  await ctx.page.screenshot({path:`${out}/screenshots/baseline-draft-label.png`});
  writeFileSync(`${out}/test-results/baseline.json`,JSON.stringify({application:'e01bd55114e2b5b1615b4088d988a41aad60eb80',technicalHint:true,englishDraftLabel:true,synthetic:true,productionWrites:0},null,2));
  await finish(ctx,'baseline');
} finally {await ctx.context.close().catch(()=>{});await browser.close();}
