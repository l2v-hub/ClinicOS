import {createRequire} from 'node:module';
export const {chromium,expect:baseExpect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
export const expect=baseExpect.configure({timeout:60000});
export const app=process.env.APP_URL||'http://127.0.0.1:7531';
export const patientId='QA-PAT-423',path='/patients/'+patientId;
export const categories=['Moduli e valutazioni','Personali','Visite specialistiche','Analisi','Esami e referti','Terapie','Medicazioni','Dimissioni e invii','Consensi e moduli','Altri documenti'];
export const types=['documento_identita','tessera_sanitaria','consulenza','esame','rx','referto','prescrizione','piano_terapeutico','documentazione_medicazioni','lettera_dimissione','invio_centro_medico','consenso_privacy','consenso_trattamento','delega','liberatoria_uscita','consenso_contenzioni','consenso_informato','privacy','regolamento','carta_servizi','modulo_allergie','altro'];
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
export const metadata={id:'QA-DOC-423',originalName:'synthetic-423.png',documentType:'prescrizione',mimeType:'image/png',sizeBytes:png.length,createdAt:'2026-10-10T00:00:00Z',importJobId:null};
export const record={id:'QA-REC-423',tipo:'prescrizione',descrizione:'Documento sintetico QA 423',dataConsegna:'2026-10-10',stato:'ricevuto',firmatoDA:'non_firmato',operatore:'Operatore Sintetico',patientDocumentId:metadata.id,note:'Solo dati sintetici'};
export async function setup(browser,out,width,height,opts={}){
 const {operator=true,grant='allowed',populated=false,mode='ready',xss=false}=opts;
 const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out+'/video'}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const identity={id:'QA-OP-423',name:operator?'Operatore Sintetico':'Amministratore Sintetico',roleLabel:operator?'Infermiere':'Amministratore',appRole:operator?'operator':'administrator',uiShell:operator?'operator':'admin'};
 const patient={id:patientId,medicalRecordNumber:'QA-423',firstName:'Paziente',lastName:'Sintetico',dateOfBirth:'1980-01-01',sex:'M',codiceFiscale:null,email:null,phone:null};
 const documents=populated?[{...metadata}]:[],records=populated?[{...record,descrizione:xss?'<img src=x onerror=alert(423)>':record.descrizione}]:[];
 const state={requests:[],unexpected:[],external:[],clinicalWrites:[],allowedMockMutations:[],errors:[],pageErrors:[],httpErrors:[],expectedErrors:[],asserted:[],grant,operator,mode,held:0,uploads:0,cartellaSaves:0};let data={documentiConsegnati:records};const waiting=[];
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname;
  if(u.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  const api=u.hostname==='localhost'&&u.port==='3001'||['clinicos-backend-demo.up.railway.app','clinicos-backend-production-df88.up.railway.app'].includes(u.hostname);
  if(!api){const a=new URL(app),local=['localhost','127.0.0.1'].includes(a.hostname);if(req.method()==='GET'&&u.origin===a.origin&&(local||p==='/'||p.startsWith('/assets/')||p==='/favicon.ico'))return route.continue();state.external.push(u.origin);return route.abort();}
  state.requests.push({method:req.method(),path:p});const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(p==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(p==='/auth/simulator/identities')return json({identities:[identity]});
  if(p==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic-423-not-a-secret'});
  if(p===path+'/documents'&&req.method()==='POST'){
   expect(['allowed','no-classify']).toContain(grant);const body=req.postDataBuffer().toString('latin1');expect(body).toContain('name="file"; filename="synthetic-423.png"');expect(body).toContain('Content-Type: image/png');expect(body).toContain('name="documentType"');expect(body).toContain('prescrizione');expect(state.uploads).toBe(0);documents.push({...metadata});state.uploads++;state.allowedMockMutations.push({method:'POST',path:p,documentType:'prescrizione',syntheticFile:true});return json({document:metadata},201);
  }
  if(p===path+'/cartella'&&req.method()==='PUT'){
   expect(['allowed','no-classify']).toContain(grant);const payload=req.postDataJSON();expect(Object.keys(payload)).toEqual(['data']);expect(payload.data.documentiConsegnati).toHaveLength(1);expect(payload.data.documentiConsegnati[0]).toMatchObject({tipo:'prescrizione',descrizione:'Documento sintetico QA 423',patientDocumentId:metadata.id,operatore:identity.name});expect(state.uploads).toBe(1);data=payload.data;state.cartellaSaves++;state.allowedMockMutations.push({method:'PUT',path:p,records:payload.data.documentiConsegnati});return json({patientId,data});
  }
  if(req.method()!=='GET'){state.clinicalWrites.push({method:req.method(),path:p});return json({error:'Forbidden mutation'},500);}
  if(p==='/auth/me'){
   const capabilities=Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','operators.page','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','clinical_record.save','documents.list','documents.upload','documents.update_type','documents.content','diary.list','rooms.list'].map(k=>[k,{allowed:true,effect:'ALLOWED'}]));
   if(state.grant==='missing'){delete capabilities['documents.upload'];delete capabilities['clinical_record.save'];}
   if(state.grant==='no-upload')capabilities['documents.upload']={allowed:false,effect:'DENIED'};
   if(state.grant==='no-save')capabilities['clinical_record.save']={allowed:false,effect:'READ_ONLY'};
   if(state.grant==='no-classify')capabilities['documents.update_type']={allowed:false,effect:'DENIED'};
   return json({...identity,role:operator?'operator':'admin',authMode:'disabled',temporaryDemo:false,capabilities:state.grant==='null-policy'?null:capabilities});
  }
  if(p===path)return json(patient);
  if(p===path+'/cartella')return json({patientId,data});
  if(p===path+'/documents'){
   if(state.mode==='hold'){state.held++;await new Promise(r=>waiting.push(r));state.held--;}
   if(state.mode==='error'){state.expectedErrors.push({status:503,path:p});return json({error:'Controlled synthetic archive failure'},503);}
   if(state.mode==='malformed')return json({documents:[],total:0,pageInfo:{loadedCount:1,hasMore:false,nextCursor:null}});
   return json({documents,total:documents.length,pageInfo:{loadedCount:documents.length,hasMore:false,nextCursor:null}});
  }
  if(p===path+'/documents/'+metadata.id+'/content')return route.fulfill({status:200,contentType:'image/png',body:png});
  if(p===path+'/room-assignments'||p===path+'/room-options')return json([]);
  if(p===path+'/therapies/page')return json({items:[],summary:{total:0,active:0,inactive:0},pageInfo:{hasMore:false,nextCursor:null}});
  if(p===path+'/diary')return json({entries:[],hasMore:false,nextCursor:null});
  if(p===path+'/therapies'||p===path+'/assessments'||p==='/appointments'||p==='/therapy-slots'||p==='/admin/rooms'||p==='/operators/schedules')return json([]);
  if(p==='/patients/page'||p==='/patients/parameters/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(p==='/patients/clinical-summary')return json([]);
  if(p==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(p==='/patients/settings')return json({deleteEnabled:false});
  if(p==='/patients/diary-unread-count')return json({unreadCount:0});
  if(p==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(['/operators/page','/operators/directory/page'].includes(p))return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,matching:0,appointmentsToday:0}});
  if(p==='/consegne/overview')return json({scope:operator?'operator':'admin',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(p==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(p==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  state.unexpected.push(req.method()+' '+p);return json({error:'Unexpected guarded API'},500);
 });
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 const ctx={page,context,state,documents,identity,width,release(){state.mode='ready';for(const r of waiting.splice(0))r();}};
 await page.goto(app+'/#/dettaglio-paziente/'+patientId+'/documenti');await login(ctx);await expect(page.locator('.patient-document-archive')).toBeVisible();return ctx;
}
export async function login(ctx){await ctx.page.getByRole('button',{name:new RegExp(ctx.identity.name)}).click();}
export async function reload(ctx){await ctx.page.reload();await login(ctx);await expect(ctx.page.locator('.patient-document-archive')).toBeVisible();}
export async function guards(ctx){for(const k of ['clinicalWrites','unexpected','external','pageErrors'])expect(ctx.state[k],k).toEqual([]);expect(ctx.state.httpErrors).toEqual(ctx.state.expectedErrors);const browserErrors=ctx.state.errors.filter(s=>!/^Failed to load resource: the server responded with a status of 503/.test(s));expect(browserErrors).toEqual([]);expect(ctx.state.errors.length).toBe(ctx.state.expectedErrors.length);}
export async function finish(ctx,out,name){await guards(ctx);await ctx.context.tracing.stop({path:out+'/trace/'+name+'.zip'});const video=ctx.page.video();await ctx.context.close();await video.saveAs(out+'/video/'+name+'.webm');await video.delete();}
