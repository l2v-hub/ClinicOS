import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire('C:/w-insulin-qa/package.json');
const {chromium,expect}=require('playwright/test');
const out=resolve('artifacts/task-validation/402-manual-intake');
for(const dir of ['screenshots','test-results','playwright-report','video'])mkdirSync(`${out}/${dir}`,{recursive:true});
const outcomes=[],contexts=[],states=[],bad=[],expected=[];
const browser=await chromium.launch({headless:true});
const identities=[{id:'QA-NURSE-402',name:'Infermiere Test',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'},
  {id:'QA-OSS-402',name:'OSS Test',roleLabel:'OSS',appRole:'oss',uiShell:'operator'}];
const patient={id:'QA-PATIENT-402',medicalRecordNumber:'QA-402',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',phone:null,email:null};
async function contextFor({role='nurse',empty=false,failDraft=false,failModule=false,mobile=false}={}) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},recordVideo:{dir:`${out}/video`}});
  contexts.push(context); await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const state={role,requests:[],draft:null,openingCalls:0,moduleAborted:false,blockedExternal:[],errors:[],expectedErrors:[],pageErrors:[]};
  states.push(state);
  await context.route('**/*',async route=> {
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
    if(!['localhost','127.0.0.1'].includes(url.hostname)){state.blockedExternal.push(url.origin);return route.abort();}
    if(url.port!=='3001') {
      if(failModule&&!state.moduleAborted&&path.endsWith('/intake/IntakeWorkspace.tsx')){state.moduleAborted=true;return route.abort('failed');}
      return route.continue();
    }
    state.requests.push({method:request.method(),path});
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
    if(path==='/auth/simulator/identities')return json({identities});
    if(path==='/auth/simulator/session')return json({token:'synthetic-session-not-a-secret'});
    if(path==='/auth/me') {
      const identity=identities.find(x=>x.appRole===role);
      const capabilities=Object.fromEntries(['patients.list_page','patients.clinical_summary','patients.clinical_overview','parameters.list_page','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]));
      capabilities['intake.create_draft']={allowed:role==='nurse',effect:role==='nurse'?'ALLOWED':'DENIED'};
      return json({...identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities});
    }
    if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
    if(path==='/patients/page')return json({items:empty?[]:[patient],hasMore:false,nextCursor:null});
    if(path==='/patients/clinical-summary')return json(empty?[]:[{patientId:patient.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:0,rischiAlti:0,allergieGravi:0}]);
    if(path==='/patients/clinical-summary/overview')return json({totalPatients:empty?0:1,critici:0,rischiAlti:0,ricoverati:empty?0:1,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
    if(path==='/patients/settings')return json({deleteEnabled:false});
    if(path==='/ai/extraction/status')return json({available:false,provider:'synthetic',model:'none',errors:[]});
    if(path==='/therapy-slots'||path==='/appointments')return json([]);
    if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
    if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
    if(path==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
    if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
    if(path==='/patients/QA-PATIENT-402/parameter-readings')return json({readings:[],hasMore:false,nextCursor:null});
    if(path==='/intake/drafts'&&request.method()==='POST') {
      state.openingCalls++;
      if(role!=='nurse'){bad.push('Denied role attempted draft creation');return json({error:'Denied'},403);}
      if(failDraft&&state.openingCalls===1){expected.push('Injected draft opening 503');return json({error:'Synthetic opening failure'},503);}
      state.draft={id:'QA-DRAFT-402',version:1,status:'draft',data:{},importJobId:null};return json(state.draft,201);
    }
    if(path==='/intake/drafts/QA-DRAFT-402') {
      if(request.method()==='PATCH'){const {expectedDraftVersion,...patch}=request.postDataJSON();state.draft={...state.draft,data:{...state.draft.data,...patch},version:state.draft.version+1};}
      return json(state.draft);
    }
    bad.push(`Unhandled/forbidden API ${request.method()} ${path}`);return json({error:'Unexpected API guarded'},500);
  });
  const page=await context.newPage();
  page.on('console',msg=>{if(msg.type()!=='error')return;const line=msg.text();
    if((failDraft&&line.includes('503'))||(failModule&&state.moduleAborted&&/Failed to fetch dynamically imported module: .*IntakeWorkspace|Failed to load resource: net::ERR_FAILED/.test(line))){state.expectedErrors.push(line);return;}state.errors.push(line);});
  page.on('pageerror',error=>{if(failModule&&state.moduleAborted&&/Failed to fetch dynamically imported module: .*IntakeWorkspace/.test(error.message)){state.expectedErrors.push(error.message);return;}state.pageErrors.push(error.message);});
  page.on('response',response=>{if(response.status()<400)return;if(failDraft&&response.url().includes('/intake/drafts')&&response.status()===503)return;state.errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);});
  return {context,page,state};
}
async function login(page,role='nurse',route='pazienti') {
  await page.goto(`http://127.0.0.1:5185/#/${route}`);
  await page.getByRole('button',{name:role==='nurse'?/Infermiere Test/:/OSS Test/}).click();
  await expect(page.locator('main')).toBeVisible();
}
async function choose(page) {
  if(page.url().endsWith('/pazienti'))await page.locator('main').getByRole('button',{name:'Nuovo ingresso',exact:true}).click();
  await expect(page.getByRole('region',{name:'Nuovo ingresso',exact:true})).toBeVisible();
  const manual=page.getByRole('button',{name:/A mano/});await manual.focus();await manual.press('Enter');
  return manual;
}
function clean(state){expect(state.errors,'unexpected console/HTTP errors').toEqual([]);expect(state.pageErrors,'unexpected runtime errors').toEqual([]);expect(state.blockedExternal,'external network blocked').toEqual([]);}
function noPatients(state){expect(state.requests.filter(x=>x.path.endsWith('/confirm')||x.method==='POST'&&x.path==='/patients')).toEqual([]);}
async function check(name,run){try{await run();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}catch(error){outcomes.push({name,status:'FAIL',message:error.message});console.log(`FAIL ${name}: ${error.message}`);process.exitCode=1;}}
try {
  const {page,state,context}=await contextFor();await login(page);
  await check('AC1 real App route opens manual form and focuses Name',async()=>{
    await choose(page);await expect(page).toHaveURL(/#\/nuovo-ingresso$/);const dialog=page.getByRole('dialog',{name:/Nuovo ingresso/});await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-demographic-field="firstName"]')).toBeFocused();await expect(dialog.locator('[data-demographic-field="firstName"]')).toHaveValue('');await expect(dialog.getByRole('heading',{name:'Anagrafica',exact:true,level:3})).toBeVisible();
    await page.screenshot({path:`${out}/screenshots/manual-form-name-focused.png`});
  });
  await check('AC4 Tab and Shift Tab contained in manual dialog',async()=>{
    const dialog=page.getByRole('dialog',{name:/Nuovo ingresso/});
    for(let i=0;i<35;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
    for(let i=0;i<35;i++){await page.keyboard.press('Shift+Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
  });
  await check('AC2 Cancel returns method chooser and method focus, no patient created',async()=>{
    await page.getByRole('button',{name:/Annulla ingresso/}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button',{name:/A mano/})).toBeFocused();await expect(page).toHaveURL(/#\/nuovo-ingresso$/);noPatients(state);
    await page.screenshot({path:`${out}/screenshots/cancel-method-focus.png`});
  });
  await check('AC2 Escape returns method chooser and method focus',async()=>{
    await choose(page);await expect(page.locator('[data-demographic-field="firstName"]')).toBeFocused();await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:/A mano/})).toBeFocused();noPatients(state);
  });
  await check('Draft Name persists after actual reload and relogin',async()=>{
    await choose(page);await page.locator('[data-demographic-field="firstName"]').fill('NOME QA');
    await expect.poll(()=>state.draft.data.anagrafica?.firstName).toBe('NOME QA');await page.reload();
    await page.getByRole('button',{name:/Infermiere Test/}).click();await choose(page);
    await expect(page.locator('[data-demographic-field="firstName"]')).toHaveValue('NOME QA');await expect(page.locator('[data-demographic-field="firstName"]')).toBeFocused();
    await page.screenshot({path:`${out}/screenshots/draft-reloaded.png`});await page.keyboard.press('Escape');noPatients(state);
  });
  await check('AC4 Back returns roster and focuses new intake action; count unchanged',async()=>{
    await page.getByRole('button',{name:/Torna ai pazienti/}).click();await expect(page).toHaveURL(/#\/pazienti$/);
    await expect(page.locator('main').getByRole('button',{name:'Nuovo ingresso',exact:true})).toBeFocused();await expect(page.getByText('1 caricati su 1',{exact:true})).toBeVisible();noPatients(state);clean(state);
  });
  await check('AC4 repeated eight Back route-remount cycles restore roster action focus',async()=>{
    for(let round=0;round<8;round++) {
      await page.locator('main').getByRole('button',{name:'Nuovo ingresso',exact:true}).click();
      await expect(page.getByRole('button',{name:/A mano/})).toBeVisible();
      await page.getByRole('button',{name:/Torna ai pazienti/}).click();
      await expect(page).toHaveURL(/#\/pazienti$/);
      await expect(page.locator('main').getByRole('button',{name:'Nuovo ingresso',exact:true})).toBeFocused();
    }noPatients(state);clean(state);await page.screenshot({path:`${out}/screenshots/back-roster-focused.png`});
  });
  await context.tracing.stop({path:`${out}/trace.zip`});await context.close();
  const failure=await contextFor({failDraft:true});await login(failure.page);
  await check('AC3 announced draft opening failure and Riprova opens same route',async()=>{
    await choose(failure.page);const alert=failure.page.getByRole('alert');await expect(alert).toContainText('Impossibile aprire la bozza');
    await expect(alert.getByRole('button',{name:'Riprova',exact:true})).toBeVisible();await failure.page.screenshot({path:`${out}/screenshots/draft-opening-error.png`});
    await alert.getByRole('button',{name:'Riprova',exact:true}).click();await expect(failure.page.locator('[data-demographic-field="firstName"]')).toBeFocused();
    expect(failure.state.openingCalls).toBe(2);await expect(failure.page).toHaveURL(/#\/nuovo-ingresso$/);noPatients(failure.state);clean(failure.state);
  });
  await failure.context.tracing.stop({path:`${out}/draft-failure-trace.zip`});await failure.context.close();
  const lazy=await contextFor({failModule:true});await login(lazy.page);
  await check('AC3 lazy module failure has local alert and retry reload recovery',async()=>{
    await choose(lazy.page);const dialog=lazy.page.getByRole('dialog',{name:'Impossibile aprire il modulo'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('alert')).toContainText('nessun paziente viene creato');
    await expect(dialog.getByRole('button',{name:'Riprova',exact:true})).toBeFocused();await lazy.page.screenshot({path:`${out}/screenshots/lazy-module-error.png`});
    await dialog.getByRole('button',{name:'Riprova',exact:true}).click();await lazy.page.getByRole('button',{name:/Infermiere Test/}).click();await choose(lazy.page);
    await expect(lazy.page.locator('[data-demographic-field="firstName"]')).toBeFocused();noPatients(lazy.state);clean(lazy.state);
  });
  await lazy.context.tracing.stop({path:`${out}/lazy-failure-trace.zip`});await lazy.context.close();
  const lazyCancel=await contextFor({failModule:true});await login(lazyCancel.page);await choose(lazyCancel.page);
  await check('AC3 lazy module failure Cancel returns chosen method focus without draft',async()=>{
    const dialog=lazyCancel.page.getByRole('dialog',{name:'Impossibile aprire il modulo'});await expect(dialog.getByRole('alert')).toContainText('nessun paziente viene creato');
    await dialog.getByRole('button',{name:'Annulla',exact:true}).click();await expect(lazyCancel.page.getByRole('dialog')).toHaveCount(0);
    await expect(lazyCancel.page.getByRole('button',{name:/A mano/})).toBeFocused();expect(lazyCancel.state.openingCalls).toBe(0);noPatients(lazyCancel.state);clean(lazyCancel.state);
  });await lazyCancel.context.tracing.stop({path:`${out}/lazy-cancel-trace.zip`});await lazyCancel.context.close();
  for(const empty of [false,true]) {
    const denied=await contextFor({role:'oss',empty});await login(denied.page,'oss');
    await check(`AC4 denied capability ${empty?'empty':'populated'} roster no intake action or draft`,async()=>{
      await expect(denied.page.locator('main').getByRole('button',{name:'Nuovo ingresso',exact:true})).toHaveCount(0);
      await expect(denied.page.getByRole('button',{name:/Aggiungi primo paziente/})).toHaveCount(0);
      await denied.page.goto('http://127.0.0.1:5185/#/nuovo-ingresso');await denied.page.getByRole('button',{name:/OSS Test/}).click();
      await expect(denied.page.getByRole('button',{name:/A mano/})).toHaveCount(0);expect(denied.state.openingCalls).toBe(0);noPatients(denied.state);clean(denied.state);
      if(empty)await denied.page.screenshot({path:`${out}/screenshots/denied-empty-roster.png`});
    });await denied.context.tracing.stop({path:`${out}/denied-${empty?'empty':'populated'}-trace.zip`});await denied.context.close();
  }
  const mobile=await contextFor({mobile:true});await login(mobile.page);await choose(mobile.page);
  await check('Mobile manual form visible and first Name focus',async()=>{
    await expect(mobile.page.getByRole('dialog',{name:/Nuovo ingresso/})).toBeVisible();await expect(mobile.page.locator('[data-demographic-field="firstName"]')).toBeFocused();await expect(mobile.page.locator('[data-demographic-field="firstName"]')).toBeInViewport();
    const field=mobile.page.locator('[data-demographic-field="firstName"]');
    const box=await field.boundingBox();
    const footerBox=await mobile.page.getByRole('button',{name:'Salva bozza e chiudi',exact:true}).boundingBox();
    expect(box.y+box.height, 'Focused Name must not be covered by mobile fixed actions').toBeLessThan(footerBox.y-35);
    expect(await field.evaluate(element=>{
      const r=element.getBoundingClientRect();
      return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===element;
    }), 'Focused Name center is actually visible and hittable').toBe(true);
    expect(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await mobile.page.screenshot({path:`${out}/screenshots/mobile-manual-form.png`});noPatients(mobile.state);clean(mobile.state);
  });await mobile.context.tracing.stop({path:`${out}/mobile-trace.zip`});await mobile.context.close();
  expect(bad).toEqual([]);
}catch(error){process.exitCode=1;for(const context of contexts){if(context.pages().length)await context.pages()[0].screenshot({path:`${out}/screenshots/failed-${contexts.indexOf(context)}.png`}).catch(()=>{});}}
finally {
  await browser.close();const report={source:'actual frontend App.tsx/index.html, synthetic intercepted localhost API only',outcomes,unexpectedApi:bad,expectedInjected:expected,
    runtime:states.map(({role,openingCalls,moduleAborted,blockedExternal,errors,expectedErrors,pageErrors,requests})=>({role,openingCalls,moduleAborted,blockedExternal,errors,expectedErrors,pageErrors,requests}))};
  writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify(report,null,2));
  writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><html><head><meta charset="utf-8"><title>Issue402 independent browser assertions</title></head><body><h1>Issue402 actual SPA independent QA</h1><p>Synthetic localhost fixtures only. See qa-browser.mjs for executable assertions.</p><pre>${JSON.stringify(report,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></body></html>`);
}
