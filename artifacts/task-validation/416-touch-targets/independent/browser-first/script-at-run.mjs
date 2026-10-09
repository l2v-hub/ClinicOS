import {writeFileSync} from 'node:fs';
import {browser,makeContext,finish,out,outcomes,states,expect} from './qa-fixture.mjs';
const geometry=[],focus=[],activeContexts=[];
const base=process.env.QA_BASE_URL||'http://127.0.0.1:7478';
const rooms=[{id:'QA-ROOM-416',numero:'S1',tipo:'singola',piano:'1',reparto:'Reparto sintetico con denominazione estesa',stato:'attiva',note:'Solo fixture QA',beds:[{id:'QA-BED-416',roomId:'QA-ROOM-416',label:'A',stato:'libero',note:'',assignments:[]}]}];
const settings=[{name:'1150',viewport:{width:1150,height:1004}},{name:'1280',viewport:{width:1280,height:720}},{name:'390-coarse',mobile:true,coarse:true},{name:'1280-coarse',viewport:{width:1280,height:720},coarse:true}];
async function settle(page){await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function shot(page,name){await settle(page);await page.screenshot({path:`${out}/screenshots/${name}.png`,fullPage:true});}
async function nativeFocus(page,item,label){
  if(!(await item.isEnabled()))return;
  await item.focus();
  if(await item.getAttribute('tabindex')!=='-1'){await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');}
  else await page.keyboard.press('Shift');
  await expect(item).toBeFocused();await settle(page);
  const data=await item.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);const header=document.querySelector('.compact-topbar')?.getBoundingClientRect();return{name:el.getAttribute('aria-label')||el.textContent?.trim(),outline:s.outlineStyle,width:s.outlineWidth,color:s.outlineColor,visible:!!h&&(h===el||el.contains(h)),top:r.top,bottom:r.bottom,headerBottom:header?.bottom,tabIndex:el.tabIndex,withinHeader:!!el.closest('.compact-topbar'),scrollMargin:s.scrollMarginBlockStart};});
  focus.push({label,...data});expect(data.outline,label).not.toBe('none');expect(parseFloat(data.width),label).toBeGreaterThanOrEqual(2);expect(data.visible,`${label} native painted focus not covered`).toBe(true);
  if(page.viewportSize().width<=1023&&!data.withinHeader&&!(await item.evaluate(e=>!!e.closest('[role=dialog]'))))expect(data.top,`${label} clears sticky topbar`).toBeGreaterThanOrEqual(data.headerBottom);
}
async function controls(page,selector,label,{keyboard=true}={}){
  const items=page.locator(selector).filter({visible:true});expect(await items.count(),label).toBeGreaterThan(0);
  for(let i=0;i<await items.count();i++){
    const item=items.nth(i);await expect(item).toBeVisible();await item.scrollIntoViewIfNeeded();await settle(page);
    const data=await item.evaluate(el=>{const r=el.getBoundingClientRect();return{name:el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent?.trim(),class:el.className,w:r.width,h:r.height,x:r.x,y:r.y,right:r.right,bottom:r.bottom,hits:[[r.x+2,r.y+r.height/2],[r.right-2,r.y+r.height/2],[r.x+r.width/2,r.y+2],[r.x+r.width/2,r.bottom-2],[r.x+r.width/2,r.y+r.height/2]].map(([x,y])=>{const h=document.elementFromPoint(x,y);return{x,y,inside:!!h&&(h===el||el.contains(h)),hit:h?.tagName};})};});
    geometry.push({label,...data});expect(data.w,`${label}:${data.name}:width`).toBeGreaterThanOrEqual(44);expect(data.h,`${label}:${data.name}:height`).toBeGreaterThanOrEqual(44);expect(data.x,label).toBeGreaterThanOrEqual(0);expect(data.right,label).toBeLessThanOrEqual(page.viewportSize().width);expect(data.hits.every(h=>h.inside),`${label}:${data.name}:edge-midpoints`).toBe(true);
    if(keyboard)await nativeFocus(page,item,`${label}:${data.name}`);
  }
}
async function pairs(page,selector,label){const boxes=await page.locator(selector).filter({visible:true}).evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{name:e.getAttribute('aria-label')||e.textContent?.trim(),x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];expect(Math.min(a.right,b.right)<=Math.max(a.x,b.x)||Math.min(a.bottom,b.bottom)<=Math.max(a.y,b.y),`${label}:${a.name}/${b.name}`).toBe(true);}geometry.push({label,nonoverlap:true,boxes});}
function configure(ctx){ctx.state.apiHandler=async(req,json)=>{if(req.method()!=='GET')return false;const p=new URL(req.url()).pathname;let data;if(p==='/patients/settings')data={deleteEnabled:true};else if(p==='/admin/rooms')data=rooms;else if(p==='/admin/rooms/occupancy')data={totalRooms:1,totalBeds:1,occupiedBeds:0,freeBeds:1,maintenanceBeds:0,occupancyPct:0};else if(p.includes('operators')&&p.endsWith('/summary'))data={total:1,active:1,appointmentsToday:0};else if(p==='/operators/page'||p==='/admin/operators')data=p.endsWith('/page')?{items:[],pageInfo:{hasMore:false,nextCursor:null}}:[];else return false;await json(data);return true;};}
async function login(ctx,role,path='pazienti'){await ctx.page.goto(`${base}/#/${path}`);await ctx.page.getByRole('button',{name:role==='nurse'?/Infermiere Sintetico/:/Supervisore Sintetico/}).click();}
async function nav(ctx,name){if(ctx.state.mobile)await ctx.page.getByRole('button',{name:'Apri menu',exact:true}).click();await ctx.page.locator('.teams-sidebar').getByRole('button',{name,exact:true}).click();}
async function chart(ctx){await ctx.page.getByRole('button',{name:'Apri cartella di Persona Sintetica',exact:true}).click();await expect(ctx.page.locator('.top-nav--chips')).toBeVisible();await ctx.page.getByRole('tab',{name:/^Clinica/}).click();await expect(ctx.page.locator('[data-clinical-topic=DIAGNOSIS]').getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();}
async function record(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}
try{
  for(const role of ['nurse','supervisor'])for(const setting of role==='nurse'?settings:settings.slice(0,3)){
    const name=`${role}-${setting.name}`,ctx=await makeContext({...setting,...role==='supervisor'?{authIdentity:{id:'QA-SUPERVISOR-416',name:'Supervisore Sintetico',appRole:'supervisor',roleLabel:'Supervisore',uiShell:'admin'},extraCapabilities:['rooms.list','operators.page','operators.summary','consegne.overview']}: {}});activeContexts.push(ctx);configure(ctx);const page=ctx.page;
    await login(ctx,role);await expect(page.locator('.patient-list-view')).toBeVisible();
    await record(`${name}:roster independent bounds and clear via keyboard`,async()=>{
      const search=page.getByRole('searchbox',{name:'Cerca paziente per nome o codice fiscale'});await search.fill('Persona');await expect(page.getByRole('button',{name:'Cancella',exact:true})).toBeVisible();
      await controls(page,'.patient-roster__open,.patient-roster__delete,.patient-card__actions button,.plist-search input,.plist-search button,.plist-views button,.plist-tools button',`${name}:roster`);
      await pairs(page,'.patient-roster__actions button,.patient-card__actions button',`${name}:open/delete`);await pairs(page,'.plist-search input,.plist-search button',`${name}:search-clear`);
      const clear=page.getByRole('button',{name:'Cancella',exact:true});await nativeFocus(page,clear,`${name}:clear`);await page.keyboard.press('Space');await expect(search).toHaveValue('');await expect(page.locator('.patient-list-view')).toBeVisible();await shot(page,`${name}-roster-result`);
    });
    await chart(ctx);
    await record(`${name}:chart toolbar navigation inline cancel and print`,async()=>{
      await controls(page,'.compact-topbar button,.chart-sections button,.demographics-status button,.clinical-topic button,.inline-edit__value',`${name}:chart`);
      await pairs(page,'.chart-sections__actions button',`${name}:print-PS`);
      const active=page.getByRole('tab',{name:/^Clinica/});await active.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[role=tab][aria-selected=true]').last()).toBeFocused();await page.getByRole('tab',{name:/^Clinica/}).click();
      const edit=page.getByRole('button',{name:'Patologie note e interventi pregressi',exact:true});await nativeFocus(page,edit,`${name}:inline`);await page.keyboard.press('Enter');await expect(page.locator('.inline-edit__input').filter({visible:true})).toBeFocused();
      await controls(page,'.inline-edit__btn',`${name}:inline-actions`);await pairs(page,'.inline-edit__btn',`${name}:inline-save-cancel`);const cancel=page.getByRole('button',{name:'Annulla',exact:true}).filter({visible:true});await cancel.focus();await page.keyboard.press('Space');await expect(edit).toBeFocused();
      const print=page.getByRole('button',{name:'Stampa la scheda',exact:true});await nativeFocus(page,print,`${name}:print`);await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await controls(page,'[role=dialog] button:not([disabled])',`${name}:print-dialog`);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await shot(page,`${name}-chart-result`);
    });
    await page.getByRole('tab',{name:/^Moduli/}).click();
    await record(`${name}:catalog purpose native creation and draft-history-reload`,async()=>{
      await controls(page,'.assessment-catalog button',`${name}:catalog`);await pairs(page,'.assessment-catalog-actions button',`${name}:catalog-actions`);await expect(page.getByRole('button',{name:'Storico PAINAD',exact:true})).toBeVisible();
      const history=page.getByRole('button',{name:'Storico PAINAD',exact:true});await history.focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();
      await controls(page,'.assessment-workspace button,.assessment-workspace input:not([type=radio]):not([type=checkbox]),.assessment-workspace select,.patient-module-return',`${name}:workspace`);
      const create=page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true});await expect(create).toHaveText('Nuova compilazione');await create.focus();await page.keyboard.press('Space');const first=page.locator('.paper-form--focused input[type=radio]').first();await expect(first).toBeFocused();await page.keyboard.press('Space');await expect(first).toBeChecked();
      geometry.push({label:`${name}:unchanged-radio`,...(await first.evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))),scope:'Unchanged whole-cell native choice; not operator-validated equivalent44'});
      const returnButton=page.getByRole('button',{name:'← Tutti i moduli',exact:true});await returnButton.click();await page.getByRole('button',{name:'Storico PAINAD',exact:true}).click();await expect(page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();await page.getByRole('button',{name:'← Tutti i moduli',exact:true}).click();await page.reload();await expect(page.locator('.patient-list-view,.patient-record-view').first()).toBeVisible();
      if(await page.locator('.patient-list-view').isVisible())await chart(ctx);else await page.getByRole('tab',{name:/^Clinica/}).click();await page.getByRole('tab',{name:/^Moduli/}).click();
      const resume=page.getByRole('button',{name:'Riprendi bozza PAINAD',exact:true});await expect(resume).toBeVisible();await resume.focus();await page.keyboard.press('Enter');await expect(page.locator('.paper-form--focused input[type=radio]').first()).toBeChecked();await shot(page,`${name}-draft-result`);await page.getByRole('button',{name:'← Tutti i moduli',exact:true}).click();await shot(page,`${name}-catalog-result`);
    });
    if(role==='supervisor'){
      await nav(ctx,'Posti letto');await expect(page.locator('.rooms-view')).toBeVisible();
      await record(`${name}:rooms edit bed dialog native escape`,async()=>{await controls(page,'.rooms-view .icon-btn,.rooms-view .btn-primary,.rooms-view .filter-chip',`${name}:rooms`);await pairs(page,'.room-card__header button',`${name}:room-actions`);const edit=page.getByRole('button',{name:'Modifica camera',exact:true});await edit.focus();await page.keyboard.press('Enter');await controls(page,'.op-form-panel input,.op-form-panel select,.op-form-panel button',`${name}:room-fields`);await page.getByRole('button',{name:'Annulla',exact:true}).click();await page.getByRole('button',{name:'Modifica letto',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await controls(page,'[role=dialog] button,[role=dialog] input,[role=dialog] select',`${name}:bed-dialog`);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await shot(page,`${name}-rooms-result`);});
    }
    await finish(ctx,name);activeContexts.splice(activeContexts.indexOf(ctx),1);
  }
  writeFileSync(`${out}/test-results/geometry.json`,JSON.stringify({geometry,focus},null,2));writeFileSync(`${out}/test-results/results.json`,JSON.stringify({outcomes,states,synthetic:true,physicalDeviceAcceptance:'EXTERNALLY UNVERIFIED AC3; coarse contexts emulation only',productionWrites:0},null,2));
  writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><title>Independent416 QA</title><h1>Independent 416 software evidence</h1><p>Overall BLOCKED: real intended-device touch AC3 unverified. Synthetic fixtures; emulation is not human signoff.</p><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
}catch(error){writeFileSync(`${out}/test-results/preliminary-failure.json`,JSON.stringify({message:error.message,outcomes,geometry,focus,states},null,2));for(const ctx of activeContexts){await ctx.page.screenshot({path:`${out}/screenshots/preliminary-failure.png`,fullPage:true}).catch(()=>{});await ctx.context.tracing.stop({path:`${out}/preliminary-failure-trace.zip`}).catch(()=>{});}throw error;}finally{await browser.close();}
