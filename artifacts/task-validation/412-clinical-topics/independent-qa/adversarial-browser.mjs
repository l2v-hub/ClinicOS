import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { chromium, expect } = createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const out = resolve(process.argv[2] || 'artifacts/task-validation/412-clinical-topics/root-initial/browser');
for (const dir of ['screenshots','test-results','video','playwright-report']) mkdirSync(`${out}/${dir}`,{recursive:true});
const browser = await chromium.launch({headless:true}), contexts=[], states=[], outcomes=[];
const patient={id:'QA-PATIENT-412',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',codiceFiscale:null,medicalRecordNumber:'QA-412',location:{status:'unassigned',room:null,bed:null,source:null}};
const identity={id:'QA-NURSE-412',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const topicTitles={ALLERGIES:'Allergie',DIAGNOSIS:'Diagnosi',ANAMNESIS:'Anamnesi',HOSPITAL_COURSE:'Decorso ospedaliero',CONSULTATIONS:'Consulenze',IMAGING_DIAGNOSTICS:'Diagnostica per immagini',PROCEDURES_AND_INTERVENTIONS:'Prestazioni e interventi',THERAPY:'Terapia',ADVICE_AND_FOLLOW_UP:'Consigli e controlli',UNMAPPED_CONTENT:'Contenuto non classificato'};
function narratives(empty=false, conflict=false) {
  return Object.entries(topicTitles).map(([sectionKey,title])=>({sectionKey,title,originalText:empty?'NON PRESENTE NEL DOCUMENTO':sectionKey==='DIAGNOSIS'?'Diagnosi sorgente sintetica':sectionKey==='ALLERGIES'?'Nessuna allergia nota':sectionKey==='ANAMNESIS'?'Anamnesi sorgente sintetica':'',reviewedText:'',displayText:'',annotations:[],sourceReferences:sectionKey==='DIAGNOSIS'?[{},{fileName:'fonte-sintetica-412.txt',pageFrom:2,pageTo:3}]:[],reviewStatus:conflict&&sectionKey==='ALLERGIES'?'conflict':empty||!['DIAGNOSIS','ALLERGIES','ANAMNESIS'].includes(sectionKey)?'absent':'pending'}));
}
async function makeContext({empty=false,conflict=false,failRead=false,holdRead=false,mobile=false,doctor=false}={}) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},recordVideo:{dir:`${out}/video`}}); contexts.push(context);
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const state={empty,conflict,failRead,holdRead,mobile,doctor,held:false,sections:narratives(empty,conflict),requests:[],domainWrites:[],unexpected:[],external:[],errors:[],pageErrors:[],httpErrors:[],failSave:false,saveAttempts:0}; states.push(state);
  const current={pazienteId:patient.id,statoRicovero:'ambulatoriale',diagnosi:[{id:'QA-DIAG-412',descrizione:'Diagnosi corrente sintetica',stato:'attiva',tipo:'principale',dataInsorgenza:'2026-10-09',createdAt:'2026-10-09',operatore:'Operatore sintetico'}],allergieStatus:'unknown',allergie:[],anamnesi:{patologicaRemota:empty?'':'Storia corrente sintetica',note:''}};
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
    if(!['127.0.0.1','localhost'].includes(url.hostname)){state.external.push(url.origin);return route.abort();}
    if(url.port!=='3001')return route.continue();
    state.requests.push({method:req.method(),path});
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
    if(path==='/auth/simulator/identities')return json({identities:[{...identity,...doctor?{id:'QA-DOCTOR-412',name:'Medico Sintetico',appRole:'doctor',roleLabel:'Medico'}:{}}]});
    if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic412-not-a-secret'});
    if(path==='/auth/me') {
      const capabilities=Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','clinical_record.update','diary.list','parameters.list_readings','narrative.list','narrative.update','documents.list'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]));
      capabilities['intake.create_draft']={allowed:false,effect:'DENIED'};
      return json({...identity,...doctor?{id:'QA-DOCTOR-412',name:'Medico Sintetico',appRole:'doctor',roleLabel:'Medico'}:{},role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities});
    }
    if(req.method()==='PUT'&&path===`/patients/${patient.id}/narrative-sections/DIAGNOSIS`) {
      state.saveAttempts++;
      if(state.failSave)return json({error:'Synthetic save unavailable'},503);
      const dto=state.sections.find(s=>s.sectionKey==='DIAGNOSIS');
      dto.reviewedText=req.postDataJSON().reviewedText; dto.displayText=dto.reviewedText; dto.reviewStatus='modified';
      return json(dto);
    }
    if(req.method()!=='GET'){state.domainWrites.push({method:req.method(),path});return json({error:'Unexpected domain write'},500);}
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
  await ctx.page.goto('http://127.0.0.1:7475/#/operator-dashboard');
  await ctx.page.getByRole('button',{name:ctx.state.doctor?/Medico Sintetico/:/Infermiere Sintetico/}).click();
  await expect(ctx.page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
  if(ctx.state.mobile)await ctx.page.getByRole('button',{name:'Apri menu'}).click();
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
try {
  const ctx=await makeContext();await openChart(ctx);
  await check('Independent aliases diagnosi and sezioni-narrative retain one three-topic composition and allergy anchor',async()=>{
    for(const alias of ['sezioni-narrative','diagnosi']) {
      await ctx.page.evaluate(alias=>{location.hash=`#/dettaglio-paziente/QA-PATIENT-412/${alias}?an=allergie`;},alias);
      for(const key of ['DIAGNOSIS','ALLERGIES','ANAMNESIS'])await expect(topic(ctx.page,key)).toHaveCount(1);
      await expect(topic(ctx.page,'ALLERGIES').locator('[data-chart-anchor="allergie"]')).toBeVisible();
      await expect(topic(ctx.page,'DIAGNOSIS').getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();
    }
  });
  await check('AC1 single entry each; current clinical data visible, three source details initially closed',async()=>{
    for(const key of ['DIAGNOSIS','ALLERGIES','ANAMNESIS']){
      await expect(topic(ctx.page,key)).toHaveCount(1);await expect(topic(ctx.page,key).locator('.cts').first()).toBeVisible();
      await expect(source(ctx.page,key)).not.toHaveAttribute('open','');
    }
    await expect(topic(ctx.page,'DIAGNOSIS')).toContainText('Dati correnti registrati — Diagnosi');
    await expect(topic(ctx.page,'ANAMNESIS').getByText('Storia corrente sintetica',{exact:true})).toBeVisible();
    await ctx.page.screenshot({path:`${out}/screenshots/current-with-compact-sources.png`,fullPage:true});
  });
  await check('AC2/3 source provenance, genuine clinical negative stays source, no structured adoption',async()=>{
    await source(ctx.page,'ALLERGIES').locator('summary').click();
    await expect(source(ctx.page,'ALLERGIES').getByText('Nessuna allergia nota',{exact:true})).toBeVisible();
    await expect(topic(ctx.page,'ALLERGIES').getByText('Dati correnti registrati — Allergie',{exact:true})).toBeVisible();
    expect(ctx.current.allergieStatus).toBe('unknown');expect(ctx.current.allergie).toEqual([]);
    await source(ctx.page,'DIAGNOSIS').locator('summary').click();
    await expect(source(ctx.page,'DIAGNOSIS')).toContainText('fonte-sintetica-412.txt');await expect(source(ctx.page,'DIAGNOSIS')).toContainText('pagina 2–3');
    await expect(source(ctx.page,'DIAGNOSIS').getByText('Diagnosi sorgente sintetica',{exact:true})).toBeVisible();
    await source(ctx.page,'DIAGNOSIS').getByRole('button',{name:'Confronta con il documento'}).click();
    await expect(ctx.page.getByRole('dialog',{name:'Fonte originale'})).toContainText('Diagnosi sorgente sintetica');
    await ctx.page.getByRole('dialog',{name:'Fonte originale'}).getByRole('button',{name:'Chiudi',exact:true}).click();
  });
  await check('AC2 reviewed save failure retains draft, retry+reload preserve immutable original and current',async()=>{
    await source(ctx.page,'DIAGNOSIS').getByRole('button',{name:'Modifica',exact:true}).click();
    await source(ctx.page,'DIAGNOSIS').locator('textarea').fill('Revisione narrativa sintetica');ctx.state.failSave=true;
    await source(ctx.page,'DIAGNOSIS').getByRole('button',{name:'Salva',exact:true}).click();
    await expect(ctx.page.getByRole('alert').filter({hasText:/Salvataggio/})).toBeVisible();
    await expect(source(ctx.page,'DIAGNOSIS').locator('textarea')).toHaveValue('Revisione narrativa sintetica');ctx.state.failSave=false;
    await source(ctx.page,'DIAGNOSIS').getByRole('button',{name:'Salva',exact:true}).click();
    await expect(source(ctx.page,'DIAGNOSIS').locator('textarea')).toHaveCount(0);
    // Development simulator sessions are intentionally memory-only: authenticate again
    // after a real reload, retaining the simulated server's saved narrative state.
    await ctx.page.reload();await openChart(ctx);
    await source(ctx.page,'DIAGNOSIS').locator('summary').click();
    await expect(source(ctx.page,'DIAGNOSIS')).toContainText('Testo importato originale');
    await expect(source(ctx.page,'DIAGNOSIS')).toContainText('Diagnosi sorgente sintetica');
    await expect(source(ctx.page,'DIAGNOSIS')).toContainText('Revisione narrativa sintetica');
    expect(ctx.state.sections.find(s=>s.sectionKey==='DIAGNOSIS').originalText).toBe('Diagnosi sorgente sintetica');
    await expect(topic(ctx.page,'DIAGNOSIS').getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();
    await ctx.page.screenshot({path:`${out}/screenshots/reviewed-original-current-distinct.png`,fullPage:true});
  });await finish(ctx,'mixed');
  const empty=await makeContext({empty:true,conflict:true});await openChart(empty);
  await check('AC3/4 document absences compact; unknown allergy not negative, conflict visible while source closed',async()=>{
    await expect(empty.page.getByTestId('document-absences')).not.toHaveAttribute('open','');
    await expect(empty.page.getByTestId('document-absences').locator('summary')).toContainText('7 argomenti');
    await expect(source(empty.page,'ALLERGIES').locator('summary')).toContainText('Conflitto da risolvere');
    await expect(source(empty.page,'ALLERGIES')).not.toHaveAttribute('open','');
    await expect(topic(empty.page,'ANAMNESIS').locator('.clinical-card:not(.clinical-card--collapsed)')).toHaveCount(0);
    expect(empty.current.allergieStatus).toBe('unknown');
    await empty.page.screenshot({path:`${out}/screenshots/compact-document-absence-visible-conflict.png`,fullPage:true});
    await empty.page.getByTestId('document-absences').locator('summary').click();
    await expect(empty.page.getByTestId('document-absences')).toContainText('non significa assente nel paziente');
    await empty.page.getByTestId('document-absences').locator('summary').click();
    await empty.page.getByTestId('document-absences').scrollIntoViewIfNeeded();
    await expect(empty.page.getByTestId('document-absences').locator('summary')).toBeInViewport();
    await expect(empty.page.getByTestId('document-absences')).not.toHaveAttribute('open','');
    await empty.page.screenshot({path:`${out}/screenshots/desktop-compact-seven-absences.png`});
  });await finish(empty,'empty-conflict');
  const failed=await makeContext({failRead:true});await openChart(failed);
  await check('AC3 source error keeps current editors, retry recovers without false document absence',async()=>{
    await expect(failed.page.getByRole('alert').filter({hasText:/Impossibile caricare le sezioni/})).toBeVisible();
    await expect(topic(failed.page,'DIAGNOSIS').getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();
    await expect(failed.page.getByTestId('document-absences')).toHaveCount(0);
    const history=topic(failed.page,'ANAMNESIS').getByRole('region',{name:'Patologie note e interventi pregressi'});
    await history.getByRole('button',{name:'Modifica',exact:true}).click();
    await history.locator('textarea').fill('Bozza corrente indipendente non salvata');
    failed.state.failRead=false;await failed.page.getByRole('alert').getByRole('button',{name:'Riprova'}).click();
    await expect(source(failed.page,'DIAGNOSIS')).toBeVisible();
    await expect(history.locator('textarea')).toHaveValue('Bozza corrente indipendente non salvata');
    expect(failed.current.anamnesi.patologicaRemota).toBe('Storia corrente sintetica');
    await failed.page.screenshot({path:`${out}/screenshots/current-draft-after-source-retry.png`,fullPage:true});
  });await finish(failed,'source-error');
  const held=await makeContext({holdRead:true});await openChart(held);
  await check('AC1/3 source loading keeps current structured values and no absence inference',async()=>{
    await expect.poll(()=>held.state.held).toBe(true);await expect(held.page.getByRole('status').filter({hasText:/Caricamento testo sorgente/})).toBeVisible();
    await expect(topic(held.page,'DIAGNOSIS').getByText('Diagnosi corrente sintetica',{exact:true})).toBeVisible();
    await expect(held.page.getByTestId('document-absences')).toHaveCount(0);held.state.release();
    await expect(source(held.page,'DIAGNOSIS')).toBeVisible();
  });await finish(held,'loading-source');
  const extra=await makeContext();
  extra.state.sections.push({sectionKey:'UNKNOWN_FUTURE_TOPIC',title:'Argomento futuro sintetico',originalText:'Contenuto extra preservato <img src=x onerror="window.qaUnsafe=true">',reviewedText:'',displayText:'',annotations:[],sourceReferences:[],reviewStatus:'pending'});
  extra.state.sections.find(s=>s.sectionKey==='HOSPITAL_COURSE').reviewStatus='conflict';
  await openChart(extra);
  await check('Independent unsupported meaningful topic and empty standalone conflict preserved, source markup escaped',async()=>{
    await expect(extra.page.getByTestId('narr-UNKNOWN_FUTURE_TOPIC')).toBeVisible();
    await expect(extra.page.getByTestId('narr-UNKNOWN_FUTURE_TOPIC')).toContainText('Contenuto extra preservato <img src=x onerror="window.qaUnsafe=true">');
    await expect(extra.page.getByTestId('narr-UNKNOWN_FUTURE_TOPIC').locator('img')).toHaveCount(0);
    expect(await extra.page.evaluate(()=>window.qaUnsafe)).toBeUndefined();
    await expect(extra.page.getByTestId('narr-HOSPITAL_COURSE')).toContainText('Conflitto da risolvere');
    await expect(extra.page.getByTestId('document-absences').locator('summary')).toContainText('6 argomenti');
    await extra.page.screenshot({path:`${out}/screenshots/unsupported-source-and-conflict.png`,fullPage:true});
  });await finish(extra,'extra-conflict');
  const mobile=await makeContext({mobile:true,doctor:true});await openChart(mobile);
  await check('AC1/2 mobile physician source detail keyboard-accessible, no horizontal overflow',async()=>{
    const summary=source(mobile.page,'DIAGNOSIS').locator('summary');await summary.focus();await expect(summary).toBeFocused();await summary.press('Enter');
    await expect(source(mobile.page,'DIAGNOSIS').getByText('Diagnosi sorgente sintetica',{exact:true})).toBeVisible();
    expect(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await mobile.page.screenshot({path:`${out}/screenshots/mobile-current-source.png`,fullPage:true});
  });await finish(mobile,'mobile-physician');
  writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify({outcomes,states,actualSurface:'Actual source SPA, fully intercepted synthetic API, no production requests or patient writes. Only existing narrative PUT simulated in memory for save/reload assertions; original and structured data unchanged.'},null,2));
  writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><title>412 source-bound browser assertions</title><h1>Issue412</h1><p>Only synthetic fixtures, guarded local transport.</p><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
}catch(error){
  for(const [i,context]of contexts.entries()){const page=context.pages()[0];if(page)await page.screenshot({path:`${out}/screenshots/failure-${i}.png`}).catch(()=>{});}
  writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:error.message,outcomes,states},null,2));throw error;
}finally{for(const context of contexts)await context.close().catch(()=>{});await browser.close();}
