import {writeFileSync} from 'node:fs';
import {painadResult} from '../../../frontend/src/lib/assessments/painadDefinition.ts';
process.env.QA_FIXTURE_ONLY='1';
const {browser,makeContext,openChart,finish,out,states,expect}=await import(process.env.QA_FIXTURE_MODULE||'./qa-fixture.mjs');
export async function start(ctx){
 await openChart(ctx);
 await ctx.page.getByRole('tab',{name:/^Moduli/}).click();
 await ctx.page.getByRole('button',{name:'Apri PAINAD',exact:true}).click();
 await ctx.page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true}).click();
 await expect(ctx.page.locator('.paper-sheet--painad')).toBeVisible();
}
const contexts=[],outcomes=[];
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}
async function visibleInViewport(locator){
 const box=await locator.boundingBox();expect(box).not.toBeNull();
 const viewport=locator.page().viewportSize();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
 const unobscured=await locator.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(e===hit||e.contains(hit));});expect(unobscured).toBe(true);
 return box;
}
async function examine(ctx,mobile=false){
 await start(ctx);
 const page=ctx.page,first=page.locator('.paper-sheet--painad input[type=radio]').first(),toolbar=page.getByRole('region',{name:'Azioni compilazione PAINAD'});
 await check(`${mobile?'mobile':'desktop'} AC1 focused first question and accessible name, one visible patient context`,async()=>{
  await expect(first).toBeFocused();await expect(first).toHaveAttribute('aria-label','1 Respirazione: Normale');
  await visibleInViewport(first);await visibleInViewport(page.locator('.paper-table tbody th').first());
  await expect(page.locator('.assessment-patient,.paper-fields')).toHaveCount(0);
  await expect(page.locator('.patient-topbar-title .patient-identity__identifier')).toBeVisible();
  await expect(page.getByRole('button',{name:'Riprendi compilazione',exact:true})).toHaveCount(0);
  await page.screenshot({path:`${out}/screenshots/${mobile?'mobile':'desktop'}-first-question.png`});
 });
 await check(`${mobile?'mobile':'desktop'} AC3 actions/progress visible at start and end of questions, no hidden focus/overflow`,async()=>{
  await visibleInViewport(toolbar);await expect(toolbar).toContainText('0 di 5 risposte');await expect(toolbar).toContainText('punteggio parziale');
  await expect(toolbar.getByRole('button',{name:'Salva e verifica anteprima'})).toBeDisabled();
  await page.locator('input[data-field-path=consolability]').last().focus();
  await page.locator('input[data-field-path=consolability]').last().evaluate(e=>e.scrollIntoView({block:'center'}));
  await visibleInViewport(toolbar);await visibleInViewport(page.locator('input[data-field-path=consolability]').last());
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${out}/screenshots/${mobile?'mobile':'desktop'}-persistent-actions.png`});
 });
 await check(`${mobile?'mobile':'desktop'} AC4 partial vs complete, 15 validated choices unchanged; no focus jump on answer edits`,async()=>{
  const keys=['respiration','negativeVocalization','facialExpression','bodyLanguage','consolability'];
  await expect(page.locator('.paper-sheet--painad input[type=radio]')).toHaveCount(15);
  for(const [i,key]of keys.entries()){
   const radio=page.locator(`input[data-field-path=${key}]`).first();await radio.click();await expect(radio).toBeFocused();
   await expect(toolbar).toContainText(`${i+1} di 5 risposte`);
   if(i<4){await expect(toolbar).toContainText('punteggio parziale');await expect(toolbar.getByRole('button',{name:'Salva e verifica anteprima'})).toBeDisabled();}
  }
  await expect(toolbar).toContainText('Compilazione completa · da verificare');
  await expect(toolbar.getByRole('button',{name:'Salva e verifica anteprima'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Conferma e finalizza'})).toHaveCount(0);
  await page.screenshot({path:`${out}/screenshots/${mobile?'mobile':'desktop'}-complete-not-final.png`});
 });
 await check(`${mobile?'mobile':'desktop'} metadata/date editable without stealing focus; inactive local draft resume+reload intact`,async()=>{
  await page.locator('.painad-metadata summary').click();const date=page.locator('.assessment-date input');await date.fill('2026-10-09T10:00');await expect(date).toBeFocused();
  await page.getByRole('button',{name:'Chiudi · conserva compilazione'}).click();
  await expect(page.getByRole('button',{name:'Riprendi compilazione',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Riprendi compilazione',exact:true}).click();await expect(first).toBeFocused();
  await expect(page.locator('.paper-check:checked')).toHaveCount(5);
  await page.reload();await openChart(ctx);await page.getByRole('tab',{name:/^Moduli/}).click();
  await page.getByRole('button',{name:'Riprendi bozza PAINAD',exact:true}).click();
  await expect(page.locator('.paper-check:checked')).toHaveCount(5);await expect(first).toBeFocused();
  await expect(page.getByRole('button',{name:'Riprendi compilazione',exact:true})).toHaveCount(0);
 });
 if(!mobile)await check('AC4 invalid save retains responses, preview stays explicit/read-only and source sheet complete',async()=>{
  let attempts=0;
  ctx.state.assessmentHandler=(req,json)=>{
   attempts++;if(attempts===1)return json({code:'assessment_invalid_input',missingPaths:['respiration']},400);
   const body=req.postDataJSON(),now=new Date().toISOString();
   return json({requestId:body.requestId,replayed:false,assessment:{id:'QA-ASSESSMENT-413',patientId:'QA-PATIENT-413',type:'painad',formVersion:body.formVersion,status:'draft',version:1,assessedAt:body.assessedAt,createdAt:now,updatedAt:now,finalizedAt:null,author:{operatorId:'QA-NURSE-413',name:'Infermiere Sintetico'},answeredCount:5,result:painadResult(body.answers),predecessorId:null,correctionReason:null,correctedById:null,pdf:null,answers:body.answers,finalSnapshot:null}});
  };
  await toolbar.getByRole('button',{name:'Salva e verifica anteprima'}).click();await expect(first).toBeFocused();
  await expect(page.getByRole('alert').filter({hasText:'Verifica le risposte e la data'})).toBeVisible();await expect(page.locator('.paper-check:checked')).toHaveCount(5);
  await toolbar.getByRole('button',{name:'Salva e verifica anteprima'}).click();
  await expect(page.getByRole('button',{name:'Conferma e finalizza'})).toBeVisible();await expect(page.locator('.paper-check')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Riprendi compilazione',exact:true})).toHaveCount(0);
  await expect(page.locator('.paper-fields')).toContainText('Sintetica Persona');await expect(page.locator('.paper-head')).toContainText('Scala PAINAD');
  await expect(toolbar).toHaveCount(0);expect(attempts).toBe(2);
  await page.screenshot({path:`${out}/screenshots/preview-full-source-sheet.png`});
 });
 ctx.state.httpErrors=ctx.state.httpErrors.filter(e=>!(e.status===400&&e.path.endsWith('/assessments')));
 ctx.state.errors=ctx.state.errors.filter(e=>!/Failed to load resource.*400/.test(e));
 await finish(ctx,mobile?'mobile':'desktop');
}
try{
 for(const mobile of [false,true]){const ctx=await makeContext({mobile});contexts.push(ctx);await examine(ctx,mobile);}
 writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify({outcomes,states,safety:'Actual SPA synthetic guarded transport only; two draft save attempts simulated, zero finalizations and zero production patient writes.'},null,2));
 writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><h1>413 actual SPA synthetic acceptance</h1><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
}catch(e){writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:e.message,outcomes,states},null,2));for(const [i,ctx]of contexts.entries())await ctx.page.screenshot({path:`${out}/screenshots/failure-${i}.png`}).catch(()=>{});throw e;}finally{for(const ctx of contexts)await ctx.context.close().catch(()=>{});await browser.close();}
