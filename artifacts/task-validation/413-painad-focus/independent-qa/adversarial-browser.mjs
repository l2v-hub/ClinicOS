import {writeFileSync} from 'node:fs';
process.env.QA_FIXTURE_ONLY='1';
const {browser,makeContext,openChart,finish,out,states,expect}=await import('../qa-fixture.mjs');
const outcomes=[], contexts=[];
async function start(ctx){await openChart(ctx); await ctx.page.getByRole('tab',{name:/^Moduli/}).click();await ctx.page.getByRole('button',{name:'Apri PAINAD',exact:true}).click();await ctx.page.getByRole('button',{name:'Nuova valutazione PAINAD',exact:true}).click();await expect(ctx.page.locator('.paper-sheet--painad')).toBeVisible();}
async function unobscured(locator){const box=await locator.boundingBox();expect(box).not.toBeNull();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(locator.page().viewportSize().height);expect(await locator.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===e||e.contains(hit));})).toBe(true);return box;}
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log('PASS '+name);}
try{
 const tablet=await makeContext({mobile:true});contexts.push(tablet);await tablet.page.setViewportSize({width:820,height:1180});await start(tablet);
 await check('Tablet 820x1180 first question and toolbar unobscured after startup and midpoint scroll',async()=>{
  const first=tablet.page.locator('input[data-field-path=respiration]').first(),toolbar=tablet.page.getByRole('region',{name:'Azioni compilazione PAINAD'});
  await expect(first).toBeFocused();await unobscured(first);await unobscured(toolbar);
  const middle=tablet.page.locator('input[data-field-path=facialExpression]').last();await middle.focus();await middle.evaluate(e=>e.scrollIntoView({block:'center'}));await expect(middle).toBeFocused();await unobscured(middle);await unobscured(toolbar);
  await tablet.page.screenshot({path:`${out}/screenshots/tablet-midpoint.png`});
 });await finish(tablet,'tablet');
 const date=await makeContext();contexts.push(date);await start(date);
 await check('Invalid required date remains reachable when compact metadata collapsed and save pressed',async()=>{
  await date.page.locator('.painad-metadata summary').click();const field=date.page.locator('.assessment-date input');await field.fill('');await date.page.locator('.painad-metadata summary').click();
  await date.page.getByRole('button',{name:'Salva bozza',exact:true}).click();
  await expect(field).toBeVisible();await expect(field).toBeFocused();await unobscured(field);
  expect(date.state.requests.filter(r=>r.method==='POST'&&r.path.endsWith('/assessments'))).toHaveLength(0);
  await date.page.screenshot({path:`${out}/screenshots/invalid-date-reachable.png`});
 });await finish(date,'invalid-date');
 writeFileSync(`${out}/test-results/adversarial-results.json`,JSON.stringify({outcomes,states},null,2));
 writeFileSync(`${out}/playwright-report/index.html`,'<!doctype html><meta charset="utf-8"><h1>413 independent adversarial assertions</h1><ul>'+outcomes.map(o=>`<li>${o.status}: ${o.name}</li>`).join('')+'</ul>');
}catch(e){writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:e.message,outcomes,states},null,2));for(const [i,ctx]of contexts.entries())if(!ctx.page.isClosed()){await ctx.page.screenshot({path:`${out}/screenshots/failure-${i}.png`}).catch(()=>{});await ctx.context.tracing.stop({path:`${out}/failure-${i}-trace.zip`}).catch(()=>{});}throw e;}finally{for(const ctx of contexts)await ctx.context.close().catch(()=>{});await browser.close();}
