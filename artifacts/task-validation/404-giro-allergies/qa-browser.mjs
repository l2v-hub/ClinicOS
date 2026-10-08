import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire('C:/w-insulin-qa/package.json');
const {chromium,expect}=require('playwright/test');
const out=resolve(process.env.CLINICOS_QA_OUTPUT_DIR||'artifacts/task-validation/404-giro-allergies');
for(const dir of ['screenshots','test-results','playwright-report','video'])mkdirSync(`${out}/${dir}`,{recursive:true});
const outcomes=[],runtimes=[],contexts=[];
const browser=await chromium.launch({headless:true});
const identity={id:'QA-SUPERVISOR-404',name:'Supervisore Sintetico',roleLabel:'Supervisore',appRole:'supervisor',uiShell:'admin'};
const nurseIdentity={id:'QA-NURSE-404',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const patients=Array.from({length:8},(_,i)=>({id:`QA-PATIENT-404-${i}`,firstName:'Persona',lastName:`Sintetica ${i}`,medicalRecordNumber:`QA-404-${i}`,dateOfBirth:'1980-01-01',sex:'M'}));
const known={allergene:'Sostanza sintetica A',gravita:'grave',reazione:'Reazione sintetica A',documentato:'2026-10-09',documentatoDa:'Autore sintetico',note:'Nota sintetica locale'};
const source=(patientId,data)=>({patientId,data});
const fixtures=[{allergie:[known],allergieStatus:'assenti',unrelatedChart:'QA-FULL-CHART-MUST-NOT-PERSIST'},
 {allergie:[],allergieStatus:'assenti'},{allergieStatus:'paziente_nega'},{},
 {allergie:[],allergieStatus:['assenti']},{allergie:null,allergieStatus:'assenti'},
 {pazienteId:'MISMATCH',allergie:[],allergieStatus:'assenti'},
 {allergie:[{allergene:'Sostanza sintetica B',gravita:['grave'],reazione:'Reazione sintetica B',note:'<img src=x onerror="window.__qaInjected=true">'}],allergieStatus:'presenti'}];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function contextFor({name,mobile=false,denied=false,failure=0,stale=false,timeout=false,nurse=false}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},recordVideo:{dir:`${out}/video`}});contexts.push(context);
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={name,nurse,forceDenied:false,requests:[],errors:[],pageErrors:[],httpErrors:[],expectedHttp:[],blockedExternal:[],unexpectedApi:[],clinicalWrites:[],persisted:[],chartCalls:{},held:[],maxRouteReads:0};runtimes.push(state);
 let activeReads=0,releaseOld;
 const gate=new Promise(r=>releaseOld=r);state.releaseOld=releaseOld;
 await context.addInitScript(()=>{
  window.__qaFetchRows=[];window.__qaActive=0;window.__qaMaxActive=0;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const url=new URL(typeof input==='string'?input:input.url,location.href);
   if(!/\/cartella$/.test(url.pathname))return nativeFetch(input,init);
   const headers=new Headers(init?.headers),row={path:url.pathname,cache:init?.cache,authenticated:headers.has('authorization')||headers.has('x-operator-id'),aborted:false};
   window.__qaFetchRows.push(row);window.__qaActive++;window.__qaMaxActive=Math.max(window.__qaMaxActive,window.__qaActive);
   init?.signal?.addEventListener('abort',()=>row.aborted=true,{once:true});
   try{return await nativeFetch(input,init);}finally{window.__qaActive--;}
  };
 });
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(!['127.0.0.1','localhost'].includes(url.hostname)){state.blockedExternal.push(url.origin);return route.abort();}
  if(url.port!=='3001')return route.continue();
  state.requests.push({method:request.method(),path,query:url.search});
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[state.nurse?nurseIdentity:identity]});
  if(path==='/auth/simulator/session')return json({token:'sim.synthetic404-not-a-secret'});
  if(path==='/auth/simulator/logout')return json({ok:true});
  if(path==='/auth/me'){
   const capabilities=Object.fromEntries(['patients.list_page','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]));
   capabilities['clinical_record.get']={allowed:!denied&&!state.forceDenied,effect:denied||state.forceDenied?'DENIED':'ALLOWED'};
   for(const key of ['administration.confirm','administration.record_not_administered'])capabilities[key]={allowed:true,effect:state.nurse?'ALLOWED':'ALLOWED_WITH_CONFIRMATION',requiresConfirmation:!state.nurse};
   return json({...state.nurse?nurseIdentity:identity,role:state.nurse?'operatore':'admin',authMode:'disabled',temporaryDemo:false,capabilities});
  }
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/patients/page')return json({items:patients,hasMore:false,nextCursor:null});
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path==='/patients/clinical-summary')return json(patients.map(p=>({patientId:p.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:[],rischiElevati:[],allergeni:[],hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:1,terapieCompletate:0})));
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:8,critici:0,rischiAlti:0,ricoverati:8,dimessi:0,allergieGravi:0,terapieTotali:8,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/appointments'||path==='/therapy-slots')return json([]);
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(path==='/operators/directory/page'||path==='/operators/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
  if(path==='/therapy-slots/page'){
   const date=url.searchParams.get('date'),slots=['mattina','pranzo'].map((fascia,index)=>{
    const ora=index?'12:00':'07:00',ps=patients.map((p,i)=>{
     const persisted=state.persisted.some(key=>key===`${p.id}|${date}|${fascia}`);
     return {patientId:p.id,firstName:p.firstName,lastName:p.lastName,dateOfBirth:p.dateOfBirth,location:{status:'unassigned'},room:'Non assegnato',bed:'Non assegnato',administrations:[{therapyId:`QA-THERAPY-404-${i}`,drugName:`Farmaco sintetico ${i}`,dosage:'1 compressa — 5 mg',quantityLabel:'1 compressa — 5 mg',route:'orale',scheduledTime:ora,status:persisted?'administered':'pending',administrationId:persisted?'QA-ADMIN-404':null,administeredAt:persisted?'2026-10-09T05:10:00Z':null,administeredBy:persisted?'Supervisore sintetico':null,notAdministeredReason:null}]};
    });const administered=ps.filter(p=>p.administrations[0].status==='administered').length;
    return {id:fascia,fascia,label:fascia,ora,summary:{total:8,administered,notAdministered:0,pending:8-administered},patients:ps};
   });
   return json({slots,pageInfo:{hasMore:false,nextCursor:null,loadedTherapies:8,completeness:'complete',summaryExact:true},roster:{context:null,order:{criterion:url.searchParams.get('sort')||'name',direction:url.searchParams.get('direction')||'asc'},source:'system',revision:null,temporary:false,asOf:date,epoch:{roster:'1',therapy:'1'}}});
  }
  if(path==='/therapy-slots/confirm'&&request.method()==='POST'){
   const body=request.postDataJSON();state.clinicalWrites.push({path,body});
   expect(body).toEqual({patientId:patients[0].id,therapyId:'QA-THERAPY-404-0',date:'2026-10-09',fascia:'mattina',confirmed:true});
   state.persisted.push(`${body.patientId}|${body.date}|${body.fascia}`);return json({ok:true});
  }
  const match=path.match(/^\/patients\/(QA-PATIENT-404-\d+)\/cartella$/);
  if(match){
   const id=match[1],index=patients.findIndex(p=>p.id===id),call=(state.chartCalls[id]??0)+1;state.chartCalls[id]=call;
   if(denied)state.unexpectedApi.push('Capability-denied cartella request');
   activeReads++;state.maxRouteReads=Math.max(state.maxRouteReads,activeReads);
   try{
    if((stale||timeout)&&call===1){state.held.push(id);await gate;}
    else await pause(100);
    if(failure&&index===0&&call===1){state.expectedHttp.push({status:failure,path});return await json({error:'Synthetic unavailable'},failure);}
    const data=stale&&call>1?{allergie:[{...known,allergene:'Sorgente nuova sintetica'}],allergieStatus:'presenti'}:fixtures[index];
    return await json(source(id,data));
   }catch(error){if(!request.failure()&&!stale&&!timeout)throw error;}finally{activeReads--;}
  }
  state.unexpectedApi.push(`${request.method()} ${path}`);return json({error:'Guarded unexpected API'},500);
 });
 const page=await context.newPage();
 page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));
 page.on('response',r=>{if(r.status()>=400){const item={status:r.status(),path:new URL(r.url()).pathname};if(!state.expectedHttp.some(e=>e.status===item.status&&e.path===item.path))state.httpErrors.push(item);}});
 return {context,page,state};
}
async function login(ctx){
 await ctx.page.goto('http://127.0.0.1:7468/#/terapie');
 await ctx.page.getByRole('button',{name:ctx.state.nurse?/Infermiere Sintetico/:/Supervisore Sintetico/}).click();
 await expect(ctx.page.locator('.giro-tools')).toBeVisible();
 await ctx.page.locator('.giro-tools').getByRole('button',{name:'Giro',exact:true}).click();
 await ctx.page.getByLabel('Data terapia',{exact:true}).fill('2026-10-09');
 await expect(ctx.page.locator('.giro-patient')).toHaveCount(8);
 await ctx.page.getByRole('button',{name:/^Ore 07:00:/}).click();
}
const card=(ctx,i=0)=>ctx.page.locator('.giro-patient').nth(i);
const allergy=(ctx,i=0)=>card(ctx,i).locator('.giro-allergies');
async function waitLoaded(ctx){await expect.poll(()=>ctx.page.locator('.giro-allergies__source').allTextContents()).not.toContain('Lettura della cartella in corso…');}
async function clean(ctx){
 expect(ctx.state.errors.filter(e=>!/^Failed to load resource: the server responded with a status of (401|403|503)/.test(e)),'unexpected console').toEqual([]);
 expect(ctx.state.pageErrors,'runtime').toEqual([]);expect(ctx.state.httpErrors,'unexpected HTTP').toEqual([]);expect(ctx.state.blockedExternal,'external blocked').toEqual([]);expect(ctx.state.unexpectedApi,'guarded APIs').toEqual([]);
 const fetchRows=await ctx.page.evaluate(()=>({rows:window.__qaFetchRows,max:window.__qaMaxActive}));
 ctx.state.fetchObservation=fetchRows;
 expect(fetchRows.rows.every(row=>row.cache==='no-store'&&row.authenticated),'fresh authenticated no-store cartella').toBe(true);
}
async function finish(ctx,name,videoName){
 await clean(ctx);ctx.state.releaseOld();delete ctx.state.releaseOld;
 await ctx.context.tracing.stop({path:`${out}/${name==='desktop'?'trace':`${name}-trace`}.zip`});
 const video=ctx.page.video();await ctx.context.close();if(videoName)await video.saveAs(`${out}/video/${videoName}.webm`);await video.delete();
}
async function check(name,fn){try{await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}catch(e){outcomes.push({name,status:'FAIL',message:e.message});console.log(`FAIL ${name}: ${e.message}`);process.exitCode=1;}}
async function states(ctx){
 await waitLoaded(ctx);
 await expect(allergy(ctx)).toContainText('1 allergia');await expect(allergy(ctx)).toContainText('Sostanza sintetica A');await expect(allergy(ctx)).toContainText('Gravità: grave');await expect(allergy(ctx)).toContainText('Reazione: Reazione sintetica A');
 await expect(allergy(ctx,1)).toContainText('Allergie assenti (verificato)');await expect(allergy(ctx,2)).toContainText('Paziente nega allergie');
 for(const i of [3,4,5,6])await expect(allergy(ctx,i)).toContainText('Stato non documentato');
 for(const i of [4,5,6])await expect(allergy(ctx,i).getByRole('button',{name:/Rileggi allergie/})).toBeVisible();
 await expect(allergy(ctx,7)).toContainText('Gravità: non documentata');
 expect(await card(ctx).evaluate(el=>el.querySelector('.giro-allergies').compareDocumentPosition(el.querySelector('.giro-drugs'))&Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
 expect(await ctx.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow').toBe(true);
 const storage=await ctx.page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));expect(storage).not.toContain('QA-FULL-CHART-MUST-NOT-PERSIST');
 await expect(ctx.page.getByText('QA-FULL-CHART-MUST-NOT-PERSIST')).toHaveCount(0);
 expect(await ctx.page.evaluate(()=>window.__qaMaxActive)).toBeLessThanOrEqual(4);
 expect(Object.keys(ctx.state.chartCalls)).toHaveLength(8);
}
async function disclosure(ctx,method,index=0){
 const summary=allergy(ctx,index).locator('summary');await summary.scrollIntoViewIfNeeded();await summary.focus();
 await expect(summary).toBeFocused();
 const before=await ctx.page.evaluate(()=>({hash:location.hash,date:document.querySelector('input[type=date]').value,scroll:scrollY,selected:[...document.querySelectorAll('.giro-slot[aria-pressed=true],.giro-filters button[aria-pressed=true]')].map(el=>el.textContent)}));
 if(method==='keyboard')await summary.press('Enter');else await summary.click();
 await expect(allergy(ctx,index).locator('details')).toHaveAttribute('open','');if(index===0){await expect(allergy(ctx)).toContainText('Autore sintetico');await expect(allergy(ctx)).toContainText('Nota sintetica locale');}
 if(index===7){await expect(allergy(ctx,7)).toContainText('<img src=x onerror="window.__qaInjected=true">');await expect(allergy(ctx,7).locator('img')).toHaveCount(0);expect(await ctx.page.evaluate(()=>window.__qaInjected)).toBeUndefined();}
 expect(await ctx.page.evaluate(()=>scrollY),'native opening retains position').toBe(before.scroll);
 await ctx.page.screenshot({path:`${out}/screenshots/${ctx.state.name}-${index?'lower-':''}details-open.png`});
 if(method==='keyboard')await summary.press('Space');else await summary.click();
 await expect(allergy(ctx,index).locator('details')).not.toHaveAttribute('open','');
 expect(await ctx.page.evaluate(()=>({hash:location.hash,date:document.querySelector('input[type=date]').value,scroll:scrollY,selected:[...document.querySelectorAll('.giro-slot[aria-pressed=true],.giro-filters button[aria-pressed=true]')].map(el=>el.textContent)}))).toEqual(before);
 expect(ctx.state.clinicalWrites).toEqual([]);
}
try{
 const desktop=await contextFor({name:'desktop'});await login(desktop);
 await check('AC1/2 desktop known, verified absent, status-only denial, unknown, malformed and identity mismatch; max4/no-store/minimal projection',async()=>{await states(desktop);await allergy(desktop).scrollIntoViewIfNeeded();await desktop.page.screenshot({path:`${out}/screenshots/desktop-allergy-before-action.png`});});
 await check('AC3 desktop keyboard Enter/Space native disclosure preserves patient, date, time/non-default filter/hash and scroll; zero writes',async()=>{await desktop.page.getByRole('button',{name:/^Da erogare/}).click();await waitLoaded(desktop);await disclosure(desktop,'keyboard');});
 await check('AC3 desktop pointer disclosure same context and scroll',()=>disclosure(desktop,'pointer'));
 await check('AC3 desktop lower card keyboard disclosure open/close retains scroll and context',()=>disclosure(desktop,'keyboard',7));
 await check('AC4 actual supervisor dialog cancel no writes; confirm unchanged exact key; refreshed administered state + reload mocked persistence',async()=>{
  await desktop.page.getByRole('button',{name:'Tutte',exact:true}).click();await waitLoaded(desktop);
  const button=card(desktop).getByRole('button',{name:/^Erogata:/});await button.click();
  const dialog=desktop.page.getByRole('alertdialog',{name:'Confermi la somministrazione?'});await expect(dialog).toBeVisible();await expect(dialog).toContainText('Sintetica 0, Persona');await expect(dialog).toContainText('Farmaco sintetico 0');await expect(dialog).toContainText('ore 07:00');
  await desktop.page.screenshot({path:`${out}/screenshots/supervisor-confirmation-dialog.png`});await dialog.getByRole('button',{name:'Annulla',exact:true}).click();await expect(dialog).toHaveCount(0);expect(desktop.state.clinicalWrites).toEqual([]);
  await button.click();await dialog.getByRole('button',{name:'Conferma somministrazione',exact:true}).click();await expect(desktop.page.getByText('Somministrazione di Farmaco sintetico 0 registrata.',{exact:true})).toBeVisible();
  await expect(card(desktop).locator('.giro-badge--ok')).toContainText('Supervisore sintetico');await expect(card(desktop).getByRole('button',{name:/^Erogata:/})).toHaveCount(0);expect(desktop.state.clinicalWrites).toHaveLength(1);
  await allergy(desktop).scrollIntoViewIfNeeded();await desktop.page.screenshot({path:`${out}/screenshots/supervisor-administered-refresh.png`});
  await desktop.page.reload();const loginButton=desktop.page.getByRole('button',{name:/Supervisore Sintetico/});if(await loginButton.isVisible())await loginButton.click();
  await desktop.page.locator('.giro-tools').getByRole('button',{name:'Giro',exact:true}).click();await desktop.page.getByLabel('Data terapia',{exact:true}).fill('2026-10-09');await desktop.page.getByRole('button',{name:/^Ore 07:00:/}).click();
  await expect(card(desktop).locator('.giro-badge--ok')).toContainText('Supervisore sintetico');await expect(allergy(desktop)).toContainText('Sostanza sintetica A');expect(desktop.state.clinicalWrites).toHaveLength(1);
  await allergy(desktop).scrollIntoViewIfNeeded();await desktop.page.screenshot({path:`${out}/screenshots/supervisor-administered-after-reload.png`});
 });await finish(desktop,'desktop','final-desktop');
 const mobile=await contextFor({name:'mobile',mobile:true});await login(mobile);
 await check('AC1/2 mobile390 named severity/reaction before action; distinct source states and no page overflow',async()=>{await states(mobile);await allergy(mobile).scrollIntoViewIfNeeded();await mobile.page.screenshot({path:`${out}/screenshots/mobile-allergy-before-action.png`});});
 await check('AC3 mobile keyboard native disclosure preserves exact Giro context/scroll',()=>disclosure(mobile,'keyboard'));await finish(mobile,'mobile','final-mobile');
 const nurse=await contextFor({name:'nurse',nurse:true});await login(nurse);
 await check('AC1/2 original issue nurse profile actual SPA known/none/denied/unknown before action; no redirect/write',async()=>{await states(nurse);await expect(nurse.page).toHaveURL(/#\/terapie$/);await expect(card(nurse).getByRole('button',{name:/^Erogata:/})).toBeEnabled();await allergy(nurse).scrollIntoViewIfNeeded();await nurse.page.screenshot({path:`${out}/screenshots/nurse-allergy-before-action.png`});});
 await check('AC3 nurse lower card pointer disclosure retains scroll/context without writes',()=>disclosure(nurse,'pointer',7));
 await check('AC1 capability revocation clears shown allergy projection and suppresses new reads',async()=>{nurse.state.forceDenied=true;const calls=Object.values(nurse.state.chartCalls).reduce((a,b)=>a+b,0);await nurse.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(allergy(nurse)).toContainText('Dato non disponibile per il tuo ruolo.');await expect(allergy(nurse)).not.toContainText('Sostanza sintetica A');expect(Object.values(nurse.state.chartCalls).reduce((a,b)=>a+b,0)).toBe(calls);});await finish(nurse,'nurse');
 const denied=await contextFor({name:'capability-denied',denied:true});await login(denied);
 await check('AC1 denied capability suppresses all cartella reads; unknown stays actionable without compatibility decision',async()=>{
  await expect(denied.page.locator('.giro-allergies')).toHaveCount(8);await expect(allergy(denied)).toContainText('Stato non documentato');await expect(allergy(denied)).toContainText('Dato non disponibile per il tuo ruolo.');expect(denied.state.chartCalls).toEqual({});await expect(card(denied).getByRole('button',{name:/^Erogata:/})).toBeEnabled();await expect(allergy(denied).locator('summary')).toHaveCount(0);await denied.page.screenshot({path:`${out}/screenshots/capability-denied-unknown.png`});
 });await finish(denied,'capability-denied');
 for(const failure of [401,403,503]){
  const ctx=await contextFor({name:`http-${failure}`,failure});await login(ctx);
  await check(`AC1/4 intentional HTTP${failure} unknown + explicit retry obtains fresh known source, zero writes`,async()=>{
   await expect(allergy(ctx)).toContainText('Dato non disponibile. Riprova');await expect(allergy(ctx)).toContainText('Stato non documentato');await expect(card(ctx).getByRole('button',{name:/^Erogata:/})).toBeEnabled();
   await allergy(ctx).getByRole('button',{name:/Rileggi allergie/}).click();await expect(allergy(ctx)).toContainText('Sostanza sintetica A');expect(ctx.state.chartCalls[patients[0].id]).toBeGreaterThanOrEqual(2);expect(ctx.state.clinicalWrites).toEqual([]);await ctx.page.screenshot({path:`${out}/screenshots/http-${failure}-retry-known.png`});
  });await finish(ctx,`http-${failure}`);
 }
 const stale=await contextFor({name:'stale',stale:true});await login(stale);
 await check('AC1/4 old queued/source reads cancelled on time/date/unmount; delayed prior response cannot replace new source',async()=>{
  await expect.poll(()=>stale.state.held.length).toBe(4);await expect(allergy(stale)).toContainText('Lettura della cartella in corso');
  await stale.page.getByRole('button',{name:/^Ore 12:00:/}).click();await expect(allergy(stale)).toContainText('Sorgente nuova sintetica');stale.state.releaseOld();await pause(150);
  await expect(allergy(stale)).toContainText('Sorgente nuova sintetica');await expect(allergy(stale)).not.toContainText('Sostanza sintetica A');
  const observations=await stale.page.evaluate(()=>window.__qaFetchRows);expect(observations.filter(r=>r.aborted).length).toBeGreaterThanOrEqual(4);
  await stale.page.getByLabel('Data terapia',{exact:true}).fill('2026-10-10');await expect(allergy(stale)).toContainText('Sorgente nuova sintetica');await expect(stale.page.getByLabel('Data terapia',{exact:true})).toHaveValue('2026-10-10');
  await stale.page.locator('.giro-tools').getByRole('button',{name:'Calendario',exact:true}).click();await expect(stale.page.locator('.giro-patient')).toHaveCount(0);expect(stale.state.clinicalWrites).toEqual([]);
 });await finish(stale,'stale');
 const session=await contextFor({name:'session-change',stale:true});await login(session);
 await check('AC1 stale old supervisor reads cancelled across actual logout/login nurse identity change; no old allergy disclosure',async()=>{
  await expect.poll(()=>session.state.held.length).toBe(4);session.state.nurse=true;
  await session.page.getByRole('button',{name:/menu utente/}).click();await session.page.getByRole('button',{name:'Cambia profilo',exact:true}).click();
  await expect(session.page.locator('.giro-allergies')).toHaveCount(0);session.state.oldSessionFetchObservation=await session.page.evaluate(()=>window.__qaFetchRows);expect(session.state.oldSessionFetchObservation.filter(r=>r.aborted).length).toBeGreaterThanOrEqual(4);
  await login(session);await expect(allergy(session)).toContainText('Sorgente nuova sintetica');session.state.releaseOld();await pause(150);
  await expect(allergy(session)).not.toContainText('Sostanza sintetica A');expect(session.state.clinicalWrites).toEqual([]);await session.page.screenshot({path:`${out}/screenshots/nurse-after-stale-supervisor-session.png`});
 });await finish(session,'session-change');
 const timeout=await contextFor({name:'timeout',timeout:true});await login(timeout);
 await check('AC1 timeout cancels stalled source + queued reads, remains unknown, explicit retry after release',async()=>{
  await expect(allergy(timeout)).toContainText('Dato non disponibile. Riprova',{timeout:13000});await expect(allergy(timeout)).toContainText('Stato non documentato');timeout.state.releaseOld();
  await allergy(timeout).getByRole('button',{name:/Rileggi allergie/}).click();await expect(allergy(timeout)).toContainText('Sostanza sintetica A');expect(timeout.state.clinicalWrites).toEqual([]);
 });await finish(timeout,'timeout');
}catch(e){process.exitCode=1;outcomes.push({name:'Harness setup/runtime',status:'FAIL',message:e.message});console.log(`FAIL setup: ${e.message}`);
 for(const [i,context]of contexts.entries())if(context.pages().length)await context.pages()[0].screenshot({path:`${out}/screenshots/failed-${i}.png`}).catch(()=>{});
}finally{
 for(const state of runtimes){state.releaseOld?.();delete state.releaseOld;}
 await browser.close();const report={surface:'Actual SPA index.html/main.tsx/App.tsx; supervisor admin shell; guarded intercepted localhost synthetic auth/clinical APIs only. Simulated transport persistence, not real database or clinical compatibility validation.',outcomes,runtimes};
 writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify(report,null,2));writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><html><head><meta charset="utf-8"><title>404 Independent actual SPA QA</title></head><body><h1>404 Independent actual SPA QA</h1><p>Actual application; synthetic local intercepted transport. Not real database evidence.</p><pre>${JSON.stringify(report,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></body></html>`);
}
