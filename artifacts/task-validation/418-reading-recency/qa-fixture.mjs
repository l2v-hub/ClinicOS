import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ASSESSMENT_VERSIONS } from '../../../frontend/src/lib/assessments/assessmentTypes.ts';
const { chromium, expect } = createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const out = resolve(process.argv[2] || 'artifacts/task-validation/418-reading-recency/root-initial/browser');
for (const dir of ['screenshots','test-results','video','playwright-report']) mkdirSync(`${out}/${dir}`,{recursive:true});
const browser = await chromium.launch({headless:true}), contexts=[], states=[], outcomes=[];
const patient={id:'QA-PATIENT-414',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',codiceFiscale:null,medicalRecordNumber:'QA-414',location:{status:'unassigned',room:null,bed:null,source:null}};
const identity={id:'QA-NURSE-414',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const topicTitles={ALLERGIES:'Allergie',DIAGNOSIS:'Diagnosi',ANAMNESIS:'Anamnesi',HOSPITAL_COURSE:'Decorso ospedaliero',CONSULTATIONS:'Consulenze',IMAGING_DIAGNOSTICS:'Diagnostica per immagini',PROCEDURES_AND_INTERVENTIONS:'Prestazioni e interventi',THERAPY:'Terapia',ADVICE_AND_FOLLOW_UP:'Consigli e controlli',UNMAPPED_CONTENT:'Contenuto non classificato'};
function narratives(empty=false, conflict=false) {
  return Object.entries(topicTitles).map(([sectionKey,title])=>({sectionKey,title,originalText:empty?'NON PRESENTE NEL DOCUMENTO':sectionKey==='DIAGNOSIS'?'Diagnosi sorgente sintetica':sectionKey==='ALLERGIES'?'Nessuna allergia nota':sectionKey==='ANAMNESIS'?'Anamnesi sorgente sintetica':'',reviewedText:'',displayText:'',annotations:[],sourceReferences:sectionKey==='DIAGNOSIS'?[{},{fileName:'fonte-sintetica-412.txt',pageFrom:2,pageTo:3}]:[],reviewStatus:conflict&&sectionKey==='ALLERGIES'?'conflict':empty||!['DIAGNOSIS','ALLERGIES','ANAMNESIS'].includes(sectionKey)?'absent':'pending'}));
}
async function makeContext({empty=false,conflict=false,failRead=false,holdRead=false,mobile=false,doctor=false,authIdentity=identity,viewport,coarse=false,extraCapabilities=[]}={}) {
  const context=await browser.newContext({viewport:viewport || (mobile?{width:390,height:844}:{width:1150,height:1004}),hasTouch:coarse,isMobile:mobile,recordVideo:{dir:`${out}/video`}}); contexts.push(context);
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const state={actorId:authIdentity.id,empty,conflict,failRead,holdRead,mobile,doctor,held:false,sections:narratives(empty,conflict),requests:[],domainWrites:[],unexpected:[],external:[],errors:[],pageErrors:[],httpErrors:[],failSave:false,saveAttempts:0}; states.push(state);
  const current={pazienteId:patient.id,statoRicovero:'ambulatoriale',diagnosi:[{id:'QA-DIAG-412',descrizione:'Diagnosi corrente sintetica',stato:'attiva',tipo:'principale',dataInsorgenza:'2026-10-09',createdAt:'2026-10-09',operatore:'Operatore sintetico'}],allergieStatus:'unknown',allergie:[],anamnesi:{patologicaRemota:empty?'':'Storia corrente sintetica',note:''}};
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
    if(!['127.0.0.1','localhost'].includes(url.hostname)){state.external.push(url.origin);return route.abort();}
    if(url.port!=='3001')return route.continue();
    state.requests.push({method:req.method(),path});
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(state.apiHandler && await state.apiHandler(req,json))return;
    if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
    if(path==='/auth/simulator/identities')return json({identities:[{...authIdentity,...doctor?{id:'QA-DOCTOR-412',name:'Medico Sintetico',appRole:'doctor',roleLabel:'Medico'}:{}}]});
    if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic414-not-a-secret'});
    if(path==='/auth/simulator/logout'&&req.method()==='POST')return json({ok:true});
    if(path==='/auth/me') {
      const capabilities=Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','clinical_record.update','diary.list','parameters.list_readings','narrative.list','narrative.update','documents.list'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]));
      capabilities['intake.create_draft']={allowed:false,effect:'DENIED'};
      for(const key of ['assessments.catalog','assessments.list','assessments.read','assessments.create_draft','assessments.save_draft','assessments.finalize'])capabilities[key]={allowed:true,effect:'ALLOWED'};
      for(const key of extraCapabilities)capabilities[key]={allowed:true,effect:'ALLOWED'};
      return json({...authIdentity,...doctor?{id:'QA-DOCTOR-412',name:'Medico Sintetico',appRole:'doctor',roleLabel:'Medico'}:{},role:authIdentity.uiShell==='admin'?'admin':'operatore',authMode:'disabled',temporaryDemo:false,capabilities});
    }
    if(req.method()==='PUT'&&path===`/patients/${patient.id}/narrative-sections/DIAGNOSIS`) {
      state.saveAttempts++;
      if(state.failSave)return json({error:'Synthetic save unavailable'},503);
      const dto=state.sections.find(s=>s.sectionKey==='DIAGNOSIS');
      dto.reviewedText=req.postDataJSON().reviewedText; dto.displayText=dto.reviewedText; dto.reviewStatus='modified';
      return json(dto);
    }
    if(state.assessmentHandler && path===`/patients/${patient.id}/assessments` && req.method()==='POST')return state.assessmentHandler(req,json);
    // This POST endpoint is read-only search; all patient mutations remain guarded.
    if(path==='/patients/page/search'&&req.method()==='POST')return json({items:[patient],hasMore:false,nextCursor:null});
    if(req.method()!=='GET'){state.domainWrites.push({method:req.method(),path});return json({error:'Unexpected domain write'},500);}
    if(path===`/patients/${patient.id}/assessments/catalog`)return json({items:['painad','postural_transfers','tinetti','mna','gds15','barthel','ucla_npi_sleep'].map(type=>({type,formVersion:ASSESSMENT_VERSIONS[type],latestFinal:null,latestOwnDraft:null,ownDraftCount:0}))});
    if(path===`/patients/${patient.id}/assessments`)return json({items:[],pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
    if(path===`/patients/${patient.id}/assessments/current`)return json({assessment:null});
    if(path==='/me/roster-order')return json({effective:{criterion:'name',direction:'asc'},source:'system',canEdit:false,canEditDefault:false});
    if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
    if(path==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ambulatoriale',consegneAperte:0,hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0}]);
    if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
    if(path==='/patients/settings')return json({deleteEnabled:false});
    if(path===`/patients/${patient.id}`)return json(patient);
    if(path===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:current});
    if(path===`/patients/${patient.id}/room-options`)return json([]);
    if(path==='/consegne')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,urgentActive:0,urgentTaken:0}});
    if(path===`/patients/${patient.id}/narrative-sections`) {
      if(state.holdRead){state.held=true;await new Promise(resolve=>{state.release=resolve;});state.holdRead=false;state.held=false;}
      return state.failRead?json({error:'Synthetic source unavailable'},503):json({sections:state.sections});
    }
    if(path===`/patients/${patient.id}/therapies/page`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,inactive:0}});
    if(path===`/patients/${patient.id}/diary`)return json({entries:[],hasMore:false,nextCursor:null});
    if(path===`/patients/${patient.id}/documents`)return json({documents:[],sourceMatch:null,pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
    if(path===`/patients/${patient.id}/intake-review`)return json({state:'none',items:[]});
    if(/\/parameter-readings$/.test(path))return json({readings:[],hasMore:false,nextCursor:null});
    if(path==='/patients/diary-unread-count')return json({unreadCount:0});
    if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
    if(['/therapy-slots','/appointments'].includes(path))return json([]);
    if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
    if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
    if(path==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
    state.unexpected.push(`${req.method()} ${path}`);return json({error:'Unexpected guarded API'},500);
  });
  const page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});
  page.on('pageerror',e=>state.pageErrors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
  return {context,page,state,current};
}
async function openChart(ctx) {
  await ctx.page.goto(`${process.env.QA_BASE_URL || 'http://127.0.0.1:7481'}/#/operator-dashboard`);
  await ctx.page.getByRole('button',{name:ctx.state.doctor?/Medico Sintetico/:/Infermiere Sintetico/}).click();
  await expect(ctx.page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
  if(await ctx.page.getByRole('button',{name:'Apri menu'}).isVisible())await ctx.page.getByRole('button',{name:'Apri menu'}).click();
  await ctx.page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();
  await ctx.page.locator('.patient-roster__row,.patient-card').getByRole('button',{name:'Apri cartella di Persona Sintetica',exact:true}).click();
  await expect(ctx.page.locator('.top-nav--chips')).toBeVisible();
  await ctx.page.getByRole('tab',{name:/^Clinica/}).click();
  await expect(topic(ctx.page,'DIAGNOSIS').getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();
}
const topic=(page,key)=>page.locator(`[data-clinical-topic="${key}"]`);
const source=(page,key)=>page.locator(`[data-source-topic="${key}"]`);
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}
async function finish(ctx,name){
  for(const key of ['domainWrites','unexpected','external','pageErrors'])expect(ctx.state[key],key).toEqual([]);
  expect(ctx.state.httpErrors.every(e=>e.status===503&&e.path.includes('/narrative-sections'))).toBe(true);
  expect(ctx.state.errors.filter(e=>!/Failed to load resource.*503/.test(e))).toEqual([]);
  await ctx.context.tracing.stop({path:`${out}/${name}-trace.zip`});const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${name}.webm`);await video.delete();
}
export {browser,makeContext,openChart,check,finish,out,outcomes,states,expect,patient,identity};
