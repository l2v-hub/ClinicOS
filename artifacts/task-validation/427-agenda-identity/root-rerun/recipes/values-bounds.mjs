import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium,expect,setup,finish,labels} from './transport.mjs';
const out=resolve(process.argv[2]);assert.ok(process.argv[2]);assert.equal(existsSync(out),false);for(const p of ['screenshots','video','trace','test-results','playwright-report'])mkdirSync(out+'/'+p,{recursive:true});
const browser=await chromium.launch({headless:true}),outcomes=[],states=[],contexts=[],measurements=[];
try{
 for(const [width,height,device]of [[1280,720,'desktop'],[390,844,'mobile']]){
  const ctx=await setup(browser,out,width,height);contexts.push(ctx);states.push(ctx.state);
  for(const view of ['Giorno','Settimana','Mese']){
   await ctx.page.getByRole('button',{name:view,exact:true}).click();const selector=view==='Giorno'?'.agt-admin-grid .agt-apt-card':view==='Settimana'?'.agt-week-apt':'.agt-month-apt';await expect(ctx.page.locator(selector)).toHaveCount(8);
   for(const [i,apt]of ctx.appointments.entries()){
    const card=ctx.page.locator(selector).filter({hasText:'Paziente sintetico '+i});await expect(card).toHaveCount(1);await expect(card).toBeVisible();await expect(card).toContainText(apt.patientName);await expect(card).toContainText(labels[i%4]);
    if(view==='Giorno'){const header=ctx.page.locator('.agt-col-hdr__name').nth(ctx.operators.findIndex(o=>o.id===apt.operatorId));await expect(header).toHaveText(ctx.operators.find(o=>o.id===apt.operatorId).cognome+' Sintetico');}else await expect(card.locator('.agt-inline-meta')).toContainText(apt.operatorName);
   }
   const baseline=await ctx.page.locator(selector).allTextContents();await ctx.page.addStyleTag({content:'html { filter: grayscale(1); }'});expect(await ctx.page.locator(selector).allTextContents()).toEqual(baseline);
   for(const locator of [ctx.page.locator('.agt-state-filter__caption'),ctx.page.locator('.agt-legend__title'),...await ctx.page.locator('.agt-legend__item').all()]){await locator.scrollIntoViewIfNeeded();await expect(locator).toBeVisible();const r=await locator.evaluate(n=>{const b=n.getBoundingClientRect();return {text:n.textContent,x:b.x,right:b.right,width:b.width,client:n.clientWidth,scroll:n.scrollWidth};});expect(r.x).toBeGreaterThanOrEqual(-1);expect(r.right).toBeLessThanOrEqual(width+1);expect(r.scroll).toBeLessThanOrEqual(r.client+1);measurements.push({device,view,...r});}
   await ctx.page.locator('.agt-state-filter__caption').scrollIntoViewIfNeeded();await ctx.page.screenshot({path:out+'/screenshots/'+device+'-'+view.toLowerCase()+'-values-bounds.png',fullPage:true});outcomes.push({name:device+' '+view+' exact patient/operator/state values and changed hierarchy bounds retained in grayscale',status:'PASS'});console.log('PASS '+device+' '+view+' exact values/bounds');
  }
  await finish(ctx,out,device);
 }
 writeFileSync(out+'/test-results/browser-results.json',JSON.stringify({applicationCommit:process.env.SOURCE_COMMIT,outcomes,states,measurements},null,2));writeFileSync(out+'/playwright-report/index.html','<!doctype html><meta charset="utf-8"><h1>427 supplemental Playwright library assertion receipt</h1><pre>'+JSON.stringify(outcomes,null,2)+'</pre>');
}catch(e){for(const [i,c]of contexts.entries()){await c.page.screenshot({path:out+'/screenshots/failure-'+i+'.png',fullPage:true}).catch(()=>{});await c.context.tracing.stop({path:out+'/trace/failure-'+i+'.zip'}).catch(()=>{});}writeFileSync(out+'/test-results/failure.json',JSON.stringify({message:e.message,stack:e.stack,outcomes,states,measurements},null,2));throw e;}finally{for(const c of contexts)await c.context.close().catch(()=>{});await browser.close();}
