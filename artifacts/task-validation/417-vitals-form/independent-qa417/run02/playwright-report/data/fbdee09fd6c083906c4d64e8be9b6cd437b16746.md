# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: independent.spec.cjs >> ward AC3 historical loading blank pagination truthful no selected-patient fanout
- Location: artifacts\task-validation\417-vitals-form\independent-qa417\independent.spec.cjs:30:2

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 4
Received:    5
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation "Navigazione principale" [ref=e4]:
    - img [ref=e7]
    - generic [ref=e9]:
      - button "Turno" [ref=e10] [cursor=pointer]:
        - img [ref=e12]
        - generic [ref=e14]: Turno
      - button "Pazienti" [ref=e15] [cursor=pointer]:
        - img [ref=e17]
        - generic [ref=e19]: Pazienti
      - button "Terapia" [ref=e20] [cursor=pointer]:
        - img [ref=e22]
        - generic [ref=e24]: Terapia
      - button "Parametri" [active] [ref=e25] [cursor=pointer]:
        - img [ref=e27]
        - generic [ref=e29]: Parametri
      - button "Consegne, 0 note senza conferma di lettura" [ref=e30] [cursor=pointer]:
        - img [ref=e32]
        - generic [ref=e34]: Consegne
      - button "Agenda" [ref=e35] [cursor=pointer]:
        - img [ref=e37]
        - generic [ref=e39]: Agenda
      - button "Farmaci" [ref=e40] [cursor=pointer]:
        - img [ref=e42]
        - generic [ref=e44]: Farmaci
  - generic [ref=e45]:
    - generic [ref=e46]:
      - 'button "Indietro: Dashboard" [ref=e47] [cursor=pointer]':
        - img [ref=e48]
      - generic [ref=e51]:
        - heading "Parametri vitali" [level=1] [ref=e52]
        - paragraph [ref=e53]: Rilevazione rapida con NEWS2
      - generic [ref=e54]:
        - generic [ref=e55]: Turno pomeriggio
        - time [ref=e56]: 16:52
      - generic [ref=e57]:
        - button "Apri Milo, assistente clinico AI, a schermo intero" [ref=e58] [cursor=pointer]:
          - img [ref=e59]
          - generic [ref=e62]: Milo
        - button "Cerca paziente, camera, codice fiscale" [ref=e63] [cursor=pointer]:
          - img [ref=e64]
        - generic "Simulatore ruoli — solo sviluppo" [ref=e67]: Simulatore
        - 'button "Infermiere Sintetico, Infermiere: menu utente" [ref=e69] [cursor=pointer]': IS
    - main [ref=e70]:
      - generic [ref=e71]:
        - generic [ref=e72]:
          - region "Pazienti" [ref=e73]:
            - generic [ref=e74]: Paziente
            - generic [ref=e75]:
              - img [ref=e77]
              - searchbox "Cerca paziente per nome o camera" [ref=e80]
            - generic [ref=e81]:
              - status [ref=e82]: 0/2 con rilevazioni oggi
              - button "Ordine del giro" [ref=e83] [cursor=pointer]
            - list [ref=e84]:
              - listitem [ref=e85]:
                - button "Sintetica, Persona, camera non indicata. Nessuna rilevazione oggi" [pressed] [ref=e86] [cursor=pointer]:
                  - generic [ref=e87]: —
                  - generic [ref=e88]:
                    - generic [ref=e89]: Sintetica, Persona
                    - generic [ref=e90]: Nessuna rilevazione oggi
                - button "NEWS2 non calcolabile. Apri lo storico NEWS2" [ref=e92] [cursor=pointer]:
                  - generic [ref=e93]: NEWS2 non calcolabile
              - listitem [ref=e94]:
                - button "Sintetica, Seconda, camera non indicata. Nessuna rilevazione oggi" [ref=e95] [cursor=pointer]:
                  - generic [ref=e96]: —
                  - generic [ref=e97]:
                    - generic [ref=e98]: Sintetica, Seconda
                    - generic [ref=e99]: Nessuna rilevazione oggi
                - button "NEWS2 non calcolabile. Apri lo storico NEWS2" [ref=e101] [cursor=pointer]:
                  - generic [ref=e102]: NEWS2 non calcolabile
          - region "Rilevazione di Sintetica, Persona" [ref=e103]:
            - generic [ref=e104]:
              - generic [ref=e105]:
                - heading "Sintetica, Persona" [level=2] [ref=e106]
                - generic [ref=e107]: Nato/a il 01/01/1980 · CF da completare
              - button "Storico" [ref=e108] [cursor=pointer]
            - form "Nuova rilevazione" [ref=e109]:
              - generic [ref=e110]:
                - group "Nuovi valori da registrare, separati dalle misure precedenti" [ref=e111]:
                  - generic [ref=e112]: Nuovi valori da registrare, separati dalle misure precedenti
                  - generic [ref=e113]:
                    - generic [ref=e114]: FR atti/min
                    - textbox "Nuova rilevazione FR" [ref=e115]:
                      - /placeholder: —
                    - generic [ref=e116]: "Prima: 18 · 08/10 10:59"
                  - generic [ref=e117]:
                    - generic [ref=e118]: SpO₂ %
                    - textbox "Nuova rilevazione SpO₂" [ref=e119]:
                      - /placeholder: —
                    - generic [ref=e120]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e121]:
                    - generic [ref=e122]: O₂
                    - combobox "Nuova rilevazione O₂" [ref=e123]:
                      - option "—" [selected]
                      - option "No (aria ambiente)"
                      - option "Sì"
                    - generic [ref=e124]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e125]:
                    - generic [ref=e126]: PA sistolica mmHg
                    - textbox "Nuova rilevazione PA sistolica" [ref=e127]:
                      - /placeholder: —
                    - generic [ref=e128]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e129]:
                    - generic [ref=e130]: PA diastolica mmHg
                    - textbox "Nuova rilevazione PA diastolica" [ref=e131]:
                      - /placeholder: —
                    - generic [ref=e132]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e133]:
                    - generic [ref=e134]: FC bpm
                    - textbox "Nuova rilevazione FC" [ref=e135]:
                      - /placeholder: —
                    - generic [ref=e136]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e137]:
                    - generic [ref=e138]: TC °C
                    - textbox "Nuova rilevazione TC" [ref=e139]:
                      - /placeholder: —
                    - generic [ref=e140]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e141]:
                    - generic [ref=e142]: Coscienza
                    - combobox "Nuova rilevazione Coscienza" [ref=e143]:
                      - option "—" [selected]
                      - option "A · Vigile"
                      - option "C · Confusione di nuova insorgenza"
                      - option "V · Risponde alla voce"
                      - option "P · Risponde al dolore"
                      - option "U · Non risponde"
                    - generic [ref=e144]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e145]:
                    - generic [ref=e146]: DTX mg/dL
                    - textbox "Nuova rilevazione DTX" [ref=e147]:
                      - /placeholder: —
                    - generic [ref=e148]: "Prima: non fra le ultime 50 rilevazioni"
                  - generic [ref=e149]:
                    - generic [ref=e150]: Evacuazione
                    - textbox "Nuova rilevazione Evacuazione" [ref=e151]:
                      - /placeholder: —
                  - generic [ref=e152]:
                    - generic [ref=e153]: Note sulla rilevazione
                    - textbox "Nuova rilevazione Note sulla rilevazione" [ref=e154]
                    - generic [ref=e155]: 0 note salvate oggi
                - generic [ref=e156]:
                  - group "Tastierino numerico" [ref=e157]:
                    - button "7" [disabled] [ref=e158]
                    - button "8" [disabled] [ref=e159]
                    - button "9" [disabled] [ref=e160]
                    - button "4" [disabled] [ref=e161]
                    - button "5" [disabled] [ref=e162]
                    - button "6" [disabled] [ref=e163]
                    - button "1" [disabled] [ref=e164]
                    - button "2" [disabled] [ref=e165]
                    - button "3" [disabled] [ref=e166]
                    - button "Virgola" [disabled] [ref=e167]: ","
                    - button "0" [disabled] [ref=e168]
                    - button "Cancella" [disabled] [ref=e169]: ⌫
                  - generic [ref=e170]: Seleziona un campo numerico. Il tastierino aggiunge o cancella in fondo al valore.
                  - button "Campo successivo" [ref=e171] [cursor=pointer]
                  - status [ref=e172]:
                    - strong [ref=e173]: NEWS2 in tempo reale · —
                    - paragraph [ref=e174]: "Mancano: FR, SpO₂, O₂, PA, FC, Coscienza, TC"
                  - paragraph [ref=e175]: NEWS2 usa i sette parametri della stessa rilevazione e la scala SpO₂ 1. O₂ indica l’ossigeno supplementare; coscienza usa ACVPU. Un punteggio incompleto non è un NEWS2 valido.
                  - generic [ref=e176]: Data e ora vengono registrate quando premi Salva.
                  - button "Salva rilevazione" [ref=e177] [cursor=pointer]
        - paragraph [ref=e178]: "Operatore: Infermiere Sintetico. Data e ora vengono registrate quando premi Salva."
```

# Test source

```ts
  1   | const {createRequire}=require('node:module');const {test,expect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
  2   | const {guard,open,labels,patient,second,identity,historical,field,form,save,clean,healthy}=require('./fixture.cjs');
  3   | const fs=require('node:fs');const path=require('node:path');
  4   | const run=process.env.QA_RUN||'run01',evidence=path.join(__dirname,run);
  5   | let state;
  6   | test.beforeEach(async({context,page})=>{state=await guard(context,page);});
  7   | test.afterEach(async({},info)=>{if(state){await info.attach('guarded-runtime-and-synthetic-writes',{body:JSON.stringify(state,(key,val)=>typeof val==='function'?undefined:val,2),contentType:'application/json'});fs.mkdirSync(path.join(evidence,'logs'),{recursive:true});fs.writeFileSync(path.join(evidence,'logs',`${info.title.replace(/[^a-zA-Z0-9]+/g,'-')}.json`),JSON.stringify(state,(key,val)=>typeof val==='function'?undefined:val,2));}});
  8   | async function shot(page,name){fs.mkdirSync(path.join(evidence,'screenshots'),{recursive:true});await page.screenshot({path:path.join(evidence,'screenshots',`${name}.png`),fullPage:true});}
  9   | async function switchNav(page,name){if(await page.getByRole('button',{name:'Apri menu'}).isVisible())await page.getByRole('button',{name:'Apri menu'}).click();await page.locator('.teams-sidebar').getByRole('button',{name,exact:true}).click();}
  10  | async function snapshot(page){return form(page).locator('fieldset label').evaluateAll(els=>els.map(label=>{const el=label.querySelector('input,select,textarea');return{caption:label.querySelector('span').innerText,aria:el.getAttribute('aria-label'),tag:el.tagName,type:el.type,inputMode:el.inputMode,maxLength:el.maxLength,value:el.value,placeholder:el.placeholder,options:el.tagName==='SELECT'?[...el.options].map(o=>[o.value,o.text]):null};}));}
  11  | test('AC1 identical visible labels units format order options in both actual SPA views',async({page})=>{
  12  |  await open(page,'chart');await expect(form(page).getByText(/Prima: 18/)).toBeVisible();const chart=await snapshot(page);
  13  |  expect(chart.map(e=>e.aria)).toEqual(labels.map(l=>`Nuova rilevazione ${l}`));expect(chart.every(e=>e.value==='')).toBe(true);
  14  |  expect(chart.map(e=>e.caption)).toEqual(['FR atti/min','SpO₂ %','O₂','PA sistolica mmHg','PA diastolica mmHg','FC bpm','TC °C','Coscienza','DTX mg/dL','Evacuazione','Note sulla rilevazione']);
  15  |  expect(chart[2].options).toEqual([['','—'],['no','No (aria ambiente)'],['si','Sì']]);expect(chart[7].options.map(x=>x[0])).toEqual(['','A','C','V','P','U']);
  16  |  await shot(page,'chart-schema-and-separated-history');await switchNav(page,'Parametri');await expect(form(page)).toBeVisible();await expect(form(page).getByText(/Prima: 18/)).toBeVisible();const ward=await snapshot(page);expect(ward).toEqual(chart);await shot(page,'ward-schema-and-separated-history');await healthy(state);
  17  | });
  18  | for(const view of ['chart','ward']){
  19  |  test(`${view} AC2 native Tab NEWS2 guidance Enter Next allfields no premature save`,async({page})=>{
  20  |   await open(page,view);await expect(form(page).getByText(/Prima: 18/)).toBeVisible();
  21  |   await expect(form(page).getByRole('button',{name:'5',exact:true})).toBeDisabled();
  22  |   await field(page,'FR').focus();for(const l of labels){await expect(field(page,l)).toBeFocused();if(l!==labels.at(-1))await page.keyboard.press('Tab');}
  23  |   for(const l of ['O₂','Coscienza']){const ids=(await field(page,l).getAttribute('aria-describedby')).split(' ');const help=page.locator(`[id="${ids.find(x=>x.endsWith('news2-help'))}"]`);await expect(help).toBeVisible();await expect(help).toHaveText(/sette parametri.*scala SpO₂ 1.*ACVPU.*incompleto/s);}
  24  |   for(const [a,b] of [['SpO₂','O₂'],['TC','Coscienza'],['DTX','Evacuazione'],['Evacuazione','Note sulla rilevazione']]){await field(page,a).press('Enter');await expect(field(page,b)).toBeFocused();}
  25  |   await field(page,'FR').focus();for(const l of labels){await expect(field(page,l)).toBeFocused();await form(page).getByRole('button',{name:'Campo successivo'}).click();}
  26  |   await expect(save(page)).toBeFocused();await expect(form(page).getByRole('button',{name:'5',exact:true})).toBeDisabled();expect(state.posts).toEqual([]);
  27  |   await field(page,'O₂').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');await expect(field(page,'PA sistolica')).toBeFocused();await expect(field(page,'O₂')).toHaveValue('no');expect(state.posts).toEqual([]);
  28  |   await shot(page,`${view}-native-news2-accessibility`);await healthy(state);
  29  |  });
  30  |  test(`${view} AC3 historical loading blank pagination truthful no selected-patient fanout`,async({page})=>{
  31  |   state.priorMode='hold';state.hasMore=true;
  32  |   state.historyRows=Array.from({length:50},(_,i)=>({id:`QA417-PAGE-${i}`,requestId:`QA417-PAGE-${i}`,patientId:patient.id,measuredAt:`2026-10-08T08:${String(59-i).padStart(2,'0')}:00.000Z`,values:{fr:String(18+i%2)},authorOperatorId:identity.id,authorName:identity.name,createdAt:'2026-10-08T08:00:00.000Z'}));
  33  |   await open(page,view);await expect(form(page).locator('.parameter-reading-form__previous').first()).toHaveText('Prima: …');
  34  |   for(const l of labels)await expect(field(page,l)).toHaveValue('');
  35  |   state.priorMode='ready';state.heldReads.splice(0).forEach(resolve=>resolve());
  36  |   await expect(form(page).getByText('Prima: non fra le ultime 50 rilevazioni',{exact:true}).first()).toBeVisible();await expect(form(page).getByText(/Prima: 18 ·/)).toBeVisible();
  37  |   const reads=state.requests.filter(r=>r.phase==='form'&&r.method==='GET'&&r.path.endsWith('/parameter-readings')&&!new URLSearchParams(r.query).has('month')&&!new URLSearchParams(r.query).has('date'));
> 38  |   expect(reads.length).toBeGreaterThan(0);expect(reads.length).toBeLessThanOrEqual(4);
      |                                                                ^ Error: expect(received).toBeLessThanOrEqual(expected)
  39  |   expect(reads.every(r=>new URLSearchParams(r.query).get('limit')==='50')).toBe(true);expect(reads.every(r=>!new URLSearchParams(r.query).has('cursor'))).toBe(true);expect(reads.every(r=>r.path.includes(patient.id))).toBe(true);
  40  |   for(const l of labels)await expect(field(page,l)).toHaveValue('');await expect(form(page).getByText('NEWS2 in tempo reale · —',{exact:true})).toBeVisible();expect(state.posts).toEqual([]);
  41  |   await shot(page,`${view}-bounded-history-pagination`);await healthy(state);
  42  |  });
  43  |  test(`${view} AC3 previous-error never treated as blank verified history and inputs editable`,async({page})=>{
  44  |   state.priorMode='error';await open(page,view);await expect(form(page).getByText('Precedente non disponibile',{exact:true}).first()).toBeVisible();
  45  |   for(const l of labels)await expect(field(page,l)).toHaveValue('');await field(page,'FC').fill('73');await expect(field(page,'FC')).toHaveValue('73');await expect(field(page,'FC')).toBeEnabled();expect(state.posts).toEqual([]);await shot(page,`${view}-history-failure-truthful`);await healthy(state);
  46  |  });
  47  |  test(`${view} AC4 same malformed bounds oversize decimal and error linkage no invalid POST`,async({page})=>{
  48  |   await open(page,view);
  49  |   const cases=[['FR','0','Frequenza respiratoria: numero intero tra 1 e 80.'],['FR','81','Frequenza respiratoria: numero intero tra 1 e 80.'],['FR','2.4','Frequenza respiratoria: numero intero tra 1 e 80.'],['FR','1e1','Frequenza respiratoria: numero intero tra 1 e 80.'],['SpO₂','101','SpO₂ deve essere compresa tra 0 e 100.'],['SpO₂','98.123','SpO₂: inserisci un numero valido.'],['FC','1O8','FC: inserisci un numero valido.'],['FC','-1','FC: inserisci un numero valido.'],['FC','1'.repeat(50),'FC: inserisci un numero valido.'],['TC','37°5','TC: inserisci un numero valido.'],['TC','36,5.2','TC: inserisci un numero valido.'],['DTX','>600','DTX: inserisci un numero valido.'],['DTX','600;DROP TABLE','DTX: inserisci un numero valido.'],['PA sistolica','120/80/70','Pressione: usa il formato 120/80.'],['PA sistolica','120','Pressione: usa il formato 120/80.'],['PA diastolica','80','Pressione: usa il formato 120/80.']];
  50  |   for(const [l,v,message]of cases){await clean(page);await field(page,l).fill(v);await save(page).click();await expect(form(page).getByRole('alert')).toHaveText(message);await expect(field(page,l==='PA diastolica'?'PA sistolica':l)).toBeFocused();await expect(field(page,l)).toHaveAttribute('aria-invalid','true');const ids=(await field(page,l).getAttribute('aria-describedby')).split(' ');await expect(page.locator(`[id="${ids.find(x=>x.endsWith('error'))}"]`)).toHaveText(message);expect(state.posts).toEqual([]);if(l==='PA sistolica'&&v==='120/80/70')await expect(field(page,'PA diastolica')).toHaveValue('80/70');else await expect(field(page,l)).toHaveValue(v);}
  51  |   await clean(page);await save(page).click();await expect(form(page).getByRole('alert')).toHaveText('Inserisci almeno un parametro.');await expect(field(page,'FR')).toBeFocused();await field(page,'Note sulla rilevazione').fill('Nota esclusivamente sintetica');await save(page).click();expect(state.posts).toEqual([]);await shot(page,`${view}-same-invalid-errors`);await healthy(state);
  52  |  });
  53  |  test(`${view} AC4 keypad end semantics native caret choice-disable and focus-deactivation`,async({page})=>{
  54  |   await open(page,view);const digit=form(page).getByRole('button',{name:'9',exact:true}),back=form(page).getByRole('button',{name:'Cancella',exact:true}),comma=form(page).getByRole('button',{name:'Virgola',exact:true});
  55  |   await expect(digit).toBeDisabled();await field(page,'FC').fill('72');await field(page,'FC').focus();await field(page,'FC').evaluate(el=>el.setSelectionRange(0,1));await digit.click();await expect(field(page,'FC')).toHaveValue('729');
  56  |   await field(page,'FC').evaluate(el=>el.setSelectionRange(0,1));await page.keyboard.type('6');await expect(field(page,'FC')).toHaveValue('629');await back.click();await expect(field(page,'FC')).toHaveValue('62');
  57  |   await field(page,'TC').fill('36');await field(page,'TC').focus();await comma.click();await form(page).getByRole('button',{name:'5',exact:true}).click();await expect(field(page,'TC')).toHaveValue('36,5');await comma.click();await expect(field(page,'TC')).toHaveValue('36,5');await back.click();await expect(field(page,'TC')).toHaveValue('36,');
  58  |   await field(page,'FR').focus();await expect(comma).toBeDisabled();for(const l of ['O₂','Coscienza','Evacuazione','Note sulla rilevazione']){await field(page,l).focus();await expect(digit).toBeDisabled();await expect(back).toBeDisabled();await expect(comma).toBeDisabled();}
  59  |   await field(page,'FC').fill('123456');await field(page,'FC').focus();await digit.click();await expect(field(page,'FC')).toHaveValue('123456');await save(page).focus();await expect(digit).toBeDisabled();expect(state.posts).toEqual([]);await shot(page,`${view}-keypad-scope-and-caret`);await healthy(state);
  60  |  });
  61  |  test(`${view} AC4 complete current NEWS2 payload uncertainty same request one durable reading reload`,async({page})=>{
  62  |   await open(page,view);for(const [l,v]of [['FR','18'],['SpO₂','98'],['PA sistolica','120/80'],['FC','72'],['TC','36,5'],['DTX','110']])await field(page,l).fill(v);await field(page,'O₂').selectOption('no');await field(page,'Coscienza').selectOption('A');
  63  |   await expect(form(page).getByText('NEWS2 in tempo reale · 0',{exact:true})).toBeVisible();await shot(page,`${view}-full-current-news2`);
  64  |   state.failure='lost';await save(page).click();await expect(form(page).getByRole('button',{name:'Riprova salvataggio'})).toBeVisible();for(const l of labels)await expect(field(page,l)).toBeDisabled();await expect(form(page).getByRole('button',{name:'5',exact:true})).toBeDisabled();
  65  |   await form(page).getByRole('button',{name:'Riprova salvataggio'}).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();expect(state.posts).toHaveLength(2);expect(state.posts[0]).toEqual(state.posts[1]);expect(state.posts[0].values).toEqual(historical);expect(state.saved).toHaveLength(1);
  66  |   for(const l of labels)await expect(field(page,l)).toHaveValue('');await expect(form(page).getByText(/Prima: 36,5 ·/)).toBeVisible();
  67  |   await page.reload();await open(page,view);await expect(form(page).getByText(/Prima: 36,5 ·/)).toBeVisible();expect(state.saved).toHaveLength(1);expect(state.posts).toHaveLength(2);for(const l of labels)await expect(field(page,l)).toHaveValue('');await shot(page,`${view}-durable-synthetic-reload`);await healthy(state);
  68  |  });
  69  |  test(`${view} AC4 definitive rejection editable correction new identity decimal dot partial score`,async({page})=>{
  70  |   await open(page,view);await field(page,'TC').fill('37.5');await expect(form(page).getByText('NEWS2 in tempo reale · —',{exact:true})).toBeVisible();state.failure='definite';await save(page).click();await expect(form(page).getByRole('alert')).toHaveText('Rifiuto sintetico di validazione');await expect(field(page,'TC')).toBeEnabled();await expect(field(page,'TC')).toHaveValue('37.5');const rejected=state.posts[0];
  71  |   state.failure=null;await field(page,'TC').fill('36.5');await save(page).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();expect(state.posts[1].requestId).not.toBe(rejected.requestId);expect(state.posts[1].values).toEqual({temperatura:'36.5'});expect(state.saved).toHaveLength(1);
  72  |   await page.reload();await open(page,view);await expect(form(page).getByText(/Prima: 36.5 ·/)).toBeVisible();await shot(page,`${view}-definite-reject-correction-reload`);await healthy(state);
  73  |  });
  74  | }
  75  | test('ward adversarial patient switch during inflight never changes original owner or new draft',async({page})=>{
  76  |  await open(page,'ward');await field(page,'FC').fill('73');state.holdPost=true;await save(page).click();await expect.poll(()=>state.posts.length).toBe(1);await expect(field(page,'FC')).toBeDisabled();
  77  |  await page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();await expect(field(page,'FC')).toHaveValue('');await field(page,'FC').fill('83');state.holdPost=false;state.heldPosts.splice(0).forEach(resolve=>resolve());await expect.poll(()=>state.saved.length).toBe(1);await expect(field(page,'FC')).toHaveValue('83');expect(state.saved[0].patientId).toBe(patient.id);expect(state.saved[0].values).toEqual({fc:'73'});
  78  |  await page.locator('.par-pick__main').filter({hasText:'Sintetica, Persona'}).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();await expect(field(page,'FC')).toHaveValue('');
  79  |  await page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();await expect(field(page,'FC')).toHaveValue('83');await save(page).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();expect(state.posts[1].patientId).toBe(second.id);expect(state.saved).toHaveLength(2);
  80  |  await page.reload();await open(page,'ward');await page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();await expect(form(page).getByText(/Prima: 83 ·/)).toBeVisible();await shot(page,'ward-inflight-owner-second-reload');await healthy(state);
  81  | });
  82  | test('chart adversarial stale session save guard and unmount inflight response cannot overwrite new chart',async({page})=>{
  83  |  await open(page,'chart');await field(page,'FC').fill('74');
  84  |  await page.evaluate(async()=>{const session=await import('/src/lib/operatorSession.ts');session.setCurrentOperator({id:'QA417-OTHER',role:'operatore'});});await save(page).click();await expect(form(page).getByRole('alert')).toHaveText(/sessione operatore è cambiata/);expect(state.posts).toEqual([]);await shot(page,'chart-stale-session-guard');
  85  |  await page.evaluate(async()=>{const session=await import('/src/lib/operatorSession.ts');session.setCurrentOperator({id:'QA417-NURSE',role:'operatore',accessToken:'sim.synthetic417-not-real'});});state.holdPost=true;await save(page).click();await expect.poll(()=>state.posts.length).toBe(1);await switchNav(page,'Pazienti');await page.locator('.patient-roster__row,.patient-card').getByRole('button',{name:'Apri cartella di Seconda Sintetica',exact:true}).click();await page.getByRole('tab',{name:/Parametri/}).click();await expect(form(page)).toBeVisible();await field(page,'FC').fill('84');
  86  |  state.holdPost=false;state.heldPosts.splice(0).forEach(resolve=>resolve());await expect.poll(()=>state.saved.length).toBe(1);await expect(field(page,'FC')).toHaveValue('84');expect(state.saved[0].patientId).toBe(patient.id);expect(state.posts[0].values).toEqual({fc:'74'});await expect(form(page).getByText(/Rilevazione salvata/)).toHaveCount(0);await shot(page,'chart-unmount-guard-second-draft');await healthy(state);
  87  | });
  88  | test('ward previous loading aborted on patient switch cannot leak original captions into second patient',async({page})=>{
  89  |  state.priorMode='hold';await open(page,'ward');await expect(form(page).locator('.parameter-reading-form__previous').first()).toHaveText('Prima: …');
  90  |  await page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();await expect(form(page).locator('.parameter-reading-form__previous').first()).toHaveText('Prima: …');for(const l of labels)await expect(field(page,l)).toHaveValue('');
  91  |  state.priorMode='ready';state.heldReads.splice(0).forEach(resolve=>resolve());await expect(form(page).getByText('Nessuna rilevazione precedente',{exact:true}).first()).toBeVisible();await expect(form(page).getByText(/Prima: 18/)).toHaveCount(0);await field(page,'FC').fill('82');await expect(field(page,'FC')).toHaveValue('82');expect(state.posts).toEqual([]);await shot(page,'ward-aborted-previous-patient-guard');await healthy(state);
  92  | });
  93  | for(const view of ['chart','ward'])test(`${view} privacy XSS free text bounded literal payload persists and renders as text`,async({page})=>{
  94  |  await open(page,view);await expect(field(page,'Evacuazione')).toHaveAttribute('maxlength','200');await expect(field(page,'Note sulla rilevazione')).toHaveAttribute('maxlength','2000');const markup='<img src=x onerror="window.qa417Xss=true"> Nota sintetica';
  95  |  await field(page,'FR').fill('18');await field(page,'Note sulla rilevazione').fill(markup);await save(page).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();expect(state.posts[0].values.note).toBe(markup);expect(state.saved[0].values.note).toBe(markup);
  96  |  await page.reload();await open(page,view);await form(page).getByRole('button',{name:'Mostra lo storico'}).count().then(async count=>{if(count)await form(page).getByRole('button',{name:'Mostra lo storico'}).click();else if(view==='ward')await page.locator('.par-form__head').getByRole('button',{name:'Storico',exact:true}).click();});
  97  |  if(view==='ward')await expect(page.getByRole('tab',{name:/Parametri/})).toBeVisible();
  98  |  await expect(page.getByText(markup,{exact:false}).first()).toBeVisible();expect(await page.evaluate(()=>window.qa417Xss)).toBeUndefined();await expect(page.locator('img[src="x"]')).toHaveCount(0);await shot(page,`${view}-synthetic-note-escaped-persisted`);await healthy(state);
  99  | });
  100 | for(const [size,width,height]of [['tablet',768,1024],['mobile',390,844]])for(const view of ['chart','ward'])test(`${view} responsive ${size} fields fit and keyboard reaches every input`,async({page})=>{
  101 |  await page.setViewportSize({width,height});await open(page,view);await expect(form(page)).toBeVisible();await expect(field(page,'FR')).toHaveValue('');const boxes=await form(page).locator('fieldset input,fieldset select,fieldset textarea').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width};}));expect(boxes.every(b=>b.x>=0&&b.right<=width&&b.width>0)).toBe(true);await field(page,'FR').focus();for(const l of labels){await expect(field(page,l)).toBeFocused();await page.keyboard.press('Tab');}expect(state.posts).toEqual([]);await shot(page,`${view}-${size}-linear-fields`);await healthy(state);
  102 | });
  103 | 
```