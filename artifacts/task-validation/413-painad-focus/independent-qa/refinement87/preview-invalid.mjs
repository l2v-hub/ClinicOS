import {writeFileSync} from 'node:fs';
process.env.QA_FIXTURE_ONLY='1';
const {browser,makeContext,openChart,finish,out,states,expect}=await import('../../qa-fixture.mjs');
const ctx=await makeContext();
try{
 await openChart(ctx);await ctx.page.getByRole('tab',{name:/^Moduli/}).click();await ctx.page.getByRole('button',{name:'Apri PAINAD',exact:true}).click();await ctx.page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true}).click();
 for(const key of ['respiration','negativeVocalization','facialExpression','bodyLanguage','consolability'])await ctx.page.locator(`input[data-field-path=${key}]`).first().click();
 await ctx.page.locator('.painad-metadata summary').click();const date=ctx.page.locator('.assessment-date input');await date.fill('');await ctx.page.locator('.painad-metadata summary').click();
 await ctx.page.getByRole('button',{name:'Salva e verifica anteprima',exact:true}).click();
 await expect(date).toBeVisible();await expect(date).toBeFocused();
 expect(ctx.state.requests.filter(r=>r.method==='POST'&&r.path.endsWith('/assessments'))).toHaveLength(0);
 await ctx.page.screenshot({path:`${out}/screenshots/invalid-preview-date.png`});await finish(ctx,'preview-invalid');
 writeFileSync(`${out}/test-results/preview-invalid.json`,JSON.stringify({status:'PASS',states},null,2));
}catch(e){writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:e.message,states},null,2));await ctx.page.screenshot({path:`${out}/screenshots/failure.png`}).catch(()=>{});await ctx.context.tracing.stop({path:`${out}/failure-trace.zip`}).catch(()=>{});throw e;}finally{await ctx.context.close().catch(()=>{});await browser.close();}
