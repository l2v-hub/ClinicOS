import {writeFileSync} from 'node:fs';
import {browser,makeContext,openChart,finish,out,expect} from './qa-fixture.mjs';
const measurements=[];
async function measure(page,scope){
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  measurements.push({scope,controls:await page.locator('button,input,select,[role=tab]').evaluateAll(els=>els.filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,cls:e.className,name:e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent?.trim()||e.getAttribute('placeholder'),w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}))});
  await page.screenshot({path:`${out}/screenshots/${scope}.png`,fullPage:true});
}
try{
  const ctx=await makeContext();await openChart(ctx);
  await measure(ctx.page,'chart');
  await ctx.page.getByRole('tab',{name:/^Moduli/}).click();await measure(ctx.page,'modules');
  await ctx.page.getByRole('button',{name:'Storico PAINAD',exact:true}).click();await expect(ctx.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();await measure(ctx.page,'workspace');
  await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();
  await expect(ctx.page.getByRole('button',{name:'Apri cartella di Persona Sintetica',exact:true})).toBeVisible();
  await ctx.page.getByRole('searchbox',{name:'Cerca paziente per nome o codice fiscale'}).fill('Sintetica');await measure(ctx.page,'roster');
  await finish(ctx,'baseline');
  writeFileSync(`${out}/test-results/geometry.json`,JSON.stringify(measurements,null,2));
  console.log(JSON.stringify(measurements.map(m=>({scope:m.scope,undersized:m.controls.filter(c=>(c.w<44||c.h<44)&&!c.cls.includes('sidebar')).map(c=>({name:c.name,w:c.w,h:c.h,cls:c.cls}))})),null,2));
}finally{await browser.close();}
