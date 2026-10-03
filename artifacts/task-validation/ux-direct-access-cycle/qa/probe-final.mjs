import pg from 'pg'; import { randomUUID } from 'node:crypto';
const API='http://127.0.0.1:3105';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
const id=(await c.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)).rows[0].id;
const tok=(await (await fetch(`${API}/auth/simulator/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identityId:'SIM-NURSE-1'})})).json()).token;
const H={'Content-Type':'application/json',Authorization:`Bearer ${tok}`};
const answers={alimentazione:10,igiene:5,curaPersona:5,abbigliamento:10,intestino:10,vescica:10,gabinetto:10,trasferimenti:15,deambulazione:15,scale:10};
const bad=await fetch(`${API}/patients/${id}/assessments`,{method:'POST',headers:H,body:JSON.stringify({requestId:randomUUID(),type:'barthel',formVersion:'barthel-it-2026-10-03-v1',assessedAt:new Date().toISOString(),answers:{...answers,scale:7}})});
console.log('invalid points create', bad.status);
const cr=await fetch(`${API}/patients/${id}/assessments`,{method:'POST',headers:H,body:JSON.stringify({requestId:randomUUID(),type:'barthel',formVersion:'barthel-it-2026-10-03-v1',assessedAt:new Date().toISOString(),answers})});
const cj=await cr.json(); const a=cj.assessment??cj; console.log('create',cr.status, Object.keys(cj).join(','), a.id, a.version);
const fin=await fetch(`${API}/patients/${id}/assessments/${a.id}/finalize`,{method:'POST',headers:H,body:JSON.stringify({requestId:randomUUID(),expectedVersion:a.version})});
const f=await fin.json(); console.log('finalize',fin.status, JSON.stringify(f.finalSnapshot?.result ?? f.result ?? f).slice(0,200));
const oss=(await (await fetch(`${API}/auth/simulator/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identityId:'SIM-OSS-1'})})).json()).token;
const oc=await fetch(`${API}/patients/${id}/assessments`,{method:'POST',headers:{...H,Authorization:`Bearer ${oss}`},body:JSON.stringify({requestId:randomUUID(),type:'barthel',formVersion:'barthel-it-2026-10-03-v1',assessedAt:new Date().toISOString(),answers})});
console.log('oss create',oc.status);
const p=await fetch(`${API}/patients/${id}/assessments/${a.id}`,{method:'PATCH',headers:H,body:JSON.stringify({expectedVersion:a.version+1,answers})});
console.log('patch final via API',p.status);
for (const sql of [`UPDATE "PatientAssessment" SET answers=jsonb_set(answers,'{scale}','5') WHERE id=$1`,`UPDATE "PatientAssessment" SET "finalSnapshot"=jsonb_set("finalSnapshot",'{result,total}','99') WHERE id=$1`,`DELETE FROM "PatientAssessment" WHERE id=$1`]){
 await c.query('BEGIN'); let out='ALLOWED'; try{const r=await c.query(sql,[a.id]); out+=' rows='+r.rowCount;}catch(e){out='refused '+e.code+' '+e.message.slice(0,80);} await c.query('ROLLBACK'); console.log(sql.slice(0,45),'->',out);}
await c.end();
