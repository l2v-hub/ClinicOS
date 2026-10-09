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
export const identity={id:'QA-NURSE-419',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
export const patient={id:'QA-PATIENT-419',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',codiceFiscale:null,medicalRecordNumber:'QA-419'};
const operator={id:identity.id,nome:'Infermiere',cognome:'Sintetico',ruolo:'infermiere',reparto:'Reparto sintetico',stato:'attivo',email:'qa@example.invalid',telefono:'',qualifica:''};
export async function setup({allowed=true,time='2026-10-09T07:00:00+02:00',appointments=[],mobile=false}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},timezoneId:'Europe/Rome',recordVideo:{dir:`${out}/video`}});
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const page=await context.newPage(); await page.clock.install({time:new Date(time)});
 const state={allowed,appointments,requests:[],errors:[],pageErrors:[],httpErrors:[],unexpected:[],external:[],writes:[]};
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname;
  if(u.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(process.env.QA_ONLINE==='1'&&u.hostname==='clinicos-eosin.vercel.app'&&req.method()==='GET'&&(path==='/'||path.startsWith('/assets/')||path==='/favicon.ico'))return route.continue();
  const api=process.env.QA_ONLINE==='1'?['clinicos-backend-demo.up.railway.app','clinicos-backend-production-df88.up.railway.app'].includes(u.hostname):['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='3001';
  if(!api){if(process.env.QA_ONLINE!=='1'&&['127.0.0.1','localhost'].includes(u.hostname)&&u.port===String(process.env.QA_PORT||7491))return route.continue();state.external.push(u.origin);return route.abort();}
  state.requests.push({method:req.method(),path});
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[identity]});
  if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic419-not-a-secret'});
  if(path==='/auth/simulator/logout'&&req.method()==='POST')return json({ok:true});
  if(path==='/auth/me')return json({...identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','diary.list','parameters.list_readings','documents.list',...state.allowed?['appointments.create']:[]].map(id=>[id,{allowed:true,effect:'ALLOWED'}]))});
  if(path==='/patients/page/search'&&req.method()==='POST')return json({items:[patient],hasMore:false,nextCursor:null});
  if(req.method()!=='GET'){state.writes.push({method:req.method(),path});return json({error:'Unexpected guarded domain write'},500);}
  if(path==='/appointments')return json(state.appointments);
  if(path==='/operators/directory/page')return json({items:[operator],pageInfo:{hasMore:false,nextCursor:null}});
  if(path==='/therapy-slots')return json([]);
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
 page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 return {page,context,state};
}
export async function openAgenda(ctx){
 const base=process.env.QA_ONLINE==='1'?'https://clinicos-eosin.vercel.app':`http://127.0.0.1:${process.env.QA_PORT||7491}`;
 await ctx.page.goto(`${base}/#/operator-dashboard`);await ctx.page.getByRole('button',{name:'Infermiere Sintetico'}).click();
 await expect(ctx.page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
 if(await ctx.page.getByRole('button',{name:'Apri menu'}).isVisible())await ctx.page.getByRole('button',{name:'Apri menu'}).click();
 await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Agenda',exact:true}).click();await expect(ctx.page.locator('.agt-day-card')).toBeVisible();
}
export async function finish(ctx,name){
 writeFileSync(`${out}/test-results/${name}-guard.json`,JSON.stringify(ctx.state,null,2));
 await ctx.context.tracing.stop({path:`${out}/trace/${name}.zip`});await ctx.context.close();
 for(const key of ['errors','pageErrors','httpErrors','unexpected','external','writes'])expect(ctx.state[key],key).toEqual([]);
 writeFileSync(`${out}/test-results/${name}.json`,JSON.stringify({name,status:'PASS',guard:ctx.state},null,2));
}
export function report(results){
 writeFileSync(`${out}/test-results/results.json`,JSON.stringify({results,productionPatientMutations:0},null,2));
 writeFileSync(`${out}/playwright-report/index.html`, `<!doctype html><meta charset="utf-8"><title>419 assertion receipt</title><h1>Actual Playwright-library assertions</h1><p>Guarded synthetic APIs; no production patient writes.</p><pre>${JSON.stringify(results,null,2)}</pre>`);
}
