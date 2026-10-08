import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { chromium } = createRequire('C:/w-insulin-qa/package.json')('playwright');
const out = resolve('artifacts/task-validation/intake-minimum-identity-20261008/postcommit');
for (const d of ['screenshots','test-results','playwright-report','video']) mkdirSync(`${out}/${d}`,{recursive:true});
const identity = { firstName:'Mario', lastName:'Rossi', dateOfBirth:'1980-01-01', codiceFiscale:'RSSMRA80A01H501U', codiceFiscaleOrigine:'manual' };
const row = { farmacoNome:'Farmaco sintetico', forma:'CPR', dosaggio:'20 MG', viaSomministrazione:'OS', quantita:'1/2 Cpr', orari:['08:00'], giorni:[], dataInizio:'2026-09-15', classe:'', note:'', originalText:'Fixture sintetica', stato:'ok' };
const checks=[]; const errors=[]; const http=[];
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1150,height:1004},recordVideo:{dir:`${out}/video`,size:{width:1150,height:1004}}});
await context.tracing.start({screenshots:true,snapshots:true,sources:true});
const page=await context.newPage();
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)http.push(`${r.status()} ${new URL(r.url()).pathname}`)});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
let draft; let payload; let patches;
await page.route('http://localhost:3001/**',async route=>{
  const req=route.request(); const path=new URL(req.url()).pathname;
  if(path==='/intake/drafts/qa-minimum' && req.method()==='GET') return route.fulfill({json:draft});
  if(path==='/intake/drafts/qa-minimum' && req.method()==='PATCH') {
    const body=req.postDataJSON(); delete body.expectedDraftVersion;
    patches++; draft={...draft,version:draft.version+1,data:{...draft.data,...body}};
    return route.fulfill({json:draft});
  }
  if(path==='/intake/drafts/qa-minimum/confirm') { payload=req.postDataJSON(); return route.fulfill({json:{status:'created',patient:{id:'qa-created-patient'}}}); }
  if(path.includes('farmaci') || path.includes('drugs')) return route.fulfill({json:[]});
  throw new Error(`Unexpected synthetic endpoint: ${req.method()} ${path}`);
});
async function load(data,width=1150){draft={id:'qa-minimum',status:'draft',version:1,data:structuredClone(data)}; payload=null; patches=0; await page.setViewportSize({width,height:1004}); await page.goto('http://127.0.0.1:5184/artifacts/task-validation/intake-minimum-identity-20261008/qa-surface.html'); await page.getByTestId('intake-section-anagrafica').waitFor();}
const create=()=>page.getByTestId('patient-intake-footer').getByRole('button',{name:'Crea paziente',exact:true});
async function check(name,run){await run();checks.push({name,outcome:'PASS'});console.log(`PASS ${name}`)}
try {
 await load({});
 await check('Exactly four identity controls required; optional controls not required',async()=>{
   for(const field of ['firstName','lastName','dateOfBirth','codiceFiscale']) assert.equal(await page.locator(`[data-demographic-field="${field}"]`).getAttribute('aria-required'),'true');
   assert.equal(await page.getByTestId('intake-section-anagrafica').locator('[aria-required="true"]').count(),4);
   assert.equal(await page.getByLabel('Telefono',{exact:true}).getAttribute('aria-required'),null);
   assert.equal(await create().isDisabled(),true);
 });
 for(const field of ['firstName','lastName','dateOfBirth','codiceFiscale']) await check(`Missing ${field} independently blocks creation despite legacy acceptance`,async()=>{await load({anagrafica:{...identity,[field]:''},_accepted:{demographics:true,therapy:true}});assert.equal(await create().isDisabled(),true);assert.match(await page.getByTestId('intake-missing').innerText(),/Mancano 1 passaggio/)});
 await load({anagrafica:identity});
 await check('Four fields alone enable creation and summary without optional clinical input',async()=>{
   assert.equal(await create().isEnabled(),true);
   assert.equal(await page.getByTestId('intake-missing').innerText(),'Pronto per la creazione');
   assert.equal(await page.getByLabel('Telefono',{exact:true}).inputValue(),'');
   assert.equal(await page.getByLabel('Sesso',{exact:true}).inputValue(),'');
   assert.equal(await page.getByLabel('Comune di nascita',{exact:true}).inputValue(),'');
   assert.equal(await page.getByTestId('accept-demographics').count(),0);
   await page.getByRole('button',{name:/^Riepilogo :/}).click();
   assert.equal(await page.getByTestId('intake-step-5').isVisible(),true);
   assert.match(await page.getByTestId('intake-step-5').innerText(),/Mario/);
   assert.equal(await create().isEnabled(),true);
   await page.screenshot({path:`${out}/screenshots/minimum-identity-ready.png`});
 });
 await check('Creation sends identity without inventing optional values or therapy',async()=>{
   await create().click(); await page.getByTestId('qa-created').filter({hasText:'qa-created-patient'}).waitFor();
   assert.equal(payload.patient.firstName,'Mario');assert.equal(payload.patient.lastName,'Rossi');assert.equal(payload.patient.codiceFiscale,identity.codiceFiscale);assert.equal(payload.patient.dateOfBirth,'1980-01-01');assert.equal(payload.patient.phone,null);assert.equal(payload.therapies,undefined);assert.ok(patches>0);
 });
 await load({anagrafica:{...identity,phone:'invalid'}});
 await check('Invalid supplied optional phone still blocks',async()=>{assert.equal(await create().isDisabled(),true);await page.getByTestId('intake-missing').locator('summary').click();assert.match(await page.getByTestId('intake-missing').innerText(),/telefono/i)});
 await load({anagrafica:identity});
 await page.getByLabel('Telefono',{exact:true}).fill('+39 333 100 9999');
 await page.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');
 await page.getByLabel('Indirizzo',{exact:true}).fill('Via sintetica 1');
 await check('Optional edits autosave and survive browser reload',async()=>{
   await page.getByTestId('patient-intake-step-summary').filter({hasText:'Bozza salvata alle'}).waitFor();
   assert.equal(draft.data.anagrafica.phone,'+39 333 100 9999');
   await page.reload();await page.getByTestId('intake-section-anagrafica').waitFor();
   assert.equal(await page.getByLabel('Telefono',{exact:true}).inputValue(),'+39 333 100 9999');assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'synthetic@example.invalid');assert.equal(await page.getByLabel('Indirizzo',{exact:true}).inputValue(),'Via sintetica 1');assert.equal(await create().isEnabled(),true);
   await page.screenshot({path:`${out}/screenshots/optional-values-reloaded.png`});
 });
 await check('Confirmed payload preserves optional values',async()=>{await create().click();await page.getByTestId('qa-created').filter({hasText:'qa-created-patient'}).waitFor();assert.equal(payload.patient.email,'synthetic@example.invalid');assert.equal(payload.patient.address,'Via sintetica 1');assert.equal(payload.patient.phone,'+39 333 100 9999')});
 await load({anagrafica:identity,terapiaImport:[row]});
 await check('Actual valid therapy requires explicit acceptance',async()=>{assert.equal(await create().isDisabled(),true);await page.getByTestId('intake-missing').locator('summary').click();assert.match(await page.getByTestId('intake-missing').innerText(),/Conferma la terapia/);await page.getByTestId('accept-therapy').click();assert.equal(await create().isEnabled(),true)});
 await load({anagrafica:identity,terapiaImport:[{...row,farmacoNome:''}],_accepted:{therapy:true}});
 await check('Invalid actual therapy still blocks after acceptance',async()=>assert.equal(await create().isDisabled(),true));
 await load({anagrafica:identity,_accepted:{therapy:true},_importProposals:[{id:'qa-proposal',status:'pending',row}]});
 await check('Pending therapy import decision blocks creation',async()=>{assert.equal(await create().isDisabled(),true);await page.getByTestId('intake-missing').locator('summary').click();assert.match(await page.getByTestId('intake-missing').innerText(),/Una proposta d'import da decidere/)});
 await load({anagrafica:identity,_fieldProposals:[{id:'qa-field',path:'anagrafica.phone',value:'+39 333 100 8888',current:'',groupIds:[],status:'pending'}]});
 await check('Pending document field proposal blocks creation',async()=>{assert.equal(await create().isDisabled(),true);assert.equal(await page.getByTestId('intake-field-proposals').isVisible(),true)});
 for(const invalid of [{codiceFiscale:'INVALID'},{dateOfBirth:'2999-01-01'}]) await check(`Invalid supplied ${Object.keys(invalid)[0]} blocks creation`,async()=>{await load({anagrafica:{...identity,...invalid}});assert.equal(await create().isDisabled(),true)});
 await load({anagrafica:identity},390);
 await check('Mobile minimum identity flow remains operable without horizontal overflow',async()=>{assert.equal(await create().isEnabled(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:`${out}/screenshots/mobile-minimum-ready.png`})});
 await check('No console, runtime or relevant HTTP errors',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(http,[])});
} catch(e) {checks.push({name:'browser flow',outcome:'FAIL',error:e.message});await page.screenshot({path:`${out}/screenshots/failure.png`});throw e;}
finally {
 writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify({surface:'Current source IntakeWorkspace; synthetic mocked draft transport, not real DB persistence',checks,errors,http},null,2));
 writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><title>Independent intake QA</title><h1>Independent intake QA</h1><p>Current-source React workspace, mocked synthetic draft persistence; no production writes.</p><ul>'+checks.map(x=>`<li>${x.outcome}: ${x.name}</li>`).join('')+'</ul>');
 await context.tracing.stop({path:`${out}/trace.zip`});await context.close();await browser.close();
}
