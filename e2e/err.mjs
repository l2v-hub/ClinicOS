import { buildSyntheticPdf } from './real-pdf.mjs';
const API='https://clinicos-backend-production-df88.up.railway.app', base=`${API}/ai/extraction/jobs`;
const OP={'X-Operator-Id':'op-err','X-Operator-Role':'operatore'};
const af=(u,o={})=>fetch(u,{...o,headers:{...OP,...(o.headers??{})}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const L=buildSyntheticPdf(['LETTERA DIMISSIONE','Paziente: Mario Bianchi','Diagnosi: BPCO','Allergie: Penicillina']);
const fd=new FormData(); fd.append('files',new Blob([L],{type:'application/pdf'}),'d.pdf');
let id=(await (await af(base,{method:'POST',body:fd})).json()).job.id;
await af(`${base}/${id}/process`,{method:'POST'});
const term=new Set(['review_ready','failed','retryable_error','cancelled']); let last;
for(let i=0;i<60;i++){await sleep(3000); last=await (await af(`${base}/${id}`)).json(); if(term.has(last.status))break;}
console.log('STATUS:',last.status);
console.log('ERROR:',JSON.stringify(last.error));
await af(`${base}/${id}/cancel`,{method:'POST'}).catch(()=>{});
