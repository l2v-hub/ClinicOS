import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire('C:/w-insulin-qa/package.json');
const {chromium,expect}=require('playwright/test');
const out=resolve('artifacts/task-validation/403-therapy-incomplete');
for(const dir of ['screenshots','test-results','playwright-report','video'])mkdirSync(`${out}/${dir}`,{recursive:true});
const outcomes=[],contexts=[],states=[],bad=[];
const browser=await chromium.launch({headless:true});
const identities=[{id:'QA-NURSE-403',name:'Infermiere Test',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'},
 {id:'QA-DOCTOR-403',name:'Medico Test',roleLabel:'Medico',appRole:'doctor',uiShell:'operator'}];
const patient={id:'QA-PATIENT-403',medicalRecordNumber:'QA-403',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',phone:null,email:null};
const therapy=(id,name,patch={})=>({id,patientId:patient.id,farmacoNome:name,dosaggio:'Dose prescritta',viaSomministrazione:'orale',tipo:'periodica',stato:'attiva',dataInizio:'2026-01-01',dataFine:null,fasceMattina:false,fascePranzo:false,fascePomeriggio:false,fasceSera:false,fasceNotte:false,orarioSpecifico:null,prescrittore:'Medico sintetico',operatoreInseritore:null,note:null,dataSomministrazione:null,orarioSomministrazione:null,schedules:[],createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',...patch});
const first=therapy('QA-THERAPY-403-A','Farmaco sintetico A',{fasceMattina:true});
const second=therapy('QA-THERAPY-403-B','Farmaco sintetico B',{fasceNotte:true,commercialStrengthValue:25,commercialStrengthUnit:'mg',prescrittore:'Prescrittore seconda pagina',note:'Nota sintetica seconda pagina'});
const schedule=(id,time)=>({id:`${id}-${time}`,therapyId:id,time,fascia:'mattina',quantityNumerator:1,quantityDenominator:1,administrationUnit:'compressa'});
const mixed=therapy('QA-THERAPY-403-M','Farmaco sintetico misto',{schedules:[schedule('QA-THERAPY-403-M','10:30'),schedule('QA-THERAPY-403-M','25:00')]});
const prn=therapy('QA-THERAPY-403-P','Farmaco sintetico PRN',{tipo:'al_bisogno',fasceMattina:true});
const pageOf=(items,total,cursor=null)=>({items,summary:{total,active:total,inactive:0},pageInfo:{hasMore:cursor!==null,nextCursor:cursor}});
async function contextFor({role='nurse',scenario='incomplete',mobile=false}={}) {
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},recordVideo:{dir:`${out}/video`}});
 contexts.push(context);await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={role,scenario,requests:[],blockedExternal:[],errors:[],pageErrors:[]};states.push(state);
 const items=scenario==='empty'?[]:scenario==='mixed'?[mixed,first,prn]:scenario==='prn'?[prn]:[first,second];
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(!['localhost','127.0.0.1'].includes(url.hostname)){state.blockedExternal.push(url.origin);return route.abort();}
  if(url.port!=='3001')return route.continue();
  state.requests.push({method:request.method(),path,query:url.search});
  const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities});
  if(path==='/auth/simulator/session')return json({token:'synthetic-session-not-a-secret'});
  if(path==='/auth/me'){
   const identity=identities.find(x=>x.appRole===role);
   const capabilities=Object.fromEntries(['patients.list_page','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]));
   capabilities['therapy.update']={allowed:role==='doctor',effect:role==='doctor'?'ALLOWED':'DENIED'};
   // Deliberately deny create even for the prescriber: editing is governed by update alone.
   capabilities['therapy.create']={allowed:false,effect:'DENIED'};
   return json({...identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities});
  }
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}`)return json(patient);
  if(path===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ricoverato'}});
  if(path===`/patients/${patient.id}/room-options`)return json([]);
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}/therapies/page`){
   const cursor=url.searchParams.get('cursor');
   if(scenario==='incomplete')return json(cursor?pageOf([second],2):pageOf([first],2,'QA-CURSOR-403'));
   return json(pageOf(items,items.length));
  }
  if(path==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:[],rischiElevati:[],allergeni:[],hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:items.length,terapieCompletate:0}]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:1,dimessi:0,allergieGravi:0,terapieTotali:items.length,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/therapy-slots'||path==='/appointments')return json([]);
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(path==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
  if(path==='/farmaci/cerca')return json({farmaci:[],items:[],total:0,hasMore:false,nextCursor:null});
  bad.push(`Unhandled/forbidden API ${request.method()} ${path}`);return route.fulfill({status:500,contentType:'application/json',body:'{"error":"Unexpected guarded API"}'});
 });
 const page=await context.newPage();
 page.on('console',msg=>{if(msg.type()==='error')state.errors.push(msg.text());});
 page.on('pageerror',error=>state.pageErrors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)state.errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);});
 return {context,page,state};
}
async function login(page,role='nurse'){
 await page.goto(`http://127.0.0.1:5186/#/dettaglio-paziente/${patient.id}/terapia-farmacologica?sv=calendario&d=2026-10-09`);
 await page.getByRole('button',{name:role==='nurse'?/Infermiere Test/:/Medico Test/}).click();
 await expect(page.getByRole('region',{name:'Calendario terapie del paziente',exact:true})).toBeVisible();
 await expect(page.locator('.patient-therapy-calendar__count')).toContainText(/dosi programmate|dose programmata/);
}
const clean=state=>{expect(state.errors,'unexpected console/HTTP').toEqual([]);expect(state.pageErrors,'runtime').toEqual([]);expect(state.blockedExternal,'external').toEqual([]);expect(state.requests.filter(row=>row.method!=='GET'&&!row.path.startsWith('/auth/')),'no clinical writes from navigation').toEqual([]);};
async function firstScreen(page){
 const count=page.locator('.patient-therapy-calendar__count'),notice=page.getByRole('region',{name:'Programmazione da completare'});
 await expect(count).toBeInViewport({ratio:1});await expect(notice.locator('p').first()).toBeInViewport({ratio:1});
 const c=await count.boundingBox(),n=await notice.boundingBox();expect(n.y,'warning follows distinct count').toBeGreaterThan(c.y);
 expect(await page.locator('.patient-therapy-calendar__summary').evaluate(el=>el.compareDocumentPosition(el.parentElement.querySelector('.therapy-calendar-grid'))&Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
}
async function noNestedVertical(page){
 expect(await page.locator('.therapy-calendar-grid').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,scrollTop:el.scrollTop}))).toMatchObject({scrollTop:0});
 expect(await page.locator('.therapy-calendar-grid').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'grid no inner vertical scrolling').toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page x overflow').toBe(true);
}
async function finish(ctx,name,finalVideo){
 clean(ctx.state);await ctx.context.tracing.stop({path:`${out}/${name==='desktop'?'trace':`${name}-trace`}.zip`});
 const video=ctx.page.video();await ctx.context.close();if(finalVideo)await video.saveAs(`${out}/video/${finalVideo}.webm`);
 // Named recordings are final proof; discard only this run's redundant temporary recording.
 await video.delete();
}
async function check(name,fn){try{await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}catch(error){outcomes.push({name,status:'FAIL',message:error.message});console.log(`FAIL ${name}: ${error.message}`);process.exitCode=1;}}
try{
 const desktop=await contextFor();await login(desktop.page);
 await check('AC1 desktop first screen distinguishes zero doses from two incomplete prescriptions',async()=>{
  await expect(desktop.page.locator('.patient-therapy-calendar__count')).toHaveText('0 dosi programmate · 0 orari esatti');
  await expect(desktop.page.getByRole('region',{name:'Programmazione da completare'})).toContainText('2 terapie con programmazione da completare');
  await firstScreen(desktop.page);await desktop.page.screenshot({path:`${out}/screenshots/desktop-incomplete-first-screen.png`});
 });
 await check('AC2 explicit zero dose incomplete state; no false absence of therapy',async()=>{
  await expect(desktop.page.locator('.patient-therapy-calendar__empty')).toHaveText('Nessuna dose programmata per questo giorno. La programmazione è da completare: questo non significa assenza di terapia.');
  await expect(desktop.page.getByTestId('therapy-calendar-cell')).toHaveCount(0);
 });
 await check('AC3 nurse keyboard expands exact source reasons; no edit; prescribing clinician reference',async()=>{
  const summary=desktop.page.locator('.patient-therapy-calendar__programming summary');await summary.focus();await summary.press('Enter');
  await expect(desktop.page.getByRole('region',{name:'Programmazione da completare'})).toContainText('Farmaco sintetico B');
  await expect(desktop.page.getByRole('region',{name:'Programmazione da completare'})).toContainText('Fasce prescritte: notte. Orario non specificato.');
  await expect(desktop.page.getByRole('button',{name:/Completa programmazione di/})).toHaveCount(0);
  await expect(desktop.page.getByText('Per completare o verificare la programmazione, contatta il medico prescrittore.',{exact:true})).toBeVisible();
  await noNestedVertical(desktop.page);await desktop.page.screenshot({path:`${out}/screenshots/nurse-source-details.png`});
 });
 await check('AC4 day warning and expanded details share outer scroll, no grid vertical scroller',()=>noNestedVertical(desktop.page));
 await check('AC2 incomplete week counts prescriptions once and explicit week empty state',async()=>{
  await desktop.page.getByRole('button',{name:'Settimana',exact:true}).click();
  await expect(desktop.page.locator('.patient-therapy-calendar__count')).toHaveText('0 dosi programmate · 0 orari esatti');
  await expect(desktop.page.locator('.patient-therapy-calendar__empty')).toContainText('Nessuna dose programmata per questa settimana.');
  await expect(desktop.page.getByRole('region',{name:'Programmazione da completare'})).toContainText('2 terapie con programmazione da completare');
  await noNestedVertical(desktop.page);
 });
 await finish(desktop,'desktop','final-desktop');
 const doctor=await contextFor({role:'doctor'});await login(doctor.page,'doctor');
 await check('AC3 doctor edits complete second-page prescription with focus and populated form; no fabricated hour or write',async()=>{
  await doctor.page.locator('.patient-therapy-calendar__programming summary').click();
  const action=doctor.page.getByRole('button',{name:'Completa programmazione di Farmaco sintetico B',exact:true});await action.focus();await action.press('Enter');
  const heading=doctor.page.getByRole('heading',{name:'Modifica terapia',exact:true});await expect(heading).toBeVisible();await expect(heading).toBeFocused();await expect(heading).toBeInViewport({ratio:1});
  await expect(doctor.page.locator('.campo-farmaco__nome')).toHaveText('Farmaco sintetico B');
  await expect(doctor.page.getByLabel('Dosaggio commerciale',{exact:true})).toHaveValue('25');
  await expect(doctor.page.getByLabel('Prescrittore',{exact:true})).toHaveValue('Prescrittore seconda pagina');
  await expect(doctor.page.getByLabel('Note e indicazioni',{exact:true})).toHaveValue('Nota sintetica seconda pagina');
  await expect(doctor.page).toHaveURL(/sv=attivi$/);
  await doctor.page.screenshot({path:`${out}/screenshots/doctor-second-page-existing-editor.png`});
  const timeValues=await doctor.page.locator('.therapy-form-shell input[type="time"]').evaluateAll(nodes=>nodes.map(n=>n.value));expect(timeValues.every(v=>v===''),'no inferred time in restored prescription').toBe(true);
  await doctor.page.getByRole('button',{name:'+ Aggiungi orario',exact:true}).click();
  await expect(doctor.page.getByLabel('Orario 1',{exact:true})).toHaveValue('');
  await doctor.page.getByLabel('Orario 1',{exact:true}).scrollIntoViewIfNeeded();
  await doctor.page.screenshot({path:`${out}/screenshots/doctor-explicit-time-required.png`});
  expect(doctor.state.requests.some(r=>r.path.endsWith('/therapies/page')&&r.query.includes('status=attiva')&&r.query.includes('cursor=QA-CURSOR-403'))).toBe(true);
  await doctor.page.screenshot({path:`${out}/screenshots/doctor-second-page-existing-editor.png`});clean(doctor.state);
 });await finish(doctor,'doctor');
 const mix=await contextFor({scenario:'mixed'});await login(mix.page);
 await check('AC1 mixed valid-invalid and PRN: one exact dose, two incomplete, PRN separate',async()=>{
  await expect(mix.page.locator('.patient-therapy-calendar__count')).toHaveText('1 dose programmata · 1 orario esatto');
  await expect(mix.page.getByRole('region',{name:'Programmazione da completare'})).toContainText('2 terapie con programmazione da completare');
  await expect(mix.page.getByTestId('therapy-calendar-cell')).toHaveCount(1);await expect(mix.page.getByTestId('therapy-calendar-cell')).toHaveAttribute('data-time','10:30');
  await expect(mix.page.getByRole('region',{name:'Al bisogno',exact:true})).toContainText('Farmaco sintetico PRN');
  await expect(mix.page.locator('.patient-therapy-calendar__empty')).toHaveCount(0);await firstScreen(mix.page);
 });
 await check('AC2 mixed week aggregates all seven days without duplicate incomplete or invented times',async()=>{
  await mix.page.getByRole('button',{name:'Settimana',exact:true}).click();
  await expect(mix.page.locator('.patient-therapy-calendar__count')).toHaveText('7 dosi programmate · 1 orario esatto');
  await expect(mix.page.getByTestId('therapy-calendar-cell')).toHaveCount(7);expect(new Set(await mix.page.getByTestId('therapy-calendar-cell').evaluateAll(nodes=>nodes.map(n=>n.dataset.time)))).toEqual(new Set(['10:30']));
  await expect(mix.page.getByRole('region',{name:'Programmazione da completare'})).toContainText('2 terapie con programmazione da completare');await noNestedVertical(mix.page);
  await mix.page.screenshot({path:`${out}/screenshots/mixed-week-counts.png`});
 });await finish(mix,'mixed');
 for(const scenario of ['empty','prn']){
  const ctx=await contextFor({scenario});await login(ctx.page);
  await check(`AC2 ${scenario} zero-dose state not classified as incomplete`,async()=>{
   await expect(ctx.page.locator('.patient-therapy-calendar__count')).toHaveText('0 dosi programmate · 0 orari esatti');
   await expect(ctx.page.getByRole('region',{name:'Programmazione da completare'})).toHaveCount(0);
   await expect(ctx.page.locator('.patient-therapy-calendar__empty')).toHaveText('Nessuna dose programmata per questo giorno.');
   if(scenario==='prn')await expect(ctx.page.getByRole('region',{name:'Al bisogno',exact:true})).toContainText('Al bisogno (1)');
   await ctx.page.screenshot({path:`${out}/screenshots/${scenario}-zero-dose-state.png`});
  });await finish(ctx,scenario);
 }
 const mobile=await contextFor({mobile:true});await login(mobile.page);
 await check('AC1 mobile390 first screen count and incomplete warning visible without overlap',async()=>{
  await mobile.page.screenshot({path:`${out}/screenshots/mobile-incomplete-first-screen.png`});
  await firstScreen(mobile.page);await expect(mobile.page.locator('.patient-therapy-calendar__count')).toHaveText('0 dosi programmate · 0 orari esatti');
  await mobile.page.screenshot({path:`${out}/screenshots/mobile-incomplete-first-screen.png`});
 });
 await check('AC4 mobile details keyboard reachable and week locally horizontally reachable without page x or grid y scrolling',async()=>{
  const summary=mobile.page.locator('.patient-therapy-calendar__programming summary');await summary.focus();await summary.press('Enter');
  await expect(mobile.page.getByRole('region',{name:'Programmazione da completare'})).toContainText('Farmaco sintetico B');await noNestedVertical(mobile.page);
  await mobile.page.getByRole('button',{name:'Settimana',exact:true}).click();await noNestedVertical(mobile.page);
  const dimensions=await mobile.page.locator('.therapy-calendar-grid').evaluate(el=>({width:el.clientWidth,content:el.scrollWidth}));expect(dimensions.content).toBeGreaterThan(dimensions.width);
  await mobile.page.locator('.therapy-calendar-grid').evaluate(el=>el.scrollLeft=el.scrollWidth);
  expect(await mobile.page.locator('.therapy-calendar-grid').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  await mobile.page.screenshot({path:`${out}/screenshots/mobile-week-reachable.png`});
 });await finish(mobile,'mobile','final-mobile');
 const mobileDoctor=await contextFor({role:'doctor',mobile:true});await login(mobileDoctor.page,'doctor');
 await check('AC3 mobile update-only prescriber existing editor focused and truly hittable, no creation permission or time invented',async()=>{
  await firstScreen(mobileDoctor.page);
  await mobileDoctor.page.locator('.patient-therapy-calendar__programming summary').click();
  const action=mobileDoctor.page.getByRole('button',{name:'Completa programmazione di Farmaco sintetico B',exact:true});await action.focus();await action.press('Enter');
  const heading=mobileDoctor.page.getByRole('heading',{name:'Modifica terapia',exact:true});await expect(heading).toBeFocused();await expect(heading).toBeInViewport({ratio:1});
  expect(await heading.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2));})).toBe(true);
  await expect(mobileDoctor.page.locator('.campo-farmaco__nome')).toHaveText('Farmaco sintetico B');
  await expect(mobileDoctor.page.locator('.therapy-form-shell input[type="time"]')).toHaveCount(0);
  await expect(mobileDoctor.page.getByRole('tab',{name:'Nuova terapia',exact:true})).toHaveCount(0);
  await mobileDoctor.page.screenshot({path:`${out}/screenshots/mobile-doctor-existing-editor.png`});clean(mobileDoctor.state);
 });await finish(mobileDoctor,'mobile-doctor');
 expect(bad).toEqual([]);
}catch(error){process.exitCode=1;outcomes.push({name:'Harness setup/runtime',status:'FAIL',message:error.message});console.log(`FAIL setup: ${error.message}`);
 for(const [i,ctx]of contexts.entries())if(ctx.pages().length)await ctx.pages()[0].screenshot({path:`${out}/screenshots/failed-${i}.png`}).catch(()=>{});
}finally{
 await browser.close();const report={source:'Actual SPA index.html/main.tsx/App.tsx; synthetic intercepted localhost APIs only; no persistence writes or real DB claim',outcomes,unexpectedApi:bad,runtime:states};
 writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify(report,null,2));
 writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><html><head><meta charset="utf-8"><title>Issue403 independent browser assertions</title></head><body><h1>Issue403 actual SPA independent QA</h1><p>Synthetic localhost fixtures only. Executable assertions: qa-browser.mjs.</p><pre>${JSON.stringify(report,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></body></html>`);
}
