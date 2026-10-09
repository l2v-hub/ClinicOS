import { writeFileSync } from 'node:fs';
import { syntheticPostgres } from './qa-postgres.mjs';
const pg = await syntheticPostgres();
process.env.DATABASE_URL = pg.url; process.env.NODE_ENV = 'test';
process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
for (const key of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','ANTHROPIC_API_KEY']) delete process.env[key];
const { prisma } = await import('../../../backend/src/lib/prisma.ts');
const service = await import('../../../backend/src/assessments/service.ts');
const { assessmentCatalog } = await import('../../../backend/src/assessments/catalog.ts');
const { currentAssessment } = await import('../../../backend/src/assessments/current.ts');
const { listAssessments } = await import('../../../backend/src/assessments/history.ts');
const { browser, makeContext, openChart, finish, out, states, expect } = await import(process.env.QA_FIXTURE_MODULE || './qa-fixture.mjs');
const actors = ['QA-NURSE-414', 'QA-NURSE-414-OTHER'];
for (const id of actors) await prisma.user.create({ data: { email: `${id}@example.test`, passwordHash: 'synthetic', fullName: 'Infermiere Sintetico', operator: { create: { id } } } });
await prisma.patient.create({ data: { id: 'QA-PATIENT-414', firstName: 'Persona', lastName: 'Sintetica', dateOfBirth: new Date('1980-01-01'), medicalRecordNumber: 'QA-414', registeredById: actors[0] } });
const contexts=[], outcomes=[], writes=[];
async function check(name, fn) { await fn(); outcomes.push({name,status:'PASS'}); console.log(`PASS ${name}`); }
async function ctx(options={}) {
 const c=await makeContext(options);contexts.push(c);c.state.attempts=[];
 c.state.apiHandler=async(req,json)=>{
  const url=new URL(req.url()), prefix='/patients/QA-PATIENT-414/assessments';
  if(!url.pathname.startsWith(prefix))return false;
  const actor={id:c.state.actorId,role:'operatore'}, query=Object.fromEntries(url.searchParams), suffix=url.pathname.slice(prefix.length), method=req.method();
  if(!actors.includes(actor.id))throw Error('Non-synthetic actor forbidden');
  try {
   let result;
   if(method==='GET') {
    if(suffix==='/catalog')result=await assessmentCatalog('QA-PATIENT-414',{},actor);
    else if(suffix==='/current')result={assessment:await currentAssessment('QA-PATIENT-414',query,actor)};
    else if(!suffix)result=await listAssessments('QA-PATIENT-414',query,actor);
    else result={assessment:await service.getAssessment('QA-PATIENT-414',suffix.slice(1),actor)};
   } else {
    const body=req.postDataJSON();c.state.attempts.push({method,requestId:body.requestId,expectedVersion:body.expectedVersion});
    if(c.state.hold) {c.state.held=true;await new Promise(ok=>{c.state.release=ok;});c.state.hold=false;}
    if(c.state.failOnce){c.state.failOnce=false;await json({code:'assessment_unavailable'},503);return true;}
    if(method==='POST'&&!suffix)result=await service.createAssessment('QA-PATIENT-414',body,actor);
    else if(method==='PATCH')result={assessment:await service.patchAssessment('QA-PATIENT-414',suffix.slice(1),body,actor)};
    else throw Error('Finalization prohibited in this QA');
    writes.push({method,actor:actor.id,synthetic:true});
    if(c.state.invalidReceipt){c.state.invalidReceipt=false;result={...result,requestId:'wrong-receipt'};}
   }
   await json(result);return true;
  }catch(error){ if(!error.code)throw error;await json({code:error.code,error:error.message,...error.details},error.status||400);return true; }
 };
 return c;
}
async function module(c,newDraft=false){
 await openChart(c);await c.page.getByRole('tab',{name:/^Moduli/}).click();
 await c.page.getByRole('button',{name:newDraft?'Apri PAINAD':'Riprendi bozza PAINAD',exact:true}).click();
 if(newDraft)await c.page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true}).click();
 await expect(c.page.locator('.paper-sheet--painad')).toBeVisible();
}
const toolbar=c=>c.page.getByRole('region',{name:'Azioni compilazione PAINAD'});
async function metadata(c){const details=c.page.locator('.painad-metadata');if(!await details.evaluate(e=>e.open))await details.locator('summary').click();return details;}
async function logout(c){
 const accept=dialog=>dialog.accept();c.page.on('dialog',accept);
 await c.page.getByRole('button',{name:/menu utente/}).click();await c.page.getByRole('button',{name:'Cambia profilo',exact:true}).click();
 await expect(c.page.getByRole('button',{name:/Infermiere Sintetico/})).toBeVisible();c.page.off('dialog',accept);
}
async function clean(c,name){
 c.state.httpErrors=c.state.httpErrors.filter(e=>e.status===503&&e.path.includes('/assessments')?false:true);
 c.state.errors=c.state.errors.filter(e=>!/Failed to load resource.*503/.test(e));await finish(c,name);
}
try{
 const a=await ctx();await module(a,true);
 await check('AC1 local-only wording, no technical server/Draft, #413 first-question focus retained',async()=>{
  await expect(toolbar(a)).toContainText('Non salvata in ClinicOS');await expect(a.page.locator('input[data-field-path=respiration]').first()).toBeFocused();
  const details=await metadata(a);await expect(details).toContainText('questa finestra');await expect(details).toContainText('altro dispositivo');await expect(details).toContainText('nuovo accesso');await expect(details).not.toContainText('server');
  await a.page.locator('input[data-field-path=respiration]').last().check();await a.page.screenshot({path:`${out}/screenshots/local-only.png`});
 });
 await check('AC4 chart tab and same-window reload preserve unsaved answer',async()=>{
  await a.page.getByRole('tab',{name:/^Clinica/}).click();await a.page.getByRole('tab',{name:/^Moduli/}).click();await a.page.getByRole('button',{name:'Riprendi bozza PAINAD',exact:true}).click();
  await expect(a.page.locator('input[data-field-path=respiration]').last()).toBeChecked();
  await a.page.reload();await module(a);await expect(a.page.locator('input[data-field-path=respiration]').last()).toBeChecked();await expect(toolbar(a)).toContainText('Non salvata in ClinicOS');
 });
 const b=await ctx();await openChart(b);await b.page.getByRole('tab',{name:/^Moduli/}).click();
 await check('AC4 separate browser context cannot see unsaved draft; logout clears local edits',async()=>{
  await expect(b.page.getByRole('button',{name:'Riprendi bozza PAINAD',exact:true})).toHaveCount(0);
  await logout(a);await module(a,true);await expect(a.page.locator('.paper-check:checked')).toHaveCount(0);
 });
 await a.page.locator('input[data-field-path=respiration]').last().check();a.state.hold=true;
 await toolbar(a).getByRole('button',{name:'Salva bozza',exact:true}).click();
 await check('AC2 held write shows pending, never saved before actual database receipt',async()=>{
  await expect.poll(()=>a.state.held).toBe(true);await expect(toolbar(a)).toContainText('Salvataggio in corso');await expect(toolbar(a)).not.toContainText('Bozza salvata in ClinicOS');await expect(toolbar(a).getByRole('button',{name:'Salvataggio…',exact:true})).toBeDisabled();
  await a.page.screenshot({path:`${out}/screenshots/save-pending.png`});a.state.release();await expect(toolbar(a)).toContainText('Bozza salvata in ClinicOS');
 });
 await check('AC2 only acknowledged save reports timestamp and author-scoped availability',async()=>{
  const details=await metadata(a);await expect(details).toContainText('Ultimo salvataggio confermato');await expect(details).toContainText('stesso account');await expect(details).toContainText('altri operatori non possono');
  await a.page.screenshot({path:`${out}/screenshots/confirmed-save.png`});await a.page.reload();await module(a);await expect(toolbar(a)).toContainText('Bozza salvata in ClinicOS');await expect(a.page.locator('input[data-field-path=respiration]').last()).toBeChecked();
 });
 await check('AC4 real PostgreSQL saved draft recovered after logout and on distinct context',async()=>{
  await logout(a);await module(a);await expect(toolbar(a)).toContainText('Bozza salvata in ClinicOS');await expect(a.page.locator('input[data-field-path=respiration]').last()).toBeChecked();
  await b.page.reload();await module(b);await expect(toolbar(b)).toContainText('Bozza salvata in ClinicOS');await expect(b.page.locator('input[data-field-path=respiration]').last()).toBeChecked();await metadata(b);await b.page.screenshot({path:`${out}/screenshots/distinct-context-recovery.png`});
 });
 await check('AC2 saved receipt remains last-confirmed only after edits, not current saved status',async()=>{
  await a.page.locator('input[data-field-path=respiration]').first().check();await expect(toolbar(a)).toContainText('Modifiche non salvate in ClinicOS');await expect(await metadata(a)).toContainText('Ultimo salvataggio confermato');
 });
 const c=await ctx();await module(c,true);c.state.failOnce=true;
 await toolbar(c).getByRole('button',{name:'Salva bozza',exact:true}).click();
 await check('AC3 failed save retains answers and exact request retry; uncertain receipt is not success',async()=>{
  await expect(toolbar(c)).toContainText('Salvataggio da verificare');await expect(c.page.getByRole('button',{name:'Riprova la stessa richiesta'})).toBeVisible();await metadata(c);await c.page.screenshot({path:`${out}/screenshots/failure-recovery.png`});
  c.state.invalidReceipt=true;await c.page.getByRole('button',{name:'Riprova la stessa richiesta'}).click();await expect(toolbar(c)).toContainText('Salvataggio da verificare');
  await c.page.getByRole('button',{name:'Riprova la stessa richiesta'}).click();await expect(toolbar(c)).toContainText('Bozza salvata in ClinicOS');
  expect(new Set(c.state.attempts.map(v=>v.requestId)).size).toBe(1);expect(await prisma.patientAssessment.count({where:{authorOperatorId:actors[0],requestId:c.state.attempts[0].requestId}})).toBe(1);
 });
 const other=await ctx({authIdentity:{id:actors[1],name:'Infermiere Sintetico Collega',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'}});
 await openChart(other);await other.page.getByRole('tab',{name:/^Moduli/}).click();
 await check('AC4 other operator cannot retrieve personal drafts even with patient access',async()=>{
  // Author isolation tested separately from patient scope: temporarily grant patient access to colleague.
  await prisma.patient.update({where:{id:'QA-PATIENT-414'},data:{registeredById:actors[1]}});await other.page.reload();await openChart(other);await other.page.getByRole('tab',{name:/^Moduli/}).click();
  await expect(other.page.getByRole('button',{name:'Riprendi bozza PAINAD',exact:true})).toHaveCount(0);
  const id=(await prisma.patientAssessment.findFirstOrThrow({where:{authorOperatorId:actors[0]}})).id;
  await expect(service.getAssessment('QA-PATIENT-414',id,{id:actors[1],role:'operatore'})).rejects.toHaveProperty('code','assessment_not_found');
  await expect(service.getAssessment('QA-PATIENT-414',id,{id:actors[0],role:'operatore'})).rejects.toHaveProperty('code','assessment_not_found');
  await prisma.patient.update({where:{id:'QA-PATIENT-414'},data:{registeredById:actors[0]}});
 });
 const mobile=await ctx({mobile:true});await module(mobile);
 await check('mobile actual draft state and locality readable, no horizontal overflow',async()=>{
  await expect(toolbar(mobile)).toContainText('Bozza salvata in ClinicOS');await metadata(mobile);await expect(mobile.page.locator('.painad-metadata')).toContainText('stesso account');expect(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await mobile.page.screenshot({path:`${out}/screenshots/mobile-confirmed-save.png`});
 });
 // Only the deliberately exercised 503 and scope-denied reads are permitted diagnostics.
 for(const [i,cx]of contexts.entries()){
  cx.state.httpErrors=cx.state.httpErrors.filter(e=>!(e.status===404&&e.path.includes('/assessments')));
  cx.state.errors=cx.state.errors.filter(e=>!/Failed to load resource.*404/.test(e));await clean(cx,`context-${i}`);
 }
 writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify({outcomes,writes,states,safety:'Actual SPA; guarded API transport invokes unchanged source services on fresh real loopback PostgreSQL. Separate storage contexts; synthetic only; no production writes.'},null,2));
 writeFileSync(`${out}/test-results/migrations.json`,JSON.stringify(pg.applied,null,2));
 writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><h1>414 synthetic SPA + real isolated PostgreSQL</h1><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
}catch(error){writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:error.message,outcomes,states},null,2));for(const[i,c]of contexts.entries())await c.page.screenshot({path:`${out}/screenshots/failure-${i}.png`}).catch(()=>{});throw error;}
finally{for(const c of contexts)await c.context.close().catch(()=>{});await browser.close();await prisma.$disconnect();await pg.close();}
