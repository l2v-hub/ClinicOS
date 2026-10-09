import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire('C:/w-insulin-qa/package.json');
const {chromium,expect}=require('playwright/test');
const out=resolve(process.env.QA406_OUTPUT || 'artifacts/task-validation/406-therapy-route-regime/independent');
for(const dir of ['screenshots','test-results','playwright-report','video'])mkdirSync(`${out}/${dir}`,{recursive:true});
const outcomes=[],states=[],contexts=[];
const browser=await chromium.launch({headless:true});
const patient={id:'QA-PATIENT-406',medicalRecordNumber:'QA-406',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',phone:null,email:null};
const identity={id:'QA-DOCTOR-406',name:'Medico Sintetico',roleLabel:'Medico',appRole:'doctor',uiShell:'operator'};
const nurse={id:'QA-NURSE-406',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const therapy=(id,name,patch={})=>({id,patientId:patient.id,farmacoNome:name,dosaggio:'1 compressa',viaSomministrazione:'orale',tipo:'periodica',stato:'attiva',dataInizio:'2026-01-01',dataFine:null,fasceMattina:true,fascePranzo:false,fascePomeriggio:false,fasceSera:false,fasceNotte:false,orarioSpecifico:null,prescrittore:'Medico sintetico',operatoreInseritore:null,note:'Nota sintetica',dataSomministrazione:null,orarioSomministrazione:null,doseMode:'fixed',doseProtocol:null,pharmaceuticalForm:'compressa',commercialStrengthValue:null,commercialStrengthUnit:null,allowedFractions:'1',schedules:[{id:`${id}-S`,therapyId:id,time:'08:00',fascia:'mattina',quantityNumerator:1,quantityDenominator:1,administrationUnit:'compressa'}],createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',...patch});
async function contextFor({mobile=false,denied=false}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:720},recordVideo:{dir:`${out}/video`}});contexts.push(context);
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={mobile,denied,requests:[],writes:[],errors:[],pageErrors:[],httpErrors:[],expectedHttp:[],blockedExternal:[],unexpected:[],rejectNext:false,items:[therapy('QA-LEGACY-406','Farmaco legacy sintetico',{viaSomministrazione:'al bisogno'}),therapy('QA-REGULAR-406','Farmaco regolare sintetico',{viaSomministrazione:'SC'})]};states.push(state);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(!['127.0.0.1','localhost'].includes(url.hostname)){state.blockedExternal.push(url.origin);return route.abort();}
  if(url.port!=='3001')return route.continue();
  state.requests.push({method:request.method(),path,query:url.search});
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[denied?nurse:identity]});
  if(path==='/auth/simulator/session')return json({token:'synthetic406-not-a-secret'});
  if(path==='/auth/me'){
   const capabilities=Object.fromEntries(['patients.list_page','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]));
   for(const key of ['therapy.create','therapy.update'])capabilities[key]={allowed:!denied,effect:denied?'DENIED':'ALLOWED'};
   capabilities['therapy.delete']={allowed:false,effect:'DENIED'};
   return json({...denied?nurse:identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities});
  }
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}`)return json(patient);
  if(path===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ricoverato'}});
  if(path===`/patients/${patient.id}/room-options`)return json([]);
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}/therapies/page`)return json({items:state.items,summary:{total:state.items.length,active:state.items.filter(x=>x.stato==='attiva').length,inactive:state.items.filter(x=>x.stato!=='attiva').length},pageInfo:{hasMore:false,nextCursor:null}});
  if(path===`/patients/${patient.id}/therapies`&&request.method()==='POST'||path.match(/^\/patients\/QA-PATIENT-406\/therapies\/QA-/)&&request.method()==='PUT'){
   const body=request.postDataJSON();state.writes.push({method:request.method(),path,body});
   if(denied){state.unexpected.push('Denied role attempted write');return json({error:'Forbidden'},403);}
   if(state.rejectNext){state.rejectNext=false;state.expectedHttp.push({path,status:400});return json({error:'Controllo sintetico: prescrizione da verificare'},400);}
   let row;
   if(request.method()==='POST'){row=therapy('QA-CREATED-406',body.farmacoNome,body);state.items.push(row);}
   else {row=state.items.find(x=>path.endsWith(`/${x.id}`));Object.assign(row,body);}
   return json(row,request.method()==='POST'?201:200);
  }
  if(path==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:[],rischiElevati:[],allergeni:[],hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:state.items.length,terapieCompletate:0}]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:1,dimessi:0,allergieGravi:0,terapieTotali:state.items.length,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/therapy-slots'||path==='/appointments')return json([]);
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(path==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
  if(path==='/farmaci/cerca')return json({esiti:[],pageInfo:{hasMore:false,nextCursor:null}});
  state.unexpected.push(`${request.method()} ${path}`);return json({error:'Unexpected guarded API'},500);
 });
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));
 page.on('response',r=>{if(r.status()>=400){const item={status:r.status(),path:new URL(r.url()).pathname};if(!state.expectedHttp.some(e=>e.status===item.status&&e.path===item.path))state.httpErrors.push(item);}});
 return {context,page,state};
}
async function login(ctx){
 await ctx.page.goto(`http://127.0.0.1:7470/#/dettaglio-paziente/${patient.id}/terapia-farmacologica?sv=attivi`);
 await ctx.page.getByRole('button',{name:ctx.state.denied?/Infermiere Sintetico/:/Medico Sintetico/}).click();
 await expect(ctx.page.getByRole('tab',{name:'Piano terapeutico',exact:true})).toBeVisible();
 await ctx.page.getByRole('tab',{name:'Piano terapeutico',exact:true}).click();
 await expect(ctx.page.getByRole('button',{name:/Farmaco legacy sintetico/}).first()).toBeVisible();
}
async function reloadTherapies(ctx){
 await ctx.page.reload();
 const gate=ctx.page.getByRole('button',{name:/Medico Sintetico/});
 await expect(gate).toBeVisible();await gate.click();
 await ctx.page.goto(`http://127.0.0.1:7470/#/dettaglio-paziente/${patient.id}/terapia-farmacologica?sv=attivi`);
 await expect(ctx.page.getByRole('tab',{name:'Piano terapeutico',exact:true})).toBeVisible();
}
const form=ctx=>ctx.page.locator('.therapy-form-shell');
const preview=ctx=>form(ctx).locator('.therapy-form__preview');
const routeField=ctx=>form(ctx).getByLabel('Via di somministrazione',{exact:true});
const type=async(ctx,name)=>form(ctx).getByRole('radio',{name:new RegExp(`^${name}`)}).check();
async function openEdit(ctx,name){
 await ctx.page.getByRole('tab',{name:'Piano terapeutico',exact:true}).click();
 const card=ctx.page.locator('.tf-drugs__item').filter({hasText:name});await card.getByRole('button').first().click();
 await card.getByRole('button',{name:`Modifica ${name}`,exact:true}).click();
 await expect(form(ctx).getByRole('heading',{name:'Modifica terapia'})).toBeVisible();
}
async function screenshot(ctx,name){await preview(ctx).scrollIntoViewIfNeeded();await ctx.page.screenshot({path:`${out}/screenshots/${name}.png`});}
async function escapeCalendarCreate(ctx){
 const count=ctx.state.writes.length;
 await form(ctx).getByRole('button',{name:'Annulla',exact:true}).click();
 await ctx.page.getByRole('tab',{name:'Calendario',exact:true}).click();
 const add=ctx.page.getByRole('button',{name:/^Nuova terapia .* ore 09:00$/});await expect(add).toBeVisible();await add.click();
 const dialog=ctx.page.getByRole('dialog',{name:'Nuova terapia',exact:true});await expect(dialog).toBeVisible();
 await expect(dialog.getByLabel('Via di somministrazione',{exact:true})).toHaveValue('orale');await dialog.getByLabel('Via di somministrazione',{exact:true}).selectOption('SC');await dialog.getByRole('radio',{name:/^Al bisogno/}).check();await expect(dialog.locator('.therapy-form__preview')).toContainText('Tipo terapia: Al bisogno');await expect(dialog.locator('.therapy-form__preview')).toContainText('Via: SC');
 await ctx.page.screenshot({path:`${out}/screenshots/${ctx.state.mobile?'mobile':'desktop'}-calendar-create-dialog.png`});
 await ctx.page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);expect(ctx.state.writes.length).toBe(count);
}
function clean(ctx){
 expect(ctx.state.errors.filter(e=>!(ctx.state.expectedHttp.length&&/^Failed to load resource: the server responded with a status of 400/.test(e))),'unexpected console').toEqual([]);
 expect(ctx.state.pageErrors,'runtime').toEqual([]);expect(ctx.state.httpErrors,'unexpected HTTP').toEqual([]);expect(ctx.state.blockedExternal,'external').toEqual([]);expect(ctx.state.unexpected,'API guard').toEqual([]);
}
async function finish(ctx,name){clean(ctx);await ctx.context.tracing.stop({path:`${out}/${name==='desktop'?'trace':`${name}-trace`}.zip`});const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${name}.webm`);await video.delete();}
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}
try{
 const desktop=await contextFor();await login(desktop);
 await check('AC1/3 actual physician create choices exclude regimes and preview has distinct route/type',async()=>{
  await desktop.page.getByRole('tab',{name:'Nuova terapia',exact:true}).click();
  await expect(routeField(desktop)).toHaveValue('orale');
  const options=await routeField(desktop).locator('option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,text:n.textContent})));desktop.state.routeOptions=options;
  expect(options.map(x=>x.value)).toEqual(['orale','IM','SC','IV','sublinguale','topico','transdermica','inalatoria','rettale','oftalmica','otologica','nasale','vaginale']);
  await expect(preview(desktop)).toContainText('Via: orale');await expect(preview(desktop)).toContainText('Tipo terapia: Periodica');
  await screenshot(desktop,'desktop-periodic-before-prn');
 });
 await check('AC2 native labels/keyboard and all three types preserve real route + latent periodic time/quantity',async()=>{
  await routeField(desktop).selectOption('SC');await form(desktop).getByLabel('Orario 1',{exact:true}).fill('10:30');
  await form(desktop).getByLabel('Quantità orario 1',{exact:true}).fill('2');
  const label=desktop.page.locator('label').filter({hasText:/^Via di somministrazione$/});await label.click();await expect(routeField(desktop)).toBeFocused();
  await routeField(desktop).press('Tab');await expect(form(desktop).getByRole('radio',{name:/^Periodica/})).toBeFocused();
  await type(desktop,'Al bisogno');await expect(routeField(desktop)).toHaveValue('SC');await expect(preview(desktop)).toContainText('Tipo terapia: Al bisogno');await expect(preview(desktop)).toContainText('Via: SC');await expect(preview(desktop)).not.toContainText('10:30');
  await type(desktop,'Una tantum');await expect(routeField(desktop)).toHaveValue('SC');await expect(preview(desktop)).toContainText('Tipo terapia: Una tantum');
  await type(desktop,'Periodica');await expect(routeField(desktop)).toHaveValue('SC');await expect(form(desktop).getByLabel('Orario 1',{exact:true})).toHaveValue('10:30');await expect(form(desktop).getByRole('button',{name:'2 compressa, orario 1',exact:true})).toHaveCount(0);await expect(preview(desktop)).toContainText('10:30');await expect(preview(desktop)).toContainText('2 compressa');
  await type(desktop,'Al bisogno');await screenshot(desktop,'desktop-prn-route-separated');
 });
 await check('AC2 create PRN synthetic payload retains route and no active schedules; result survives reload',async()=>{
  await form(desktop).getByRole('searchbox',{name:'Cerca il farmaco per nome commerciale'}).fill('Farmaco nuovo sintetico');
  await form(desktop).getByRole('button',{name:'Usa comunque «Farmaco nuovo sintetico»',exact:true}).click();
  await form(desktop).getByLabel('Data inizio *',{exact:true}).fill('2026-10-09');
  await form(desktop).getByRole('button',{name:'Salva terapia',exact:true}).click();
  await expect(form(desktop)).toHaveCount(0);expect(desktop.state.writes.at(-1).body.viaSomministrazione).toBe('SC');expect(desktop.state.writes.at(-1).body.tipo).toBe('al_bisogno');expect(desktop.state.writes.at(-1).body.schedules).toEqual([]);
  await reloadTherapies(desktop);await desktop.page.getByRole('tab',{name:'Piano terapeutico',exact:true}).click();await openEdit(desktop,'Farmaco nuovo sintetico');
  await expect(routeField(desktop)).toHaveValue('SC');await expect(preview(desktop)).toContainText('Tipo terapia: Al bisogno');await expect(preview(desktop)).not.toContainText('10:30');await screenshot(desktop,'desktop-created-prn-after-reload');await form(desktop).getByRole('button',{name:'Annulla',exact:true}).click();
 });
 await check('AC1/3 legacy ambiguous route shown as review, nonselectable; type switch never mutates original; rejected save has zero writes',async()=>{
  await openEdit(desktop,'Farmaco legacy sintetico');const before=desktop.state.writes.length;
  await expect(routeField(desktop)).toHaveValue('');await expect(routeField(desktop)).toHaveAttribute('aria-invalid','true');await expect(form(desktop)).toContainText('Via registrata da verificare');await expect(preview(desktop)).toContainText('Via: da verificare');
  const warning=form(desktop).getByText(/^Via registrata da verificare:/);await warning.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(warning).toBeVisible();await expect(warning).toBeInViewport({ratio:1});await desktop.page.screenshot({path:`${out}/screenshots/desktop-legacy-review-field.png`});
  expect(await routeField(desktop).locator('option[value="al bisogno"]').count()).toBe(0);expect(desktop.state.items[0].viaSomministrazione).toBe('al bisogno');
  await type(desktop,'Al bisogno');await expect(routeField(desktop)).toHaveValue('');await expect(preview(desktop)).toContainText('Via: da verificare');await expect(preview(desktop)).toContainText('Tipo terapia: Al bisogno');
  await screenshot(desktop,'desktop-legacy-review-no-conversion');await form(desktop).getByRole('button',{name:'Aggiorna',exact:true}).click();await expect(routeField(desktop)).toBeFocused();expect(desktop.state.writes.length).toBe(before);expect(desktop.state.items[0].viaSomministrazione).toBe('al bisogno');
 });
 await check('AC4 explicit legacy repair, intentional server400 remains visible, unchanged source then retry and reload preserves actual route/PRN',async()=>{
  await routeField(desktop).selectOption('SC');desktop.state.rejectNext=true;await form(desktop).getByRole('button',{name:'Aggiorna',exact:true}).click();
  await expect(form(desktop).getByRole('alert')).toContainText('Controllo sintetico: prescrizione da verificare');await expect(routeField(desktop)).toHaveValue('SC');expect(desktop.state.items[0].viaSomministrazione).toBe('al bisogno');
  await form(desktop).getByRole('button',{name:'Aggiorna',exact:true}).click();await expect(form(desktop)).toHaveCount(0);
  expect(desktop.state.writes.at(-1).body.viaSomministrazione).toBe('SC');expect(desktop.state.writes.at(-1).body.tipo).toBe('al_bisogno');expect(desktop.state.writes.at(-1).body.schedules).toEqual([]);
  await reloadTherapies(desktop);await openEdit(desktop,'Farmaco legacy sintetico');await expect(routeField(desktop)).toHaveValue('SC');await expect(routeField(desktop)).not.toHaveAttribute('aria-invalid','true');await expect(preview(desktop)).toContainText('Tipo terapia: Al bisogno');await expect(preview(desktop)).toContainText('Via: SC');await screenshot(desktop,'desktop-legacy-repaired-after-reload');
 });
 await check('AC3 desktop actual calendar create dialog preserves route/regime, Escape cancels with zero writes',()=>escapeCalendarCreate(desktop));
 await finish(desktop,'desktop');
 const mobile=await contextFor({mobile:true});await login(mobile);
 await check('AC1/3 mobile390 real edit review, native route label and distinct preview, no automatic conversion',async()=>{
  await openEdit(mobile,'Farmaco legacy sintetico');await expect(routeField(mobile)).toHaveValue('');await expect(form(mobile)).toContainText('Via registrata da verificare');await expect(preview(mobile)).toContainText('Via: da verificare');await screenshot(mobile,'mobile-legacy-review');
  const warning=form(mobile).getByText(/^Via registrata da verificare:/);await warning.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(warning).toBeVisible();await expect(warning).toBeInViewport({ratio:1});await mobile.page.screenshot({path:`${out}/screenshots/mobile-legacy-review-field.png`});
  await routeField(mobile).selectOption('orale');await type(mobile,'Al bisogno');await expect(routeField(mobile)).toHaveValue('orale');await expect(preview(mobile)).toContainText('Via: orale');await expect(preview(mobile)).toContainText('Tipo terapia: Al bisogno');await expect(preview(mobile)).not.toContainText('08:00');await screenshot(mobile,'mobile-route-regime-separated');
  expect(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(mobile.state.writes).toEqual([]);
 });
 await check('AC3 mobile actual calendar create dialog route/regime and Escape cancels with zero writes',()=>escapeCalendarCreate(mobile));
 await finish(mobile,'mobile');
 const denied=await contextFor({denied:true});await login(denied);
 await check('Security denied nurse create/edit capabilities suppress prescription controls and every write',async()=>{
  await expect(denied.page.getByRole('tab',{name:'Nuova terapia',exact:true})).toHaveCount(0);
  const card=denied.page.locator('.tf-drugs__item').filter({hasText:'Farmaco legacy sintetico'});await card.getByRole('button').first().click();await expect(card.getByRole('button',{name:'Modifica Farmaco legacy sintetico',exact:true})).toHaveCount(0);expect(denied.state.writes).toEqual([]);await denied.page.screenshot({path:`${out}/screenshots/denied-role-controls.png`});
 });await finish(denied,'denied-role');
}catch(error){process.exitCode=1;outcomes.push({name:'Harness assertion/runtime',status:'FAIL',message:error.message});console.log(`FAIL ${error.message}`);for(const [i,context]of contexts.entries())if(context.pages().length)await context.pages()[0].screenshot({path:`${out}/screenshots/failed-${i}.png`}).catch(()=>{});
}finally{
 await browser.close();const report={application:'Actual index.html/main.tsx/App.tsx SPA, guarded intercepted synthetic localhost APIs. Browser writes/reload are simulated transport persistence; real PostgreSQL evidence is separate db-results.json.',outcomes,states};writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify(report,null,2));writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><html><head><meta charset="utf-8"><title>406 Independent SPA QA</title></head><body><h1>406 Independent SPA QA</h1><p>Synthetic fixtures only. Browser transport persistence is not a database proof.</p><pre>${JSON.stringify(report,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></body></html>`);
}
