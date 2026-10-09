import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {chromium,expect:baseExpect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const expect=baseExpect.configure({timeout:60000});const acceptance=process.env.ACCEPT==='1';
const out=resolve(process.argv[2]||'artifacts/task-validation/425-chart-scroll/baseline-browser');
mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});
const states=[],results=[],contexts=[];
const patient={id:'QA-PATIENT-425',medicalRecordNumber:'QA-425',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',codiceFiscale:null,sex:'M',phone:null,email:null,location:{status:'unassigned',source:null,room:null,bed:null,asOf:'2026-10-09'}};
const therapies=Array.from({length:25},(_,i)=>({id:`QA-THERAPY-425-${i}`,patientId:patient.id,farmacoNome:`Farmaco sintetico ${i}`,dosaggio:'1 unità',viaSomministrazione:'orale',tipo:i===24?'al_bisogno':'periodica',stato:'attiva',dataInizio:'2026-01-01',dataFine:null,dataSomministrazione:null,orarioSomministrazione:null,orarioSpecifico:i===24?null:`${String(i).padStart(2,'0')}:00`,giorniSettimana:null,fasceMattina:false,fascePranzo:false,fascePomeriggio:false,fasceSera:false,fasceNotte:false,assuntoMattina:false,assuntoPranzo:false,assuntoPomeriggio:false,assuntoSera:false,assuntoNotte:false,prescrittore:'Medico Sintetico',note:'Prescrizione inventata per prova di layout, non indicazione clinica.',schedules:[]}));
const identities=['nurse','doctor'].map(role=>({id:`QA-${role}-425`,name:role==='doctor'?'Medico Sintetico':'Infermiere Sintetico',roleLabel:role==='doctor'?'Medico':'Infermiere',appRole:role,uiShell:'operator'}));
async function setup(viewport,role){
 const context=await browser.newContext({viewport,recordVideo:{dir:out},isMobile:false,hasTouch:true});contexts.push(context);
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={viewport,role,requests:[],unexpected:[],external:[],writes:[],pageErrors:[],consoleErrors:[],httpErrors:[]};states.push(state);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(!['localhost','127.0.0.1'].includes(url.hostname)){state.external.push(url.origin);return route.abort();}
  if(url.port!== '3001')return route.continue();
  state.requests.push({method:req.method(),path,query:url.search});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities});
  if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic425-not-a-secret'});
  if(req.method()!=='GET'){state.writes.push({method:req.method(),path});return json({error:'Forbidden synthetic clinical write'},500);}
  if(path==='/auth/me')return json({...identities.find(i=>i.appRole===role),role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','therapy.create','clinical_record.get','clinical_record.patch','diary.list','consegne.create','documents.list'].map(k=>[k,{allowed:k!=='therapy.create',effect:k==='therapy.create'?'DENIED':'ALLOWED'}]))});
  if(path===`/patients/${patient.id}`)return json(patient);
  if(path===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ricoverato',diagnosiIngresso:'Diagnosi sintetica '.repeat(160),anamnesiPatologicaRemota:'Storia inventata '.repeat(160)}});
  if(path===`/patients/${patient.id}/therapies/page`){const items=state.emptyCalendar?[]:therapies;return json({items,summary:{total:items.length,active:items.length,inactive:0},pageInfo:{hasMore:false,nextCursor:null}});}
  if(path===`/patients/${patient.id}/parameter-readings`)return json({readings:[],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}/room-options`)return json([]);
  if(path===`/patients/${patient.id}/narrative-sections`)return json({sections:[]});
  if(path===`/patients/${patient.id}/documents`)return json({documents:[],total:0,pageInfo:{hasMore:false,nextCursor:null,loadedCount:0}});
  if(path===`/patients/${patient.id}/diary`)return json({entries:[],hasMore:false,nextCursor:null});
  if(path==='/patients/diary-unread-count')return json({unreadCount:0});
  if(path==='/patients/diary-unread-patient-counts')return json({items:[{patientId:patient.id,total:0}]});
  if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:[],rischiElevati:[],allergeni:[],hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:25,terapieCompletate:0}]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:1,dimessi:0,allergieGravi:0,terapieTotali:25,terapieCompletate:0});
  if(['/therapy-slots','/appointments','/admin/rooms'].includes(path))return json([]);
  if(path==='/farmaci/cerca')return json([]);
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(['/operators/directory/page','/operators/page'].includes(path))return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
  state.unexpected.push(`${req.method()} ${path}`);return json({error:'Unexpected intercepted API'},500);
 });
 const page=await context.newPage();page.on('pageerror',e=>state.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')state.consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),url:r.url()});});page.setDefaultTimeout(60000);
 await page.goto(`http://127.0.0.1:${process.env.QA_PORT||7513}/#/dettaglio-paziente/${patient.id}/terapia-farmacologica`);
 await page.getByRole('button',{name:role==='doctor'?/Medico Sintetico/:/Infermiere Sintetico/}).click();
 await expect(page.locator('.patient-therapy-calendar')).toBeVisible();await expect(page.locator('.therapy-calendar-grid table')).toBeVisible();
 return {page,context,state};
}
async function metrics(page){return page.evaluate(()=>{
 const root=document.scrollingElement;
 const selectors=['.page-content','.patient-record-view','.cr-detail-layout','.cr-detail-content','.cr-tab-content','.therapy-calendar-grid'];
 return {document:{height:root.scrollHeight,client:root.clientHeight,top:root.scrollTop,width:root.scrollWidth},owners:selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map(el=>({selector,height:el.scrollHeight,client:el.clientHeight,top:el.scrollTop,overflowX:getComputedStyle(el).overflowX,overflowY:getComputedStyle(el).overflowY}))),viewport:{width:innerWidth,height:innerHeight}};
});}
try{
 for(const role of ['nurse'])for(const viewport of [{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]){
  const ctx=await setup(viewport,role),{page,state}=ctx;const key=`${role}-${viewport.width}`;
  const initial=await metrics(page);await page.screenshot({path:`${out}/${key}-before-wheel.png`});
  const grid=await page.locator('.therapy-calendar-grid').boundingBox();await page.mouse.move(grid.x+grid.width/2,Math.min(viewport.height-80,grid.y+80));
  for(let i=0;i<12;i++){await page.mouse.wheel(0,450);await page.waitForTimeout(100);}
  const after=await metrics(page),prn=await page.getByRole('region',{name:'Al bisogno',exact:true}).boundingBox();
  await page.screenshot({path:`${out}/${key}-after-wheel.png`});
  results.push({role,viewport,initial,after,prn});
  if(acceptance){
   const owners=after.owners.filter(o=>['auto','scroll'].includes(o.overflowY)&&o.height>o.client+1);
   expect(owners.length+(after.document.height>after.document.client+1?1:0)).toBe(1);
   expect(after.document.width).toBeLessThanOrEqual(viewport.width);expect(prn.y).toBeGreaterThanOrEqual(0);expect(prn.y+prn.height).toBeLessThanOrEqual(viewport.height+1);
   expect(after.owners.find(o=>o.selector==='.therapy-calendar-grid').top).toBe(0);
   const week=page.getByRole('button',{name:'Settimana',exact:true});await week.click();
   const rail=page.locator('.therapy-calendar-grid');await rail.scrollIntoViewIfNeeded();
   const horizontal=await rail.evaluate(e=>({max:e.scrollWidth-e.clientWidth,start:e.scrollLeft}));
   const box=await rail.boundingBox();await page.mouse.move(box.x+box.width/2,Math.max(160,Math.min(viewport.height-80,box.y+60)));await page.mouse.wheel(900,0);await page.waitForTimeout(200);
   horizontal.end=await rail.evaluate(e=>e.scrollLeft);if(horizontal.max>1)expect(horizontal.end).toBeGreaterThan(horizontal.start);
   results.at(-1).horizontal=horizontal;await page.screenshot({path:`${out}/${key}-week-rail.png`});await page.getByRole('button',{name:'Giorno',exact:true}).click();
  }
  await expect(page.getByRole('tab',{name:'Nuova terapia',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Nuova terapia .* ore /})).toHaveCount(0);
  results.at(-1).pointer=await page.evaluate(()=>({coarse:matchMedia('(pointer: coarse)').matches,innerWidth,innerHeight}));
  expect(results.at(-1).pointer.coarse).toBe(true);
  if(false){
   await page.getByRole('tab',{name:'Nuova terapia',exact:true}).click();
   await expect(page.locator('.therapy-form-shell')).toBeVisible();
   const focus=[];
   for(let i=0;i<(acceptance?110:55);i++){
    await page.keyboard.press(i<55?'Tab':'Shift+Tab');
    focus.push(await page.evaluate(()=>{
     const el=document.activeElement,r=el.getBoundingClientRect(),footer=document.querySelector('.therapy-form-shell__actions').getBoundingClientRect(),topbar=document.querySelector('.compact-topbar')?.getBoundingClientRect();
     const inForm=!!el.closest('.therapy-form-shell'),inFooter=!!el.closest('.therapy-form-shell__actions');
     const panel=document.querySelector('.cr-detail-content').getBoundingClientRect();
     return {tag:el.tagName,id:el.id,text:el.getAttribute('aria-label')||el.textContent?.slice(0,60),inForm,inFooter,rect:{top:r.top,bottom:r.bottom,height:r.height},footer:{top:footer.top,bottom:footer.bottom},topbarBottom:topbar?.bottom,panelTop:panel.top,occluded:inForm&&!inFooter&&r.top<footer.bottom&&r.bottom>footer.top};
    }));
   }
   results.at(-1).focus=focus;await page.screenshot({path:`${out}/${key}-form.png`});
   if(acceptance){
    const fields=focus.filter(f=>f.inForm);expect(fields.length).toBeGreaterThan(40);expect(fields.filter(f=>f.occluded)).toEqual([]);
    expect(fields.filter(f=>f.rect.top<Math.max(f.topbarBottom||0,viewport.width>=1024?f.panelTop:0)-1||f.rect.bottom>viewport.height+1)).toEqual([]);
    await page.locator('.therapy-form-shell').getByRole('button',{name:'Annulla',exact:true}).click();
    await page.getByRole('tab',{name:'Clinica',exact:true}).click();
    const clinical=await metrics(page);results.at(-1).clinical=clinical;
    expect(clinical.document.width).toBeLessThanOrEqual(viewport.width);
    const active=clinical.owners.filter(o=>['auto','scroll'].includes(o.overflowY)&&o.height>o.client+1);
    expect(active.length+(clinical.document.height>clinical.document.client+1?1:0)).toBe(1);
    await page.mouse.move(viewport.width/2,viewport.height-100);await page.mouse.wheel(0,3000);await page.waitForTimeout(200);results.at(-1).clinicalAfter=await metrics(page);
    await page.screenshot({path:`${out}/${key}-clinical.png`});
    await page.getByRole('tab',{name:'Terapia',exact:true}).click();state.emptyCalendar=true;await page.getByRole('button',{name:'Aggiorna',exact:true}).click();
    const trigger=page.getByRole('button',{name:/Nuova terapia .* ore 12:00/});await expect(trigger).toHaveCount(1);await trigger.click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    const modal=[];for(let i=0;i<110;i++){await page.keyboard.press(i<55?'Tab':'Shift+Tab');modal.push(await page.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),d=e.closest('[role="dialog"]')?.getBoundingClientRect();return {inDialog:!!d,tag:e.tagName,type:e.getAttribute('type'),rect:{top:r.top,bottom:r.bottom},dialog:d?{top:d.top,bottom:d.bottom}:null};}));}
    expect(modal.every(f=>f.inDialog)).toBe(true);
    expect(modal.filter(f=>f.rect.top<Math.max(0,f.dialog.top)-1||f.rect.bottom>Math.min(viewport.height,f.dialog.bottom)+1)).toEqual([]);
    const dialogMetrics=await dialog.evaluate(e=>({height:e.scrollHeight,client:e.clientHeight,overflow:getComputedStyle(e).overflowY}));
    const backgroundBefore=await metrics(page);const dialogBox=await dialog.boundingBox();await page.mouse.move(dialogBox.x+dialogBox.width/2,dialogBox.y+dialogBox.height/2);await page.mouse.wheel(0,3000);await page.waitForTimeout(200);const backgroundAfter=await metrics(page);
    results.at(-1).modal={focus:modal,dialogMetrics,backgroundBefore,backgroundAfter,bodyLockClaim:false};
    await expect(dialog.getByRole('button',{name:'Salva terapia',exact:true})).toBeVisible();await page.screenshot({path:`${out}/${key}-modal.png`});
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
   }
  }
  await ctx.context.tracing.stop({path:`${out}/${key}-trace.zip`});await ctx.context.close();
  expect(state.unexpected).toEqual([]);expect(state.external).toEqual([]);expect(state.writes).toEqual([]);expect(state.pageErrors).toEqual([]);expect(state.consoleErrors).toEqual([]);expect(state.httpErrors).toEqual([]);
  console.log(`PASS ${key}: wheel, keyboard and guarded transport${acceptance?', clinical/week/modal':''}`);
 }
 writeFileSync(`${out}/results.json`,JSON.stringify({results,states,physicalTablet:false,mode:acceptance?'source-bound browser layout/keyboard acceptance; physical touch unverified':'baseline observation only, not acceptance certification'},null,2));console.log(`${results.length} browser viewport/role groups complete; no clinical writes`);
}catch(error){for(const [i,c]of contexts.entries()){const p=c.pages()[0];if(p)await p.screenshot({path:`${out}/failure-${i}.png`}).catch(()=>{});await c.tracing.stop({path:`${out}/failure-${i}-trace.zip`}).catch(()=>{});}writeFileSync(`${out}/failure.json`,JSON.stringify({message:error.message,results,states},null,2));throw error;}
finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();}
