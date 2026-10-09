const {createRequire}=require('node:module');
const {test,expect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const fs=require('node:fs');
const out=__dirname;
fs.mkdirSync(out+'/screenshots',{recursive:true});
const patient={id:'QA-418-INDEPENDENT',firstName:'Caso',lastName:'Sintetico QA',dateOfBirth:'1970-01-01',sex:'F',medicalRecordNumber:'QA-ONLY-418',location:{status:'unassigned',room:null,bed:null,source:null}};
const nurse={id:'QA-418-NURSE',name:'Infermiere QA418',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const at=new Date('2026-10-25T01:05:00Z');
const row=(id,measuredAt,values)=>({id,patientId:patient.id,requestId:id,measuredAt,values,createdAt:measuredAt,authorOperatorId:nurse.id,authorName:nurse.name});
function history(){return [row('QA-minutes','2026-10-25T00:59:00Z',{fr:'19'}),row('QA-days','2026-10-21T01:05:00Z',{spo2:'95',o2:'no'}),row('QA-weeks','2026-10-04T01:05:00Z',{fr:'15',spo2:'98',o2:'no',pa:'124/76',fc:'74',temperatura:'36,6',coscienza:'A',dtx:'104'})];}
const fields=['FR','SpO₂','O₂','PA sistolica','PA diastolica','FC','TC','Coscienza','DTX','Evacuazione','Note sulla rilevazione'];
async function setup(page,context,{rows=history(),now=at,hasMore=false}={}){
 const state={calls:[],blocked:[],writes:[],consoleErrors:[],pageErrors:[],httpErrors:[]};
 const caps=['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','clinical_record.update','diary.list','parameters.list_readings','narrative.list','narrative.update','documents.list','parameters.list_page','parameters.create_reading','parameters.save_reading','assessments.catalog','assessments.list','assessments.read'];
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname,method=request.method();
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(url.origin==='http://127.0.0.1:7483')return route.continue();
  if(url.origin!=='http://localhost:3001'){state.blocked.push({method,origin:url.origin});return route.abort();}
  state.calls.push({method,path:p,query:url.search});
  const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(p==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(p==='/auth/simulator/identities')return json({identities:[nurse]});
  if(p==='/auth/simulator/session'&&method==='POST')return json({token:'synthetic-qa418-session'});
  if(p==='/auth/me')return json({...nurse,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(caps.map(key=>[key,{allowed:true,effect:'ALLOWED'}]))});
  if(p==='/patients/page/search'&&method==='POST')return json({items:[patient],hasMore:false,nextCursor:null});
  if(method!=='GET'){state.writes.push({method,path:p});return route.fulfill({status:500,contentType:'application/json',body:'{"error":"QA guard rejected mutation"}'});}
  if(p==='/me/roster-order')return json({effective:{criterion:'name',direction:'asc'},source:'system',canEdit:false,canEditDefault:false});
  if(p==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(p==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ambulatoriale',consegneAperte:0,hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0}]);
  if(p==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(p==='/patients/settings')return json({deleteEnabled:false});
  if(p===`/patients/${patient.id}`)return json(patient);
  if(p===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ambulatoriale',allergieStatus:'unknown',allergie:[],diagnosi:[],anamnesi:{patologicaRemota:'',note:''}}});
  if(p===`/patients/${patient.id}/parameter-readings`)return json({readings:rows,hasMore,nextCursor:hasMore?'QA-next-page':null});
  if(p==='/patients/parameters/page')return json({items:[{patient,cartella:{pazienteId:patient.id,readingCount:rows.length,noteCount:0,lastReadingAt:rows[0]?.measuredAt}}],hasMore:false,nextCursor:null});
  if(p===`/patients/${patient.id}/room-options`)return json([]);
  if(p===`/patients/${patient.id}/narrative-sections`)return json({sections:[]});
  if(p===`/patients/${patient.id}/diary`)return json({entries:[],hasMore:false,nextCursor:null});
  if(p===`/patients/${patient.id}/therapies/page`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,inactive:0}});
  if(p===`/patients/${patient.id}/documents`)return json({documents:[],sourceMatch:null,pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
  if(p===`/patients/${patient.id}/intake-review`)return json({state:'none',items:[]});
  if(p===`/patients/${patient.id}/assessments/catalog`)return json({items:[]});
  if(p===`/patients/${patient.id}/assessments`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
  if(p==='/patients/diary-unread-count')return json({unreadCount:0});
  if(p==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(p==='/consegne')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(p==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(p==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
  if(['/therapy-slots','/appointments'].includes(p))return json([]);
  state.blocked.push({method,path:p});return route.fulfill({status:500,contentType:'application/json',body:'{"error":"Unexpected guarded API"}'});
 });
 page.on('console',msg=>{if(msg.type()==='error')state.consoleErrors.push(msg.text());});
 page.on('pageerror',e=>state.pageErrors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 await page.clock.install({time:now});
 await page.goto('/#/operator-dashboard');
 await page.getByRole('button',{name:nurse.name}).click();
 await expect(page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
 return state;
}
async function menu(page,item){if(await page.getByRole('button',{name:'Apri menu'}).isVisible())await page.getByRole('button',{name:'Apri menu'}).click();await page.locator('.teams-sidebar').getByRole('button',{name:item,exact:true}).click();}
async function open(page,view){
 if(view==='ward'){await menu(page,'Parametri');return page.getByRole('form',{name:'Nuova rilevazione',exact:true});}
 await menu(page,'Pazienti');await page.getByRole('button',{name:'Apri cartella di Caso Sintetico QA',exact:true}).click();
 await expect(page.getByRole('tab',{name:/^Panoramica/})).toBeVisible();
 if(view==='chart')await page.getByRole('tab',{name:/Parametri/}).click();
 return view==='overview'?page.getByRole('region',{name:'Ultimi parametri e NEWS2'}):page.getByRole('form',{name:'Nuova rilevazione',exact:true});
}
async function clean(state,testInfo){for(const key of ['blocked','writes','consoleErrors','pageErrors','httpErrors'])expect(state[key],key).toEqual([]);const calls=state.calls.filter(r=>r.path.endsWith('/parameter-readings'));expect(calls.length).toBeGreaterThan(0);for(const c of calls){const q=new URLSearchParams(c.query);expect(q.get('limit')===null||Number(q.get('limit'))<=50).toBe(true);expect(q.get('cursor')).toBeNull();}await testInfo.attach('safe-network-receipt',{body:Buffer.from(JSON.stringify(state,null,2)),contentType:'application/json'});}
async function blank(form){for(const field of fields)await expect(form.getByLabel(`Nuova rilevazione ${field}`,{exact:true})).toHaveValue('');await expect(form.getByRole('status').filter({hasText:'NEWS2 in tempo reale'})).toContainText('NEWS2 in tempo reale · —');}
async function verifyRange(surface,view){
 const examples=[['FR','19','25/10/2026 02:59','6 minuti fa'],['SpO₂','95','21/10/2026 03:05','4 giorni fa'],['FC','74','04/10/2026 03:05','3 settimane fa']];
 for(const [field,value,date,age] of examples){const block=view==='overview'?surface.locator('.vt').filter({has:surface.page().locator('.vt__label',{hasText:new RegExp(`^${field}$`)})}):surface.locator('label').filter({has:surface.getByLabel(`Nuova rilevazione ${field}`,{exact:true})});await expect(block).toBeVisible();await expect(block).toContainText(value);await expect(block).toContainText(date);await expect(block).toContainText(age);}
}
const profiles=[{name:'desktop',viewport:{width:1150,height:1004},isMobile:false,hasTouch:false,deviceScaleFactor:1},{name:'tablet-emulated',viewport:{width:768,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:2},{name:'mobile-emulated',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}];
for(const profile of profiles){test.describe(profile.name,()=>{test.use({...profile,timezoneId:'America/Los_Angeles'});for(const view of ['overview','chart','ward'])test(`${view}: DST minutes days weeks associated, wraps and read-only idle`,async({page,context},info)=>{
 const state=await setup(page,context);const surface=await open(page,view);await expect(surface).toBeVisible();await verifyRange(surface,view);
 const captions=surface.locator(view==='overview'?'.reading-recency':'.parameter-reading-form__previous');
 const metrics=await captions.evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {text:el.textContent,font:+s.fontSize.replace('px',''),color:s.color,whiteSpace:s.whiteSpace,x:r.x,right:r.right,client:el.clientWidth,scroll:el.scrollWidth,width:r.width};}));
 expect(metrics.length).toBeGreaterThan(0);for(const m of metrics){expect(m.font).toBeGreaterThanOrEqual(14);expect(m.whiteSpace).toBe('normal');expect(m.x).toBeGreaterThanOrEqual(0);expect(m.right).toBeLessThanOrEqual(profile.viewport.width);expect(m.scroll).toBeLessThanOrEqual(m.client+1);expect(m.text).not.toMatch(/attuale|appena rilevato|rilevato ora/i);}
 if(view!=='overview'){await blank(surface);await surface.getByLabel('Nuova rilevazione DTX',{exact:true}).fill('105');}
 const count=state.calls.filter(x=>x.path.endsWith('/parameter-readings')).length;
 await page.clock.fastForward(120000);await expect(surface).toContainText('8 minuti fa');expect(state.calls.filter(x=>x.path.endsWith('/parameter-readings')).length).toBe(count);
 if(view!=='overview'){await expect(surface.getByLabel('Nuova rilevazione DTX',{exact:true})).toHaveValue('105');await surface.getByLabel('Nuova rilevazione FR',{exact:true}).focus();for(const field of fields){await expect(surface.getByLabel(`Nuova rilevazione ${field}`,{exact:true})).toBeFocused();await page.keyboard.press('Tab');}await surface.getByLabel('Nuova rilevazione SpO₂',{exact:true}).press('Enter');await expect(surface.getByLabel('Nuova rilevazione O₂',{exact:true})).toBeFocused();}
 await page.screenshot({path:`${out}/screenshots/${profile.name}-${view}.png`,fullPage:true});await info.attach('caption-metrics',{body:Buffer.from(JSON.stringify(metrics)),contentType:'application/json'});await clean(state,info);
});});}
test.use({viewport:{width:1150,height:1004},timezoneId:'Asia/Tokyo'});
test('expanded comparison has own full provenance and historical NEWS2 remains zero',async({page,context},info)=>{
 const state=await setup(page,context);await open(page,'overview');await page.getByRole('button',{name:'Espandi ultimi parametri e NEWS2'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const fr=dialog.locator('.vt').filter({has:page.locator('.vt__label',{hasText:/^FR$/})});await expect(fr).toContainText('19');await expect(fr).toContainText('era 15');await expect(fr.locator('.vt__comparison')).toContainText('04/10/2026 03:05');await expect(fr.locator('.vt__comparison')).toContainText('3 settimane fa');const news=dialog.locator('.vt--news2');await expect(news).toBeVisible();await expect(news.locator('.vt__value')).toHaveText('0punti');await expect(news).toContainText('04/10/2026 03:05');await expect(news).toHaveAccessibleName(/NEWS2 0.*3 settimane fa.*Da aggiornare/);await page.screenshot({path:out+'/screenshots/expanded-provenance.png',fullPage:true});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Espandi ultimi parametri e NEWS2'})).toBeFocused();await clean(state,info);
});
for(const view of ['overview','chart','ward'])test(`${view}: impossible/unzoned/future timestamps never imply present`,async({page,context},info)=>{
 const rows=history();rows[0].measuredAt='2026-02-30T10:00:00Z';rows[1].measuredAt='2026-10-26T01:05:00Z';rows[2].measuredAt='2026-10-04T03:05:00';const state=await setup(page,context,{rows});const surface=await open(page,view);await expect(surface).toBeVisible();await expect(surface).toContainText('Data/ora non verificabile');await expect(surface).toContainText('data/ora futura — da verificare');if(view!=='overview')await blank(surface);await page.screenshot({path:`${out}/screenshots/${view}-invalid-future.png`,fullPage:true});await clean(state,info);
});
test('bounded partial history does not invent empty history or populate new controls',async({page,context},info)=>{
 const rows=[row('QA-only-FR','2026-10-25T00:59:00Z',{fr:'19'})];const state=await setup(page,context,{rows,hasMore:true});const form=await open(page,'ward');await expect(form).toBeVisible();await blank(form);await expect(form.locator('label').filter({has:form.getByLabel('Nuova rilevazione DTX',{exact:true})})).toContainText("Prima: non nell'ultima rilevazione");await expect(form).not.toContainText('Nessuna rilevazione precedente');await page.clock.fastForward(120000);await blank(form);await clean(state,info);
});
test('spring DST transition is six elapsed minutes despite wall-clock jump',async({page,context},info)=>{
 const rows=[row('QA-spring','2026-03-29T00:59:00Z',{fr:'18'})];const state=await setup(page,context,{rows,now:new Date('2026-03-29T01:05:00Z')});const surface=await open(page,'overview');await expect(surface).toBeVisible();const fr=surface.locator('.vt').filter({has:page.locator('.vt__label',{hasText:/^FR$/})});await expect(fr).toContainText('18');await expect(fr).toContainText('29/03/2026 01:59');await expect(fr).toContainText('6 minuti fa');await clean(state,info);
});
