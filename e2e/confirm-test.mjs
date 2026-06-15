import { buildSyntheticPdf } from './real-pdf.mjs';
const API='https://clinicos-backend-production-df88.up.railway.app', base=`${API}/ai/extraction/jobs`;
const OP={'X-Operator-Id':'op-confirm','X-Operator-Role':'operatore'};
const af=(u,o={})=>fetch(u,{...o,headers:{...OP,...(o.headers??{})}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const L=buildSyntheticPdf(['LETTERA DIMISSIONE','Paziente: Carla Neri','Data di nascita: 23/07/1948','Sesso: F','Diagnosi: Diabete tipo 2','Allergie: Nichel','Terapia: Metformina 500mg orale 2 volte/die']);
const fd=new FormData(); fd.append('files',new Blob([L],{type:'application/pdf'}),'d.pdf');
let id=(await (await af(base,{method:'POST',body:fd})).json()).job.id;
await af(`${base}/${id}/process`,{method:'POST'});
const term=new Set(['review_ready','failed','retryable_error','cancelled']); let last;
for(let i=0;i<60;i++){await sleep(3000); last=await (await af(`${base}/${id}`)).json(); if(term.has(last.status))break;}
console.log('job status:',last.status);
if(last.status!=='review_ready'){console.log('error:',JSON.stringify(last.error));process.exit(0);}
const rd=(await (await af(`${base}/${id}/result`)).json()).resultData ?? {};
const a=rd._full?.anagrafica ?? {}; const c=rd._full?.cartella ?? {};
console.log('dataNascita extracted:',JSON.stringify(a.dataNascita));
const body={mode:'new',patient:{firstName:String(a.nome||'').trim(),lastName:String(a.cognome||'').trim(),dateOfBirth:String(a.dataNascita||'').trim(),sex:String(a.sesso||'').trim()},cartella:c,confirmDuplicate:false};
console.log('--- POST confirm ---');
const res=await af(`${base}/${id}/confirm`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
console.log('HTTP',res.status); console.log('resp:',JSON.stringify(await res.json()));
