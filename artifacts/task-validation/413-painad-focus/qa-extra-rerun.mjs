import {writeFileSync} from 'node:fs';
import {painadResult} from '../../../frontend/src/lib/assessments/painadDefinition.ts';
process.env.QA_FIXTURE_ONLY='1';
const {browser,makeContext,openChart,finish,out,states,expect}=await import(process.env.QA_FIXTURE_MODULE || './qa-fixture.mjs');
const outcomes=[],contexts=[];
async function start(ctx){await openChart(ctx);await ctx.page.getByRole('tab',{name:/^Moduli/}).click();await ctx.page.getByRole('button',{name:'Apri PAINAD',exact:true}).click();await ctx.page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true}).click();await expect(ctx.page.locator('.paper-sheet--painad')).toBeVisible();}
async function unobscured(locator){const box=await locator.boundingBox();expect(box).not.toBeNull();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(locator.page().viewportSize().height);expect(await locator.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===e||e.contains(hit));})).toBe(true);return box;}
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log('PASS '+name);}
try{
 const tablet=await makeContext({mobile:true});contexts.push(tablet);await tablet.page.setViewportSize({width:820,height:1180});await start(tablet);
 await check('Tablet820x1180 first question and sticky toolbar unobscured startup/midpoint',async()=>{
  const first=tablet.page.locator('input[data-field-path=respiration]').first(),toolbar=tablet.page.getByRole('region',{name:'Azioni compilazione PAINAD'});await expect(first).toBeFocused();await unobscured(first);await unobscured(toolbar);
  const middle=tablet.page.locator('input[data-field-path=facialExpression]').last();await middle.focus();await middle.evaluate(e=>e.scrollIntoView({block:'center'}));await expect(middle).toBeFocused();await unobscured(middle);await unobscured(toolbar);await tablet.page.screenshot({path:`${out}/screenshots/tablet-midpoint.png`});
 });await finish(tablet,'tablet');
 const save=await makeContext();contexts.push(save);await start(save);
 await check('Invalid required date inside collapsed metadata revealed/focused on save; zero write/error',async()=>{
  await save.page.locator('.painad-metadata summary').click();const field=save.page.locator('.assessment-date input');await field.fill('');await save.page.locator('.painad-metadata summary').click();await save.page.getByRole('button',{name:'Salva bozza',exact:true}).click();await expect(field).toBeVisible();await expect(field).toBeFocused();await unobscured(field);expect(save.state.requests.filter(r=>r.method==='POST'&&r.path.endsWith('/assessments'))).toHaveLength(0);await save.page.screenshot({path:`${out}/screenshots/invalid-save-date.png`});
 });await finish(save,'invalid-save');
 await check('Complete answers with invalid hidden date cannot preview; reachable field desktop/mobile',async()=>{
  for(const mobile of [false,true]){
   const ctx=await makeContext({mobile});contexts.push(ctx);await start(ctx);
   for(const key of ['respiration','negativeVocalization','facialExpression','bodyLanguage','consolability'])await ctx.page.locator(`input[data-field-path=${key}]`).first().click();
   const toolbar=ctx.page.getByRole('region',{name:'Azioni compilazione PAINAD'});await expect(toolbar).toContainText('5 di 5 risposte');await expect(toolbar).toContainText('Compilazione completa · da verificare');
   await ctx.page.locator('.painad-metadata summary').click();const date=ctx.page.locator('.assessment-date input');await date.fill('');await ctx.page.locator('.painad-metadata summary').click();await toolbar.getByRole('button',{name:'Salva e verifica anteprima',exact:true}).click();
   await expect(date).toBeVisible();await expect(date).toBeFocused();await unobscured(date);await expect(ctx.page.getByRole('button',{name:'Conferma e finalizza'})).toHaveCount(0);await expect(ctx.page.locator('.paper-check:checked')).toHaveCount(5);expect(ctx.state.requests.filter(r=>r.method==='POST'&&r.path.endsWith('/assessments'))).toHaveLength(0);
   await ctx.page.screenshot({path:`${out}/screenshots/${mobile?'mobile':'desktop'}-invalid-preview-date.png`});await finish(ctx,mobile?'mobile-invalid-preview':'desktop-invalid-preview');
  }
 });
 await check('AC2 preview/edit/close/new draft lifecycle excludes selected draft but retains inactive saved draft',async()=>{
  const ctx=await makeContext();contexts.push(ctx);await start(ctx);
  for(const key of ['respiration','negativeVocalization','facialExpression','bodyLanguage','consolability'])await ctx.page.locator(`input[data-field-path=${key}]`).first().click();
  let attempts=0;
  ctx.state.assessmentHandler=(req,json)=>{attempts++;const body=req.postDataJSON(),now=new Date().toISOString();return json({requestId:body.requestId,replayed:false,assessment:{id:'QA-ADVERSARIAL-ASSESSMENT-413',patientId:'QA-PATIENT-413',type:'painad',formVersion:body.formVersion,status:'draft',version:1,assessedAt:body.assessedAt,createdAt:now,updatedAt:now,finalizedAt:null,author:{operatorId:'QA-NURSE-413',name:'Infermiere Sintetico'},answeredCount:5,result:painadResult(body.answers),predecessorId:null,correctionReason:null,correctedById:null,pdf:null,answers:body.answers,finalSnapshot:null}});};
  const resume=ctx.page.getByRole('button',{name:'Riprendi compilazione',exact:true});
  await ctx.page.getByRole('button',{name:'Salva e verifica anteprima',exact:true}).click();await expect(ctx.page.getByRole('button',{name:'Conferma e finalizza'})).toBeVisible();await expect(resume).toHaveCount(0);
  await ctx.page.getByRole('button',{name:'Torna alla compilazione',exact:true}).click();await expect(ctx.page.getByRole('region',{name:'Azioni compilazione PAINAD'})).toContainText('5 di 5 risposte');await expect(resume).toHaveCount(0);
  await ctx.page.getByRole('button',{name:'Chiudi · conserva compilazione',exact:true}).click();await expect(resume).toHaveCount(1);
  await ctx.page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true}).click();await expect(ctx.page.getByRole('region',{name:'Azioni compilazione PAINAD'})).toContainText('0 di 5 risposte');await expect(resume).toHaveCount(1);
  await resume.click();await expect(ctx.page.getByRole('region',{name:'Azioni compilazione PAINAD'})).toContainText('5 di 5 risposte');await expect(ctx.page.locator('.paper-check:checked')).toHaveCount(5);await expect(resume).toHaveCount(1);expect(attempts).toBe(1);
  await ctx.page.screenshot({path:`${out}/screenshots/inactive-draft-retained.png`});await finish(ctx,'inactive-draft');
 });
 writeFileSync(`${out}/test-results/adversarial-results.json`,JSON.stringify({outcomes,states,safety:'Synthetic guarded actual SPA. Zero assessment writes in failure paths; one successful synthetic save response for draft lifecycle. Zero finalizations; browser contexts closed.'},null,2));writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><h1>413 independent adversarial assertions</h1><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
}catch(e){writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:e.message,outcomes,states},null,2));for(const [i,ctx]of contexts.entries())if(!ctx.page.isClosed()){await ctx.page.screenshot({path:`${out}/screenshots/failure-${i}.png`}).catch(()=>{});await ctx.context.tracing.stop({path:`${out}/failure-${i}-trace.zip`}).catch(()=>{});}throw e;}finally{for(const ctx of contexts)await ctx.context.close().catch(()=>{});await browser.close();}
