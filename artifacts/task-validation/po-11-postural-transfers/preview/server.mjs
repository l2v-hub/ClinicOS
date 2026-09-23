import express from 'express';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startPo11Fixture,fixtureActors} from '../../../../tests/fixtures/po11-transfers.mjs';
const root=process.cwd(),folder=resolve('artifacts/task-validation/po-11-postural-transfers/preview'),port=4192;
const fixture=await startPo11Fixture();const {prisma,database}=fixture;
process.env.VITE_API_URL=`http://127.0.0.1:${port}/api`;
await database.db.query(`CREATE TABLE "__Po11PdfFault" (id BOOLEAN PRIMARY KEY, armed BOOLEAN NOT NULL); INSERT INTO "__Po11PdfFault" VALUES(true,false);
CREATE FUNCTION po11_pdf_fault() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."assessmentId" IS NOT NULL AND (SELECT armed FROM "__Po11PdfFault" WHERE id=true) THEN RAISE EXCEPTION 'Synthetic PDF persistence failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER po11_pdf_fault BEFORE INSERT ON "PatientDocument" FOR EACH ROW EXECUTE FUNCTION po11_pdf_fault();`);
const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([import('../../../../backend/src/routes/patients.js'),import('../../../../backend/src/routes/patient-documents.js'),import('../../../../backend/src/routes/patient-assessments.js')]);
const app=express(),requests=[];let fault=null;app.use(express.json());
app.get('/fixture/info',(_req,res)=>res.json({actors:fixtureActors}));
app.post('/fixture/fault',(req,res)=>{fault=req.body.mode;res.json({fault})});
app.post('/fixture/pdf-fault',async(req,res)=>{await database.db.query('UPDATE "__Po11PdfFault" SET armed=$1 WHERE id=true',[req.body.armed===true]);res.json({ok:true})});
app.post('/fixture/rename',async(req,res)=>{if(!['vitals-qa-anna','vitals-qa-bruno'].includes(req.body.patientId))return res.status(400).end();await prisma.patient.update({where:{id:req.body.patientId},data:{lastName:'Nome modificato dopo la valutazione'}});res.json({ok:true})});
const exportState=async()=>{
 const assessments=await prisma.patientAssessment.findMany(),docs=await prisma.patientDocument.findMany({where:{assessmentId:{not:null}}});
 const output=resolve(folder,'../qa-evidence/pdfs');await mkdir(output,{recursive:true});
 for(const doc of docs)await writeFile(resolve(output,`${doc.id}.pdf`),Buffer.from(doc.dataBase64,'base64'));
 const attestations=await prisma.patientAssessmentAttestation.findMany();
 const state={requests,assessments,attestations,documents:docs.map(({dataBase64,...doc})=>doc)};
 await writeFile(resolve(folder,'synthetic-state.json'),JSON.stringify(state,null,2));return {assessments:assessments.length,documents:docs.length};
};
app.post('/fixture/export',async(_req,res)=>res.json(await exportState()));
app.use('/api',async(req,res,next)=>{
 const item={method:req.method,path:req.originalUrl,status:null,...(req.method==='POST'||req.method==='PATCH'?{body:req.body}:{}),at:new Date().toISOString()};requests.push(item);res.on('finish',()=>{item.status=res.statusCode});
 const save=(req.method==='POST'&&/\/assessments$/.test(req.path))||(req.method==='PATCH'&&/\/assessments\/[^/]+$/.test(req.path));
 const finalize=req.method==='POST'&&req.path.endsWith('/finalize');
 const attest=req.method==='POST'&&req.path.endsWith('/attestations');
 if((save&&fault==='save-lost')||(finalize&&fault==='finalize-lost')||(attest&&fault==='attest-lost')){fault=null;const json=res.json.bind(res);res.json=body=>res.statusCode<300?json.call(res.status(503),{error:'Synthetic response lost after commit'}):json(body)}
 if(save&&fault==='slow-save'){fault=null;await new Promise(ok=>setTimeout(ok,5000))}
 next();
});
app.use('/api/patients',documents);app.use('/api/patients',assessments);app.use('/api/patients',patients);
const vite=await createServer({root,configFile:false,envDir:false,plugins:[react()],cacheDir:resolve(folder,'cache'),server:{middlewareMode:true,hmr:false,fs:{allow:[root]}},appType:'custom'});
app.use(vite.middlewares);app.get('/',async(_req,res)=>res.type('html').send(await vite.transformIndexHtml('/',await readFile(resolve(folder,'index.html'),'utf8'))));
const server=app.listen(port,'127.0.0.1',()=>console.log(`PO11 synthetic preview http://127.0.0.1:${port}`));
let closing=false;async function close(){if(closing)return;closing=true;await exportState();server.closeAllConnections();server.close();await vite.close();await fixture.close();process.exit(0)}
app.post('/fixture/close',(_req,res)=>{res.json({closing:true});void close()});process.on('SIGINT',close);process.on('SIGTERM',close);
