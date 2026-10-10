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
try{
 const ctx=await setup(1280,720),{page,state}=ctx;state.allowMutation=true;
 await check('Independent bed busy409 retains exact target, all5controls disabled and singleflight; synthetic retry reload',async()=>{
  const label='Modifica letto "B" della camera "102"';await page.getByRole('button',{name:label,exact:true}).click();
  const dialog=page.getByRole('dialog',{name:label,exact:true});await expect(dialog).toBeVisible();await dialog.getByLabel('Stato',{exact:true}).selectOption('manutenzione');await dialog.getByLabel('Note',{exact:true}).fill('Nota sintetica QA426');
  state.delay=true;state.fail=true;await dialog.getByRole('button',{name:'Salva',exact:true}).click();await expect.poll(()=>state.held).toBe(true);await expect(dialog.locator('button:disabled,input:disabled,select:disabled')).toHaveCount(5);await page.keyboard.press('Escape');await expect(dialog).toBeVisible();expect(state.allowedMockMutations.length).toBe(1);expect(state.allowedMockMutations[0].path).toBe('/admin/beds/QA-BED-426-2-B');expect(JSON.parse(state.allowedMockMutations[0].body)).toEqual({stato:'manutenzione',note:'Nota sintetica QA426'});
  await page.screenshot({path:out+'/screenshots/independent-bed-busy.png'});state.release();state.delay=false;await expect(dialog.getByRole('button',{name:'Salva',exact:true})).toBeEnabled();await expect(dialog.getByLabel('Note',{exact:true})).toHaveValue('Nota sintetica QA426');await expect(page.getByRole('alert')).toContainText('Errore sintetico salvataggio');
  await dialog.getByRole('button',{name:'Salva',exact:true}).click();await expect(dialog).toHaveCount(0);expect(state.allowedMockMutations.length).toBe(2);await reloadFacility(page);await page.getByRole('button',{name:label,exact:true}).click();await expect(page.getByRole('dialog',{name:label,exact:true}).getByLabel('Stato',{exact:true})).toHaveValue('manutenzione');await expect(page.getByRole('dialog',{name:label,exact:true}).getByLabel('Note',{exact:true})).toHaveValue('Nota sintetica QA426');await page.screenshot({path:out+'/screenshots/independent-bed-mock-reload.png'});await page.keyboard.press('Escape');
 });
 await check('Independent room rename PUT targets capturedoriginal ID, mock-only reload confirms renamedresource',async()=>{
  await page.getByRole('button',{name:'Modifica camera 101',exact:true}).click();const editor=page.getByRole('region',{name:'Modifica camera 101',exact:true});await expect(editor).toBeVisible();await editor.getByLabel('N° camera *',{exact:true}).fill('103');await expect(editor.getByRole('heading',{name:'Modifica camera 101',exact:true})).toBeVisible();await editor.getByRole('button',{name:'Salva modifiche',exact:true}).click();await expect(page.getByRole('button',{name:'Modifica camera 103',exact:true})).toBeVisible();const req=state.allowedMockMutations.at(-1);expect(req.method).toBe('PUT');expect(req.path).toBe('/admin/rooms/QA-ROOM-426-1');expect(JSON.parse(req.body).numero).toBe('103');await reloadFacility(page);await expect(page.getByRole('button',{name:'Modifica camera 103',exact:true})).toBeVisible();await page.screenshot({path:out+'/screenshots/independent-room-mock-reload.png'});
 });
 await check('Independent creation heading notstale editidentity and cancel issues noPOST',async()=>{
  const count=state.allowedMockMutations.length;await page.getByRole('button',{name:'Nuova camera',exact:true}).click();const editor=page.getByRole('region',{name:'Nuova camera',exact:true});await expect(editor).toBeVisible();await expect(editor.getByLabel('N° camera *',{exact:true})).toHaveValue('');await expect(editor.getByRole('button',{name:'Crea camera',exact:true})).toBeVisible();await editor.getByRole('button',{name:'Annulla',exact:true}).click();expect(state.allowedMockMutations.length).toBe(count);
 });await finish(ctx,'supplemental-desktop');
 const hostileRooms=[room('1 della camera 2',1),room('2',2)];hostileRooms[1].beds[0].label='A della camera 1';hostileRooms[1].beds[1].label='<img src=x onerror=1>';const hostile=await setup(1280,720,hostileRooms);
 await check('Independent arbitrary separator/hostilelabels unique literalnames notHTML execution',async()=>{
  const p=hostile.page;for(const r of hostileRooms){for(const b of r.beds){const label='Modifica letto '+JSON.stringify(b.label)+' della camera '+JSON.stringify(r.numero),opener=p.getByRole('button',{name:label,exact:true});await expect(opener).toHaveCount(1);await expect(opener).toHaveAttribute('title',label);await opener.click();const d=p.getByRole('dialog',{name:label,exact:true});await expect(d).toBeVisible();await expect(d.getByRole('heading',{name:label,exact:true})).toBeVisible();await expect(d.locator('img')).toHaveCount(0);await p.keyboard.press('Escape');await expect(opener).toBeFocused();}}
  await p.getByRole('button',{name:'Modifica letto "<img src=x onerror=1>" della camera "2"',exact:true}).click();await p.screenshot({path:out+'/screenshots/independent-hostile-literal-label.png'});await p.keyboard.press('Escape');expect(hostile.state.allowedMockMutations).toEqual([]);
 });await finish(hostile,'supplemental-hostile');
 const mobile=await setup(390,844);
 await check('Independent mobile pixelhit tests roomedit/delete and all beddialog fields/buttons',async()=>{
  const p=mobile.page;for(const name of ['Modifica camera 101','Elimina camera 101'])expect(await hit(p.getByRole('button',{name,exact:true}))).toBe(true);const label='Modifica letto "A" della camera "101"';const opener=p.getByRole('button',{name:label,exact:true});expect(await hit(opener)).toBe(true);await opener.click();const d=p.getByRole('dialog',{name:label,exact:true});await expect(d).toBeVisible();for(const el of [d.getByLabel('Stato',{exact:true}),d.getByLabel('Note',{exact:true}),d.getByRole('button',{name:'Salva',exact:true}),d.getByRole('button',{name:'Annulla',exact:true}),d.getByRole('button',{name:'Chiudi '+label,exact:true})])expect(await hit(el)).toBe(true);await p.screenshot({path:out+'/screenshots/independent-mobile-hit-tested.png'});await p.keyboard.press('Escape');expect(mobile.state.allowedMockMutations).toEqual([]);
 });await finish(mobile,'supplemental-mobile');
 writeFileSync(out+'/test-results/browser-results.json',JSON.stringify({outcomes,states,applicationCommit:process.env.SOURCE_COMMIT,fixtureTransport:'All endpoints mocked beforewire. Exactoriginal PUT IDs + controlled409 and stateful mockreload only; NOT real persistence/DB. Zero actualDELETE/livewrites.'},null,2));
}catch(e){for(const [i,c]of contexts.entries()){const p=c.pages()[0];if(p)await p.screenshot({path:out+'/screenshots/failure-'+i+'.png'}).catch(()=>{});await c.tracing.stop({path:out+'/trace/failure-'+i+'.zip'}).catch(()=>{});}writeFileSync(out+'/test-results/failure.json',JSON.stringify({message:e.message,stack:e.stack,outcomes,states},null,2));throw e;}finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();}

