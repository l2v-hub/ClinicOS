import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire('C:/w-insulin-qa/package.json');
const {chromium,expect}=require('playwright/test');
const out=resolve(process.env.CLINICOS_QA_OUTPUT_DIR||'artifacts/task-validation/405-appointment-labels');
for(const dir of ['screenshots','test-results','playwright-report','video'])mkdirSync(`${out}/${dir}`,{recursive:true});
const outcomes=[],runtimes=[],contexts=[];
const browser=await chromium.launch({headless:true});
const nurse={id:'QA-NURSE-405',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const admin={id:'QA-ADMIN-405',name:'Amministratore Sintetico',roleLabel:'Amministratore',appRole:'admin',uiShell:'admin'};
const patients=[{id:'QA-PATIENT-405',firstName:'Persona',lastName:'Sintetica',medicalRecordNumber:'QA-405',dateOfBirth:'1980-01-01',sex:'M',codiceFiscale:'SNTPSN80A01H501A'}];
const operators=[{id:nurse.id,nome:'Sintetico',cognome:'Infermiere',ruolo:'infermiere',reparto:'Reparto QA',stato:'attivo',email:'qa@example.test',telefono:'',pazientiAssegnati:1}];
const labels=['Paziente','Data','Ora','Durata','Tipo intervento','Priorità','Operatore','Camera (opz.)','Stato','Note cliniche'];
async function contextFor(name,mobile=false,isAdmin=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},recordVideo:{dir:`${out}/video`},timezoneId:'Europe/Rome'});contexts.push(context);
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={name,isAdmin,requests:[],errors:[],pageErrors:[],httpErrors:[],expectedHttp:[],external:[],unexpectedApi:[],writes:[],appointments:[],saveMode:'conflict',names:[],tabOrder:[]};runtimes.push(state);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(!['127.0.0.1','localhost'].includes(url.hostname)){state.external.push(url.origin);return route.abort();}
  if(url.port!=='3001')return route.continue();
  state.requests.push({method,path});const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  const identity=isAdmin?admin:nurse;
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[identity]});
  if(path==='/auth/simulator/session')return json({token:'sim.synthetic405-not-a-secret'});
  if(path==='/auth/simulator/logout')return json({ok:true});
  if(path==='/auth/me')return json({...identity,role:isAdmin?'admin':'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(['patients.list_page','patients.clinical_summary','patients.clinical_overview','appointments.list','appointments.create','appointments.update','appointments.delete','consegne.list','notes.list','operators.directory','operators.list','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]))});
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/patients/page'||path==='/patients/page/search')return json({items:patients,hasMore:false,nextCursor:null});
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path==='/patients/clinical-summary')return json(patients.map(p=>({patientId:p.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:[],rischiElevati:[],allergeni:[],hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0})));
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:1,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/admin/rooms')return json([]);
  if(path==='/appointments'&&method==='GET')return json(state.appointments);
  if((path==='/appointments'&&method==='POST')||(/^\/appointments\//.test(path)&&method==='PATCH')){
   const body=request.postDataJSON();state.writes.push({method,body,authenticated:Boolean(request.headers()['x-operator-id']||request.headers().authorization)});
   if(state.saveMode==='hold')await new Promise(r=>state.releaseSave=r);
   if(state.saveMode==='conflict'){state.expectedHttp.push({status:409,path});return json({error:{kind:'conflict',message:'Slot sintetico occupato: scegli un altro orario.'}},409);}
   const row={id:'QA-APT-405',...body,patientId:patients[0].id,patientName:'Sintetica, Persona'};state.appointments=[row];return json(row,method==='POST'?201:200);
  }
  if(path==='/therapy-slots')return json([]);
  if(path==='/therapy-slots/page')return json({slots:[],pageInfo:{hasMore:false,nextCursor:null,loadedTherapies:0,completeness:'complete',summaryExact:true},roster:{context:null,order:{criterion:'name',direction:'asc'},source:'system',revision:null,temporary:false,asOf:'2026-10-09',epoch:{roster:'1',therapy:'1'}}});
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(path==='/operators/directory/page'||path==='/operators/page')return json({items:operators,pageInfo:{hasMore:false,nextCursor:null},summary:null});
  state.unexpectedApi.push(`${method} ${path}`);return json({error:'Guarded unexpected API'},500);
 });
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));
 page.on('response',r=>{if(r.status()>=400){const item={status:r.status(),path:new URL(r.url()).pathname};if(!state.expectedHttp.some(e=>e.status===item.status&&e.path===item.path))state.httpErrors.push(item);}});
 return{context,page,state};
}
async function login(ctx){await ctx.page.goto('http://127.0.0.1:7469/#/login');await ctx.page.getByRole('button',{name:ctx.state.isAdmin?/Amministratore Sintetico/:/Infermiere Sintetico/}).click();await expect(ctx.page.locator('.teams-sidebar')).toBeAttached();await ctx.page.goto(`http://127.0.0.1:7469/#/${ctx.state.isAdmin?'agenda-admin':'agenda-operatore'}`);await expect(ctx.page.locator('.agt-view')).toBeVisible();}
const dialog=ctx=>ctx.page.getByRole('dialog',{name:/Appuntamento/});
async function open(ctx){const trigger=ctx.state.isAdmin?ctx.page.locator('.agt-col-hdr').first():ctx.page.getByRole('button',{name:'Crea appuntamento alle 14:00',exact:true});await trigger.scrollIntoViewIfNeeded();await trigger.focus();if(ctx.state.isAdmin)await ctx.page.locator('.agt-admin-cell.free').nth(12).click();else await trigger.press('Enter');await expect(dialog(ctx)).toBeVisible();await expect(dialog(ctx).getByRole('button',{name:'Chiudi',exact:true})).toBeFocused();return trigger;}
async function namesAndClicks(ctx,edit=false){const dlg=dialog(ctx);const rows=[];for(const name of labels.slice(edit?1:0)){
 if(name!=='Paziente')await dlg.getByRole('button',{name:'Chiudi',exact:true}).focus();
 const control=dlg.getByLabel(name,{exact:true});await expect(control).toHaveCount(1);await expect(control).toBeVisible();await expect(control).toHaveAccessibleName(name);
 const row=await control.evaluate(el=>({id:el.id,labels:[...el.labels].map(l=>l.textContent.trim()),type:el.type,value:el.value}));expect(row.id).toBeTruthy();expect(row.labels).toEqual([name]);
 const lab=dlg.locator('label').filter({hasText:new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`)});await expect(lab).toHaveCount(1);await lab.click();await expect(control).toBeFocused();rows.push({name,...row});}
 expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);expect(await ctx.page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return ids.length===new Set(ids).size;})).toBe(true);ctx.state.names.push({edit,rows});}
async function keyboard(ctx){const dlg=dialog(ctx);await dlg.getByRole('button',{name:'Chiudi',exact:true}).focus();const seen=[];for(let i=0;i<35;i++){await ctx.page.keyboard.press('Tab');const focus=await ctx.page.evaluate(()=>{const el=document.activeElement;return{inDialog:Boolean(el.closest('[role=dialog]')),id:el.id,tag:el.tagName,label:el.labels?.[0]?.textContent.trim(),name:el.getAttribute('aria-label')||el.textContent?.trim(),type:el.type};});expect(focus.inDialog).toBe(true);seen.push(focus);if(focus.name==='Chiudi')break;}
 const fieldOrder=[];for(const item of seen)if(item.label&&fieldOrder.at(-1)!==item.label)fieldOrder.push(item.label);expect(fieldOrder).toEqual(labels);await ctx.page.keyboard.press('Shift+Tab');await expect(dlg.getByRole('button',{name:'Annulla',exact:true})).toBeFocused();ctx.state.tabOrder.push(seen);}
async function selectPatient(ctx){await dialog(ctx).getByLabel('Paziente',{exact:true}).fill('Sintetica');const option=dialog(ctx).getByRole('option',{name:/Sintetica/});await expect(option).toBeVisible();await option.click();await expect(dialog(ctx).getByRole('button',{name:'Salva appuntamento',exact:true})).toBeEnabled();}
async function clean(ctx){expect(ctx.state.errors.filter(e=>!/^Failed to load resource: the server responded with a status of 409/.test(e))).toEqual([]);expect(ctx.state.pageErrors).toEqual([]);expect(ctx.state.httpErrors).toEqual([]);expect(ctx.state.external).toEqual([]);expect(ctx.state.unexpectedApi).toEqual([]);expect(ctx.state.writes.every(r=>r.authenticated)).toBe(true);}
async function finish(ctx){await clean(ctx);await ctx.context.tracing.stop({path:`${out}/${ctx.state.name==='desktop'?'trace':ctx.state.name+'-trace'}.zip`});const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${ctx.state.name}.webm`);await video.delete();}
async function check(name,fn){try{await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}catch(e){outcomes.push({name,status:'FAIL',message:e.message});console.log(`FAIL ${name}: ${e.message}`);process.exitCode=1;throw e;}}
try{
 const desktop=await contextFor('desktop');await login(desktop);let trigger;
 await check('AC1/2 nurse actual create10 names and native label clicks',async()=>{trigger=await open(desktop);await namesAndClicks(desktop);await desktop.page.screenshot({path:`${out}/screenshots/desktop-create-labelled.png`});});
 await check('AC2/4 native Tab order/trap Escape and cancel restore origin slot',async()=>{await keyboard(desktop);await desktop.page.keyboard.press('Escape');await expect(dialog(desktop)).toHaveCount(0);await expect(trigger).toBeFocused();trigger=await open(desktop);await dialog(desktop).getByRole('button',{name:'Annulla',exact:true}).click();await expect(trigger).toBeFocused();expect(desktop.state.writes).toEqual([]);});
 await check('AC1 browser error live alert/descriptions and patient selected semantics, not real reader proof',async()=>{trigger=await open(desktop);await selectPatient(desktop);await dialog(desktop).getByLabel('Note cliniche',{exact:true}).fill('Nota QA sintetica');await dialog(desktop).getByRole('button',{name:'Salva appuntamento',exact:true}).click();const alert=dialog(desktop).getByRole('alert');await expect(alert).toHaveText('Slot sintetico occupato: scegli un altro orario.');const id=await alert.getAttribute('id');await expect(dialog(desktop)).toHaveAttribute('aria-describedby',id);await expect(dialog(desktop).getByRole('button',{name:'Salva appuntamento',exact:true})).toHaveAttribute('aria-describedby',id);await expect(dialog(desktop).getByLabel('Paziente',{exact:true})).toHaveAttribute('aria-invalid','false');await desktop.page.screenshot({path:`${out}/screenshots/desktop-conflict-alert.png`});});
 await check('AC4 pending save remains non-dismissible; retry payload unchanged and mocked reload persistence',async()=>{desktop.state.saveMode='hold';await dialog(desktop).getByRole('button',{name:'Salva appuntamento',exact:true}).click();await expect(dialog(desktop).getByRole('button',{name:'Salvataggio…',exact:true})).toBeDisabled();await desktop.page.keyboard.press('Escape');await expect(dialog(desktop)).toBeVisible();await expect(dialog(desktop).getByRole('button',{name:'Chiudi',exact:true})).toBeDisabled();await desktop.page.screenshot({path:`${out}/screenshots/desktop-pending-save.png`});await expect.poll(()=>Boolean(desktop.state.releaseSave)).toBe(true);desktop.state.saveMode='success';desktop.state.releaseSave();delete desktop.state.releaseSave;await expect(dialog(desktop)).toHaveCount(0);expect(desktop.state.writes).toHaveLength(2);expect(desktop.state.writes[1].body).toEqual(desktop.state.writes[0].body);expect(desktop.state.writes[1].body).toEqual({patientId:patients[0].id,operatorId:nurse.id,operatorName:'Infermiere Sintetico',data:desktop.state.writes[1].body.data,ora:'14:00',durata:30,tipologia:'visita',note:'Nota QA sintetica',stato:'programmato'});await desktop.page.reload();await login(desktop);await expect(desktop.page.locator('.agt-apt-card')).toContainText('Nota QA sintetica');await desktop.page.screenshot({path:`${out}/screenshots/desktop-reloaded-mock-appointment.png`});});
 await check('AC1/2 edit9 linked fields readonly patient; Escape returns edit trigger',async()=>{await desktop.page.locator('.agt-apt-card').click();const edit=desktop.page.getByRole('button',{name:'Modifica',exact:true});await edit.click();await expect(dialog(desktop)).toHaveAccessibleName('Modifica Appuntamento');await namesAndClicks(desktop,true);await expect(dialog(desktop).locator('.apt-form-readonly')).toHaveText('Sintetica, Persona');await desktop.page.screenshot({path:`${out}/screenshots/desktop-edit-labelled.png`});await desktop.page.keyboard.press('Escape');await expect(edit).toBeFocused();});await finish(desktop);
 const mobile=await contextFor('mobile',true);await login(mobile);
 await check('AC1/2/4 mobile create10 names native clicks Tab trap Escape origin return',async()=>{const origin=await open(mobile);await namesAndClicks(mobile);await keyboard(mobile);await mobile.page.screenshot({path:`${out}/screenshots/mobile-labelled.png`});await mobile.page.keyboard.press('Escape');await expect(origin).toBeFocused();expect(mobile.state.writes).toEqual([]);});await finish(mobile);
 const manager=await contextFor('admin',false,true);await login(manager);
 await check('AC1/2 shared admin form10 names native clicks and Escape closes; admin pointer cell has no baseline focus target',async()=>{await open(manager);await namesAndClicks(manager);await manager.page.screenshot({path:`${out}/screenshots/admin-labelled.png`});await manager.page.keyboard.press('Escape');await expect(dialog(manager)).toHaveCount(0);manager.state.baselineLimitation='Admin calendar pointer-only div has no focusable origin; not changed in405. Nurse keyboard origin restoration verified.';expect(manager.state.writes).toEqual([]);});await finish(manager);
}catch(error){writeFileSync(`${out}/test-results/exception.txt`,error.stack);for(const ctx of contexts){for(const page of ctx.pages())await page.screenshot({path:`${out}/screenshots/failed-${contexts.indexOf(ctx)}.png`}).catch(()=>{});await ctx.tracing.stop({path:`${out}/failed-trace.zip`}).catch(()=>{});await ctx.close().catch(()=>{});}process.exitCode=1;}
finally{await browser.close();const report={candidate:'21f8c75c221c464fb00499326cf261143b444bf4',surface:'Actual SPA; guarded synthetic APIs; zero real network mutations',outcomes,runtimes,realScreenReader:{status:'UNVERIFIED',reason:'Real reader explicitly required; browser DOM/accessible-name assertions are not AT speech verification'}};writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify(report,null,2));writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><meta charset="utf-8"><title>405 independent actual SPA QA</title><h1>405 independent QA</h1><p>Real screen reader AC3 UNVERIFIED; no closure/release.</p><pre>${JSON.stringify(report,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre>`);}
