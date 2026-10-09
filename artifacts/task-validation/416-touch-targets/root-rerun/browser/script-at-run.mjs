import {writeFileSync} from 'node:fs';
import {browser,makeContext,openChart,check,finish,out,outcomes,states,expect} from './qa-fixture.mjs';
const geometry=[];
const visible=locator=>locator.filter({visible:true});
async function stable(page){await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function inspect(page,locator,label){
  const controls=visible(locator);await expect(controls.first()).toBeVisible();const count=await controls.count();expect(count,label).toBeGreaterThan(0);
  for(let i=0;i<count;i++){
    const item=controls.nth(i);await item.scrollIntoViewIfNeeded();await stable(page);
    // Test edge midpoints; rounded corners are intentionally outside the painted target.
    const result=await item.evaluate(el=>{const r=el.getBoundingClientRect();const hits=[[r.left+3,r.top+r.height/2],[r.right-3,r.top+r.height/2],[r.left+r.width/2,r.top+3],[r.left+r.width/2,r.bottom-3],[r.left+r.width/2,r.top+r.height/2]].map(([x,y])=>{const hit=document.elementFromPoint(x,y);return{x,y,inside:!!hit&&(hit===el||el.contains(hit)),actual:hit?.className};});return{name:el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent?.trim(),cls:el.className,w:r.width,h:r.height,l:r.left,r:r.right,t:r.top,b:r.bottom,hits};});
    geometry.push({label,...result});expect(result.w,`${label}:${result.name}:width`).toBeGreaterThanOrEqual(44);expect(result.h,`${label}:${result.name}:height`).toBeGreaterThanOrEqual(44);
    expect(result.l).toBeGreaterThanOrEqual(0);expect(result.r).toBeLessThanOrEqual(page.viewportSize().width);
    expect(result.hits.every(h=>h.inside),`${label}:${result.name}:corners ${JSON.stringify(result.hits)}`).toBe(true);
    if(await item.isEnabled()){
      await item.focus();
      // Native roving tabs intentionally keep inactive tabs out of Tab order.
      if(await item.getAttribute('tabindex')!=='-1'){await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');}
      else{await page.keyboard.press('Shift');}
      await expect(item).toBeFocused();
      const focus=await item.evaluate(e=>{const s=getComputedStyle(e);return{s:s.outlineStyle,w:s.outlineWidth,offset:s.outlineOffset,searchRing:e.matches('.search-input')?getComputedStyle(e.closest('.search-wrap')).boxShadow:'none'};});
      expect((focus.s!=='none'&&parseFloat(focus.w)>=2)||focus.searchRing!=='none',`${label}:${result.name}:visible focus ${JSON.stringify(focus)}`).toBe(true);
    }
  }
}
async function separated(page,selector,label){
  const rects=await visible(page.locator(selector)).evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{name:e.getAttribute('aria-label')||e.textContent,l:r.left,r:r.right,t:r.top,b:r.bottom};}));
  for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){const x=rects[a],y=rects[b];expect(Math.min(x.r,y.r)-Math.max(x.l,y.l)<=0||Math.min(x.b,y.b)-Math.max(x.t,y.t)<=0,`${label}:nonoverlap ${x.name}/${y.name}`).toBe(true);}
  geometry.push({label,pairsNonOverlapping:true,rects});
}
const rooms=[{id:'QA-ROOM-416',numero:'S1',tipo:'singola',piano:'1',reparto:'Reparto sintetico con denominazione estesa',stato:'attiva',note:'Solo fixture QA',beds:[{id:'QA-BED-416',roomId:'QA-ROOM-416',label:'A',stato:'libero',note:'',assignments:[]}]}];
try{
  for(const setting of [{name:'desktop',viewport:{width:1150,height:1004}},{name:'compact-desktop',viewport:{width:1280,height:720}},{name:'mobile-coarse',mobile:true,coarse:true},{name:'desktop-coarse',viewport:{width:1280,height:720},coarse:true}]){
    const ctx=await makeContext(setting),page=ctx.page;
    // Synthetic capability enables geometry of both adjacent roster actions, never deletion.
    ctx.state.apiHandler=async(req,json)=>req.method()==='GET'&&new URL(req.url()).pathname==='/patients/settings'?(await json({deleteEnabled:true}),true):false;
    await openChart(ctx);
    await check(`${setting.name}:chart controls actual44, edge hit tests, native focus`,async()=>{
      await inspect(page,page.locator('.compact-topbar button,.chart-sections button,.demographics-status button,.clinical-topic button,.inline-edit__value'),`${setting.name}:chart`);
      await separated(page,'.chart-sections__actions button',`${setting.name}:print/PS`);
      const edit=page.getByRole('button',{name:'Patologie note e interventi pregressi',exact:true});await edit.focus();await page.keyboard.press('Space');
      await expect(page.locator('.inline-edit__input').filter({visible:true})).toBeFocused();
      await inspect(page,page.locator('.inline-edit__btn'),`${setting.name}:inline actions`);await separated(page,'.inline-edit__btn',`${setting.name}:inline actions`);
      await page.getByRole('button',{name:'Annulla',exact:true}).filter({visible:true}).click();await expect(edit).toBeFocused();
      await page.getByRole('button',{name:'Stampa la scheda',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
      await inspect(page,page.getByRole('dialog').locator('button').filter({hasNot:page.locator('[disabled]')}),`${setting.name}:print dialog`);
      await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
      await stable(page);await page.screenshot({path:`${out}/screenshots/${setting.name}-chart.png`,fullPage:true});
    });
    await page.getByRole('tab',{name:/^Moduli/}).click();
    await check(`${setting.name}:catalog/workspace fields and textual creation`,async()=>{
      await inspect(page,page.locator('.assessment-catalog button'),`${setting.name}:catalog`);
      await separated(page,'.assessment-catalog-actions button',`${setting.name}:catalog`);
      await page.getByRole('button',{name:'Storico PAINAD',exact:true}).click();await expect(page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();
      await inspect(page,page.locator('.assessment-workspace button,.assessment-workspace input,.assessment-workspace select,.patient-module-return'),`${setting.name}:workspace`);
      const create=page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true});await expect(create).toHaveText('Nuova compilazione');await create.focus();await page.keyboard.press('Enter');
      const first=page.locator('.paper-form--focused input[type=radio]').first();await expect(first).toBeFocused();await first.check();
      await page.getByRole('button',{name:'← Tutti i moduli',exact:true}).click();await page.reload();await openChart(ctx);await page.getByRole('tab',{name:/^Moduli/}).click();
      await page.getByRole('button',{name:'Riprendi bozza PAINAD',exact:true}).click();await expect(page.locator('.paper-form--focused input[type=radio]').first()).toBeChecked();
      await page.getByRole('button',{name:'← Tutti i moduli',exact:true}).click();await stable(page);await page.screenshot({path:`${out}/screenshots/${setting.name}-modules.png`,fullPage:true});
    });
    if(setting.mobile)await page.getByRole('button',{name:'Apri menu'}).click();await page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();
    await check(`${setting.name}:roster/search44 with separated hitboxes, clear not open`,async()=>{
      const search=page.getByRole('searchbox',{name:'Cerca paziente per nome o codice fiscale'});await search.fill('Persona');
      await expect(page.getByRole('button',{name:'Apri cartella di Persona Sintetica',exact:true})).toBeVisible();
      await inspect(page,page.locator('.patient-roster__open,.patient-roster__delete,.patient-card__actions button,.plist-search input,.plist-search button,.plist-views button,.plist-tools button'),`${setting.name}:roster`);
      await separated(page,'.plist-search input,.plist-search button',`${setting.name}:search/clear`);
      await separated(page,'.patient-roster__actions button,.patient-card__actions button',`${setting.name}:open/delete`);
      await page.getByRole('button',{name:'Cancella',exact:true}).click();await expect(search).toHaveValue('');await expect(page.locator('.patient-list-view')).toBeVisible();
      await stable(page);await page.screenshot({path:`${out}/screenshots/${setting.name}-roster.png`,fullPage:true});
    });
    await finish(ctx,setting.name);
  }
  for(const mobile of [false,true]){
    const ctx=await makeContext({mobile,coarse:mobile,authIdentity:{id:'QA-SUPERVISOR-416',name:'Supervisore Sintetico',appRole:'supervisor',roleLabel:'Supervisore',uiShell:'admin'},extraCapabilities:['rooms.list','operators.page','operators.summary','consegne.overview']}),page=ctx.page;
    ctx.state.apiHandler=async(req,json)=>{
      if(req.method()!=='GET')return false;const p=new URL(req.url()).pathname;
      if(p==='/admin/rooms'){await json(rooms);return true;}
      if(p==='/admin/rooms/occupancy'){await json({totalRooms:1,totalBeds:1,occupiedBeds:0,freeBeds:1,maintenanceBeds:0,occupancyPct:0});return true;}
      if(p.includes('operators')&&p.endsWith('/summary')){await json({total:1,active:1,appointmentsToday:0});return true;}
      if(p==='/operators/page'||p==='/admin/operators'){await json(p.endsWith('/page')?{items:[],pageInfo:{hasMore:false,nextCursor:null}}:[]);return true;}
      return false;
    };
    await page.goto(`${process.env.QA_BASE_URL||'http://127.0.0.1:7478'}/#/posti-letto`);await page.getByRole('button',{name:/Supervisore Sintetico/}).click();
    await expect(page.locator('.rooms-view')).toBeVisible();
    await check(`supervisor ${mobile?'mobile emulation':'desktop'}:rooms/bed actions and form44`,async()=>{
      await expect(page.getByRole('button',{name:'Modifica camera',exact:true})).toBeVisible();
      await inspect(page,page.locator('.rooms-view .icon-btn,.rooms-view .btn-primary,.rooms-view .filter-chip'),`supervisor-${mobile}:rooms`);
      await separated(page,'.room-card__header button',`supervisor-${mobile}:edit/delete`);
      await page.getByRole('button',{name:'Modifica camera',exact:true}).click();
      await inspect(page,page.locator('.op-form-panel input,.op-form-panel select,.op-form-panel button'),`supervisor-${mobile}:room form`);
      await page.getByRole('button',{name:'Annulla',exact:true}).click();
      await page.getByRole('button',{name:'Modifica letto',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
      await inspect(page,page.getByRole('dialog').locator('button,input,select'),`supervisor-${mobile}:bed dialog`);await page.keyboard.press('Escape');
      await stable(page);await page.screenshot({path:`${out}/screenshots/supervisor-${mobile?'mobile':'desktop'}-rooms.png`,fullPage:true});
    });await finish(ctx,`supervisor-${mobile?'mobile':'desktop'}`);
  }
  writeFileSync(`${out}/test-results/geometry.json`,JSON.stringify(geometry,null,2));
  writeFileSync(`${out}/test-results/results.json`,JSON.stringify({outcomes,states,synthetic:true,physicalDeviceAcceptance:'UNVERIFIED original AC3',productionPatientWrites:0},null,2));
  writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><h1>416 synthetic software checks</h1><p>Physical device AC3 UNVERIFIED. Emulation is not human signoff.</p><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
}catch(error){writeFileSync(`${out}/test-results/preliminary-failure.json`,JSON.stringify({message:error.message,geometry,outcomes,states},null,2));throw error;}finally{await browser.close();}
