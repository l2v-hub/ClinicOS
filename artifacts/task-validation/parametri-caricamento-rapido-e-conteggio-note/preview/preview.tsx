import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MultiPatientParametri } from '../../../../frontend/src/components/operator/MultiPatientParametri';
import { facilityLocalMinute } from '../../../../frontend/src/lib/facilityTime';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';

const patients = Array.from({length:27},(_,i)=>({id:`synthetic-${i}`,firstName:'Esempio',lastName:`${i===0?'Alfa':i===1?'Beta':'Gamma'} ${String(i).padStart(2,'0')}`,medicalRecordNumber:`QA-${i}`}));
const RealDate = Date; let clockOffset = 0;
window.Date = class extends RealDate {
  constructor(value?: string | number) { super(value === undefined ? RealDate.now() + clockOffset : value); }
  static now() { return RealDate.now() + clockOffset; }
} as DateConstructor;
const stored = JSON.parse(sessionStorage.getItem('parameter-qa-saves') ?? '[]');
const notes = [{id:'seed-1',patientId:'synthetic-0',measuredAt:new Date().toISOString(),values:{fc:'70',note:'Prima nota sintetica'}},{id:'seed-2',patientId:'synthetic-0',measuredAt:new Date().toISOString(),values:{fc:'71',note:'Seconda nota sintetica'}},...stored];
let scenario='slow', started=0, requests=[], metrics={}, errors=[], selected='';
window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const wait=(ms,signal,ignore=false)=>new Promise((resolve,reject)=>{const timer=setTimeout(resolve,ms);if(!ignore)signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
window.fetch=async(input,init)=>{
  const url=new URL(String(input),location.origin), path=url.pathname.replace('/synthetic-api','');
  const params=init?.body?JSON.parse(String(init.body)):Object.fromEntries(url.searchParams);
  requests.push({path,method:init?.method??'GET',at:Math.round(performance.now()-started)});
  if(path==='/patients/page'||path==='/patients/parameters/page'){
    metrics.requestMs??=Math.round(performance.now()-started);
    const detailed=path.includes('/parameters/');
    // Snapshot before delay models an older read that completes after a save.
    const filtered=scenario==='empty'?[]:patients.filter(p=>!params.q||p.lastName.toLowerCase().includes(params.q.toLowerCase())||params.q==='101'&&p.id==='synthetic-0');
    const offset=params.cursor?25:0, page=filtered.slice(offset,offset+25);
    const daily=notes.filter(n=>!params.date||facilityLocalMinute(new Date(n.measuredAt)).slice(0,10)===params.date);
    const items=page.map(patient=>({patient,cartella:{pazienteId:patient.id,parametriMensili:[],cameraNumero:patient.id==='synthetic-0'?'101':undefined,readingCount:daily.filter(n=>n.patientId===patient.id).length,noteCount:daily.filter(n=>n.patientId===patient.id&&n.values.note?.trim()).length,lastReadingAt:daily.filter(n=>n.patientId===patient.id).at(-1)?.measuredAt??null}}));
    await wait(params.q==='Alfa'?1900:params.q?100:detailed?1600:500,init?.signal,params.q==='Alfa');
    if(scenario==='page-error'||detailed&&scenario==='summary-error'||params.cursor&&scenario==='more-error')return json({},500);
    return json({items:detailed?items:page,hasMore:filtered.length>offset+25,nextCursor:filtered.length>offset+25?'next':null});
  }
  if(path.endsWith('/parameter-readings')&&init?.method==='POST'){
    const patientId=path.split('/')[2];
    let saved=notes.find(n=>n.requestId===params.requestId);
    if(!saved){saved={...params,id:`saved-${params.requestId}`,patientId,authorOperatorId:'qa',authorName:'Operatore QA',createdAt:params.measuredAt};notes.push(saved);stored.push(saved);sessionStorage.setItem('parameter-qa-saves',JSON.stringify(stored));}
    await wait(150,init?.signal);
    if(scenario==='save-unknown'){scenario='slow';return json({error:'Esito da verificare'},500);}
    const own=notes.filter(n=>n.patientId===patientId);
    return json({reading:saved,summary:{date:facilityLocalMinute().slice(0,10),count:own.length,noteCount:own.filter(n=>n.values.note?.trim()).length,lastReadingAt:own.at(-1).measuredAt}});
  }
  errors.push(`Unexpected ${init?.method??'GET'} ${path}`);return json({},404);
};
function Preview(){
  const [open,setOpen]=useState(false),[,tick]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>{
    if(open&&document.querySelector('.parameter-entry-row'))metrics.rowsMs??=Math.round(performance.now()-started);
    tick(x=>x+1);
  },16);return()=>clearInterval(timer);},[open]);
  return <main style={{padding:24}}><div style={{background:'#dce8f5',padding:12,marginBottom:24}}>
    <strong>Verifica locale · solo dati sintetici</strong><label> Scenario <select aria-label="Scenario" onChange={e=>{scenario=e.target.value;}} defaultValue="slow"><option value="slow">Rete lenta</option><option value="summary-error">Errore riepilogo</option><option value="page-error">Errore elenco</option><option value="more-error">Errore pagina successiva</option><option value="save-unknown">Salvataggio incerto</option><option value="empty">Elenco vuoto</option></select></label>
    <button onClick={()=>{clockOffset+=86400000;}}>Giorno successivo</button>
    <button onClick={()=>{started=performance.now();metrics={};requests=[];errors=[];setOpen(true);}}>Apri elenco</button><button onClick={()=>setOpen(false)}>Chiudi elenco</button>
    <pre id="qa-metrics" style={{fontSize:10,whiteSpace:'pre-wrap'}}>{JSON.stringify({metrics,requests,errors,selected})}</pre></div>
    {open&&<MultiPatientParametri operatoreNome="Operatore QA" onSelectPaziente={id=>{selected=id;}}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
