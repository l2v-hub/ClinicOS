import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {chromium,expect:baseExpect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test'),expect=baseExpect.configure({timeout:60000}),out=resolve(process.argv[2]),before=process.env.BEFORE==='1';
assert.ok(process.argv[2]);for(const p of ['screenshots','video','trace','test-results'])mkdirSync(out+'/'+p,{recursive:true});
const browser=await chromium.launch({headless:true}),outcomes=[],states=[],contexts=[];
const identities=[{id:'QA-SUPERVISOR-426',name:'Supervisore Sintetico',roleLabel:'Supervisore',appRole:'administrator',uiShell:'admin'}];
const room=(numero,index)=>({id:'QA-ROOM-426-'+index,numero,tipo:'doppia',piano:'1',reparto:'Reparto Sintetico',stato:'attiva',note:'',beds:['A','B'].map(label=>({id:`QA-BED-426-${index}-${label}`,roomId:'QA-ROOM-426-'+index,label,stato:'libero',note:'',assignments:[]}))});
async function setup(width,height,fixtureRooms){
 const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out+'/video'}});contexts.push(context);await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={rooms:fixtureRooms||[room('101',1),room('102',2)],requests:[],unexpected:[],external:[],clinicalWrites:[],allowedMockMutations:[],errors:[],pageErrors:[],httpErrors:[],allowMutation:false,delay:false,expectedErrors:0};states.push(state);
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),path=u.pathname;
  if(u.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  const api=u.hostname==='localhost'&&u.port==='3001'||['clinicos-backend-demo.up.railway.app','clinicos-backend-production-df88.up.railway.app'].includes(u.hostname);
  if(!api){const app=new URL(process.env.APP_URL||'http://127.0.0.1:7517'),local=['localhost','127.0.0.1'].includes(app.hostname);if(req.method()==='GET'&&u.origin===app.origin&&(local||path==='/'||path.startsWith('/assets/')||path==='/favicon.ico'))return route.continue();state.external.push(u.origin);return route.abort();}
  state.requests.push({method:req.method(),path});const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities});
  if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic-426-not-a-secret'});
  if(path==='/auth/simulator/logout'&&req.method()==='POST')return json({ok:true});
  if(req.method()!=='GET'){
   if(!state.allowMutation||!/^\/admin\/(rooms|beds)\/QA-(ROOM|BED)-426-/.test(path)){state.clinicalWrites.push({method:req.method(),path});return json({error:'Real or unauthorized mutation forbidden'},500);}
   state.allowedMockMutations.push({method:req.method(),path,body:req.postData()});if(state.delay){state.held=true;await new Promise(r=>state.release=r);state.held=false;}
   if(state.fail){state.fail=false;state.expectedErrors++;return json({error:'Errore sintetico salvataggio'},409);}
   const body=JSON.parse(req.postData()||'{}'),id=path.split('/').at(-1);if(path.includes('/beds/')){const target=state.rooms.flatMap(r=>r.beds).find(b=>b.id===id);assert.ok(target);Object.assign(target,body);}else{const target=state.rooms.find(r=>r.id===id);assert.ok(target);Object.assign(target,body);}
   return json({ok:true});
  }
  if(path==='/auth/me'){const capabilities=Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','diary.list','admin.rooms'].map(k=>[k,{allowed:true,effect:'ALLOWED'}]));capabilities['intake.create_draft']={allowed:false,effect:'DENIED'};return json({...identities[0],role:'admin',authMode:'disabled',temporaryDemo:false,capabilities});}
  if(path==='/admin/rooms')return json(state.rooms);
  if(path==='/admin/rooms/occupancy')return json({totalRooms:2,totalBeds:4,occupiedBeds:0,freeBeds:4,maintenanceBeds:0,occupancyPct:0});
  if(path==='/patients/page'||path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path==='/patients/clinical-summary')return json([]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:0,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/patients/diary-unread-count')return json({unreadCount:0});
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(['/therapy-slots','/appointments'].includes(path))return json([]);
  if(path==='/consegne/overview')return json({scope:'admin',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(['/operators/directory/page','/operators/page'].includes(path))return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,matching:0,appointmentsToday:0}});
  state.unexpected.push(req.method()+' '+path);return json({error:'Unexpected guarded API'},500);
 });
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 await page.goto((process.env.APP_URL||'http://127.0.0.1:7517')+'/#/posti-letto');await page.getByRole('button',{name:/Supervisore Sintetico/}).click();await page.getByRole('button',{name:/Gestione posti letto/}).click();await expect(page.locator('.rooms-grid .room-card')).toHaveCount(2);return {context,page,state};
}
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log('PASS '+name);}
async function finish(ctx,name){for(const k of ['clinicalWrites','unexpected','external','pageErrors'])expect(ctx.state[k],k).toEqual([]);expect(ctx.state.httpErrors).toEqual(Array.from({length:ctx.state.expectedErrors},()=>({status:409,path:'/admin/beds/QA-BED-426-2-B'})));expect(ctx.state.errors.length).toBe(ctx.state.expectedErrors);for(const e of ctx.state.errors)expect(e).toContain('409');await ctx.context.tracing.stop({path:out+'/trace/'+name+'.zip'});const video=ctx.page.video();await ctx.context.close();await video.saveAs(out+'/video/'+name+'.webm');await video.delete();}
async function reloadFacility(page){await page.reload();await page.getByRole('button',{name:/Supervisore Sintetico/}).click();await page.getByRole('button',{name:/Gestione posti letto/}).click();}
async function hit(locator){await locator.scrollIntoViewIfNeeded();return locator.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&el.contains(document.elementFromPoint(x,y));});}

async function geometry(locator,container){return locator.evaluate((el,selector)=>{const r=el.getBoundingClientRect(),d=el.closest(selector).getBoundingClientRect();return {left:r.left,right:r.right,containerLeft:d.left,containerRight:d.right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,viewport:innerWidth};},container);}
try{
 const r=room('W'.repeat(32),1),ctx=await setup(390,844,[r,room('102',2)]),{page,state}=ctx;
 await check('Bound32 complete confirmation message and destructivebutton wrap without clipped text; pixelhit cancel only',async()=>{
  const label='Elimina camera '+r.numero,opener=page.getByRole('button',{name:label,exact:true});
  await expect(opener).toBeVisible();await expect(opener).toHaveAttribute('title',label);expect(await hit(opener)).toBe(true);await opener.click();
  const title='Eliminare la camera '+r.numero+'?',dialog=page.getByRole('alertdialog',{name:title,exact:true});
  await expect(dialog).toBeVisible();
  const message=dialog.locator('.confirm-dialog__message'),danger=dialog.getByRole('button',{name:label,exact:true}),cancel=dialog.getByRole('button',{name:'Annulla',exact:true});
  await expect(message).toHaveText("La camera "+r.numero+" verrà eliminata. L'azione non è reversibile.");
  await expect(danger).toHaveText(label);await expect(danger).toBeVisible();await expect(danger).toHaveClass(/btn-danger/);await expect(cancel).toBeVisible();
  const all=[];
  for(const [name,el] of [['heading',dialog.getByRole('heading',{name:title,exact:true})],['message',message],['destructivebutton',danger],['cancel',cancel]]) {
   const g=await el.evaluate(el=>{
    const r=el.getBoundingClientRect(),d=el.closest('[role=alertdialog]').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);
    const rects=Array.from(range.getClientRects()).map(t=>({left:t.left,right:t.right,top:t.top,bottom:t.bottom}));
    const style=getComputedStyle(el),parents=[];for(let p=el.parentElement;p;p=p.parentElement){const b=p.getBoundingClientRect(),s=getComputedStyle(p);parents.push({className:p.className,top:b.top,bottom:b.bottom,scrollTop:p.scrollTop,height:s.height,overflow:s.overflow,transform:s.transform,flex:s.flex});}
    return {text:el.textContent,computed:{flex:style.flex,height:style.height,whiteSpace:style.whiteSpace,overflow:style.overflow},parents,left:r.left,right:r.right,top:r.top,bottom:r.bottom,dialogLeft:d.left,dialogRight:d.right,dialogTop:d.top,dialogBottom:d.bottom,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,viewportWidth:innerWidth,viewportHeight:innerHeight,textRects:rects};
   });all.push({name,...g});writeFileSync(out+'/test-results/confirmation-complete-text-geometry.json',JSON.stringify(all,null,2));
   expect(g.top,name+' top fully in dialog/viewport').toBeGreaterThanOrEqual(Math.max(0,g.dialogTop));expect(g.bottom,name+' bottom fully in dialog/viewport').toBeLessThanOrEqual(Math.min(g.viewportHeight,g.dialogBottom));
   expect(g.left,name+' left inside dialog').toBeGreaterThanOrEqual(Math.max(0,g.dialogLeft));
   expect(g.right,name+' right inside dialog').toBeLessThanOrEqual(Math.min(g.viewportWidth,g.dialogRight));
   expect(g.scrollWidth,name+' text wraps horizontally').toBeLessThanOrEqual(g.clientWidth);
   expect(g.scrollHeight,name+' text not vertically clipped').toBeLessThanOrEqual(g.clientHeight);
   for(const text of g.textRects){expect(text.left,name+' glyphs left').toBeGreaterThanOrEqual(g.left-1);expect(text.right,name+' glyphs right').toBeLessThanOrEqual(g.right+1);expect(text.top,name+' glyphs top').toBeGreaterThanOrEqual(g.top-1);expect(text.bottom,name+' glyphs bottom').toBeLessThanOrEqual(g.bottom+1);}
  }
  writeFileSync(out+'/test-results/confirmation-complete-text-geometry.json',JSON.stringify(all,null,2));
  expect(await hit(danger)).toBe(true);expect(await hit(cancel)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:out+'/screenshots/mobile-complete-confirmation-context.png'});
  await cancel.click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();expect(state.allowedMockMutations).toEqual([]);expect(state.requests.filter(r=>r.method==='DELETE')).toEqual([]);
 });
 await finish(ctx,'confirm-bounds-mobile');
 writeFileSync(out+'/test-results/browser-results.json',JSON.stringify({outcomes,states,applicationCommit:process.env.SOURCE_COMMIT,fixtureTransport:'All APIs/auth mocked beforewire; complete DOM text plus glyph rect geometry/no clipping and real pixel hit. CANCEL ONLY no DELETE or any facility mutation. Not hardware/AT/DB certification.'},null,2));
}catch(e){for(const [i,c]of contexts.entries()){const p=c.pages()[0];if(p)await p.screenshot({path:out+'/screenshots/failure-'+i+'.png'}).catch(()=>{});await c.tracing.stop({path:out+'/trace/failure-'+i+'.zip'}).catch(()=>{});}writeFileSync(out+'/test-results/failure.json',JSON.stringify({message:e.message,stack:e.stack,outcomes,states},null,2));throw e;}finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();}



