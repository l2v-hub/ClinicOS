import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const snapshot='/workspace/.clinicos-cloud/pr483-followup-independent-qa-20261018/snapshot-qa6';
const moduleAt=(p)=>import(pathToFileURL(resolve(snapshot,p)).href);
const {prisma}=await moduleAt('backend/src/lib/prisma.ts');
const {facilityToday}=await moduleAt('backend/src/patients/parameter-reading-input.ts');
const {findTherapiesDue}=await moduleAt('backend/src/therapies/due-therapy-query.ts');
const {buildTherapySlotPage,buildTherapySlots}=await moduleAt('backend/src/therapies/therapy-slots.ts');
const {chromium}=await moduleAt('node_modules/playwright/index.mjs');
const {installVerifiedFonts,verifyLoadedFonts,redactSyntheticTrace}=await moduleAt('e2e/qa-bug-batch-432-browser.mjs');
const out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const backend=process.env.QA_BACKEND_URL,frontend=process.env.QA_FRONTEND_URL,date=facilityToday();
for(const url of [backend,frontend,process.env.DATABASE_URL])assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname));
assert.equal(new URL(process.env.DATABASE_URL).pathname,'/clinicos_qa_batch432');
const marker=await prisma.$queryRaw`SELECT shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname=current_database()`;
assert.equal(marker[0].owner,`clinicos-qa:${process.env.QA_RUN_OWNER}`);
const sessions={};for(const id of ['SIM-DOCTOR-1','SIM-NURSE-1','SIM-OSS-1','SIM-ADMIN','SIM-SUPERVISOR-1']){const r=await fetch(`${backend}/auth/simulator/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identityId:id})});assert.equal(r.status,201);sessions[id]=await r.json();}
const headers=(id='SIM-NURSE-1')=>({'Content-Type':'application/json',Authorization:`Bearer ${sessions[id].token}`});
const patient=await prisma.patient.create({data:{medicalRecordNumber:`QA-INDEPENDENT-${randomUUID()}`,firstName:'Ada',lastName:'QA Independent',dateOfBirth:new Date('1970-01-01'),registeredById:'SIM-DOCTOR-1'}});
const make=(name,time,flags={})=>prisma.patientTherapy.create({data:{patientId:patient.id,farmacoNome:name,dosaggio:'10 mg',viaSomministrazione:'orale',tipo:'una_tantum',stato:'attiva',dataInizio:date,dataSomministrazione:date,orarioSomministrazione:time,fasceMattina:false,fascePranzo:false,fascePomeriggio:false,fasceSera:false,fasceNotte:false,...flags}});
const results=[];let browser,active,globalVerificationCount;
async function post(endpoint,body,id){return fetch(`${backend}/therapy-slots/${endpoint}`,{method:'POST',headers:headers(id),body:JSON.stringify(body)});}
const input=(t,extra={})=>({patientId:patient.id,therapyId:t.id,date,fascia:'mattina',scheduledTime:'08:30',requestId:randomUUID(),expectedStato:'da_erogare',...extra});
async function context(name){const directory=resolve(out,name);mkdirSync(directory,{recursive:true});const ctx=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:resolve(directory,'video')}});await installVerifiedFonts(ctx,directory);await ctx.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await ctx.newPage();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.url().startsWith(backend)&&r.status()>=400)errors.push(`${new URL(r.url()).pathname}:${r.status()}`);});return{ctx,page,errors,directory,video:page.video()};}
async function close(run,clean=true){await run.ctx.tracing.stop({path:resolve(run.directory,'trace.zip')});await run.ctx.close();await redactSyntheticTrace(resolve(run.directory,'trace.zip'));copyFileSync(await run.video.path(),resolve(run.directory,'flow.webm'));writeFileSync(resolve(run.directory,'browser-errors.json'),JSON.stringify(run.errors));if(clean)assert.deepEqual(run.errors,[]);}
async function login(page,name){await page.goto(frontend+'/');await page.getByRole('button',{name}).click();await page.locator('.app-shell').waitFor();await verifyLoadedFonts(page);}
async function verifyPanel(page,name){const p=page.getByRole('region',{name:`Terapie da verificare ${date}`});await p.getByText('QA independent missing',{exact:true}).waitFor();assert.equal(await p.getByRole('button').count(),0);assert.ok((await p.innerText()).includes(`Da verificare · ${globalVerificationCount}`));for(const t of ambiguous)await p.getByText(t.farmacoNome,{exact:true}).waitFor();await page.screenshot({path:resolve(active.directory,name+'.png'),fullPage:true});}
async function captureMissingAgenda(page,name){await page.getByRole('group',{name:'Visualizzazione agenda'}).waitFor();await page.getByText('Caricamento agenda…',{exact:true}).waitFor({state:'detached'});assert.equal(await page.getByRole('region',{name:`Terapie da verificare ${date}`}).count(),0);assert.equal(await page.getByText('QA independent missing',{exact:true}).count(),0);await page.screenshot({path:resolve(active.directory,name+'.png'),fullPage:true});writeFileSync(resolve(active.directory,name+'-dom.txt'),await page.locator('body').innerText());results.push({name,pass:false,expectedVerificationPrescriptions:5,actualVisibleVerificationPrescriptions:0,apiAndSqlValidated:true,sourceFinding:'App.tsx omits therapySlots props and loads therapy feed only on terapie route'});}
let ambiguous=[];
try{
 const missing=await make('QA independent missing',null,{fasceMattina:true,fasceSera:true});
 const tab=await make('QA independent tab clock','\t08:30');
 const short=await make('QA independent short minutes','8:3');
 const band=await make('QA independent wrong band','08:30');
 const duplicate=await make('QA independent duplicate schedule','08:30');
 for(const [t,schedules] of [[missing,[{time:'08:30',fascia:'mattina'}]],[band,[{time:'08:30',fascia:'sera'}]],[duplicate,[{time:'08:30',fascia:'mattina'},{time:'8:30',fascia:'mattina'}]]])await prisma.therapySchedule.createMany({data:schedules.map(s=>({therapyId:t.id,...s,quantityNumerator:1,quantityDenominator:1,administrationUnit:'compressa'}))});
 ambiguous=[missing,tab,short,band,duplicate];
 const normal=await make('QA independent padded clock',' 8:30 ');await prisma.therapySchedule.create({data:{therapyId:normal.id,time:'8:30',fascia:'mattina',quantityNumerator:1,quantityDenominator:1,administrationUnit:'compressa'}});
 const access={patientIds:[patient.id],registeredById:'SIM-DOCTOR-1'};
 const feed=await buildTherapySlots(date,access);const verification=feed.find(g=>g.kind==='verification');assert.equal(verification.summary.total,5);assert.equal(verification.patients[0].items.length,5);assert.ok(verification.patients[0].items.every(i=>i.dosage===null&&i.quantityLabel===null&&i.scheduledTime===null&&!i.canAdminister));
 const scheduled=feed.filter(g=>g.kind!=='verification').flatMap(g=>g.patients.flatMap(p=>p.administrations));assert.equal(scheduled.filter(a=>a.therapyId===normal.id).length,1);assert.equal(scheduled.find(a=>a.therapyId===normal.id).scheduledTime,'08:30');
 let cursor,seen=new Set(),firstTotal,pages=0;do{const page=await buildTherapySlotPage(date,access,{limit:1,...(cursor?{cursor}:{})},{id:'SIM-NURSE-1',role:'operatore'});const v=page.slots.find(g=>g.kind==='verification');if(pages===0)firstTotal=v?.summary.total;for(const p of v?.patients??[])for(const i of p.items){assert.ok(!seen.has(i.therapyId));seen.add(i.therapyId);}cursor=page.pageInfo.nextCursor;pages++;assert.ok(pages<=10);}while(cursor);assert.equal(firstTotal,5);assert.equal(seen.size,5);
 const due=await findTherapiesDue(date,access,new Date(),60,2);assert.equal(due.toVerifyCount,5);assert.equal(due.toVerify.length,2);assert.equal(due.truncated,true);
 for(const a of [{patientIds:[]},{patientIds:[patient.id],registeredById:'SIM-NURSE-1'}]){assert.deepEqual(await buildTherapySlots(date,a),[]);assert.equal((await findTherapiesDue(date,a,new Date(),60)).toVerifyCount,0);}
 for(const t of ambiguous)for(const endpoint of ['confirm','not-administered'])assert.equal((await post(endpoint,input(t,{motivo:'rifiuto'}))).status,409);
 assert.equal(await prisma.medicationAdministration.count({where:{therapyId:{in:ambiguous.map(t=>t.id)}}}),0);
 results.push({name:'independent-invalid-clock-band-duplicates-exact-summary-pagination-sample-acl',pass:true,verification:5,pages,deniedWrites:10,normalized:'08:30'});
 const correction=await make('QA independent concurrency','08:30');
 assert.equal((await post('confirm',input(correction,{expectedStato:'non_erogata'}))).status,409);
 const r=await post('not-administered',input(correction,{motivo:'rifiuto'}));assert.equal(r.status,200);const refused=await r.json();
 assert.equal((await post('confirm',input(correction))).status,409);
 assert.equal((await post('confirm',input(correction,{expectedStato:'non_erogata'}),'SIM-OSS-1')).status,403);
 const a=input(correction,{expectedStato:'non_erogata'}),b=input(correction,{expectedStato:'non_erogata'});
 const concurrent=await Promise.all([post('confirm',a),post('confirm',b)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 const winner=concurrent[0].status===200?a:b;const record=await concurrent.find(r=>r.status===200).json();assert.equal(record.id,refused.id);assert.equal(record.stato,'erogata');
 const replay=await post('confirm',winner);assert.equal(replay.status,200);assert.equal(replay.headers.get('Idempotent-Replayed'),'true');assert.equal(await prisma.medicationAdministration.count({where:{therapyId:correction.id}}),1);assert.equal(await prisma.therapyAdministrationReceipt.count({where:{actorId:'SIM-NURSE-1',requestId:{in:[a.requestId,b.requestId]}}}),1);
 assert.equal((await post('confirm',{...winner,note:'different request content'})).status,409);
 results.push({name:'independent-two-key-concurrent-refusal-correction-role-denial-replay',pass:true,statuses:[200,409],clinicalRecords:1,receipts:1});
 const globalFeedResponse=await fetch(`${backend}/therapy-slots?date=${date}`,{headers:headers()});assert.equal(globalFeedResponse.status,200);globalVerificationCount=(await globalFeedResponse.json()).find(g=>g.kind==='verification').summary.total;assert.ok(globalVerificationCount>=5);
 browser=await chromium.launch({executablePath:'/usr/bin/chromium'});active=await context('operator-week-agenda');await login(active.page,/^Infermiere 1/);
 await active.page.goto(frontend+'/#/terapie');await active.page.getByRole('button',{name:'Calendario',exact:true}).click();await verifyPanel(active.page,'week-verification');
 await active.page.reload();await login(active.page,/^Infermiere 1/);await active.page.goto(frontend+'/#/terapie');await active.page.getByRole('button',{name:'Calendario',exact:true}).click();await verifyPanel(active.page,'week-verification-after-reload');
 await active.page.goto(frontend+'/#/agenda-operatore');await captureMissingAgenda(active.page,'operator-agenda-verification-omitted');
 await active.page.reload();await login(active.page,/^Infermiere 1/);await active.page.goto(frontend+'/#/agenda-operatore');await captureMissingAgenda(active.page,'operator-agenda-omitted-after-reload');results.push({name:'independent-week-readonly-reload',pass:true});await close(active);active=undefined;
 active=await context('admin-agenda');await login(active.page,/^Supervisore 1/);await active.page.goto(frontend+'/#/agenda-admin');await captureMissingAgenda(active.page,'admin-agenda-verification-omitted');await active.page.reload();await login(active.page,/^Supervisore 1/);await active.page.goto(frontend+'/#/agenda-admin');await captureMissingAgenda(active.page,'admin-agenda-omitted-after-reload');await close(active);active=undefined;

 active=await context('scheduled-drug-component');await login(active.page,/^Infermiere 1/);
 const moduleUrls=await active.page.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name));
 const reactUrl=moduleUrls.find(u=>/\/react\.js\?/.test(u));const reactDomUrl=moduleUrls.find(u=>/\/react-dom_client\.js\?/.test(u));assert.ok(reactUrl&&reactDomUrl);
 await active.page.route(frontend+'/independent-drug-component',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><link rel="stylesheet" href="/src/App.css"></head><body><h1>Independent QA: actual scheduled drug component</h1><p>Synthetic prescription; real API and component, no API interception.</p><main id="qa-root"></main></body></html>'}));
 const renderDrug=async()=>{await active.page.goto(frontend+'/independent-drug-component');await active.page.evaluate(async({reactUrl,reactDomUrl,therapy,patientId,backend,date})=>{
  const React=await import(reactUrl);const {createRoot}=await import(reactDomUrl);const {TherapyDrugDosePanel}=await import('/src/components/operator/cartella/TherapyDrugDosePanel.tsx');const {setCurrentOperator}=await import('/src/lib/operatorSession.ts');const {setSessionCapabilities}=await import('/src/lib/capabilities.ts');
  const r=await fetch(backend+'/auth/simulator/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identityId:'SIM-NURSE-1'})});if(r.status!==201)throw Error('QA simulator login failed');const session=await r.json();setCurrentOperator({id:'SIM-NURSE-1',role:'operatore',accessToken:session.token});const me=await fetch(backend+'/auth/me',{headers:{Authorization:'Bearer '+session.token}});if(!me.ok)throw Error('QA capability lookup failed');const user=await me.json();setSessionCapabilities(user.capabilities??null);createRoot(document.getElementById('qa-root')).render(React.createElement(TherapyDrugDosePanel,{patientId,therapy,date}));
 },{reactUrl,reactDomUrl,therapy:missing,patientId:patient.id,backend,date});const panel=active.page.getByTestId('drug-dose-panel');await panel.getByText('QA independent missing',{exact:true}).waitFor();await panel.getByText('Nessuna dose programmata per questo giorno.',{exact:true}).waitFor();assert.equal(await panel.getByRole('button').count(),0);assert.match(await panel.innerText(),/Da verificare · 1/);assert.doesNotMatch(await panel.innerText(),/08:30|10 mg/);};
 await renderDrug();await active.page.screenshot({path:resolve(active.directory,'scheduled-drug-readonly.png'),fullPage:true});await active.page.reload();await renderDrug();await active.page.screenshot({path:resolve(active.directory,'scheduled-drug-after-reload.png'),fullPage:true});results.push({name:'independent-actual-scheduled-drug-component-real-api-readonly-reload',pass:true,qaOnlyHtml:true,apiInterception:false});await close(active);active=undefined;
 writeFileSync(resolve(out,'results.json'),JSON.stringify({results},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}catch(error){writeFileSync(resolve(out,'failure.json'),JSON.stringify({error:error.message,stack:error.stack,results},null,2));if(active){await active.page.screenshot({path:resolve(active.directory,'failure.png'),fullPage:true}).catch(()=>{});writeFileSync(resolve(active.directory,'failure-dom.txt'),await active.page.locator('body').innerText().catch(()=>''));}throw error;
}finally{try{if(active)await close(active,false);if(browser)await browser.close();}finally{await prisma.therapyAdministrationReceipt.deleteMany({where:{patientId:patient.id}});await prisma.patient.delete({where:{id:patient.id}});await prisma.$disconnect();}}
