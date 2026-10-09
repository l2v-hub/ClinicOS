const {createRequire}=require('node:module');const {expect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
const labels=['FR','SpO₂','O₂','PA sistolica','PA diastolica','FC','TC','Coscienza','DTX','Evacuazione','Note sulla rilevazione'];
const patient={id:'QA417-A',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',codiceFiscale:null,medicalRecordNumber:'QA417-A',location:{status:'unassigned',room:null,bed:null,source:null}};
const second={...patient,id:'QA417-B',firstName:'Seconda',medicalRecordNumber:'QA417-B'};
const identity={id:'QA417-NURSE',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const historical={fr:'18',spo2:'98',o2:'no',pa:'120/80',fc:'72',temperatura:'36,5',coscienza:'A',dtx:'110'};
const field=(page,label)=>page.getByRole('form',{name:'Nuova rilevazione',exact:true}).getByLabel(`Nuova rilevazione ${label}`,{exact:true});
const form=page=>page.getByRole('form',{name:'Nuova rilevazione',exact:true});
const save=page=>form(page).getByRole('button',{name:'Salva rilevazione',exact:true});
async function guard(context,page,opts={}){
 const s={requests:[],writes:[],posts:[],saved:[],external:[],unexpected:[],consoleErrors:[],pageErrors:[],httpErrors:[],allowedErrors:[],priorMode:opts.priorMode||'ready',failure:null,heldReads:[],heldPosts:[],prior:{...historical},hasMore:false};
 const prior=id=>({id:`QA417-PRIOR-${id}`,requestId:`QA417-PRIOR-${id}`,patientId:id,measuredAt:'2026-10-08T08:00:00.000Z',values:id===patient.id?s.prior:{},authorOperatorId:identity.id,authorName:identity.name,createdAt:'2026-10-08T08:00:00.000Z'});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname,m=req.method();
  if(!['127.0.0.1','localhost'].includes(u.hostname)){
   // External stylesheets are intercepted too; never reach an external host.
   if(u.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
   s.external.push(u.origin);return route.abort();
  }
  if(u.port!=='3001'){if(u.port!=='7480')s.unexpected.push(`${m} ${u.origin}${p}`);return route.continue();}
  s.requests.push({method:m,path:p,query:u.search});if(m!=='GET')s.writes.push({method:m,path:p});
  const json=(body,status=200)=>{if(status>=400)s.allowedErrors.push({path:p,status});return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});};
  if(p==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(p==='/auth/simulator/identities')return json({identities:[identity]});
  if(p==='/auth/simulator/session'&&m==='POST')return json({token:'sim.synthetic417-not-real'});
  if(p==='/auth/simulator/logout'&&m==='POST')return json({ok:true});
  if(p==='/auth/me')return json({...identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities:Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','clinical_record.update','diary.list','parameters.list_readings','parameters.list_page','parameters.create_reading','parameters.save_reading','narrative.list','narrative.update','documents.list','assessments.catalog','assessments.list','assessments.read'].map(k=>[k,{allowed:true,effect:'ALLOWED'}]))});
  if(p==='/patients/page/search'&&m==='POST')return json({items:[patient,second],hasMore:false,nextCursor:null});
  if(/\/parameter-readings$/.test(p)){
   const id=decodeURIComponent(p.split('/')[2]);
   if(m==='GET'){
    if(s.priorMode==='hold')await new Promise(resolve=>s.heldReads.push(resolve));
    if(s.priorMode==='error')return json({error:'Synthetic prior unavailable'},503);
    const rows=[...s.saved.filter(r=>r.patientId===id),...(s.historyRows??(id===patient.id?[prior(id)]:[]))];
    return json({readings:rows,hasMore:s.hasMore,nextCursor:s.hasMore?'QA417-NEXT':null});
   }
   if(m==='POST'){
    const dto=req.postDataJSON();s.posts.push({patientId:id,...dto});
    if(s.holdPost)await new Promise(resolve=>s.heldPosts.push(resolve));
    if(s.failure==='definite')return json({error:'Rifiuto sintetico di validazione'},400);
    let r=s.saved.find(r=>r.requestId===dto.requestId);if(!r){r={...dto,id:`QA417-SAVED-${s.saved.length}`,patientId:id,authorOperatorId:identity.id,authorName:identity.name,createdAt:dto.measuredAt};s.saved.push(r);}
    if(s.failure==='lost'){s.failure=null;return json({error:'Risposta sintetica persa dopo persistenza'},503);}
    const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.measuredAt));
    return json({reading:r,summary:{date:parts,count:s.saved.filter(r=>r.patientId===id).length,noteCount:s.saved.filter(r=>r.patientId===id&&r.values.note).length,lastReadingAt:r.measuredAt}});
   }
  }
  if(m!=='GET'){s.unexpected.push(`${m} ${p}`);return route.abort();}
  if(p==='/me/roster-order')return json({effective:{criterion:'name',direction:'asc'},source:'system',canEdit:false,canEditDefault:false});
  if(p==='/patients/page')return json({items:[patient,second],hasMore:false,nextCursor:null});
  if(p==='/patients/parameters/page')return json({items:[patient,second].map(person=>({patient:person,cartella:{pazienteId:person.id,readingCount:0,noteCount:0,lastReadingAt:null}})),hasMore:false,nextCursor:null});
  if(p==='/patients/clinical-summary')return json([patient,second].map(person=>({patientId:person.id,statoRicovero:'ambulatoriale',consegneAperte:0,hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0})));
  if(p==='/patients/clinical-summary/overview')return json({totalPatients:2,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(p==='/patients/settings')return json({deleteEnabled:false});
  if(p===`/patients/${patient.id}`||p===`/patients/${second.id}`)return json(p.includes(second.id)?second:patient);
  if(/\/cartella$/.test(p))return json({patientId:p.split('/')[2],data:{pazienteId:p.split('/')[2],statoRicovero:'ambulatoriale',diagnosi:[],allergieStatus:'unknown',allergie:[],anamnesi:{patologicaRemota:'',note:''}}});
  if(/\/narrative-sections$/.test(p))return json({sections:[]});
  if(/\/room-options$/.test(p))return json([]);
  if(/\/therapies\/page$/.test(p))return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,inactive:0}});
  if(/\/diary$/.test(p))return json({entries:[],hasMore:false,nextCursor:null});
  if(/\/documents$/.test(p))return json({documents:[],sourceMatch:null,pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
  if(/\/intake-review$/.test(p))return json({state:'none',items:[]});
  if(/\/assessments\/catalog$/.test(p))return json({items:[]});
  if(/\/assessments$/.test(p))return json({items:[],pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
  if(p==='/patients/diary-unread-count')return json({unreadCount:0});
  if(p==='/consegne')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(p==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(p==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(p==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null}});
  if(['/therapy-slots','/appointments'].includes(p))return json([]);
  s.unexpected.push(`${m} ${p}`);return route.abort();
 });
 page.on('console',m=>{if(m.type()==='error')s.consoleErrors.push(m.text());});page.on('pageerror',e=>s.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)s.httpErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
 return s;
}
async function open(page,view){
 await page.goto('http://127.0.0.1:7480/#/operator-dashboard');await page.getByRole('button',{name:/Infermiere Sintetico/}).click();await expect(page.getByRole('heading',{name:'Il mio turno'})).toBeVisible();
 if(view==='chart'){
  if(await page.getByRole('button',{name:'Apri menu'}).isVisible())await page.getByRole('button',{name:'Apri menu'}).click();
  await page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();await page.locator('.patient-roster__row,.patient-card').getByRole('button',{name:'Apri cartella di Persona Sintetica',exact:true}).click();await page.getByRole('tab',{name:/Parametri/}).click();
 }else{
  if(await page.getByRole('button',{name:'Apri menu'}).isVisible())await page.getByRole('button',{name:'Apri menu'}).click();await page.locator('.teams-sidebar').getByRole('button',{name:'Parametri',exact:true}).click();
 }
 await expect(form(page)).toBeVisible();
}
async function clean(page){for(const label of labels){if(['O₂','Coscienza'].includes(label))await field(page,label).selectOption('');else await field(page,label).fill('');}}
async function healthy(s){expect(s.external,'external host guard').toEqual([]);expect(s.unexpected,'unexpected API').toEqual([]);expect(s.pageErrors,'runtime exceptions').toEqual([]);expect(s.httpErrors).toEqual(s.allowedErrors);expect(s.allowedErrors.every(e=>[400,503].includes(e.status)&&e.path.endsWith('/parameter-readings'))).toBe(true);expect(s.consoleErrors.filter(x=>!x.includes('Failed to load resource'))).toEqual([]);expect(s.writes.every(w=>w.path==='/auth/simulator/session'||w.path==='/auth/simulator/logout'||w.path==='/patients/page/search'||w.path.endsWith('/parameter-readings'))).toBe(true);}
module.exports={guard,open,labels,patient,second,identity,historical,field,form,save,clean,healthy};
