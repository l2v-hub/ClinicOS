# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: independent.spec.cjs >> ward: synthetic read-only history retains its date/value provenance after reload
- Location: artifacts\task-validation\418-reading-recency\independent-qa418-final\independent.spec.cjs:120:39

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('form', { name: 'Nuova rilevazione', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('form', { name: 'Nuova rilevazione', exact: true })

```

```yaml
- text: ✚
- heading "ClinicOS" [level=1]
- paragraph: Sistema di Gestione Clinica
- paragraph: Scegli il profilo con cui accedere
- region "Simulatore ruoli — solo sviluppo":
  - note:
    - strong: Simulatore ruoli — solo sviluppo
    - text: Profili simulati definiti dal server. Il ruolo e i permessi li decide il server.
  - list:
    - listitem:
      - button "Infermiere QA418 Infermiere"
- paragraph: Simulatore ruoli — nessuna credenziale reale
```

# Test source

```ts
  22  |   const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  23  |   if(p==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  24  |   if(p==='/auth/simulator/identities')return json({identities:[nurse]});
  25  |   if(p==='/auth/simulator/session'&&method==='POST')return json({token:'synthetic-qa418-session'});
  26  |   if(p==='/auth/me')return json({...nurse,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(caps.map(key=>[key,{allowed:true,effect:'ALLOWED'}]))});
  27  |   if(p==='/patients/page/search'&&method==='POST')return json({items:[patient],hasMore:false,nextCursor:null});
  28  |   if(method!=='GET'){state.writes.push({method,path:p});return route.fulfill({status:500,contentType:'application/json',body:'{"error":"QA guard rejected mutation"}'});}
  29  |   if(p==='/me/roster-order')return json({effective:{criterion:'name',direction:'asc'},source:'system',canEdit:false,canEditDefault:false});
  30  |   if(p==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  31  |   if(p==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ambulatoriale',consegneAperte:0,hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0}]);
  32  |   if(p==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  33  |   if(p==='/patients/settings')return json({deleteEnabled:false});
  34  |   if(p===`/patients/${patient.id}`)return json(patient);
  35  |   if(p===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ambulatoriale',allergieStatus:'unknown',allergie:[],diagnosi:[],anamnesi:{patologicaRemota:'',note:''}}});
  36  |   if(p===`/patients/${patient.id}/parameter-readings`)return json({readings:rows,hasMore,nextCursor:hasMore?'QA-next-page':null});
  37  |   if(p==='/patients/parameters/page')return json({items:[{patient,cartella:{pazienteId:patient.id,readingCount:rows.length,noteCount:0,lastReadingAt:rows[0]?.measuredAt}}],hasMore:false,nextCursor:null});
  38  |   if(p===`/patients/${patient.id}/room-options`)return json([]);
  39  |   if(p===`/patients/${patient.id}/narrative-sections`)return json({sections:[]});
  40  |   if(p===`/patients/${patient.id}/diary`)return json({entries:[],hasMore:false,nextCursor:null});
  41  |   if(p===`/patients/${patient.id}/therapies/page`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,inactive:0}});
  42  |   if(p===`/patients/${patient.id}/documents`)return json({documents:[],sourceMatch:null,pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
  43  |   if(p===`/patients/${patient.id}/intake-review`)return json({state:'none',items:[]});
  44  |   if(p===`/patients/${patient.id}/assessments/catalog`)return json({items:[]});
  45  |   if(p===`/patients/${patient.id}/assessments`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
  46  |   if(p==='/patients/diary-unread-count')return json({unreadCount:0});
  47  |   if(p==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  48  |   if(p==='/consegne')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,urgentActive:0,urgentTaken:0}});
  49  |   if(p==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  50  |   if(p==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
  51  |   if(['/therapy-slots','/appointments'].includes(p))return json([]);
  52  |   state.blocked.push({method,path:p});return route.fulfill({status:500,contentType:'application/json',body:'{"error":"Unexpected guarded API"}'});
  53  |  });
  54  |  page.on('console',msg=>{if(msg.type()==='error')state.consoleErrors.push(msg.text());});
  55  |  page.on('pageerror',e=>state.pageErrors.push(e.message));
  56  |  page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
  57  |  await page.clock.install({time:now});
  58  |  await page.goto('/#/operator-dashboard');
  59  |  await page.getByRole('button',{name:nurse.name}).click();
  60  |  await expect(page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
  61  |  return state;
  62  | }
  63  | test.afterEach(async({},info)=>{if(globalThis.qa418State)await info.attach('network-state-including-failed-attempt',{body:Buffer.from(JSON.stringify(globalThis.qa418State,null,2)),contentType:'application/json'});});
  64  | async function menu(page,item){if(await page.getByRole('button',{name:'Apri menu'}).isVisible())await page.getByRole('button',{name:'Apri menu'}).click();await page.locator('.teams-sidebar').getByRole('button',{name:item,exact:true}).click();}
  65  | async function open(page,view){
  66  |  if(view==='ward'){await menu(page,'Parametri');return page.getByRole('form',{name:'Nuova rilevazione',exact:true});}
  67  |  await menu(page,'Pazienti');await page.getByRole('button',{name:'Apri cartella di Caso Sintetico QA',exact:true}).click();
  68  |  await expect(page.getByRole('tab',{name:/^Panoramica/})).toBeVisible();
  69  |  if(view==='chart')await page.getByRole('tab',{name:/Parametri/}).click();
  70  |  return view==='overview'?page.getByRole('region',{name:'Ultimi parametri e NEWS2'}):page.getByRole('form',{name:'Nuova rilevazione',exact:true});
  71  | }
  72  | async function clean(state,testInfo){for(const key of ['blocked','writes','consoleErrors','pageErrors','httpErrors'])expect(state[key],key).toEqual([]);const calls=state.calls.filter(r=>r.path.endsWith('/parameter-readings'));expect(calls.length).toBeGreaterThan(0);for(const c of calls){const q=new URLSearchParams(c.query);expect(q.get('limit')===null||Number(q.get('limit'))<=50).toBe(true);expect(q.get('cursor')).toBeNull();}await testInfo.attach('safe-network-receipt',{body:Buffer.from(JSON.stringify(state,null,2)),contentType:'application/json'});}
  73  | async function blank(form){for(const field of fields)await expect(form.getByLabel(`Nuova rilevazione ${field}`,{exact:true})).toHaveValue('');await expect(form.getByRole('status').filter({hasText:'NEWS2 in tempo reale'})).toContainText('NEWS2 in tempo reale · —');}
  74  | async function verifyRange(surface,view){
  75  |  const examples=[['FR','19','25/10/2026 02:59','6 minuti fa'],['SpO₂','95','21/10/2026 03:05','4 giorni fa'],['FC','74','04/10/2026 03:05','3 settimane fa']];
  76  |  for(const [field,value,date,age] of examples){const block=view==='overview'?surface.locator('.vt').filter({has:surface.page().locator('.vt__label',{hasText:new RegExp(`^${field}$`)})}):surface.getByLabel(`Nuova rilevazione ${field}`,{exact:true}).locator('..');await expect(block).toBeVisible();await expect(block).toContainText(value);await expect(block).toContainText(date);await expect(block).toContainText(age);}
  77  | }
  78  | const profiles=[{name:'desktop',viewport:{width:1150,height:1004},isMobile:false,hasTouch:false,deviceScaleFactor:1},{name:'tablet-emulated',viewport:{width:768,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:2},{name:'mobile-emulated',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}];
  79  | for(const profile of profiles){test.describe(profile.name,()=>{test.use({...profile,timezoneId:'America/Los_Angeles'});for(const view of ['overview','chart','ward'])test(`${view}: DST minutes days weeks associated, wraps and read-only idle`,async({page,context},info)=>{
  80  |  const state=await setup(page,context);const surface=await open(page,view);await expect(surface).toBeVisible();await verifyRange(surface,view);
  81  |  const captions=surface.locator(view==='overview'?'.reading-recency':'.parameter-reading-form__previous');
  82  |  const actual=await page.evaluate(()=>({layoutWidth:document.documentElement.clientWidth,documentScroll:document.documentElement.scrollWidth,visualWidth:visualViewport.width,scale:visualViewport.scale,dpr:devicePixelRatio,meta:document.querySelector('meta[name=viewport]')?.content}));
  83  |  const metrics=await captions.evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {text:el.textContent,font:+s.fontSize.replace('px',''),color:s.color,whiteSpace:s.whiteSpace,x:r.x,right:r.right,client:el.clientWidth,scroll:el.scrollWidth,width:r.width};}));
  84  |  expect(metrics.length).toBeGreaterThan(0);expect(actual.documentScroll).toBeLessThanOrEqual(actual.layoutWidth);for(const m of metrics){expect(m.font).toBeGreaterThanOrEqual(14);expect(m.whiteSpace).toBe('normal');expect(m.x).toBeGreaterThanOrEqual(0);expect(m.right).toBeLessThanOrEqual(actual.layoutWidth);expect(m.right*actual.scale).toBeLessThanOrEqual(profile.viewport.width+1);expect(m.scroll).toBeLessThanOrEqual(m.client+1);expect(m.text).not.toMatch(/attuale|appena rilevato|rilevato ora/i);}
  85  |  if(view!=='overview'){await blank(surface);await surface.getByLabel('Nuova rilevazione DTX',{exact:true}).fill('105');}
  86  |  const count=state.calls.filter(x=>x.path.endsWith('/parameter-readings')).length;
  87  |  await page.clock.fastForward(120000);await expect(surface).toContainText('8 minuti fa');expect(state.calls.filter(x=>x.path.endsWith('/parameter-readings')).length).toBe(count);
  88  |  if(view!=='overview'){await expect(surface.getByLabel('Nuova rilevazione DTX',{exact:true})).toHaveValue('105');await surface.getByLabel('Nuova rilevazione FR',{exact:true}).focus();for(const field of fields){await expect(surface.getByLabel(`Nuova rilevazione ${field}`,{exact:true})).toBeFocused();await page.keyboard.press('Tab');}await surface.getByLabel('Nuova rilevazione SpO₂',{exact:true}).press('Enter');await expect(surface.getByLabel('Nuova rilevazione O₂',{exact:true})).toBeFocused();}
  89  |  await page.screenshot({path:`${out}/screenshots/${profile.name}-${view}.png`,fullPage:true});await info.attach('caption-metrics',{body:Buffer.from(JSON.stringify({actual,configured:profile,metrics})),contentType:'application/json'});await clean(state,info);
  90  | });});}
  91  | test.use({viewport:{width:1150,height:1004},timezoneId:'Asia/Tokyo'});
  92  | test('expanded comparison has own full provenance and historical NEWS2 remains zero',async({page,context},info)=>{
  93  |  const state=await setup(page,context);await open(page,'overview');await page.getByRole('button',{name:'Espandi ultimi parametri e NEWS2'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const fr=dialog.locator('.vt').filter({has:page.locator('.vt__label',{hasText:/^FR$/})});await expect(fr).toContainText('19');await expect(fr).toContainText('era 15');await expect(fr.locator('.vt__comparison')).toContainText('04/10/2026 03:05');await expect(fr.locator('.vt__comparison')).toContainText('3 settimane fa');const news=dialog.locator('.vt--news2');await expect(news).toBeVisible();await expect(news.locator('.vt__value')).toHaveText('0punti');await expect(news).toContainText('04/10/2026 03:05');await expect(news).toHaveAccessibleName(/NEWS2 0.*3 settimane fa.*Da aggiornare/);await page.screenshot({path:out+'/screenshots/expanded-provenance.png',fullPage:true});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Espandi ultimi parametri e NEWS2'})).toBeFocused();await clean(state,info);
  94  | });
  95  | for(const view of ['overview','chart','ward'])test(`${view}: impossible/unzoned/future timestamps never imply present`,async({page,context},info)=>{
  96  |  const rows=history();rows[0].measuredAt='2026-02-30T10:00:00Z';rows[1].measuredAt='2026-10-26T01:05:00Z';rows[2].measuredAt='2026-10-04T03:05:00';const state=await setup(page,context,{rows});const surface=await open(page,view);await expect(surface).toBeVisible();await expect(surface).toContainText('Data/ora non verificabile');await expect(surface).toContainText('data/ora futura — da verificare');if(view!=='overview')await blank(surface);await page.screenshot({path:`${out}/screenshots/${view}-invalid-future.png`,fullPage:true});await clean(state,info);
  97  | });
  98  | test('bounded partial history does not invent empty history or populate new controls',async({page,context},info)=>{
  99  |  const rows=[row('QA-only-FR','2026-10-25T00:59:00Z',{fr:'19'})];const state=await setup(page,context,{rows,hasMore:true});const form=await open(page,'ward');await expect(form).toBeVisible();await blank(form);await expect(form.getByLabel('Nuova rilevazione DTX',{exact:true}).locator('..')).toContainText("Prima: non nell'ultima rilevazione");await expect(form).not.toContainText('Nessuna rilevazione precedente');await page.clock.fastForward(120000);await blank(form);await clean(state,info);
  100 | });
  101 | test('spring DST transition is six elapsed minutes despite wall-clock jump',async({page,context},info)=>{
  102 |  const rows=[row('QA-spring','2026-03-29T00:59:00Z',{fr:'18'})];const state=await setup(page,context,{rows,now:new Date('2026-03-29T01:05:00Z')});const surface=await open(page,'overview');await expect(surface).toBeVisible();const fr=surface.locator('.vt').filter({has:page.locator('.vt__label',{hasText:/^FR$/})});await expect(fr).toContainText('18');await expect(fr).toContainText('29/03/2026 01:59');await expect(fr).toContainText('6 minuti fa');await clean(state,info);
  103 | });
  104 | test.describe('tablet diagnostic',()=>{
  105 |  test.use({viewport:{width:768,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:2,timezoneId:'America/Los_Angeles'});
  106 |  test('runtime viewport and ward container bounds',async({page,context},info)=>{
  107 |   const state=await setup(page,context);const form=await open(page,'ward');await expect(form).toBeVisible();await expect(form).toContainText('3 settimane fa');
  108 |   const receipt=await page.evaluate(()=>({innerWidth,innerHeight,dpr:devicePixelRatio,visualViewport:{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale},meta:document.querySelector('meta[name=viewport]')?.content,documentClient:document.documentElement.clientWidth,documentScroll:document.documentElement.scrollWidth,touch:matchMedia('(pointer:coarse)').matches,elements:[...document.querySelectorAll('.main-area-clean,.main-content,.par-view,.par-grid,.par-form,.parameter-reading-form,.parameter-reading-form__layout,.parameter-reading-form__fields,.parameter-reading-form__field,.parameter-reading-form__previous')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{class:el.className,x:r.x,right:r.right,width:r.width,scroll:el.scrollWidth,client:el.clientWidth,minWidth:s.minWidth,gridTemplateColumns:s.gridTemplateColumns,fontSize:s.fontSize,padding:s.padding,overflowX:s.overflowX};})}));
  109 |   fs.writeFileSync(out+'/tablet-runtime.json',JSON.stringify(receipt,null,2));await page.screenshot({path:out+'/screenshots/tablet-runtime-diagnostic.png',fullPage:true});await clean(state,info);
  110 |  });
  111 | });
  112 | for(const view of ['overview','chart','ward'])test(`${view}: all unsupported four-digit year representations fail safe without UI crash`,async({page,context},info)=>{
  113 |  const rows=[row('QA-year-zero','0000-01-01T00:00:00Z',{fr:'19'}),row('QA-year-short','0099-01-01T00:00:00Z',{spo2:'95',o2:'no'}),row('QA-year-999','0999-01-01T00:00:00Z',{pa:'124/76'}),row('QA-year-rollover','9999-12-31T23:59:00Z',{fc:'74',temperatura:'36,6'})];
  114 |  const state=await setup(page,context,{rows});const surface=await open(page,view);await expect(surface).toBeVisible();await expect(surface).toContainText('Data/ora non verificabile');
  115 |  const selectors=view==='overview'?'.reading-recency':'.parameter-reading-form__previous';const captions=surface.locator(selectors);for(const caption of await captions.all()){const text=await caption.textContent();if(/19|95|124|76|74|36,6/.test(text)||view==='overview')await expect(caption).toContainText('Data/ora non verificabile');}
  116 |  if(view==='overview'){await expect(surface.locator('.vt__label',{hasText:/^FR$/}).locator('..')).toContainText('19');await expect(surface.locator('.vt__label',{hasText:/^FC$/}).locator('..')).toContainText('74');}
  117 |  else await blank(surface);
  118 |  await page.screenshot({path:`${out}/screenshots/${view}-unsupported-years.png`,fullPage:true});await clean(state,info);
  119 | });
  120 | for(const view of ['overview','ward'])test(`${view}: synthetic read-only history retains its date/value provenance after reload`,async({page,context},info)=>{
  121 |  const state=await setup(page,context);let surface=await open(page,view);await expect(surface).toBeVisible();await verifyRange(surface,view);if(view==='ward')await blank(surface);
> 122 |  await page.reload();surface=view==='overview'?page.getByRole('region',{name:'Ultimi parametri e NEWS2'}):page.getByRole('form',{name:'Nuova rilevazione',exact:true});await expect(surface).toBeVisible();await verifyRange(surface,view);if(view==='ward')await blank(surface);await page.screenshot({path:`${out}/screenshots/${view}-after-reload.png`,fullPage:true});await clean(state,info);
      |                                                                                                                                                                                              ^ Error: expect(locator).toBeVisible() failed
  123 | });
  124 | 
```