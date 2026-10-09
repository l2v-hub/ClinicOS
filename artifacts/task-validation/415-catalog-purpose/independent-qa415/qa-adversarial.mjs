import {writeFileSync,mkdirSync} from 'node:fs';
import {browser,makeContext,openChart,out,states,expect} from './qa-fixture.mjs';
import {ASSESSMENT_VERSIONS} from '../../../../frontend/src/lib/assessments/assessmentTypes.ts';
const cat=p=>p.locator('.assessment-catalog'), form=p=>p.locator('.cr-inline-form').filter({visible:true});
const row=(p,name)=>cat(p).locator('article').filter({has:p.getByRole('heading',{name,exact:true})});
const modern=['PAINAD','Trasferimenti posturali','Tinetti','MNA®-SF','GDS-15','Indice di Barthel','UCLA · Sonno-veglia (NPI)'];
const outcomes=[], contexts=[], expected503=[];
const empty=()=>({items:Object.entries(ASSESSMENT_VERSIONS).map(([type,formVersion])=>({type,formVersion,latestFinal:null,latestOwnDraft:null,ownDraftCount:0}))});
// Object order is not the wire contract: use its exact bounded canonical order.
const metadata=()=>({items:['painad','postural_transfers','tinetti','mna','gds15','barthel','ucla_npi_sleep'].map(type=>empty().items.find(i=>i.type===type))});
const base='/patients/QA-PATIENT-414/assessments';
const saved={id:'QA-OWN-415',patientId:'QA-PATIENT-414',type:'painad',formVersion:ASSESSMENT_VERSIONS.painad,status:'draft',version:1,assessedAt:'2026-10-09T08:00:00.000Z',createdAt:'2026-10-09T08:00:00.000Z',updatedAt:'2026-10-09T09:00:00.000Z',finalizedAt:null,author:{operatorId:'QA-NURSE-414',name:'Infermiere Sintetico'},predecessorId:null,correctionReason:null,correctedById:null,pdf:null,answeredCount:1,result:null,answers:{respiration:1,negativeVocalization:null,facialExpression:null,bodyLanguage:null,consolability:null},finalSnapshot:null};
async function check(name,fn){try{await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}catch(e){outcomes.push({name,status:'FAIL',error:e.message});throw e;}}
async function context(name,options={}){const ctx=await makeContext(options);contexts.push({...ctx,name});return ctx;}
async function modules(ctx){await openChart(ctx);await ctx.page.getByRole('tab',{name:/^Moduli/}).click();await expect(cat(ctx.page)).toBeVisible();}
async function back(p){await p.getByRole('button',{name:'← Tutti i moduli',exact:true}).click();await expect(cat(p)).toBeVisible();}
const assessmentReq=s=>s.requests.filter(r=>r.path.includes('/assessments'));
function noImplicit(s,start){const recent=s.requests.slice(start).filter(r=>r.path.includes('/assessments'));expect(recent.filter(r=>r.path!==base&&r.path!==base+'/catalog')).toEqual([]);expect(recent.every(r=>r.method==='GET')).toBe(true);}
async function screen(ctx,name){await ctx.page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});await ctx.page.screenshot({path:`${out}/screenshots/${name}.png`,fullPage:true});}
async function legacyStorage(p,module){return p.evaluate(module=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('clinicos:module-draft:v1:')&&k.endsWith(':'+module));return key?{key,value:JSON.parse(sessionStorage.getItem(key))}:null;},module);}
try{
 const ctx=await context('catalog-metadata');const data=metadata();
 data.items[0].latestFinal={id:'QA-FINAL-415',formVersion:ASSESSMENT_VERSIONS.painad,assessedAt:'2026-10-07T08:00:00.000Z',createdAt:'2026-10-08T08:00:00.000Z',finalizedAt:'2026-10-09T08:00:00.000Z'};
 data.items[0].latestOwnDraft={id:saved.id,formVersion:saved.formVersion,assessedAt:saved.assessedAt,createdAt:saved.createdAt,updatedAt:saved.updatedAt};data.items[0].ownDraftCount=1;
 data.items[2].latestOwnDraft={...data.items[0].latestOwnDraft,id:'QA-OWN-TINETTI',formVersion:ASSESSMENT_VERSIONS.tinetti};data.items[2].ownDraftCount=2;
 ctx.state.apiHandler=async(req,json)=>{const path=new URL(req.url()).pathname;if(path===base+'/catalog'){await json(data);return true;}if(path===base+'/'+saved.id){await json({assessment:saved});return true;}return false;};
 await modules(ctx);
 await check('official names, ten visible purposes/text actions, no catalog tooltip or invented score',async()=>{
   await expect(cat(ctx.page).locator('h4')).toHaveText(['Medicazioni','Contenzioni','Trasferimenti posturali','Braden','PAINAD','Tinetti','MNA®-SF','GDS-15','Indice di Barthel','UCLA · Sonno-veglia (NPI)']);
   await expect(cat(ctx.page).locator('.assessment-catalog-purpose')).toHaveCount(10);
   await expect(row(ctx.page,'Braden').locator('.assessment-catalog-purpose')).toHaveText('Rischio di compromissione dell’integrità cutanea.');
   await expect(row(ctx.page,'PAINAD').locator('.assessment-catalog-purpose')).toHaveText('Valutazione osservazionale del dolore nel paziente non verbale.');
   await expect(cat(ctx.page).getByRole('button',{name:/^Compila /})).toHaveCount(10);await expect(cat(ctx.page).locator('.assessment-catalog-actions').getByRole('button',{name:/^Storico /})).toHaveCount(10);
   expect(await cat(ctx.page).locator('.assessment-catalog-actions button').evaluateAll(es=>es.every(e=>e.textContent.trim()&& !e.hasAttribute('title')))).toBe(true);
   await expect(row(ctx.page,'PAINAD')).toContainText('Ultima completa: 07/10/26, 10:00');await expect(row(ctx.page,'PAINAD')).toContainText('Registrata 08/10/26, 10:00 · Finalizzata 09/10/26, 10:00');await expect(row(ctx.page,'PAINAD')).toContainText('1 bozza salvata personale');
   await expect(row(ctx.page,'Tinetti')).toContainText('Bozza personale · nessuna compilazione completa');await expect(row(ctx.page,'Tinetti')).toContainText('2 bozze salvate personali');await expect(row(ctx.page,'MNA®-SF')).toContainText('Nessuna compilazione');
   await expect(cat(ctx.page)).not.toContainText('Dolore lieve');await expect(cat(ctx.page)).not.toContainText('Punteggio totale');await screen(ctx,'metadata-catalog');noImplicit(ctx.state,0);
 });
 await check('saved-own resume alone reads exact draft; history with latest final and saved-own reads neither',async()=>{
   const start=ctx.state.requests.length;await row(ctx.page,'PAINAD').getByRole('button',{name:'Storico PAINAD',exact:true}).click();await expect(ctx.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();await expect(ctx.page.locator('.paper-form--focused')).toHaveCount(0);noImplicit(ctx.state,start);await back(ctx.page);
   await row(ctx.page,'PAINAD').getByRole('button',{name:'Riprendi bozza PAINAD',exact:true}).click();await expect(ctx.page.locator('.paper-form--focused')).toBeVisible();await expect(ctx.page.locator('.paper-form--focused input[type=radio]:checked')).toHaveCount(1);await expect(ctx.page.locator('.paper-form--focused input[type=radio]:checked')).toHaveAttribute('aria-label',/^1 Respirazione: Occasionalmente affannosa/);
   expect(ctx.state.requests.some(r=>r.path===base+'/'+saved.id)).toBe(true);await back(ctx.page);
 });
 await check('coexisting final metadata, saved-own and local draft; repeated history preserves exact answers without auto-resume',async()=>{
   await expect(row(ctx.page,'PAINAD').getByRole('button',{name:'Elimina bozza locale PAINAD'})).toBeVisible();
   await screen(ctx,'coexisting-final-saved-local');
   for(let i=0;i<3;i++){const start=ctx.state.requests.length;await row(ctx.page,'PAINAD').getByRole('button',{name:'Storico PAINAD',exact:true}).click();await expect(ctx.page.locator('.paper-form--focused')).toHaveCount(0);await expect(ctx.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();noImplicit(ctx.state,start);await back(ctx.page);}
   await row(ctx.page,'PAINAD').getByRole('button',{name:'Riprendi bozza PAINAD',exact:true}).click();await expect(ctx.page.locator('.paper-form--focused input[type=radio]:checked')).toHaveAttribute('aria-label',/^1 Respirazione: Occasionalmente affannosa/);await screen(ctx,'painad-resume-saved-local');await back(ctx.page);
 });
 for(const name of modern)await check(`new/history/resume route ${name} preserves local state with no domain writes`,async()=>{
   const start=ctx.state.requests.length;const comp=row(ctx.page,name).getByRole('button',{name:`Compila ${name}`,exact:true});await comp.focus();await ctx.page.keyboard.press('Space');
   if(name==='Trasferimenti posturali')await expect(ctx.page.locator('.transfers-form')).toBeVisible();else await expect(ctx.page.locator('.paper-form')).toBeVisible();
   if(name==='PAINAD'){await expect(ctx.page.locator('.assessment-workspace--focused')).toBeVisible();await expect(ctx.page.locator('.paper-form--focused')).toBeVisible();}
   await back(ctx.page);const historic=row(ctx.page,name).getByRole('button',{name:`Storico ${name}`,exact:true});await historic.focus();await ctx.page.keyboard.press('Tab');await ctx.page.keyboard.press('Shift+Tab');await expect(historic).toBeFocused();expect(await historic.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await ctx.page.keyboard.press('Enter');
   await expect(ctx.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();await expect(ctx.page.locator('.paper-form,.assessment-form')).toHaveCount(0);await expect(ctx.page.locator('[tabindex="-1"][aria-label^="Storico"]')).toBeFocused();noImplicit(ctx.state,start);await back(ctx.page);
   await row(ctx.page,name).getByRole('button',{name:`Riprendi bozza ${name}`,exact:true}).click();if(name==='Trasferimenti posturali')await expect(ctx.page.locator('.transfers-form')).toBeVisible();else await expect(ctx.page.locator('.paper-form')).toBeVisible();await back(ctx.page);
 });
 await check('local-delete cancellation preserves draft; confirmation removes only local draft',async()=>{
   await row(ctx.page,'MNA®-SF').getByRole('button',{name:'Elimina bozza locale MNA®-SF',exact:true}).click();await expect(ctx.page.getByRole('alertdialog')).toBeVisible();await ctx.page.getByRole('button',{name:'Annulla',exact:true}).click();await expect(row(ctx.page,'MNA®-SF').getByRole('button',{name:'Riprendi bozza MNA®-SF',exact:true})).toBeVisible();
   await row(ctx.page,'MNA®-SF').getByRole('button',{name:'Elimina bozza locale MNA®-SF',exact:true}).click();await ctx.page.getByRole('alertdialog').getByRole('button',{name:'Elimina bozza',exact:true}).click();await expect(row(ctx.page,'MNA®-SF').getByRole('button',{name:'Riprendi bozza MNA®-SF',exact:true})).toHaveCount(0);await expect(row(ctx.page,'PAINAD').getByRole('button',{name:'Riprendi bozza PAINAD',exact:true})).toBeVisible();
 });
 const leg=await context('legacy-restored-edit');await modules(leg);
 for(const [name,module] of [['Medicazioni','medicazioni'],['Contenzioni','contenzioni'],['Braden','braden']])await check(`legacy ${name}: kept-alive and restored edit identity survives repeated history/resume; new blocks hidden update`,async()=>{
   await row(leg.page,name).getByRole('button',{name:`Compila ${name}`,exact:true}).click();await expect(form(leg.page)).toBeVisible();await form(leg.page).locator('input[type=date]').first().fill('2026-10-06');await form(leg.page).locator('textarea').last().fill('QA415 synthetic unsaved note');
   await expect.poll(async()=>!!await legacyStorage(leg.page,module)).toBe(true);await back(leg.page);
   const before=await legacyStorage(leg.page,module);
   for(let i=0;i<2;i++){await row(leg.page,name).getByRole('button',{name:`Storico ${name}`,exact:true}).click();await expect(form(leg.page)).toHaveCount(0);const after=await legacyStorage(leg.page,module);expect(after.value.form).toEqual(before.value.form);expect(after.value.editId).toEqual(before.value.editId);await back(leg.page);}
   await row(leg.page,name).getByRole('button',{name:`Riprendi bozza ${name}`,exact:true}).click();await expect(form(leg.page).locator('input[type=date]').first()).toHaveValue('2026-10-06');await expect(form(leg.page).locator('textarea').last()).toHaveValue('QA415 synthetic unsaved note');await back(leg.page);
   if(module!=='braden'){await leg.page.evaluate(key=>{const v=JSON.parse(sessionStorage.getItem(key));v.editId='QA-EXISTING-415';v.show=true;sessionStorage.setItem(key,JSON.stringify(v));},before.key);}
   await leg.page.reload();await modules(leg);
   await row(leg.page,name).getByRole('button',{name:`Storico ${name}`,exact:true}).click();await expect(form(leg.page)).toHaveCount(0);await back(leg.page);await row(leg.page,name).getByRole('button',{name:`Riprendi bozza ${name}`,exact:true}).click();await expect(form(leg.page).locator('input[type=date]').first()).toHaveValue('2026-10-06');await expect(form(leg.page).locator('textarea').last()).toHaveValue('QA415 synthetic unsaved note');
   if(module!=='braden'){await expect(form(leg.page)).toContainText('Modifica');expect((await legacyStorage(leg.page,module)).value.editId).toBe('QA-EXISTING-415');await back(leg.page);await row(leg.page,name).getByRole('button',{name:`Compila ${name}`,exact:true}).click();await expect(form(leg.page)).toHaveCount(0);expect((await legacyStorage(leg.page,module)).value.editId).toBe('QA-EXISTING-415');await expect(leg.page.getByRole('button',{name:'Riprendi modifica',exact:true})).toBeVisible();}
   await screen(leg,`legacy-${module}`);await back(leg.page);expect(leg.state.domainWrites).toEqual([]);
 });
 const err=await context('loading-error-retry');let release;const held=new Promise(r=>release=r);let attempt=0,recovered=false;expected503.push(err.state);
 err.state.apiHandler=async(req,json)=>{if(new URL(req.url()).pathname!==base+'/catalog')return false;attempt++;if(!recovered){await held;await json({error:'Synthetic metadata unavailable'},503);}else await json(metadata());return true;};
 await modules(err);await check('held metadata loading never reports empty; controlled error distinct and retry recovers',async()=>{
   await expect(row(err.page,'PAINAD')).toContainText('Caricamento date e bozze');await expect(row(err.page,'PAINAD')).not.toContainText('Nessuna compilazione');await expect(cat(err.page).getByRole('button',{name:/^Compila /})).toHaveCount(10);await screen(err,'loading');release();
   await expect(cat(err.page).getByRole('alert')).toBeVisible();await expect(row(err.page,'PAINAD')).toContainText('Date e bozze non disponibili');await expect(row(err.page,'PAINAD')).not.toContainText('Nessuna compilazione');await screen(err,'controlled-error');const beforeRetry=attempt;recovered=true;await cat(err.page).getByRole('button',{name:'Riprova',exact:true}).click();await expect(row(err.page,'PAINAD')).toContainText('Nessuna compilazione');expect(attempt).toBe(beforeRetry+1);await screen(err,'retry-recovered');
 });
 const ro=await context('readonly',{authIdentity:{id:'QA-OSS-415',name:'Infermiere Sintetico',roleLabel:'OSS',appRole:'oss',uiShell:'operator'}});ro.state.readOnly=true;await modules(ro);await check('read-only OSS actor sees all purposes/history but no compile/resume/delete action',async()=>{
   await expect(cat(ro.page).locator('.assessment-catalog-purpose')).toHaveCount(10);await expect(cat(ro.page).getByRole('button',{name:/^Compila |^Riprendi bozza|^Elimina bozza/})).toHaveCount(0);await expect(cat(ro.page).locator('.assessment-catalog-actions button')).toHaveCount(10);await screen(ro,'readonly-catalog');await row(ro.page,'PAINAD').getByRole('button',{name:'Storico PAINAD',exact:true}).click();await expect(ro.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();noImplicit(ro.state,0);
 });
 const mob=await context('mobile-keyboard',{mobile:true});await modules(mob);await check('mobile 390px, visible text and >=44px targets, keyboard focus and text history',async()=>{
   await expect(cat(mob.page).locator('.assessment-catalog-purpose')).toHaveCount(10);await expect(cat(mob.page).getByRole('button',{name:/^Compila /})).toHaveCount(10);const sizes=await cat(mob.page).locator('.assessment-catalog-actions button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim(),width:r.width,height:r.height,left:r.left,right:r.right};}));writeFileSync(`${out}/test-results/mobile-targets.json`,JSON.stringify(sizes,null,2));expect(sizes.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=390)).toBe(true);await screen(mob,'catalog-mobile');
   const target=row(mob.page,'MNA®-SF').getByRole('button',{name:'Storico MNA®-SF',exact:true});await target.focus();await expect(target).toBeFocused();expect(await target.evaluate(e=>getComputedStyle(e).outlineWidth)).toBe('3px');await mob.page.keyboard.press('Enter');await expect(mob.page.getByRole('heading',{name:'Storico valutazioni'})).toBeVisible();noImplicit(mob.state,0);await screen(mob,'mobile-keyboard-history');
 });
}catch(e){console.error(e.message);process.exitCode=1;}finally{
 for(const ctx of contexts){try{for(const key of ['domainWrites','unexpected','external','pageErrors'])expect(ctx.state[key],`${ctx.name} ${key}`).toEqual([]);const intentional=expected503.includes(ctx.state);expect(ctx.state.httpErrors.filter(r=>!(intentional&&r.status===503&&r.path===base+'/catalog'))).toEqual([]);expect(ctx.state.errors.filter(e=>!(intentional&&/Failed to load resource.*503/.test(e)))).toEqual([]);outcomes.push({name:`${ctx.name} guarded network/console`,status:'PASS'});}catch(e){outcomes.push({name:`${ctx.name} guarded network/console`,status:'FAIL',error:e.message});process.exitCode=1;}
   await ctx.context.tracing.stop({path:`${out}/${ctx.name}-trace.zip`});const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${ctx.name}.webm`);await video.delete();
 }
 await browser.close();
 writeFileSync(`${out}/test-results/results.json`,JSON.stringify({outcomes,states:states.map(s=>({requests:s.requests,domainWrites:s.domainWrites,unexpected:s.unexpected,external:s.external,errors:s.errors,pageErrors:s.pageErrors,httpErrors:s.httpErrors})),synthetic:true,fixtureReuse:'QA414 synthetic actor/patient only; original adversarial scenarios authored independently',productionWrites:0},null,2));
 writeFileSync(`${out}/test-results/run-output.log`,outcomes.map(o=>`${o.status} ${o.name}${o.error?'\n'+o.error:''}`).join('\n')+'\n');
 mkdirSync(`${out}/playwright-report`,{recursive:true});const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><meta charset="utf-8"><title>Independent #415 Playwright assertion report</title><h1>Independent #415 synthetic actual-SPA assertions</h1><p>Each result comes from executed Playwright assertions; controlled 503 expected only in explicit retry case.</p><pre>${escape(JSON.stringify(outcomes,null,2))}</pre>`);
}
