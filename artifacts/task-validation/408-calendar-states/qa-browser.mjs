import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire('C:/w-insulin-qa/package.json');const {chromium,expect}=require('playwright/test');
const out=resolve(process.env.QA408_OUTPUT||'artifacts/task-validation/408-calendar-states/independent');
for(const dir of ['screenshots','video','test-results','playwright-report'])mkdirSync(`${out}/${dir}`,{recursive:true});
const outcomes=[],states=[],contexts=[];const browser=await chromium.launch({headless:true});
const identity={id:'QA-NURSE-408',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const patient={id:'QA-PATIENT-408',firstName:'Persona',lastName:'Sintetica',medicalRecordNumber:'QA-408',dateOfBirth:'1980-01-01',sex:'M',location:{status:'unassigned'}};
const dose=(id,time,status='pending')=>({therapyId:`QA-${id}`,administrationId:status==='pending'?null:`QA-ADM-${id}`,drugName:`Farmaco sintetico ${id}`,dosage:'5 mg',quantityLabel:'1 compressa',route:'orale',scheduledTime:time,status,administeredAt:status==='administered'?'2026-10-08T22:20:00Z':null,administeredBy:status==='administered'?'Infermiere Sintetico':null,notAdministeredReason:status==='not_administered'?'rifiutata_paziente':null});
function pageFixture(date,cursor){
 let rows=[],hasMore=false,summaryExact=true;
 if(date==='2026-10-08')rows=[dose('prior','08:00')];
 if(date==='2026-10-09')rows=[dose('early','00:15'),dose('distinct','07:15'),dose('mixed-pending','08:00'),dose('mixed-done','08:00','administered'),dose('mixed-refused','08:00','not_administered'),dose('done','11:00','administered'),dose('refused','12:00','not_administered'),dose('mixedzero-done','13:00','administered'),dose('mixedzero-refused','13:00','not_administered'),...Array.from({length:8},(_,i)=>dose(`late-row-${i}`,`${String(14+i).padStart(2,'0')}:00`))];
 if(date==='2026-10-10'){rows=[dose(cursor?'partial-added':'partial-positive','08:00')];hasMore=!cursor;}
 if(date==='2026-10-11'){rows=[dose('partial-zero-inexact','08:00','administered')];summaryExact=false;}
 if(date==='2026-10-07'){rows=[dose(cursor?'zero-added':'partial-zero-more','08:00',cursor?'pending':'administered')];hasMore=!cursor;}
 const summary={total:rows.length,administered:rows.filter(r=>r.status==='administered').length,notAdministered:rows.filter(r=>r.status==='not_administered').length,pending:rows.filter(r=>r.status==='pending').length};
 return {slots:rows.length?[{id:`QA-SLOT-${date}`,fascia:'mattina',label:'Mattina sintetica',ora:'08:00',summary,patients:[{patientId:patient.id,firstName:patient.firstName,lastName:patient.lastName,room:'Non assegnato',bed:'Non assegnato',location:{status:'unassigned'},administrations:rows}]}]:[],pageInfo:{hasMore,nextCursor:hasMore?'QA-NEXT':null,loadedTherapies:rows.length,completeness:hasMore?'partial':'complete',summaryExact}};
}
async function makeContext(mobile){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},timezoneId:'America/Los_Angeles',recordVideo:{dir:`${out}/video`}});contexts.push(context);
 await context.addInitScript(()=>{const OriginalDate=Date;const fixed=OriginalDate.parse('2026-10-08T22:30:00Z');class QADate extends OriginalDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}globalThis.Date=QADate;});
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={mobile,clock:'2026-10-08T22:30:00Z',hostTimezone:'America/Los_Angeles',facilityCurrentDate:'2026-10-09',requests:[],writes:[],unexpected:[],external:[],consoleErrors:[],runtimeErrors:[],httpErrors:[],measurements:[]};states.push(state);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(!['127.0.0.1','localhost'].includes(url.hostname)){state.external.push(url.origin);return route.abort();}
  if(url.port!=='3001')return route.continue();
  const method=request.method();state.requests.push({method,path,query:url.search});
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',simulator:true,temporaryDemo:false});
  if(path==='/auth/simulator/identities')return json({identities:[identity]});
  if(path==='/auth/simulator/session'&&method==='POST')return json({token:'synthetic408-not-a-secret'});
  if(method!=='GET'){state.writes.push({method,path});return json({error:'QA clinical write forbidden'},500);}
  if(path==='/auth/me')return json({...identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(['patients.list_page','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get'].map(key=>[key,{allowed:true,effect:'READ_ONLY'}]))});
  if(path==='/therapy-slots/page')return json(pageFixture(url.searchParams.get('date'),url.searchParams.get('cursor')));
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ricoverato'}});
  if(path==='/patients/clinical-summary')return json([]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:1,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/therapy-slots'||path==='/appointments')return json([]);
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(path==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
  state.unexpected.push({method,path});return json({error:'Unexpected guarded API'},500);
 });
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')state.consoleErrors.push(m.text());});page.on('pageerror',e=>state.runtimeErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 return {context,page,state};
}
const cell=(ctx,date,time)=>ctx.page.locator(`[data-testid="therapy-calendar-count"][data-date="${date}"][data-time="${time}"]`);
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}
async function shot(ctx,name){await ctx.page.screenshot({path:`${out}/screenshots/${ctx.state.mobile?'mobile':'desktop'}-${name}.png`});}
async function open(ctx,date,time){const button=cell(ctx,date,time);await button.scrollIntoViewIfNeeded();await button.focus();await ctx.page.keyboard.press('Enter');const dialog=ctx.page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading')).toHaveText(`Terapie delle ${time}`);return dialog;}
async function close(ctx,date,time){await ctx.page.getByRole('dialog').getByRole('button',{name:'Chiudi',exact:true}).click();await expect(ctx.page.getByRole('dialog')).toHaveCount(0);await expect(cell(ctx,date,time)).toBeFocused();}
function clean(ctx){for(const key of ['writes','unexpected','external','consoleErrors','runtimeErrors','httpErrors'])expect(ctx.state[key],key).toEqual([]);}
try{
 for(const mobile of [false,true]){
  const ctx=await makeContext(mobile),name=mobile?'mobile':'desktop';await ctx.page.goto('http://127.0.0.1:7472/#/terapie');await ctx.page.getByRole('button',{name:/Infermiere Sintetico/}).click();await expect(ctx.page.locator('.tcal')).toBeVisible();
  await check(`${name} actual SPA non-color labels/symbols/mixed counts`,async()=>{
   for(const [date,time,label,symbol,count]of [['2026-10-08','08:00','Ritardo / non registrata','!','1'],['2026-10-09','00:15','Ritardo / non registrata','!','1'],['2026-10-09','08:00','Programmata','○','1'],['2026-10-09','11:00','Somministrate','✓','0'],['2026-10-09','12:00','Non somministrate presenti','×','0'],['2026-10-09','13:00','Non somministrate presenti','×','0']]){
    const target=cell(ctx,date,time);await target.scrollIntoViewIfNeeded();await expect(target).toBeVisible();await expect(target.locator('.therapy-calendar-count__state')).toHaveText(label);await expect(target.locator('.therapy-calendar-count__symbol')).toHaveText(symbol);await expect(target.locator('strong')).toHaveText(count);await expect(target).toContainText('da erogare');
   }
   await expect(cell(ctx,'2026-10-09','08:00').locator('.therapy-calendar-count__detail')).toHaveText('1 somministrate · 1 non somministrate');await expect(cell(ctx,'2026-10-09','13:00').locator('.therapy-calendar-count__detail')).toHaveText('1 somministrate · 1 non somministrate');
   await cell(ctx,'2026-10-09','08:00').scrollIntoViewIfNeeded();await shot(ctx,'mixed-states');
   await ctx.page.addStyleTag({content:'.tcal {filter:grayscale(1)}'});expect(await ctx.page.locator('.tcal').evaluate(el=>getComputedStyle(el).filter)).toBe('grayscale(1)');await shot(ctx,'grayscale-mixed');
   for(const selector of ['.therapy-calendar-count__state','.therapy-calendar-count__detail']){const measurement=await cell(ctx,'2026-10-09','08:00').locator(selector).evaluate(el=>({text:el.textContent,display:getComputedStyle(el).display,width:el.clientWidth,height:el.clientHeight,scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight}));expect(measurement.display).not.toBe('none');expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.width+1);expect(measurement.scrollHeight).toBeLessThanOrEqual(measurement.height+1);ctx.state.measurements.push(measurement);}
  });
  await check(`${name} facility Rome Oggi sticky header survives scroll; host previous date`,async()=>{
   const today=ctx.page.locator('.therapy-calendar-grid__today');await expect(today).toContainText('ven 9 ott');await expect(today.locator('strong')).toHaveText('Oggi');await expect(today).toHaveAttribute('aria-current','date');
   await today.scrollIntoViewIfNeeded();await ctx.page.locator('.therapy-calendar-grid').evaluate(el=>{el.scrollTop=el.scrollHeight;});expect(await today.evaluate(el=>getComputedStyle(el).position)).toBe('sticky');await expect(today).toBeVisible();const rect=await today.boundingBox(),grid=await ctx.page.locator('.therapy-calendar-grid').boundingBox();expect(Math.abs(rect.y-grid.y)).toBeLessThan(4);await shot(ctx,'sticky-oggi');await ctx.page.locator('.therapy-calendar-grid').evaluate(el=>el.scrollTop=0);
  });
  await check(`${name} exact 07:15/08:00 same band dialogs preserve statuses/dose/date and focus`,async()=>{
   const first=await open(ctx,'2026-10-09','07:15');await expect(first).toContainText('venerdì 9 ottobre 2026');await expect(first.locator('.therapy-calendar-dialog__count')).toHaveText('1 paziente · 1 dose');await expect(first).toContainText('Farmaco sintetico distinct');await expect(first).not.toContainText('mixed-pending');await close(ctx,'2026-10-09','07:15');
   const mixed=await open(ctx,'2026-10-09','08:00');await expect(mixed.locator('.therapy-calendar-dialog__count')).toHaveText('1 paziente · 3 dosi');for(const id of ['mixed-pending','mixed-done','mixed-refused'])await expect(mixed).toContainText(`Farmaco sintetico ${id}`);for(const text of ['1 compressa','orale','Da somministrare','Somministrata 00:20 da Infermiere Sintetico','Non somministrata · Rifiutata dal paziente'])await expect(mixed).toContainText(text);await shot(ctx,'exact-time-dialog');await close(ctx,'2026-10-09','08:00');
  });
  await check(`${name} incomplete positive/zero flags and actual bounded load-more merge`,async()=>{
   await expect(cell(ctx,'2026-10-10','08:00').locator('strong')).toHaveText('≥1');await expect(cell(ctx,'2026-10-10','08:00')).toContainText('Elenco parziale');
   for(const date of ['2026-10-11','2026-10-07']){await expect(cell(ctx,date,'08:00').locator('strong')).toHaveText('—');await expect(cell(ctx,date,'08:00')).toContainText('Conteggio incompleto');await expect(cell(ctx,date,'08:00')).toContainText('Elenco parziale');}
   await cell(ctx,'2026-10-11','08:00').scrollIntoViewIfNeeded();await shot(ctx,'partial-zero');
   const dialog=await open(ctx,'2026-10-07','08:00');await expect(dialog.locator('.therapy-calendar-dialog__count')).toHaveText('1 paziente · 1 dose caricate');await dialog.getByRole('button',{name:'Carica altri dettagli',exact:true}).click();await expect(dialog.locator('.therapy-calendar-dialog__count')).toHaveText('1 paziente · 2 dosi');await expect(dialog).toContainText('Farmaco sintetico zero-added');await close(ctx,'2026-10-07','08:00');await expect(cell(ctx,'2026-10-07','08:00').locator('strong')).toHaveText('1');await expect(cell(ctx,'2026-10-07','08:00')).not.toContainText('Elenco parziale');
   const positive=await open(ctx,'2026-10-10','08:00');await positive.getByRole('button',{name:'Carica altri dettagli',exact:true}).click();await expect(positive.locator('.therapy-calendar-dialog__count')).toHaveText('1 paziente · 2 dosi');await close(ctx,'2026-10-10','08:00');await expect(cell(ctx,'2026-10-10','08:00').locator('strong')).toHaveText('2');
  });
  await check(`${name} other week excludes Oggi; existing Giro alternative intact`,async()=>{
   await ctx.page.getByRole('button',{name:'Settimana successiva',exact:true}).click();await expect(ctx.page.locator('.therapy-calendar-grid__today-marker')).toHaveCount(0);await expect(ctx.page.locator('.tcal')).toContainText('Nessuna dose programmata questa settimana.');await ctx.page.getByRole('button',{name:'Giro',exact:true}).click();await expect(ctx.page.locator('.giro-bar')).toBeVisible();await expect(ctx.page.locator('.giro-view')).toContainText('Farmaco sintetico prior');await shot(ctx,'giro-alternative');
  });
  clean(ctx);await ctx.context.tracing.stop({path:`${out}/${mobile?'mobile-trace':'trace'}.zip`});const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${name}.webm`);await video.delete();
 }
 writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify({applicationCommit:'f58fbbd3337fabe68315dbd3cf7d295219dab58e',outcomes,states,noClinicalWrites:true,fixtureTransport:'Guarded synthetic API, actual SPA; fixed clock and timezone only QA emulation; no application substitutions.',intenseLightDevice:{status:'UNVERIFIED',reason:'Explicit original AC4 requires real device in intense ambient light; grayscale/desktop/mobile emulation cannot certify it.'}},null,2));
 writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><meta charset="utf-8"><title>408 synthetic calendar QA</title><h1>408 actual SPA calendar QA</h1><p>Headless desktop/mobile and grayscale emulation. AC4 device in intense light UNVERIFIED. No release claim.</p><ul>${outcomes.map(x=>`<li>${x.status} ${x.name}</li>`).join('')}</ul>`);
}catch(error){writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:error.message,stack:error.stack,outcomes,states},null,2));throw error;}finally{for(const context of contexts)await context.close().catch(()=>{});await browser.close();}
