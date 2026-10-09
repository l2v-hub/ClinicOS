import { writeFileSync } from 'node:fs';
import { browser,makeContext,openChart,check,out,outcomes,states,expect,patient } from './online-fixture.mjs';
import { syntheticReadings } from './synthetic-readings.mjs';
const now=new Date('2026-10-09T10:00:00Z');
const labels=['FR','SpO₂','O₂','PA sistolica','PA diastolica','FC','TC','Coscienza','DTX','Evacuazione','Note sulla rilevazione'];
async function open(view,viewport={width:1150,height:1004},history=syntheticReadings(patient.id,now),touch=false) {
 const ctx=await makeContext({viewport,mobile:viewport.width<600||touch,coarse:touch,extraCapabilities:['parameters.list_page','parameters.create_reading','parameters.save_reading']});
 await ctx.page.clock.install({time:now});ctx.state.history=history;
 ctx.state.apiHandler=async(req,json)=>{
  const p=new URL(req.url()).pathname;
  if(p==='/patients/parameters/page'){await json({items:[{patient,cartella:{pazienteId:patient.id,readingCount:3,noteCount:0,lastReadingAt:history[0]?.measuredAt}}],hasMore:false,nextCursor:null});return true;}
  if(p===`/patients/${patient.id}/parameter-readings`&&req.method()==='GET'){await json({readings:ctx.state.history,hasMore:false,nextCursor:null});return true;}
  return false;
 };
 await openChart(ctx);
 if(view==='overview')await ctx.page.getByRole('tab',{name:/^Panoramica/}).click();
 else if(view==='chart')await ctx.page.getByRole('tab',{name:/Parametri/}).click();
 else{if(await ctx.page.getByRole('button',{name:'Apri menu'}).isVisible())await ctx.page.getByRole('button',{name:'Apri menu'}).click();await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Parametri',exact:true}).click();}
 ctx.surface=view==='overview'?ctx.page.getByRole('region',{name:'Ultimi parametri e NEWS2'}):ctx.page.getByRole('form',{name:'Nuova rilevazione',exact:true});
 await expect(ctx.surface).toBeVisible();
 return ctx;
}
async function end(ctx,name){
 for(const key of ['domainWrites','unexpected','external','pageErrors','httpErrors','errors'])expect(ctx.state[key],key).toEqual([]);
 await ctx.context.tracing.stop({path:`${out}/${name}-trace.zip`});const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${name}.webm`);await video.delete();
}
try{
 for(const view of ['overview','chart','ward']){
  const ctx=await open(view);
  await check(`${view}: minutes days weeks and full date/year visibly associated, no new values`,async()=>{
   const surface=ctx.surface;
   for(const [value,date,age] of [['18','09/10/2026 11:52','8 minuti fa'],['98','06/10/2026 12:00','3 giorni fa'],['120','25/09/2026 12:00','2 settimane fa']]){
    const block=view==='overview'?surface.locator('.vt').filter({hasText:value}).first():surface.locator('label').filter({hasText:`Prima: ${value}`}).first();
    await expect(block).toContainText(date);await expect(block).toContainText(age);await expect(block).toBeVisible();
   }
   if(view!=='overview')for(const label of labels)await expect(surface.getByLabel(`Nuova rilevazione ${label}`,{exact:true})).toHaveValue('');
   const captions=surface.locator('.reading-recency,.parameter-reading-form__previous');
   const metrics=await captions.evaluateAll(els=>els.map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{font:parseFloat(s.fontSize),white:s.whiteSpace,right:r.right,width:r.width,client:e.clientWidth,scroll:e.scrollWidth,text:e.textContent};}));
   expect(metrics.every(m=>m.font>=14&&m.white==='normal'&&m.scroll<=m.client+1)).toBe(true);
   expect(metrics.every(m=>!/attuale|appena rilevato|rilevato ora/i.test(m.text))).toBe(true);
   await ctx.page.screenshot({path:`${out}/screenshots/${view}-recency.png`,fullPage:true});
  });
  await check(`${view}: one display clock advances minutes without history refetch or draft edits`,async()=>{
   if(view!=='overview')await ctx.surface.getByLabel('Nuova rilevazione FC',{exact:true}).fill('83');
   const reads=ctx.state.requests.filter(r=>r.path.endsWith('/parameter-readings')).length;
   await ctx.page.clock.fastForward(120000);
   await expect(ctx.surface).toContainText('10 minuti fa');
   expect(ctx.state.requests.filter(r=>r.path.endsWith('/parameter-readings'))).toHaveLength(reads);
   if(view!=='overview')await expect(ctx.surface.getByLabel('Nuova rilevazione FC',{exact:true})).toHaveValue('83');
  });
  if(view==='overview')await check('overview expanded comparison has independent source date and unchanged NEWS2',async()=>{
   await ctx.page.getByRole('button',{name:'Espandi ultimi parametri e NEWS2'}).click();
   const dialog=ctx.page.getByRole('dialog');
   const fr=dialog.locator('.vt').filter({hasText:'atti/min'});
   await expect(fr).toContainText('era 16');await expect(fr).toContainText('25/09/2026 12:00');
   await expect(dialog.locator('.vt--news2')).toContainText('0');await expect(dialog.locator('.vt--news2')).toContainText('2 settimane fa');
   await ctx.page.screenshot({path:`${out}/screenshots/overview-expanded.png`,fullPage:true});
   await dialog.getByRole('button',{name:'Chiudi parametri espansi'}).click();
  });
  else await check(`${view}: native keyboard order unchanged, no implicit save`,async()=>{
   await ctx.surface.getByLabel('Nuova rilevazione FR',{exact:true}).focus();
   for(const label of labels){await expect(ctx.surface.getByLabel(`Nuova rilevazione ${label}`,{exact:true})).toBeFocused();await ctx.page.keyboard.press('Tab');}
   await ctx.surface.getByLabel('Nuova rilevazione SpO₂',{exact:true}).press('Enter');await expect(ctx.surface.getByLabel('Nuova rilevazione O₂',{exact:true})).toBeFocused();
  });
  await end(ctx,view);
 }
 for(const viewport of [{width:768,height:1024},{width:390,height:844}])for(const view of ['overview','chart','ward']){
  const ctx=await open(view,viewport);
  await check(`${view}-${viewport.width}: recency remains wrapped visible and inside viewport`,async()=>{
   const selector=view==='overview'?'.reading-recency':'.parameter-reading-form__previous';
   await expect(ctx.surface).toContainText('2 settimane fa');
   const metrics=await ctx.surface.locator(selector).evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,right:r.right,scroll:e.scrollWidth,client:e.clientWidth,width:r.width};}));
   expect(metrics.every(m=>m.x>=0&&m.right<=viewport.width&&m.scroll<=m.client+1&&m.width>0)).toBe(true);
   await ctx.page.screenshot({path:`${out}/screenshots/${view}-${viewport.width}.png`,fullPage:true});
  });await end(ctx,`${view}-${viewport.width}`);
 }
 for(const view of ['overview','chart','ward']){
  const invalid=syntheticReadings(patient.id,now);invalid[0].measuredAt='bad';invalid[1].measuredAt='2026-10-10T10:00:00Z';
  const ctx=await open(view,undefined,invalid);
  await check(`${view}: invalid/future date is explicit and history never becomes current`,async()=>{
   await expect(ctx.surface).toContainText('Data/ora non verificabile');await expect(ctx.surface).toContainText('data/ora futura — da verificare');
   if(view!=='overview')for(const label of labels)await expect(ctx.surface.getByLabel(`Nuova rilevazione ${label}`,{exact:true})).toHaveValue('');
  });await end(ctx,`${view}-guarded-dates`);
 }
 for(const view of ['overview','chart','ward']){
  const ctx=await open(view,{width:768,height:1024},undefined,true);
  await check(`${view}-touch768: actual scaled CSS and projected physical viewport both fit`,async()=>{
   await expect(ctx.surface).toContainText('2 settimane fa');
   const metrics=await ctx.surface.locator('.reading-recency,.parameter-reading-form__previous').evaluateAll(els=>({
    client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
    visual:visualViewport.width,scale:visualViewport.scale,
    captions:els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,right:r.right,scroll:e.scrollWidth,client:e.clientWidth};})}));
   expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1);
   expect(metrics.captions.every(m=>m.x>=0&&m.right<=metrics.visual+1&&m.right*metrics.scale<=769&&m.scroll<=m.client+1)).toBe(true);
   writeFileSync(`${out}/${view}-touch768-metrics.json`,JSON.stringify(metrics,null,2));
   await ctx.page.screenshot({path:`${out}/screenshots/${view}-touch768.png`,fullPage:true});
  });await end(ctx,`${view}-touch768`);
 }
 for(const view of ['overview','chart','ward']){
  const history=syntheticReadings(patient.id,now);
  for(const [i,date] of ['0099-01-01T00:00:00Z','0999-01-01T00:00:00Z','9999-12-31T23:59:00Z'].entries())history[i].measuredAt=date;
  const ctx=await open(view,undefined,history);
  await check(`${view}: unsupported year representation shows unavailable without crashing or prefilling`,async()=>{
   await expect(ctx.surface).toContainText('Data/ora non verificabile');
   if(view!=='overview')for(const label of labels)await expect(ctx.surface.getByLabel(`Nuova rilevazione ${label}`,{exact:true})).toHaveValue('');
   await ctx.page.screenshot({path:`${out}/screenshots/${view}-year-boundary.png`,fullPage:true});
  });await end(ctx,`${view}-year-boundary`);
 }
}catch(error){writeFileSync(`${out}/failure.txt`,error.stack);throw error;}
finally{writeFileSync(`${out}/browser-results.json`,JSON.stringify({outcomes,states},null,2));await browser.close();}
