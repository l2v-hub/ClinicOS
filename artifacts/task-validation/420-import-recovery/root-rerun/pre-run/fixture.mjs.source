import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {chromium,expect:rawExpect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const expect=rawExpect.configure({timeout:20000});
export {expect};
if(!process.env.EV_OUT)throw Error('Distinct immutable-attempt EV_OUT required');
export const out=resolve(process.env.EV_OUT);
for(const dir of ['screenshots','video','trace','test-results','playwright-report'])mkdirSync(`${out}/${dir}`,{recursive:true});
export const browser=await chromium.launch({headless:true});
export const identity={id:'QA-NURSE-420',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
export const patient={id:'QA-PATIENT-420',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',codiceFiscale:null,medicalRecordNumber:'QA-420'};
export const memoryKey='clinicos:import-session:QA-NURSE-420:operatore';
export const newJob=(status='collecting',id='synthetic-session-420')=>({id,status,expiresAt:'2026-10-10T12:00:00Z',totalBytes:0,documents:[],capabilities:{sessionVersion:1,pageEditing:true,atomicReplacement:true},manifest:{version:1,revision:1,groups:[{id:'synthetic-letter',label:'Lettera sintetica',sortOrder:0,status:'pending',pageCount:0,completedPages:0,error:null,pdfUrl:null}],pages:[]},limits:{maxPages:30,maxSourceFiles:30,maxGroups:30,maxTotalBytes:26214400,maxFileBytes:26214400,maxFilesPerRequest:10,maxRequestBytes:26476544,acceptedMimeTypes:['application/pdf','image/jpeg','image/png']},progress:{phase:'documents',totalPages:0,completedPages:0,failedPages:0,totalGroups:1,completedGroups:0,currentPageId:null,currentGroupId:null},review:{manifestRevision:null,resultHash:null,unresolvedConflicts:0,canProceed:false,draftId:null,draftSourceIsCurrent:false}});
const operator={id:identity.id,nome:'Infermiere',cognome:'Sintetico',ruolo:'infermiere',reparto:'Reparto sintetico',stato:'attivo',email:'qa@example.invalid',telefono:'',qualifica:''};
export async function setup({allowed=true,time='2026-10-09T18:00:00Z',appointments=[],mobile=false,session=newJob('expired'),sessionStatus=200,actor=identity}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},timezoneId:'Europe/Rome',recordVideo:{dir:`${out}/video`}});
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const page=await context.newPage(); await page.clock.install({time:new Date(time)});
 const syntheticPng=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=100;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,80,100);x.fillStyle='#2359aa';x.font='16px sans-serif';x.fillText('QA',20,50);return c.toDataURL('image/png').split(',')[1];}),'base64');
 const state={identity:actor,allowed,appointments,session,sessionStatus,created:0,creationKeys:[],expectedHttp:[],expectedConsole:[],requests:[],errors:[],pageErrors:[],httpErrors:[],unexpected:[],external:[],writes:[],expectedNetwork:0};
 await context.addInitScript(({key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,'synthetic-session-420');},{key:memoryKey});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname;
  if(u.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  const api=['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='3001';
  if(!api){if(['127.0.0.1','localhost'].includes(u.hostname)&&u.port===String(process.env.QA_PORT||7503))return route.continue();state.external.push(u.origin);return route.abort();}
  state.requests.push({method:req.method(),path});
  const json=(body,status=200)=>{if(status>=400){state.expectedHttp.push({status,path});state.expectedConsole.push({text:`Failed to load resource: the server responded with a status of ${status} (${status===404?'Not Found':status===503?'Service Unavailable':status===409?'Conflict':status===403?'Forbidden':'Internal Server Error'})`,url:req.url()});}return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});};
  if(path==='/ai/extraction/status')return json({available:true,provider:'synthetic-no-provider',model:'fixture',errors:[]});
  if(path==='/ai/extraction/jobs'&&req.method()==='POST'){const key=req.headers()['idempotency-key'];state.creationKeys.push(key);if(state.delayCreate)await new Promise(r=>setTimeout(r,state.delayCreate));if(!state.created){state.created++;state.session=newJob('collecting','synthetic-new-session-420');state.sessionStatus=200;}if(state.lostCreate){state.lostCreate=false;state.expectedNetwork++;state.expectedConsole.push({text:'Failed to load resource: net::ERR_FAILED',url:req.url()});return route.abort('failed');}return json({job:state.session});}
  if(path.endsWith('/files/synthetic-document/content')&&req.method()==='GET'){if(state.pageMissing)return json({error:'Synthetic missing source'},404);return route.fulfill({status:200,contentType:'image/png',body:syntheticPng});}
  if(path.startsWith('/ai/extraction/jobs/')&&req.method()==='GET'&&!path.endsWith('/result')){if(state.networkFailure){state.networkFailure=false;state.expectedNetwork++;state.expectedConsole.push({text:'Failed to load resource: net::ERR_FAILED',url:req.url()});return route.abort('failed');}return json(state.sessionStatus===200?state.session:{error:'Synthetic unavailable'},state.sessionStatus);}
  if(path.endsWith('/manifest')&&req.method()==='PUT')return json({error:'Synthetic closed session',code:state.mutationCode||'session_closed'},409);
  if(path.endsWith('/result')&&req.method()==='GET')return json({error:'Synthetic missing result'},404);
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[state.identity]});
  if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic420-not-a-secret'});
  if(path==='/auth/simulator/logout'&&req.method()==='POST')return json({ok:true});
  if(path==='/auth/me')return json({...state.identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','diary.list','parameters.list_readings','documents.list','patients.diary_unread_count','intake.create_draft','ai.extraction.status','ai.extraction.import',...state.allowed?['appointments.create']:[]].map(id=>[id,{allowed:true,effect:'ALLOWED'}]))});
  if(path==='/patients/page/search'&&req.method()==='POST')return json({items:[patient],hasMore:false,nextCursor:null});
  if(req.method()!=='GET'){state.writes.push({method:req.method(),path});return json({error:'Unexpected guarded domain write'},500);}
  if(path==='/appointments')return json(state.appointments);
  if(path==='/operators/directory/page')return json({items:[operator],pageInfo:{hasMore:false,nextCursor:null}});
  if(path==='/therapy-slots')return json([]);
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path.endsWith('/parameter-readings'))return json([]);
  if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ambulatoriale',consegneAperte:0,hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0}]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(path==='/me/roster-order')return json({effective:{criterion:'name',direction:'asc'},source:'system',canEdit:false,canEditDefault:false});
  if(path==='/patients/diary-unread-count')return json({unreadCount:0});
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  state.unexpected.push(`${req.method()} ${path}`);return json({error:'Unexpected guarded API'},500);
 });
 page.on('console',m=>{if(m.type()==='error')state.errors.push({text:m.text(),url:m.location().url});});page.on('pageerror',e=>state.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 return {page,context,state};
}
export async function openImport(ctx){
 const base=`http://127.0.0.1:${process.env.QA_PORT||7503}`;
 await ctx.page.goto(`${base}/#/operator-dashboard`);await ctx.page.getByRole('button',{name:ctx.state?.identity.name||'Infermiere Sintetico'}).click();
 await expect(ctx.page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
 if(await ctx.page.getByRole('button',{name:'Apri menu'}).isVisible())await ctx.page.getByRole('button',{name:'Apri menu'}).click();
 await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();await ctx.page.getByRole('button',{name:'Importa lettera di dimissione',exact:true}).click();await expect(ctx.page.getByRole('dialog',{name:'Importa lettere di dimissione'})).toBeVisible();
}
export async function finish(ctx,name){
 writeFileSync(`${out}/test-results/${name}-guard.json`,JSON.stringify(ctx.state,null,2));
 await ctx.context.tracing.stop({path:`${out}/trace/${name}.zip`});await ctx.context.close();
 const sorted=v=>[...v].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));expect(sorted(ctx.state.httpErrors)).toEqual(sorted(ctx.state.expectedHttp));expect(sorted(ctx.state.errors)).toEqual(sorted(ctx.state.expectedConsole));
 for(const key of ['pageErrors','unexpected','external','writes'])expect(ctx.state[key],key).toEqual([]);
 writeFileSync(`${out}/test-results/${name}.json`,JSON.stringify({name,status:'PASS',guard:ctx.state},null,2));
}
export function report(results){
 writeFileSync(`${out}/test-results/results.json`,JSON.stringify({results,productionPatientMutations:0},null,2));
 writeFileSync(`${out}/playwright-report/index.html`, `<!doctype html><meta charset="utf-8"><title>420 independent assertions</title><h1>Fresh independent Playwright-library assertions</h1><p>Guarded synthetic APIs; no production patient writes. Not a native Playwright Test runner report; full original assertion receipts, trace and video retained.</p><pre>${JSON.stringify(results,null,2).replace(/</g,'&lt;')}</pre>`);
}
