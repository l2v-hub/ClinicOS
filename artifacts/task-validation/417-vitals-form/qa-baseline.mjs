import { writeFileSync } from 'node:fs';
import {browser,makeContext,openChart,out,expect,patient} from './qa-fixture.mjs';
const records=[];
try {
  for(const view of ['chart','ward']) {
    const ctx=await makeContext({extraCapabilities:['parameters.list_page']});
    ctx.state.apiHandler=async(req,json)=>{
      if(new URL(req.url()).pathname==='/patients/parameters/page') {
        await json({items:[{patient,cartella:{pazienteId:patient.id,readingCount:0,noteCount:0,lastReadingAt:null}}],hasMore:false,nextCursor:null});return true;
      }return false;
    };
    await openChart(ctx);
    if(view==='chart')await ctx.page.getByRole('tab',{name:/Parametri/}).click();
    else await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Parametri',exact:true}).click();
    await expect(ctx.page.locator(view==='chart'?'.parameter-single-entry':'.par-form')).toBeVisible();
    await ctx.page.screenshot({path:`${out}/screenshots/baseline-${view}.png`,fullPage:true});
    records.push({view,fields:await ctx.page.locator(view==='chart'?'.parameter-single-entry input,.parameter-single-entry select':'.par-form input,.par-form button.ds-chip').evaluateAll(els=>els.map(e=>({label:e.getAttribute('aria-label'),mode:e.inputMode,placeholder:e.placeholder}))),source:'accepted415 0d7adc361b92c8466655d9ed830d2b87bbd0f419',unexpected:ctx.state.unexpected,writes:ctx.state.domainWrites});
    await ctx.context.tracing.stop({path:`${out}/baseline-${view}-trace.zip`});await ctx.context.close();
  }
}finally{writeFileSync(`${out}/baseline-results.json`,JSON.stringify(records,null,2));await browser.close();}
