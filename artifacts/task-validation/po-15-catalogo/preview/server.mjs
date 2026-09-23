import express from 'express';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startPo15Fixture,seedPo15Assessments,fixtureActors} from '../../../../tests/fixtures/po15-catalog.mjs';
import {legacyForms} from './legacy-records.mjs';
const folder=resolve('artifacts/task-validation/po-15-catalogo/preview'),port=4196;
const fixture=await startPo15Fixture(),{prisma}=fixture;
const anna=await prisma.cartella.findUniqueOrThrow({where:{patientId:'vitals-qa-anna'}});
await prisma.cartella.update({where:{patientId:'vitals-qa-anna'},data:{data:{...anna.data,...legacyForms}}});
const initialCartelle=await prisma.cartella.findMany();
const initialIntakes=await prisma.patientIntakeDraft.findMany();
const seed=await seedPo15Assessments();
process.env.VITE_API_URL=`http://127.0.0.1:${port}/api`;
const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([
 import('../../../../backend/src/routes/patients.js'),import('../../../../backend/src/routes/patient-documents.js'),
 import('../../../../backend/src/routes/patient-assessments.js'),
]);
const app=express(),requests=[],printCaptures=[];let fault=null;app.use(express.json());
app.get('/fixture/info',(_req,res)=>res.json({actors:fixtureActors}));
app.post('/fixture/fault',(req,res)=>{fault=req.body.mode;res.json({fault})});
app.post('/fixture/print-capture',(req,res)=>{printCaptures.push(req.body);res.json({captured:true})});
const exportState=async()=>{
 const assessments=await prisma.patientAssessment.findMany(),docs=await prisma.patientDocument.findMany({where:{assessmentId:{not:null}}});
 const output=resolve(folder,'../qa-evidence/pdfs');await mkdir(output,{recursive:true});
 for(const doc of docs)await writeFile(resolve(output,`${doc.id}.pdf`),Buffer.from(doc.dataBase64,'base64'));
 const cartelle=await prisma.cartella.findMany(),intakes=await prisma.patientIntakeDraft.findMany();
 const state={requests,printCaptures,seed,assessments,initialCartelle,cartelle,initialIntakes,intakes,documents:docs.map(({dataBase64,...doc})=>doc)};
 await writeFile(resolve(folder,'synthetic-state.json'),JSON.stringify(state,null,2));return {assessments:assessments.length,documents:docs.length};
};
app.post('/fixture/export',async(_req,res)=>res.json(await exportState()));
app.use('/api',async(req,res,next)=>{
 const item={method:req.method,path:req.originalUrl,status:null,...(['POST','PATCH','PUT'].includes(req.method)?{body:req.body}:{}),at:new Date().toISOString()};requests.push(item);res.on('finish',()=>{item.status=res.statusCode});
 const save=(req.method==='POST'&&/\/assessments$/.test(req.path))||(req.method==='PATCH'&&/\/assessments\/[^/]+$/.test(req.path));
 const finalize=req.method==='POST'&&req.path.endsWith('/finalize');
 if((save&&fault==='save-lost')||(finalize&&fault==='finalize-lost')){fault=null;const json=res.json.bind(res);res.json=body=>res.statusCode<300?json.call(res.status(503),{error:'Synthetic response lost after commit'}):json(body)}
 if(save&&fault==='slow-save'){fault=null;await new Promise(ok=>setTimeout(ok,5000))}
 if(req.method==='GET'&&req.path.endsWith('/intake-review')&&fault==='intake-slow'){fault=null;await new Promise(ok=>setTimeout(ok,5000))}
 if(req.method==='GET'&&req.path.endsWith('/assessments/catalog')){
  if(fault==='catalog-error'){fault=null;return res.status(503).json({error:'Errore catalogo sintetico recuperabile'})}
  if(fault==='catalog-slow'){fault=null;await new Promise(ok=>setTimeout(ok,4000))}
 }
 next();
});
app.use('/api/patients',documents);app.use('/api/patients',assessments);app.use('/api/patients',patients);
app.use(express.static(resolve(folder,'build')));
const server=app.listen(port,'127.0.0.1',()=>console.log(`PO15 synthetic preview http://127.0.0.1:${port}`));
let closing=false;async function close(){if(closing)return;closing=true;await exportState();server.closeAllConnections();server.close();await fixture.close();process.exit(0)}
app.post('/fixture/close',(_req,res)=>{res.json({closing:true});void close()});process.on('SIGINT',close);process.on('SIGTERM',close);
