import { createServer } from 'vite';
import { resolve } from 'node:path';
import { syntheticReadings } from './synthetic-readings.mjs';
const device=process.argv.includes('--device');
const receipt={applicationCommit:'ae2a94f3dc66a6f1c2eb693d1d9faf6c3924c01c',mode:'QA-only same-origin synthetic actual desktop check, no patient mutations',fixtureAt:new Date().toISOString(),requests:[],deniedWrites:[],unexpected:[],clinicalWrites:0};
const patient={id:'QA-PATIENT-407',medicalRecordNumber:'QA-407',firstName:'Persona',lastName:'Sintetica',dateOfBirth:'1980-01-01',sex:'M',phone:null,email:null,location:{status:'unassigned'}};
const identity={id:'QA-NURSE-407',name:'Infermiere Sintetico',roleLabel:'Infermiere',appRole:'nurse',uiShell:'operator'};
const history=syntheticReadings(patient.id,new Date(receipt.fixtureAt));
const deviceApi={name:'418-qa-only-device-api',configureServer(vite){
 if(!device)return;
 vite.middlewares.use((request,response,next)=>{
  const url=new URL(request.url,'http://127.0.0.1:7482');
  if(!url.pathname.startsWith('/api/'))return next();
  const path=url.pathname.slice(4),method=request.method;
  const json=(body,status=200)=>{response.statusCode=status;response.setHeader('Content-Type','application/json');response.setHeader('Cache-Control','no-store');response.end(JSON.stringify(body));};
  if(path==='/__qa418/receipt'&&method==='GET')return json({...receipt,history});
  receipt.requests.push({method,path});
  if(path==='/auth/simulator/session'&&method==='POST')return json({token:'synthetic407-not-a-secret'});
  if(method!=='GET'){receipt.deniedWrites.push({method,path});return json({error:'QA device surface forbids mutations'},405);}
  if(path==='/auth/status')return json({mode:'disabled',temporaryDemo:false,simulator:true});
  if(path==='/auth/simulator/identities')return json({identities:[identity]});
  if(path==='/auth/me'){
   const capabilities=Object.fromEntries(['patients.list_page','patients.get','patients.clinical_summary','patients.clinical_overview','appointments.list','consegne.list','notes.list','operators.directory','administration.list_slots','therapy.list','therapy.list_page','clinical_record.get','parameters.list_readings','parameters.list_page','parameters.create_reading','parameters.save_reading','narrative.list','documents.list','diary.list'].map(key=>[key,{allowed:true,effect:'ALLOWED'}]));
   capabilities['intake.create_draft']={allowed:false,effect:'DENIED'};
   return json({...identity,role:'operatore',authMode:'disabled',temporaryDemo:false,capabilities});
  }
  if(path==='/me/roster-order')return json({context:null,default:null,override:null,effective:{criterion:'name',direction:'asc'},source:'system',revision:null,canEdit:false,canEditDefault:false,temporary:false,reason:null});
  if(path==='/patients/page')return json({items:[patient],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}`)return json(patient);
  if(path===`/patients/${patient.id}/cartella`)return json({patientId:patient.id,data:{pazienteId:patient.id,statoRicovero:'ricoverato'}});
  if(path===`/patients/${patient.id}/parameter-readings`)return json({readings:history,hasMore:false,nextCursor:null});
  if(path==='/patients/parameters/page')return json({items:[{patient,cartella:{pazienteId:patient.id,readingCount:3,noteCount:0,lastReadingAt:history[0].measuredAt}}],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}/narrative-sections`)return json({sections:[]});
  if(path===`/patients/${patient.id}/room-options`)return json([]);
  if(path===`/patients/${patient.id}/therapies/page`)return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{total:0,active:0,inactive:0}});
  if(path===`/patients/${patient.id}/diary`)return json({entries:[],hasMore:false,nextCursor:null});
  if(path===`/patients/${patient.id}/documents`)return json({documents:[],sourceMatch:null,pageInfo:{loadedCount:0,hasMore:false,nextCursor:null}});
  if(path===`/patients/${patient.id}/intake-review`)return json({state:'none',items:[]});
  if(path==='/patients/diary-unread-count')return json({unreadCount:0});
  if(path==='/patients/clinical-summary')return json([{patientId:patient.id,statoRicovero:'ricoverato',consegneAperte:0,parametriCritici:[],rischiElevati:[],allergeni:[],hasCriticalVitals:false,hasHighRisk:false,allergieCount:0,hasSevereAllergy:false,terapieTotali:0,terapieCompletate:0}]);
  if(path==='/patients/clinical-summary/overview')return json({totalPatients:1,critici:0,rischiAlti:0,ricoverati:1,dimessi:0,allergieGravi:0,terapieTotali:0,terapieCompletate:0});
  if(path==='/patients/settings')return json({deleteEnabled:false});
  if(path==='/therapy-slots'||path==='/appointments')return json([]);
  if(path==='/consegne/overview')return json({scope:'operator',summary:{total:0,urgentActive:0,urgentTaken:0},recentPreview:[],urgentPreview:[],byOperator:{}});
  if(path==='/consegne')return json({items:[],hasMore:false,nextCursor:null,summary:{total:0,urgentActive:0,urgentTaken:0}});
  if(path==='/notes')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:{unread:0}});
  if(path==='/operators/directory/page')return json({items:[],pageInfo:{hasMore:false,nextCursor:null},summary:null});
  receipt.unexpected.push({method,path});return json({error:'Unexpected QA device API'},404);
 });
}};
const server=await createServer({configFile:false,root:resolve('frontend'),esbuild:{jsx:'automatic'},
 plugins:[deviceApi],define:{'import.meta.env.VITE_API_URL':JSON.stringify(device?'http://127.0.0.1:7482/api':'http://localhost:3001'),
 'import.meta.env.VITE_ENTRA_CLIENT_ID':'""','import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},
 server:{host:'127.0.0.1',port:7482,strictPort:true,fs:{allow:[resolve('.')]}}});
await server.listen();console.log(`418 QA actual SPA synthetic localhost7482; device API ${device?'enabled':'disabled'}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
