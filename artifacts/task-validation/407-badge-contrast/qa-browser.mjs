import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire('C:/w-insulin-qa/package.json');
const {chromium,expect}=require('playwright/test');
const out=resolve(process.env.QA407_OUTPUT||'artifacts/task-validation/407-badge-contrast/independent');
for(const dir of ['screenshots','test-results','playwright-report','video'])mkdirSync(`${out}/${dir}`,{recursive:true});
const outcomes=[],states=[],contexts=[];
const browser=await chromium.launch({headless:true});
const patient={id:'QA-PATIENT-407',medicalRecordNumber:'QA-407',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',phone:null,email:null,location:{status:'unassigned'}};
const identity={id:'QA-NURSE-407',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
async function contextFor(mobile){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1150,height:1004},recordVideo:{dir:`${out}/video`}});contexts.push(context);
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state={mobile,requests:[],writes:[],errors:[],pageErrors:[],httpErrors:[],blockedExternal:[],unexpected:[],textMeasurements:[],controlDiagnostics:[]};states.push(state);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(url.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(!['127.0.0.1','localhost'].includes(url.hostname)){state.blockedExternal.push(url.origin);return route.abort();}
  if(url.port!=='3001')return route.continue();
  state.requests.push({method:request.method(),path,query:url.search});
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[identity]});
  if(path==='/auth/simulator/session'&&request.method()==='POST')return json({token:'synthetic407-not-a-secret'});
  if(request.method()!=='GET'){state.writes.push({method:request.method(),path});return json({error:'QA write forbidden'},500);}
  if(path==='/auth/me'){
   const capabilities=Object.fromEntries(['patients.list_page','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get'].map(key=>[key,{allowed:true,effect:'READ_ONLY'}]));
   capabilities['intake.create_draft']={allowed:false,effect:'DENIED'};
   return json({...identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities});
  }
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}`)return json(patient);
  if(path===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ricoverato'}});
  if(path===`/patients/${patient.id}/parameter-readings`)return json({readings:[],hasMore:false,nextCursor:null});
  if(path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:[],rischiElevati:[],allergeni:[],hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0}]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:1,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/therapy-slots'||path==='/appointments')return json([]);
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(path==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
  state.unexpected.push(`${request.method()} ${path}`);return json({error:'Unexpected guarded API'},500);
 });
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 return {context,page,state};
}
async function login(ctx){
 await ctx.page.goto('http://127.0.0.1:7471/#/pazienti');
 await ctx.page.getByRole('button',{name:/Infermiere Sintetico/}).click();
 await expect(ctx.page.locator('.patient-list-view')).toBeVisible();
 await expect(ctx.page.locator(ctx.state.mobile?'.patient-card-grid .stato-pill--ricovero-ricoverato':'.patient-roster .stato-pill--ricovero-ricoverato')).toHaveText('Ricoverato');
}
async function measure(locator){
 return locator.evaluate(el=>{
  const rgba=value=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true});context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);const a=[...context.getImageData(0,0,1,1).data];return [a[0],a[1],a[2],a[3]/255];};
  const blend=(fg,bg)=>[...fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3])),1];
  const chain=[];let n=el;while(n){const s=getComputedStyle(n);chain.unshift({tag:n.tagName,background:s.backgroundColor,opacity:Number(s.opacity)});n=n.parentElement;}
  let surface=[255,255,255,1],parentSurface=[255,255,255,1];for(const [index,node] of chain.entries()){surface=blend(rgba(node.background),surface);if(index<chain.length-1)parentSurface=surface;}
  const s=getComputedStyle(el),raw=rgba(s.color),effective=blend(raw,surface);
  const lum=rgb=>{const channels=rgb.slice(0,3).map(v=>{const c=v/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
  const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const r=el.getBoundingClientRect();
  return {text:el.textContent.trim(),foreground:s.color,background:s.backgroundColor,effectiveSurface:surface,parentSurface,colorConversion:'Browser canvas sRGB pixel conversion supports rgb/rgba/oklab/color-mix computed colors; alpha composited across ancestors, white browser canvas base.',opacity:Number(s.opacity),ancestorOpacityProduct:chain.reduce((p,x)=>p*x.opacity,1),fontSize:s.fontSize,fontWeight:s.fontWeight,ratio:ratio(effective,surface),border:{color:s.borderTopColor,width:s.borderTopWidth,style:s.borderTopStyle,ratioAgainstInside:ratio(blend(rgba(s.borderTopColor),surface),surface),ratioAgainstOutside:ratio(blend(rgba(s.borderTopColor),parentSurface),parentSurface)},outline:{color:s.outlineColor,width:s.outlineWidth,style:s.outlineStyle,offset:s.outlineOffset,ratioAgainstElementSurface:ratio(blend(rgba(s.outlineColor),surface),surface),ratioAgainstParentSurface:ratio(blend(rgba(s.outlineColor),parentSurface),parentSurface)},svgPaint:el.tagName.toLowerCase()==='svg'?[...el.querySelectorAll('path,polyline,line,rect,circle')].map(shape=>({tag:shape.tagName,stroke:getComputedStyle(shape).stroke,fill:getComputedStyle(shape).fill})):null,rect:{x:r.x,y:r.y,width:r.width,height:r.height},focusVisible:el.matches(':focus-visible')};
 });
}
async function textProof(ctx,locator,surface,state){
 await expect(locator).toBeVisible();const m=await measure(locator);
 expect(m.text.length).toBeGreaterThan(0);expect(m.ratio,`${surface}/${state}`).toBeGreaterThanOrEqual(4.5);expect(m.ancestorOpacityProduct).toBe(1);
 ctx.state.textMeasurements.push({surface,state,...m});return m;
}
async function tabTo(ctx,target){
 await ctx.page.keyboard.press('Escape');await ctx.page.mouse.move(0,0);
 for(let i=0;i<80;i++){if(await target.evaluate(el=>document.activeElement===el))break;await ctx.page.keyboard.press('Tab');}
 await expect(target).toBeFocused();expect(await target.evaluate(el=>el.matches(':focus-visible'))).toBe(true);await ctx.page.waitForTimeout(200);
}
async function diagnostics(ctx,locator,name,state){
 const m=await measure(locator);const parent=await measure(locator.locator('..'));
 ctx.state.controlDiagnostics.push({surface:name,state,...m,parentSurface:parent.effectiveSurface,thresholds:{nonText:3,normalText:4.5},scope:'Diagnostic only; border/outline geometry, rendered area and component identification remain separate from text contrast. No broad control compliance claim.'});
}
function clean(ctx){for(const key of ['errors','pageErrors','httpErrors','blockedExternal','unexpected','writes'])expect(ctx.state[key],key).toEqual([]);}
async function check(name,fn){await fn();outcomes.push({name,status:'PASS'});console.log(`PASS ${name}`);}
async function finish(ctx,name){clean(ctx);await ctx.context.tracing.stop({path:`${out}/${name==='desktop'?'trace':'mobile-trace'}.zip`});const video=ctx.page.video();await ctx.context.close();await video.saveAs(`${out}/video/${name}.webm`);await video.delete();}
async function probe(ctx){
 await ctx.page.evaluate(()=>{
  const section=document.createElement('section');section.id='qa407-probe';section.setAttribute('aria-label','QA-only shared badge CSS probe');
  const title=document.createElement('h2');title.textContent='QA-only · badge condivisi (CSS app, non componenti di produzione)';section.append(title);
  const variants=[['stato-pill stato-pill--ricovero-ricoverato','Ricoverato'],['stato-pill stato-pill--attivo','Attivo'],['stato-pill stato-pill--consegna-completata','Completata'],['status-badge status-badge--success','Esito positivo'],['ds-badge ds-badge--ok','NEWS2 sintetico nella norma']];
  for(const [className,label]of variants){const line=document.createElement('p');const badge=document.createElement(className.startsWith('ds-badge')?'button':'span');badge.className=className;badge.textContent=label;badge.id=`qa407-${variants.findIndex(x=>x[0]===className)}`;if(badge.tagName==='BUTTON')badge.type='button';else line.tabIndex=0;line.append(badge);section.append(line);}
  document.querySelector('main').append(section);
 });
 for(let i=0;i<5;i++){
  const target=ctx.page.locator(`#qa407-${i}`),parent=i===4?target:target.locator('..');
  await ctx.page.mouse.move(0,0);await textProof(ctx,target,`QA-only shared consumer ${i}`,'default');
  await target.hover();await ctx.page.waitForTimeout(200);await textProof(ctx,target,`QA-only shared consumer ${i}`,'hover');
  await tabTo(ctx,parent);await textProof(ctx,target,`QA-only shared consumer ${i}`,'keyboard-focused parent');
 }
 await ctx.page.locator('#qa407-probe').scrollIntoViewIfNeeded();await ctx.page.screenshot({path:`${out}/screenshots/${ctx.state.mobile?'mobile':'desktop'}-shared-css-probe.png`});
 await ctx.page.locator('#qa407-probe').evaluate(el=>el.remove());
}
try{
 for(const mobile of [false,true]){
  const ctx=await contextFor(mobile);await login(ctx);const name=mobile?'mobile':'desktop';
  const badge=ctx.page.locator(mobile?'.patient-card-grid .stato-pill--ricovero-ricoverato':'.patient-roster .stato-pill--ricovero-ricoverato');
  const parent=ctx.page.locator(mobile?'.patient-card .ds-btn':'.patient-roster__row').first();
  await check(`AC1/3 ${name} actual roster visible literal Ricoverato default/hover/keyboard-parent focus`,async()=>{
   await expect(badge).toHaveText('Ricoverato');expect(await badge.evaluate(el=>el.closest('[aria-hidden="true"]')===null)).toBe(true);
   await textProof(ctx,badge,'Actual PatientRoster Ricoverato','default');
   await ctx.page.screenshot({path:`${out}/screenshots/${name}-roster-default.png`});
   await (mobile?ctx.page.locator('.patient-card'):parent).hover();await ctx.page.waitForTimeout(200);await textProof(ctx,badge,'Actual PatientRoster Ricoverato','hovered row/card');
   await ctx.page.screenshot({path:`${out}/screenshots/${name}-roster-hover.png`});
   await tabTo(ctx,parent);await textProof(ctx,badge,'Actual PatientRoster Ricoverato',mobile?'keyboard focus on card open button':'keyboard-focused row');
   await ctx.page.screenshot({path:`${out}/screenshots/${name}-roster-focused-parent.png`});
   if(mobile)expect(await ctx.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
  await check(`AC4 ${name} nearby actual control/icon/border/focus diagnostics separately recorded`,async()=>{
   if(!mobile)await diagnostics(ctx,parent,'Actual PatientRoster row','keyboard-focused row');
   const control=ctx.page.locator(mobile?'.patient-card .ds-btn':'.patient-roster__open').first();
   await ctx.page.mouse.move(0,0);await control.evaluate(el=>el.blur());await diagnostics(ctx,control,'Actual roster open control','default');
   await control.hover();await ctx.page.waitForTimeout(200);await diagnostics(ctx,control,'Actual roster open control','hover');
   await tabTo(ctx,control);await diagnostics(ctx,control,'Actual roster open control','keyboard-focused');
   const svg=control.locator('svg');await expect(svg).toBeVisible();await diagnostics(ctx,svg,'Actual roster open chevron SVG currentColor','keyboard-focused parent');
   await ctx.page.screenshot({path:`${out}/screenshots/${name}-actual-control-focus.png`});
  });
  await check(`AC1/2/3 ${name} five shared green consumers QA-only loaded CSS default/hover/focus`,()=>probe(ctx));
  clean(ctx);await finish(ctx,name);
 }
 writeFileSync(`${out}/test-results/browser-results.json`,JSON.stringify({applicationCommit:'973d78e5e109032a36cf89cf80fd8eb2a848a649',outcomes,states,physicalDeviceVerification:{status:'UNVERIFIED',reason:'Headless desktop/mobile viewport emulation is not a genuine physical-device visual check.'},noClinicalWrites:true,fixtureTransport:'Guarded synthetic API interception; actual application SPA and loaded CSS. Shared five-consumer probe is QA-only DOM, not production component coverage.'},null,2));
 const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 writeFileSync(`${out}/playwright-report/index.html`,`<!doctype html><meta charset="utf-8"><title>407 independent browser report</title><h1>407 synthetic browser evidence</h1><p>Candidate 973d78e5. Physical-device visual AC2 UNVERIFIED; no release decision.</p><ul>${outcomes.map(x=>`<li>${escape(x.status)} ${escape(x.name)}</li>`).join('')}</ul><pre>${escape(JSON.stringify(states.map(s=>({mobile:s.mobile,textMeasurements:s.textMeasurements,controlDiagnostics:s.controlDiagnostics})),null,2))}</pre>`);
}catch(error){writeFileSync(`${out}/test-results/failure.json`,JSON.stringify({message:error.message,stack:error.stack,outcomes,states},null,2));throw error;}
finally{for(const context of contexts)await context.close().catch(()=>{});await browser.close();}
