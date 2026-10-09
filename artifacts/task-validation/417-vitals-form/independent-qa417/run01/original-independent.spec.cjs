const {createRequire}=require('node:module');const {test,expect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const {guard,open,labels,patient,second,identity,historical,field,form,save,clean,healthy}=require('./fixture.cjs');
const fs=require('node:fs');const path=require('node:path');
const run=process.env.QA_RUN||'run01',evidence=path.join(__dirname,run);
let state;
test.beforeEach(async({context,page})=>{state=await guard(context,page);});
test.afterEach(async({},info)=>{if(state){await info.attach('guarded-runtime-and-synthetic-writes',{body:JSON.stringify(state,(key,val)=>typeof val==='function'?undefined:val,2),contentType:'application/json'});fs.mkdirSync(path.join(evidence,'logs'),{recursive:true});fs.writeFileSync(path.join(evidence,'logs',`${info.title.replace(/[^a-zA-Z0-9]+/g,'-')}.json`),JSON.stringify(state,(key,val)=>typeof val==='function'?undefined:val,2));}});
async function shot(page,name){fs.mkdirSync(path.join(evidence,'screenshots'),{recursive:true});await page.screenshot({path:path.join(evidence,'screenshots',`${name}.png`),fullPage:true});}
async function switchNav(page,name){if(await page.getByRole('button',{name:'Apri menu'}).isVisible())await page.getByRole('button',{name:'Apri menu'}).click();await page.locator('.teams-sidebar').getByRole('button',{name,exact:true}).click();}
async function snapshot(page){return form(page).locator('fieldset label').evaluateAll(els=>els.map(label=>{const el=label.querySelector('input,select,textarea');return{caption:label.querySelector('span').innerText,aria:el.getAttribute('aria-label'),tag:el.tagName,type:el.type,inputMode:el.inputMode,maxLength:el.maxLength,value:el.value,placeholder:el.placeholder,options:el.tagName==='SELECT'?[...el.options].map(o=>[o.value,o.text]):null};}));}
test('AC1 identical visible labels units format order options in both actual SPA views',async({page})=>{
 await open(page,'chart');await expect(form(page).getByText(/Prima: 18/)).toBeVisible();const chart=await snapshot(page);
 expect(chart.map(e=>e.aria)).toEqual(labels.map(l=>`Nuova rilevazione ${l}`));expect(chart.every(e=>e.value==='')).toBe(true);
 expect(chart.map(e=>e.caption)).toEqual(['FR atti/min','SpO₂ %','O₂','PA sistolica mmHg','PA diastolica mmHg','FC bpm','TC °C','Coscienza','DTX mg/dL','Evacuazione','Note sulla rilevazione']);
 expect(chart[2].options).toEqual([['','—'],['no','No (aria ambiente)'],['si','Sì']]);expect(chart[7].options.map(x=>x[0])).toEqual(['','A','C','V','P','U']);
 await shot(page,'chart-schema-and-separated-history');await switchNav(page,'Parametri');await expect(form(page)).toBeVisible();await expect(form(page).getByText(/Prima: 18/)).toBeVisible();const ward=await snapshot(page);expect(ward).toEqual(chart);await shot(page,'ward-schema-and-separated-history');await healthy(state);
});
for(const view of ['chart','ward']){
 test(`${view} AC2 native Tab NEWS2 guidance Enter Next allfields no premature save`,async({page})=>{
  await open(page,view);await expect(form(page).getByText(/Prima: 18/)).toBeVisible();
  await expect(form(page).getByRole('button',{name:'5',exact:true})).toBeDisabled();
  await field(page,'FR').focus();for(const l of labels){await expect(field(page,l)).toBeFocused();if(l!==labels.at(-1))await page.keyboard.press('Tab');}
  for(const l of ['O₂','Coscienza']){const ids=(await field(page,l).getAttribute('aria-describedby')).split(' ');const help=page.locator(`[id="${ids.find(x=>x.endsWith('news2-help'))}"]`);await expect(help).toBeVisible();await expect(help).toHaveText(/sette parametri.*scala SpO₂ 1.*ACVPU.*incompleto/s);}
  for(const [a,b] of [['SpO₂','O₂'],['TC','Coscienza'],['DTX','Evacuazione'],['Evacuazione','Note sulla rilevazione']]){await field(page,a).press('Enter');await expect(field(page,b)).toBeFocused();}
  await field(page,'FR').focus();for(const l of labels){await expect(field(page,l)).toBeFocused();await form(page).getByRole('button',{name:'Campo successivo'}).click();}
  await expect(save(page)).toBeFocused();await expect(form(page).getByRole('button',{name:'5',exact:true})).toBeDisabled();expect(state.posts).toEqual([]);
  await field(page,'O₂').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');await expect(field(page,'PA sistolica')).toBeFocused();await expect(field(page,'O₂')).toHaveValue('no');expect(state.posts).toEqual([]);
  await shot(page,`${view}-native-news2-accessibility`);await healthy(state);
 });
 test(`${view} AC3 historical loading blank pagination truthful no selected-patient fanout`,async({page})=>{
  state.priorMode='hold';state.hasMore=true;
  state.historyRows=Array.from({length:50},(_,i)=>({id:`QA417-PAGE-${i}`,requestId:`QA417-PAGE-${i}`,patientId:patient.id,measuredAt:`2026-10-08T08:${String(59-i).padStart(2,'0')}:00.000Z`,values:{fr:String(18+i%2)},authorOperatorId:identity.id,authorName:identity.name,createdAt:'2026-10-08T08:00:00.000Z'}));
  await open(page,view);await expect(form(page).locator('.parameter-reading-form__previous').first()).toHaveText('Prima: …');
  for(const l of labels)await expect(field(page,l)).toHaveValue('');
  state.priorMode='ready';state.heldReads.splice(0).forEach(resolve=>resolve());
  await expect(form(page).getByText('Prima: non fra le ultime 50 rilevazioni',{exact:true}).first()).toBeVisible();await expect(form(page).getByText(/Prima: 18 ·/)).toBeVisible();
  const reads=state.requests.filter(r=>r.method==='GET'&&r.path.endsWith('/parameter-readings'));
  expect(reads.every(r=>new URLSearchParams(r.query).get('limit')==='50')).toBe(true);expect(reads.every(r=>!new URLSearchParams(r.query).has('cursor'))).toBe(true);expect(reads.every(r=>r.path.includes(patient.id))).toBe(true);
  for(const l of labels)await expect(field(page,l)).toHaveValue('');await expect(form(page).getByText('NEWS2 in tempo reale · —',{exact:true})).toBeVisible();expect(state.posts).toEqual([]);
  await shot(page,`${view}-bounded-history-pagination`);await healthy(state);
 });
 test(`${view} AC3 previous-error never treated as blank verified history and inputs editable`,async({page})=>{
  state.priorMode='error';await open(page,view);await expect(form(page).getByText('Precedente non disponibile',{exact:true}).first()).toBeVisible();
  for(const l of labels)await expect(field(page,l)).toHaveValue('');await field(page,'FC').fill('73');await expect(field(page,'FC')).toHaveValue('73');await expect(field(page,'FC')).toBeEnabled();expect(state.posts).toEqual([]);await shot(page,`${view}-history-failure-truthful`);await healthy(state);
 });
 test(`${view} AC4 same malformed bounds oversize decimal and error linkage no invalid POST`,async({page})=>{
  await open(page,view);
  const cases=[['FR','0','Frequenza respiratoria: numero intero tra 1 e 80.'],['FR','81','Frequenza respiratoria: numero intero tra 1 e 80.'],['FR','2.4','Frequenza respiratoria: numero intero tra 1 e 80.'],['FR','1e1','Frequenza respiratoria: numero intero tra 1 e 80.'],['SpO₂','101','SpO₂ deve essere compresa tra 0 e 100.'],['SpO₂','98.123','SpO₂: inserisci un numero valido.'],['FC','1O8','FC: inserisci un numero valido.'],['FC','-1','FC: inserisci un numero valido.'],['FC','1'.repeat(50),'FC: inserisci un numero valido.'],['TC','37°5','TC: inserisci un numero valido.'],['TC','36,5.2','TC: inserisci un numero valido.'],['DTX','>600','DTX: inserisci un numero valido.'],['DTX','600;DROP TABLE','DTX: inserisci un numero valido.'],['PA sistolica','120/80/70','Pressione: usa il formato 120/80.'],['PA sistolica','120','Pressione: usa il formato 120/80.'],['PA diastolica','80','Pressione: usa il formato 120/80.']];
  for(const [l,v,message]of cases){await clean(page);await field(page,l).fill(v);await save(page).click();await expect(form(page).getByRole('alert')).toHaveText(message);await expect(field(page,l==='PA diastolica'?'PA sistolica':l)).toBeFocused();await expect(field(page,l)).toHaveAttribute('aria-invalid','true');const ids=(await field(page,l).getAttribute('aria-describedby')).split(' ');await expect(page.locator(`[id="${ids.find(x=>x.endsWith('error'))}"]`)).toHaveText(message);expect(state.posts).toEqual([]);if(l==='PA sistolica'&&v==='120/80/70')await expect(field(page,'PA diastolica')).toHaveValue('80/70');else await expect(field(page,l)).toHaveValue(v);}
  await clean(page);await save(page).click();await expect(form(page).getByRole('alert')).toHaveText('Inserisci almeno un parametro.');await expect(field(page,'FR')).toBeFocused();await field(page,'Note sulla rilevazione').fill('Nota esclusivamente sintetica');await save(page).click();expect(state.posts).toEqual([]);await shot(page,`${view}-same-invalid-errors`);await healthy(state);
 });
 test(`${view} AC4 keypad end semantics native caret choice-disable and focus-deactivation`,async({page})=>{
  await open(page,view);const digit=form(page).getByRole('button',{name:'9',exact:true}),back=form(page).getByRole('button',{name:'Cancella',exact:true}),comma=form(page).getByRole('button',{name:'Virgola',exact:true});
  await expect(digit).toBeDisabled();await field(page,'FC').fill('72');await field(page,'FC').focus();await field(page,'FC').evaluate(el=>el.setSelectionRange(0,1));await digit.click();await expect(field(page,'FC')).toHaveValue('729');
  await field(page,'FC').evaluate(el=>el.setSelectionRange(0,1));await page.keyboard.type('6');await expect(field(page,'FC')).toHaveValue('629');await back.click();await expect(field(page,'FC')).toHaveValue('62');
  await field(page,'TC').fill('36');await field(page,'TC').focus();await comma.click();await form(page).getByRole('button',{name:'5',exact:true}).click();await expect(field(page,'TC')).toHaveValue('36,5');await comma.click();await expect(field(page,'TC')).toHaveValue('36,5');await back.click();await expect(field(page,'TC')).toHaveValue('36,');
  await field(page,'FR').focus();await expect(comma).toBeDisabled();for(const l of ['O₂','Coscienza','Evacuazione','Note sulla rilevazione']){await field(page,l).focus();await expect(digit).toBeDisabled();await expect(back).toBeDisabled();await expect(comma).toBeDisabled();}
  await field(page,'FC').fill('123456');await field(page,'FC').focus();await digit.click();await expect(field(page,'FC')).toHaveValue('123456');await save(page).focus();await expect(digit).toBeDisabled();expect(state.posts).toEqual([]);await shot(page,`${view}-keypad-scope-and-caret`);await healthy(state);
 });
 test(`${view} AC4 complete current NEWS2 payload uncertainty same request one durable reading reload`,async({page})=>{
  await open(page,view);for(const [l,v]of [['FR','18'],['SpO₂','98'],['PA sistolica','120/80'],['FC','72'],['TC','36,5'],['DTX','110']])await field(page,l).fill(v);await field(page,'O₂').selectOption('no');await field(page,'Coscienza').selectOption('A');
  await expect(form(page).getByText('NEWS2 in tempo reale · 0',{exact:true})).toBeVisible();await shot(page,`${view}-full-current-news2`);
  state.failure='lost';await save(page).click();await expect(form(page).getByRole('button',{name:'Riprova salvataggio'})).toBeVisible();for(const l of labels)await expect(field(page,l)).toBeDisabled();await expect(form(page).getByRole('button',{name:'5',exact:true})).toBeDisabled();
  await form(page).getByRole('button',{name:'Riprova salvataggio'}).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();expect(state.posts).toHaveLength(2);expect(state.posts[0]).toEqual(state.posts[1]);expect(state.posts[0].values).toEqual(historical);expect(state.saved).toHaveLength(1);
  for(const l of labels)await expect(field(page,l)).toHaveValue('');await expect(form(page).getByText(/Prima: 36,5 ·/)).toBeVisible();
  await page.reload();await open(page,view);await expect(form(page).getByText(/Prima: 36,5 ·/)).toBeVisible();expect(state.saved).toHaveLength(1);expect(state.posts).toHaveLength(2);for(const l of labels)await expect(field(page,l)).toHaveValue('');await shot(page,`${view}-durable-synthetic-reload`);await healthy(state);
 });
 test(`${view} AC4 definitive rejection editable correction new identity decimal dot partial score`,async({page})=>{
  await open(page,view);await field(page,'TC').fill('37.5');await expect(form(page).getByText('NEWS2 in tempo reale · —',{exact:true})).toBeVisible();state.failure='definite';await save(page).click();await expect(form(page).getByRole('alert')).toHaveText('Rifiuto sintetico di validazione');await expect(field(page,'TC')).toBeEnabled();await expect(field(page,'TC')).toHaveValue('37.5');const rejected=state.posts[0];
  state.failure=null;await field(page,'TC').fill('36.5');await save(page).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();expect(state.posts[1].requestId).not.toBe(rejected.requestId);expect(state.posts[1].values).toEqual({temperatura:'36.5'});expect(state.saved).toHaveLength(1);
  await page.reload();await open(page,view);await expect(form(page).getByText(/Prima: 36.5 ·/)).toBeVisible();await shot(page,`${view}-definite-reject-correction-reload`);await healthy(state);
 });
}
test('ward adversarial patient switch during inflight never changes original owner or new draft',async({page})=>{
 await open(page,'ward');await field(page,'FC').fill('73');state.holdPost=true;await save(page).click();await expect.poll(()=>state.posts.length).toBe(1);await expect(field(page,'FC')).toBeDisabled();
 await page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();await expect(field(page,'FC')).toHaveValue('');await field(page,'FC').fill('83');state.holdPost=false;state.heldPosts.splice(0).forEach(resolve=>resolve());await expect.poll(()=>state.saved.length).toBe(1);await expect(field(page,'FC')).toHaveValue('83');expect(state.saved[0].patientId).toBe(patient.id);expect(state.saved[0].values).toEqual({fc:'73'});
 await page.locator('.par-pick__main').filter({hasText:'Sintetica, Persona'}).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();await expect(field(page,'FC')).toHaveValue('');
 await page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();await expect(field(page,'FC')).toHaveValue('83');await save(page).click();await expect(form(page).getByText(/Rilevazione salvata/)).toBeVisible();expect(state.posts[1].patientId).toBe(second.id);expect(state.saved).toHaveLength(2);
 await page.reload();await open(page,'ward');await page.locator('.par-pick__main').filter({hasText:'Sintetica, Seconda'}).click();await expect(form(page).getByText(/Prima: 83 ·/)).toBeVisible();await shot(page,'ward-inflight-owner-second-reload');await healthy(state);
});
test('chart adversarial stale session save guard and unmount inflight response cannot overwrite new chart',async({page})=>{
 await open(page,'chart');await field(page,'FC').fill('74');
 await page.evaluate(async()=>{const session=await import('/src/lib/operatorSession.ts');session.setCurrentOperator({id:'QA417-OTHER',role:'operatore'});});await save(page).click();await expect(form(page).getByRole('alert')).toHaveText(/sessione operatore è cambiata/);expect(state.posts).toEqual([]);await shot(page,'chart-stale-session-guard');
 await page.evaluate(async()=>{const session=await import('/src/lib/operatorSession.ts');session.setCurrentOperator({id:'QA417-NURSE',role:'operatore',accessToken:'sim.synthetic417-not-real'});});state.holdPost=true;await save(page).click();await expect.poll(()=>state.posts.length).toBe(1);await switchNav(page,'Pazienti');await page.locator('.patient-roster__row,.patient-card').getByRole('button',{name:'Apri cartella di Seconda Sintetica',exact:true}).click();await page.getByRole('tab',{name:/Parametri/}).click();await expect(form(page)).toBeVisible();await field(page,'FC').fill('84');
 state.holdPost=false;state.heldPosts.splice(0).forEach(resolve=>resolve());await expect.poll(()=>state.saved.length).toBe(1);await expect(field(page,'FC')).toHaveValue('84');expect(state.saved[0].patientId).toBe(patient.id);expect(state.posts[0].values).toEqual({fc:'74'});await expect(form(page).getByText(/Rilevazione salvata/)).toHaveCount(0);await shot(page,'chart-unmount-guard-second-draft');await healthy(state);
});
for(const [size,width,height]of [['tablet',768,1024],['mobile',390,844]])for(const view of ['chart','ward'])test(`${view} responsive ${size} fields fit and keyboard reaches every input`,async({page})=>{
 await page.setViewportSize({width,height});await open(page,view);await expect(form(page)).toBeVisible();await expect(field(page,'FR')).toHaveValue('');const boxes=await form(page).locator('fieldset input,fieldset select,fieldset textarea').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width};}));expect(boxes.every(b=>b.x>=0&&b.right<=width&&b.width>0)).toBe(true);await field(page,'FR').focus();for(const l of labels){await expect(field(page,l)).toBeFocused();await page.keyboard.press('Tab');}expect(state.posts).toEqual([]);await shot(page,`${view}-${size}-linear-fields`);await healthy(state);
});
