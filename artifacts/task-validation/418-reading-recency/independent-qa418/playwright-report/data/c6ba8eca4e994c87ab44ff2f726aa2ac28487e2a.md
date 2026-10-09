# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: independent.spec.cjs >> tablet-emulated >> chart: DST minutes days weeks associated, wraps and read-only idle
- Location: artifacts\task-validation\418-reading-recency\independent-qa418\independent.spec.cjs:77:166

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('form', { name: 'Nuova rilevazione', exact: true }).locator('label').filter({ has: getByRole('form', { name: 'Nuova rilevazione', exact: true }).getByLabel('Nuova rilevazione FR', { exact: true }) })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('form', { name: 'Nuova rilevazione', exact: true }).locator('label').filter({ has: getByRole('form', { name: 'Nuova rilevazione', exact: true }).getByLabel('Nuova rilevazione FR', { exact: true }) })

```

```yaml
- navigation "Navigazione principale":
  - button "Turno"
  - button "Pazienti"
  - button "Terapia"
  - button "Parametri"
  - button "Consegne, 0 note senza conferma di lettura": Consegne
  - button "Agenda"
  - button "Farmaci"
- button "Apri menu":
  - img
- 'button "Indietro: Sintetico QA, Caso"'
- heading "Sintetico QA, Caso" [level=1]
- paragraph: Posto letto non disponibile · 56 anni · nata il 01/01/1970
- text: Turno pomeriggio
- time: 18:05
- button "Apri Milo, assistente clinico AI, a schermo intero":
  - img
- button "Cerca paziente, camera, codice fiscale":
  - img
- text: Simulatore
- 'button "Infermiere QA418, Infermiere: menu utente"': IQ
- main:
  - tablist "Sezioni della cartella":
    - tab "Panoramica"
    - tab "Dati di ingresso"
    - tab "Clinica"
    - tab "Terapia"
    - tab "Parametri" [selected]
    - tab "Moduli"
    - tab "Documenti"
    - tab "Dimissione"
  - button "Stampa la scheda": Stampa
  - button "Invio in Pronto Soccorso": Invio in PS
  - complementary "Completezza anagrafica":
    - strong: Anagrafica da completare
    - text: "Dati da completare:"
    - list:
      - listitem:
        - button "Codice fiscale"
      - listitem:
        - button "Telefono"
  - tabpanel "Parametri":
    - region "Registra parametri del paziente":
      - heading "Nuova rilevazione" [level=3]
      - time: 02:05
      - text: domenica 25 ottobre 2026
      - form "Nuova rilevazione":
        - group "Nuovi valori da registrare, separati dalle misure precedenti":
          - text: Nuovi valori da registrare, separati dalle misure precedenti FR atti/min
          - textbox "Nuova rilevazione FR":
            - /placeholder: —
          - text: "Prima: 19 · Misurato il 25/10/2026 02:59 · 6 minuti fa SpO₂ %"
          - textbox "Nuova rilevazione SpO₂":
            - /placeholder: —
          - text: "Prima: 95 · Misurato il 21/10/2026 03:05 · 4 giorni fa O₂"
          - combobox "Nuova rilevazione O₂":
            - option "—" [selected]
            - option "No (aria ambiente)"
            - option "Sì"
          - text: "Prima: in aria · Misurato il 21/10/2026 03:05 · 4 giorni fa PA sistolica mmHg"
          - textbox "Nuova rilevazione PA sistolica":
            - /placeholder: —
          - text: "Prima: 124 · Misurato il 04/10/2026 03:05 · 3 settimane fa PA diastolica mmHg"
          - textbox "Nuova rilevazione PA diastolica":
            - /placeholder: —
          - text: "Prima: 76 · Misurato il 04/10/2026 03:05 · 3 settimane fa FC bpm"
          - textbox "Nuova rilevazione FC":
            - /placeholder: —
          - text: "Prima: 74 · Misurato il 04/10/2026 03:05 · 3 settimane fa TC °C"
          - textbox "Nuova rilevazione TC":
            - /placeholder: —
          - text: "Prima: 36,6 · Misurato il 04/10/2026 03:05 · 3 settimane fa Coscienza"
          - combobox "Nuova rilevazione Coscienza":
            - option "—" [selected]
            - option "A · Vigile"
            - option "C · Confusione di nuova insorgenza"
            - option "V · Risponde alla voce"
            - option "P · Risponde al dolore"
            - option "U · Non risponde"
          - text: "Prima: A · Misurato il 04/10/2026 03:05 · 3 settimane fa DTX mg/dL"
          - textbox "Nuova rilevazione DTX":
            - /placeholder: —
          - text: "Prima: 104 · Misurato il 04/10/2026 03:05 · 3 settimane fa Evacuazione"
          - textbox "Nuova rilevazione Evacuazione":
            - /placeholder: —
          - text: Note sulla rilevazione
          - textbox "Nuova rilevazione Note sulla rilevazione"
        - group "Tastierino numerico":
          - button "7" [disabled]
          - button "8" [disabled]
          - button "9" [disabled]
          - button "4" [disabled]
          - button "5" [disabled]
          - button "6" [disabled]
          - button "1" [disabled]
          - button "2" [disabled]
          - button "3" [disabled]
          - button "Virgola" [disabled]: ","
          - button "0" [disabled]
          - button "Cancella" [disabled]: ⌫
        - text: Seleziona un campo numerico. Il tastierino aggiunge o cancella in fondo al valore.
        - button "Campo successivo"
        - status:
          - strong: NEWS2 in tempo reale · —
          - paragraph: "Mancano: FR, SpO₂, O₂, PA, FC, Coscienza, TC"
        - paragraph: NEWS2 usa i sette parametri della stessa rilevazione e la scala SpO₂ 1. O₂ indica l’ossigeno supplementare; coscienza usa ACVPU. Un punteggio incompleto non è un NEWS2 valido.
        - text: Data e ora vengono registrate quando premi Salva.
        - button "Salva rilevazione"
    - region "Consultazione parametri vitali":
      - heading "Valori e andamento" [level=3]
      - button "Aggiorna"
      - group "Periodo delle rilevazioni":
        - button "Oggi" [pressed]
        - button "7 giorni"
        - button "Mese"
        - button "6 mesi"
        - button "Anno"
        - button "Personalizzato"
      - strong: 25/10/2026 – 25/10/2026
      - button "Mostra andamento"
      - alert:
        - paragraph: Impossibile caricare tutte le rilevazioni del periodo. Riprova o scegli un intervallo più breve.
        - button "Riprova"
```

# Test source

```ts
  1   | const {createRequire}=require('node:module');
  2   | const {test,expect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
  3   | const fs=require('node:fs');
  4   | const out=__dirname;
  5   | fs.mkdirSync(out+'/screenshots',{recursive:true});
  6   | const patient={id:'QA-418-INDEPENDENT',firstName:'Caso',lastName:'Sintetico QA',dateOfBirth:'1970-01-01',sex:'F',medicalRecordNumber:'QA-ONLY-418',location:{status:'unassigned',room:null,bed:null,source:null}};
  7   | const nurse={id:'QA-418-NURSE',name:'Infermiere QA418',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
  8   | const at=new Date('2026-10-25T01:05:00Z');
  9   | const row=(id,measuredAt,values)=>({id,patientId:patient.id,requestId:id,measuredAt,values,createdAt:measuredAt,authorOperatorId:nurse.id,authorName:nurse.name});
  10  | function history(){return [row('QA-minutes','2026-10-25T00:59:00Z',{fr:'19'}),row('QA-days','2026-10-21T01:05:00Z',{spo2:'95',o2:'no'}),row('QA-weeks','2026-10-04T01:05:00Z',{fr:'15',spo2:'98',o2:'no',pa:'124/76',fc:'74',temperatura:'36,6',coscienza:'A',dtx:'104'})];}
  11  | const fields=['FR','SpO₂','O₂','PA sistolica','PA diastolica','FC','TC','Coscienza','DTX','Evacuazione','Note sulla rilevazione'];
  12  | async function setup(page,context,{rows=history(),now=at,hasMore=false}={}){
  13  |  const state={calls:[],blocked:[],writes:[],consoleErrors:[],pageErrors:[],httpErrors:[]};
  14  |  const caps=['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','clinical_record.update','diary.list','parameters.list_readings','narrative.list','narrative.update','documents.list','parameters.list_page','parameters.create_reading','parameters.save_reading','assessments.catalog','assessments.list','assessments.read'];
  15  |  await context.route('**/*',async route=>{
  16  |   const request=route.request(),url=new URL(request.url()),p=url.pathname,method=request.method();
  17  |   if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  18  |   if(url.origin==='http://127.0.0.1:7483')return route.continue();
  19  |   if(url.origin!=='http://localhost:3001'){state.blocked.push({method,origin:url.origin});return route.abort();}
  20  |   state.calls.push({method,path:p,query:url.search});
  21  |   const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  22  |   if(p==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  23  |   if(p==='/auth/simulator/identities')return json({identities:[nurse]});
  24  |   if(p==='/auth/simulator/session'&&method==='POST')return json({token:'synthetic-qa418-session'});
  25  |   if(p==='/auth/me')return json({...nurse,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(caps.map(key=>[key,{allowed:true,effect:'ALLOWED'}]))});
  26  |   if(p==='/patients/page/search'&&method==='POST')return json({items:[patient],hasMore:false,nextCursor:null});
  27  |   if(method!=='GET'){state.writes.push({method,path:p});return route.fulfill({status:500,contentType:'application/json',body:'{"error":"QA guard rejected mutation"}'});}
  28  |   if(p==='/me/roster-order')return json({effective:{criterion:'name',direction:'asc'},source:'system',canEdit:false,canEditDefault:false});
  29  |   if(p==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  30  |   if(p==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ambulatoriale',consegneAperte:0,hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0}]);
  31  |   if(p==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  32  |   if(p==='/patients/settings')return json({deleteEnabled:false});
  33  |   if(p===`/patients/${patient.id}`)return json(patient);
  34  |   if(p===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ambulatoriale',allergieStatus:'unknown',allergie:[],diagnosi:[],anamnesi:{patologicaRemota:'',note:''}}});
  35  |   if(p===`/patients/${patient.id}/parameter-readings`)return json({readings:rows,hasMore,nextCursor:hasMore?'QA-next-page':null});
  36  |   if(p==='/patients/parameters/page')return json({items:[{patient,cartella:{pazienteId:patient.id,readingCount:rows.length,noteCount:0,lastReadingAt:rows[0]?.measuredAt}}],hasMore:false,nextCursor:null});
  37  |   if(p===`/patients/${patient.id}/room-options`)return json([]);
  38  |   if(p===`/patients/${patient.id}/narrative-sections`)return json({sections:[]});
  39  |   if(p===`/patients/${patient.id}/diary`)return json({entries:[],hasMore:false,nextCursor:null});
  40  |   if(p===`/patients/${patient.id}/therapies/page`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,inactive:0}});
  41  |   if(p===`/patients/${patient.id}/documents`)return json({documents:[],sourceMatch:null,pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
  42  |   if(p===`/patients/${patient.id}/intake-review`)return json({state:'none',items:[]});
  43  |   if(p===`/patients/${patient.id}/assessments/catalog`)return json({items:[]});
  44  |   if(p===`/patients/${patient.id}/assessments`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
  45  |   if(p==='/patients/diary-unread-count')return json({unreadCount:0});
  46  |   if(p==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  47  |   if(p==='/consegne')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,urgentActive:0,urgentTaken:0}});
  48  |   if(p==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  49  |   if(p==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
  50  |   if(['/therapy-slots','/appointments'].includes(p))return json([]);
  51  |   state.blocked.push({method,path:p});return route.fulfill({status:500,contentType:'application/json',body:'{"error":"Unexpected guarded API"}'});
  52  |  });
  53  |  page.on('console',msg=>{if(msg.type()==='error')state.consoleErrors.push(msg.text());});
  54  |  page.on('pageerror',e=>state.pageErrors.push(e.message));
  55  |  page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
  56  |  await page.clock.install({time:now});
  57  |  await page.goto('/#/operator-dashboard');
  58  |  await page.getByRole('button',{name:nurse.name}).click();
  59  |  await expect(page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
  60  |  return state;
  61  | }
  62  | async function menu(page,item){if(await page.getByRole('button',{name:'Apri menu'}).isVisible())await page.getByRole('button',{name:'Apri menu'}).click();await page.locator('.teams-sidebar').getByRole('button',{name:item,exact:true}).click();}
  63  | async function open(page,view){
  64  |  if(view==='ward'){await menu(page,'Parametri');return page.getByRole('form',{name:'Nuova rilevazione',exact:true});}
  65  |  await menu(page,'Pazienti');await page.getByRole('button',{name:'Apri cartella di Caso Sintetico QA',exact:true}).click();
  66  |  await expect(page.getByRole('tab',{name:/^Panoramica/})).toBeVisible();
  67  |  if(view==='chart')await page.getByRole('tab',{name:/Parametri/}).click();
  68  |  return view==='overview'?page.getByRole('region',{name:'Ultimi parametri e NEWS2'}):page.getByRole('form',{name:'Nuova rilevazione',exact:true});
  69  | }
  70  | async function clean(state,testInfo){for(const key of ['blocked','writes','consoleErrors','pageErrors','httpErrors'])expect(state[key],key).toEqual([]);const calls=state.calls.filter(r=>r.path.endsWith('/parameter-readings'));expect(calls.length).toBeGreaterThan(0);for(const c of calls){const q=new URLSearchParams(c.query);expect(q.get('limit')===null||Number(q.get('limit'))<=50).toBe(true);expect(q.get('cursor')).toBeNull();}await testInfo.attach('safe-network-receipt',{body:Buffer.from(JSON.stringify(state,null,2)),contentType:'application/json'});}
  71  | async function blank(form){for(const field of fields)await expect(form.getByLabel(`Nuova rilevazione ${field}`,{exact:true})).toHaveValue('');await expect(form.getByRole('status').filter({hasText:'NEWS2 in tempo reale'})).toContainText('NEWS2 in tempo reale · —');}
  72  | async function verifyRange(surface,view){
  73  |  const examples=[['FR','19','25/10/2026 02:59','6 minuti fa'],['SpO₂','95','21/10/2026 03:05','4 giorni fa'],['FC','74','04/10/2026 03:05','3 settimane fa']];
> 74  |  for(const [field,value,date,age] of examples){const block=view==='overview'?surface.locator('.vt').filter({has:surface.page().locator('.vt__label',{hasText:new RegExp(`^${field}$`)})}):surface.locator('label').filter({has:surface.getByLabel(`Nuova rilevazione ${field}`,{exact:true})});await expect(block).toBeVisible();await expect(block).toContainText(value);await expect(block).toContainText(date);await expect(block).toContainText(age);}
      |                                                                                                                                                                                                                                                                                                                    ^ Error: expect(locator).toBeVisible() failed
  75  | }
  76  | const profiles=[{name:'desktop',viewport:{width:1150,height:1004},isMobile:false,hasTouch:false,deviceScaleFactor:1},{name:'tablet-emulated',viewport:{width:768,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:2},{name:'mobile-emulated',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}];
  77  | for(const profile of profiles){test.describe(profile.name,()=>{test.use({...profile,timezoneId:'America/Los_Angeles'});for(const view of ['overview','chart','ward'])test(`${view}: DST minutes days weeks associated, wraps and read-only idle`,async({page,context},info)=>{
  78  |  const state=await setup(page,context);const surface=await open(page,view);await expect(surface).toBeVisible();await verifyRange(surface,view);
  79  |  const captions=surface.locator(view==='overview'?'.reading-recency':'.parameter-reading-form__previous');
  80  |  const metrics=await captions.evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {text:el.textContent,font:+s.fontSize.replace('px',''),color:s.color,whiteSpace:s.whiteSpace,x:r.x,right:r.right,client:el.clientWidth,scroll:el.scrollWidth,width:r.width};}));
  81  |  expect(metrics.length).toBeGreaterThan(0);for(const m of metrics){expect(m.font).toBeGreaterThanOrEqual(14);expect(m.whiteSpace).toBe('normal');expect(m.x).toBeGreaterThanOrEqual(0);expect(m.right).toBeLessThanOrEqual(profile.viewport.width);expect(m.scroll).toBeLessThanOrEqual(m.client+1);expect(m.text).not.toMatch(/attuale|appena rilevato|rilevato ora/i);}
  82  |  if(view!=='overview'){await blank(surface);await surface.getByLabel('Nuova rilevazione DTX',{exact:true}).fill('105');}
  83  |  const count=state.calls.filter(x=>x.path.endsWith('/parameter-readings')).length;
  84  |  await page.clock.fastForward(120000);await expect(surface).toContainText('8 minuti fa');expect(state.calls.filter(x=>x.path.endsWith('/parameter-readings')).length).toBe(count);
  85  |  if(view!=='overview'){await expect(surface.getByLabel('Nuova rilevazione DTX',{exact:true})).toHaveValue('105');await surface.getByLabel('Nuova rilevazione FR',{exact:true}).focus();for(const field of fields){await expect(surface.getByLabel(`Nuova rilevazione ${field}`,{exact:true})).toBeFocused();await page.keyboard.press('Tab');}await surface.getByLabel('Nuova rilevazione SpO₂',{exact:true}).press('Enter');await expect(surface.getByLabel('Nuova rilevazione O₂',{exact:true})).toBeFocused();}
  86  |  await page.screenshot({path:`${out}/screenshots/${profile.name}-${view}.png`,fullPage:true});await info.attach('caption-metrics',{body:Buffer.from(JSON.stringify(metrics)),contentType:'application/json'});await clean(state,info);
  87  | });});}
  88  | test.use({viewport:{width:1150,height:1004},timezoneId:'Asia/Tokyo'});
  89  | test('expanded comparison has own full provenance and historical NEWS2 remains zero',async({page,context},info)=>{
  90  |  const state=await setup(page,context);await open(page,'overview');await page.getByRole('button',{name:'Espandi ultimi parametri e NEWS2'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const fr=dialog.locator('.vt').filter({has:page.locator('.vt__label',{hasText:/^FR$/})});await expect(fr).toContainText('19');await expect(fr).toContainText('era 15');await expect(fr.locator('.vt__comparison')).toContainText('04/10/2026 03:05');await expect(fr.locator('.vt__comparison')).toContainText('3 settimane fa');const news=dialog.locator('.vt--news2');await expect(news).toBeVisible();await expect(news.locator('.vt__value')).toHaveText('0punti');await expect(news).toContainText('04/10/2026 03:05');await expect(news).toHaveAccessibleName(/NEWS2 0.*3 settimane fa.*Da aggiornare/);await page.screenshot({path:out+'/screenshots/expanded-provenance.png',fullPage:true});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Espandi ultimi parametri e NEWS2'})).toBeFocused();await clean(state,info);
  91  | });
  92  | for(const view of ['overview','chart','ward'])test(`${view}: impossible/unzoned/future timestamps never imply present`,async({page,context},info)=>{
  93  |  const rows=history();rows[0].measuredAt='2026-02-30T10:00:00Z';rows[1].measuredAt='2026-10-26T01:05:00Z';rows[2].measuredAt='2026-10-04T03:05:00';const state=await setup(page,context,{rows});const surface=await open(page,view);await expect(surface).toBeVisible();await expect(surface).toContainText('Data/ora non verificabile');await expect(surface).toContainText('data/ora futura — da verificare');if(view!=='overview')await blank(surface);await page.screenshot({path:`${out}/screenshots/${view}-invalid-future.png`,fullPage:true});await clean(state,info);
  94  | });
  95  | test('bounded partial history does not invent empty history or populate new controls',async({page,context},info)=>{
  96  |  const rows=[row('QA-only-FR','2026-10-25T00:59:00Z',{fr:'19'})];const state=await setup(page,context,{rows,hasMore:true});const form=await open(page,'ward');await expect(form).toBeVisible();await blank(form);await expect(form.locator('label').filter({has:form.getByLabel('Nuova rilevazione DTX',{exact:true})})).toContainText("Prima: non nell'ultima rilevazione");await expect(form).not.toContainText('Nessuna rilevazione precedente');await page.clock.fastForward(120000);await blank(form);await clean(state,info);
  97  | });
  98  | test('spring DST transition is six elapsed minutes despite wall-clock jump',async({page,context},info)=>{
  99  |  const rows=[row('QA-spring','2026-03-29T00:59:00Z',{fr:'18'})];const state=await setup(page,context,{rows,now:new Date('2026-03-29T01:05:00Z')});const surface=await open(page,'overview');await expect(surface).toBeVisible();const fr=surface.locator('.vt').filter({has:page.locator('.vt__label',{hasText:/^FR$/})});await expect(fr).toContainText('18');await expect(fr).toContainText('29/03/2026 01:59');await expect(fr).toContainText('6 minuti fa');await clean(state,info);
  100 | });
  101 | 
```