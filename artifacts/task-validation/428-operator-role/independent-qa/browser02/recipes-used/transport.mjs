import {createRequire} from 'node:module';
export const {chromium,expect:baseExpect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
export const expect=baseExpect.configure({timeout:60000});
export const app=process.env.APP_URL||'http://127.0.0.1:7529';
export const tokens=['medico','infermiere','coordinatore','oss','fisioterapista','operatore','altro','admin','manager','  InFeRmIeRe  ',null,'','   ','custom','<img src=x onerror=alert(1)>','  OSS '];
export const labels=['Medico','Infermiere','Coordinatore','OSS (legacy)','Fisioterapista (legacy)','Operatore (legacy)','Altro (legacy)','Amministratore (legacy)','Manager (legacy)','Infermiere','Ruolo non disponibile','Ruolo non disponibile','Ruolo non disponibile','custom (da verificare)','<img src=x onerror=alert(1)> (da verificare)','OSS (legacy)'];
export const explanation='Funzione dichiarata nel profilo, distinta dai permessi di accesso.';
export const profile=i=>labels[i]+' · Qualifica: Qualifica sintetica '+i;
export async function setup(browser,out,width,height){
const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out+'/video'}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});
const operators=tokens.map((ruolo,i)=>({id:'QA-OP-428-'+i,nome:'Sintetico',cognome:'Identita'+String(i).padStart(2,'0'),ruolo:ruolo??'',qualifica:'Qualifica sintetica '+i,reparto:'Reparto sintetico',email:'role428-'+i+'@example.test',telefono:'',stato:'attivo',note:'',pazientiAssegnati:0,appuntamentiOggi:0}));
const identity={id:'QA-SUP-428',name:'Supervisore Sintetico',roleLabel:'Supervisore',appRole:'administrator',uiShell:'admin'};
const state={requests:[],unexpected:[],external:[],clinicalWrites:[],allowedMockMutations:[],errors:[],pageErrors:[],httpErrors:[],selected:[],asserted:[],fixture:'Synthetic transport only; raw null DTO projected as empty string; real DB proof is separate.'};
await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),path=u.pathname;
if(u.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
const api=u.hostname==='localhost'&&u.port==='3001'||['clinicos-backend-demo.up.railway.app','clinicos-backend-production-df88.up.railway.app'].includes(u.hostname);
if(!api){const a=new URL(app),local=['localhost','127.0.0.1'].includes(a.hostname);if(req.method()==='GET'&&u.origin===a.origin&&(local||path==='/'||path.startsWith('/assets/')||path==='/favicon.ico'))return route.continue();state.external.push(u.origin);return route.abort();}
state.requests.push({method:req.method(),path});const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
if(path==='/auth/simulator/identities')return json({identities:[identity]});
if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic-428-not-a-secret'});
if(req.method()==='PUT'&&/^\/operators\/QA-OP-428-\d+$/.test(path)){const payload=req.postDataJSON(),id=path.split('/').at(-1),op=operators.find(o=>o.id===id);state.allowedMockMutations.push({id,payload});Object.assign(op,payload);return json(op);}
if(req.method()!=='GET'){state.clinicalWrites.push({method:req.method(),path});return json({error:'Forbidden mutation'},500);}
if(path==='/auth/me'){const capabilities=Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','operators.page','operators.update','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','diary.list','rooms.list'].map(k=>[k,{allowed:true,effect:'ALLOWED'}]));return json({...identity,role:'admin',authMode:'disabled',temporaryDemo:false,capabilities});}
if(['/operators/page','/operators/directory/page'].includes(path)){const q=u.searchParams.get('q')||'',items=operators.filter(o=>JSON.stringify(o).toLowerCase().includes(q.toLowerCase()));return json({items,pageInfo:{hasMore:false,nextCursor:null},summary:{total:operators.length,active:operators.length,matching:items.length,appointmentsToday:0}});}
if(path==='/appointments'||path==='/therapy-slots'||path==='/admin/rooms'||path==='/operators/schedules')return json([]);
if(path==='/patients/page'||path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
if(path==='/patients/clinical-summary')return json([]);
if(path==='/patients/clinical-summary/overview')return json({totalPatients:0,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
if(path==='/patients/settings')return json({deleteEnabled:false});
if(path==='/patients/diary-unread-count')return json({unreadCount:0});
if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
if(path==='/consegne/overview')return json({scope:'admin',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
state.unexpected.push(req.method()+' '+path);return json({error:'Unexpected guarded API'},500);
});
const page=await context.newPage();page.setDefaultTimeout(60000);page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
await page.goto(app+'/#/admin-dashboard');await page.getByRole('button',{name:new RegExp(identity.name)}).click();await expect(page.locator('.operator-workload-grid')).toBeVisible();
return {page,context,state,operators,width};
}
export async function navigate(ctx,name){if(ctx.width<600)await ctx.page.getByRole('button',{name:'Apri menu',exact:true}).click();await ctx.page.getByRole('button',{name,exact:true}).click();}
export function item(ctx,i){const name='Identita'+String(i).padStart(2,'0')+' Sintetico';return ctx.width<600?ctx.page.locator('.pt-list-card').filter({has:ctx.page.getByText(name,{exact:true})}):ctx.page.locator('.clinicos-table tbody tr').filter({has:ctx.page.getByText(name,{exact:true})});}
export async function guards(ctx){for(const k of ['clinicalWrites','unexpected','external','pageErrors','httpErrors','errors'])expect(ctx.state[k],k).toEqual([]);}
export async function finish(ctx,out,name){await guards(ctx);await ctx.context.tracing.stop({path:out+'/trace/'+name+'.zip'});const video=ctx.page.video();await ctx.context.close();await video.saveAs(out+'/video/'+name+'.webm');await video.delete();}
