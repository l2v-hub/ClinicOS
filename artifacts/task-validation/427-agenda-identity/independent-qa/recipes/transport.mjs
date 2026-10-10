import {createRequire} from 'node:module';
import {resolve} from 'node:path';
export const {chromium,expect:baseExpect}=createRequire('C:/w-insulin-qa/package.json')('playwright/test');
export const expect=baseExpect.configure({timeout:60000});
export const app=process.env.APP_URL||'http://127.0.0.1:7527';
export const day=new Date().toLocaleDateString('en-CA');
export const names=['Alfa','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda'];
export const labels=['Programmato','In corso','Completato','Annullato'];
export const states=['programmato','in_corso','completato','annullato'];
export const backgrounds=['rgb(255, 240, 207)','rgb(231, 239, 255)','rgb(227, 245, 235)','rgb(236, 239, 243)'];
export async function setup(browser,out,width,height,{count=4,empty=false,operator=false,hold=false,fail=false}={}){
 const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out+'/video'}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const operators=names.slice(0,count).map((name,i)=>({id:'QA-OP-427-'+i,nome:'Sintetico',cognome:name,ruolo:'infermiere',qualifica:'',reparto:'Reparto sintetico',email:'',telefono:'',stato:'attivo',note:''}));
 const appointments=empty?[]:[0,1,2,3,0,1,2,3].map((n,i)=>({id:'QA-APT-427-'+i,data:day,ora:String(8+i).padStart(2,'0')+':00',durata:30,operatorId:operators[i<4?0:Math.min(i-3,count-1)].id,operatorName:'Sintetico '+names[i<4?0:Math.min(i-3,count-1)],patientId:'QA-PAT-427-'+i,patientName:'Paziente sintetico '+i,tipologia:'controllo',stato:states[n],note:'Fixture sintetica QA 427'}));
 const identity={id:operator?operators[0].id:'QA-SUP-427',name:operator?'Operatore Sintetico':'Supervisore Sintetico',roleLabel:operator?'Operatore':'Supervisore',appRole:operator?'operator':'administrator',uiShell:operator?'operator':'admin'};
 const state={requests:[],unexpected:[],external:[],clinicalWrites:[],allowedMockMutations:[],errors:[],pageErrors:[],httpErrors:[],expectedErrors:[],operator,hold,fail,held:0};
 const waiting=[];
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname;
  if(u.hostname==='fonts.googleapis.com')return route.fulfill({status:200,contentType:'text/css',body:''});
  const api=u.hostname==='localhost'&&u.port==='3001'||['clinicos-backend-demo.up.railway.app','clinicos-backend-production-df88.up.railway.app'].includes(u.hostname);
  if(!api){const a=new URL(app),local=['localhost','127.0.0.1'].includes(a.hostname);if(req.method()==='GET'&&u.origin===a.origin&&(local||path==='/'||path.startsWith('/assets/')||path==='/favicon.ico'))return route.continue();state.external.push(u.origin);return route.abort();}
  state.requests.push({method:req.method(),path});const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[identity]});
  if(path==='/auth/simulator/session'&&req.method()==='POST')return json({token:'synthetic-427-not-a-secret'});
  if(req.method()!=='GET'){state.clinicalWrites.push({method:req.method(),path});return json({error:'Forbidden mutation'},500);}
  if(path==='/auth/me'){const capabilities=Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','diary.list','admin.rooms'].map(k=>[k,{allowed:true,effect:'ALLOWED'}]));return json({...identity,role:operator?'operator':'admin',authMode:'disabled',temporaryDemo:false,capabilities});}
  if(['/operators/page','/operators/directory/page'].includes(path))return json({items:operators,pageInfo:{hasMore:false,nextCursor:null},summary:{total:count,active:count,matching:count,appointmentsToday:8}});
  if(path==='/appointments'){
   if(state.hold){state.held++;await new Promise(r=>waiting.push(r));state.held--;}
   if(state.fail)return json({error:'Controlled synthetic appointment load failure'},503);
   const from=u.searchParams.get('from')||day,to=u.searchParams.get('to')||day,op=u.searchParams.get('operatorId');return json(appointments.filter(a=>a.data>=from&&a.data<=to&&(!op||a.operatorId===op)));
  }
  if(path==='/patients/page'||path==='/patients/parameters/page')return json({items:[],hasMore:false,nextCursor:null});
  if(path==='/patients/clinical-summary')return json([]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:0,critici:0,rischiAlti:0,ricoverati:0,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/patients/diary-unread-count')return json({unreadCount:0});
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/therapy-slots')return json([]);
  if(path==='/consegne/overview')return json({scope:operator?'operator':'admin',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  state.unexpected.push(req.method()+' '+path);return json({error:'Unexpected guarded API'},500);
 });
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('console',m=>{if(m.type()==='error')state.errors.push(m.text());});page.on('pageerror',e=>state.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)state.httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 await page.goto(app+'/#/'+(operator?'agenda-operatore':'agenda-admin'));await page.getByRole('button',{name:new RegExp(identity.name)}).click();if(width<600)await page.getByRole('button',{name:'Apri menu',exact:true}).click();await page.getByRole('button',{name:'Agenda',exact:true}).click();await expect(page.locator('.agt-state-filter__caption')).toHaveText('Appuntamenti nel periodo selezionato');
 return {page,context,state,operators,appointments,release(){state.hold=false;for(const fn of waiting.splice(0))fn();}};
}
export async function finish(ctx,out,name){
 for(const k of ['clinicalWrites','unexpected','external','pageErrors'])expect(ctx.state[k],k).toEqual([]);expect(ctx.state.httpErrors).toEqual([]);expect(ctx.state.errors).toEqual([]);
 await ctx.context.tracing.stop({path:out+'/trace/'+name+'.zip'});const video=ctx.page.video();await ctx.context.close();await video.saveAs(out+'/video/'+name+'.webm');await video.delete();
}
