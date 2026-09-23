import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PatientDetail} from '../../../../frontend/src/components/operator/PatientDetail';
import {createDefaultCartella} from '../../../../frontend/src/mockData';
import {mergeCartellaPatch,cartellaWriteData} from '../../../../frontend/src/lib/cartellaWriteQueue';
import {createAssessmentDraftStore} from '../../../../frontend/src/lib/assessments/assessmentDraftStore';
import {useAssessmentExitGuard} from '../../../../frontend/src/lib/assessments/useAssessmentExitGuard';
import {setCurrentOperator,operatorHeaders} from '../../../../frontend/src/lib/operatorSession';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';
import '../../../../frontend/src/print-forms.css';
const fixture=(path:string,body={})=>fetch(`/fixture/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
function Preview(){
 const [info,setInfo]=useState<any>(),[profile,setProfile]=useState('operator'),[patientId,setPatientId]=useState('vitals-qa-anna');
 const [store,setStore]=useState(createAssessmentDraftStore),confirmExit=useAssessmentExitGuard(store);
 const [data,setData]=useState<any>(),[message,setMessage]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const original=window.print;
  window.print=()=>{void fixture('print-capture',{
   owner:document.body.getAttribute('data-nrs-print'),
   surfaces:Array.from(document.querySelectorAll('.nrs-print-surface')).map(node=>({text:node.textContent})),
  }).then(()=>setMessage('Richiesta di stampa simulata: DOM acquisito, nessuna stampante usata'))};
  return()=>{window.print=original};
 },[]);
 useEffect(()=>{void fetch('/fixture/info').then(r=>r.json()).then(value=>{setCurrentOperator(value.actors.operator);setInfo(value)})},[]);
 useEffect(()=>{
  if(!info)return;let active=true;setData(null);
  void Promise.all([fetch(`/api/patients/${patientId}`,{headers:operatorHeaders()}).then(r=>r.json()),fetch(`/api/patients/${patientId}/cartella`,{headers:operatorHeaders()}).then(r=>r.json()),fetch('/api/patients/page?limit=25',{headers:operatorHeaders()}).then(r=>r.json())]).then(([patient,chart,page])=>{if(active)setData({patient:{...patient,...page.items?.find((p:any)=>p.id===patientId)},chart:{...createDefaultCartella(patientId),...(chart.data??chart)}})});
  return()=>{active=false};
 },[patientId,profile,info,refresh]);
 const actor=info?.actors[profile],noop=()=>{};
 const updateChart=async(id:string,updates:any)=>{
  if(data?.patient?.id!==id)return false;
  const chart=cartellaWriteData(mergeCartellaPatch(data.chart,data.chart,updates));
  const response=await fetch(`/api/patients/${id}/cartella`,{method:'PUT',headers:{...operatorHeaders(),'Content-Type':'application/json'},body:JSON.stringify({data:chart})});
  if(!response.ok)return false;
  const saved=await response.json();setData((current:any)=>current?.patient?.id===id?{...current,chart:{...createDefaultCartella(id),...saved.data}}:current);return true;
 };
 return <>
 <header className="no-print" style={{background:'#dce8f5',padding:12}}><strong>PO15 · solo pazienti sintetici</strong>
 <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
 <label>Profilo sintetico <select value={profile} onChange={e=>{if(!confirmExit())return;store.clear();setStore(createAssessmentDraftStore());setCurrentOperator(info.actors[e.target.value]);setProfile(e.target.value);setPatientId(e.target.value==='outsider'?'vitals-qa-other':'vitals-qa-anna')}}>{['operator','outsider','manager'].map(p=><option key={p}>{p}</option>)}</select></label>
 <label>Paziente sintetico <select value={patientId} onChange={e=>setPatientId(e.target.value)}>{(profile==='outsider'?['vitals-qa-other']:['vitals-qa-anna','vitals-qa-bruno']).map(id=><option key={id}>{id}</option>)}</select></label>
 <button onClick={()=>void fixture('fault',{mode:'save-lost'}).then(()=>setMessage('Prossima risposta bozza persa'))}>Perdi risposta bozza</button>
 <button onClick={()=>void fixture('fault',{mode:'finalize-lost'}).then(()=>setMessage('Prossima risposta finale persa'))}>Perdi risposta finale</button>
 <button onClick={()=>void fixture('fault',{mode:'slow-save'}).then(()=>setMessage('Prossimo salvataggio rallentato'))}>Rallenta salvataggio</button>
 <button onClick={()=>void fixture('fault',{mode:'catalog-error'}).then(()=>setMessage('Prossimo caricamento catalogo fallisce'))}>Simula errore catalogo</button>
 <button onClick={()=>void fixture('fault',{mode:'catalog-slow'}).then(()=>setMessage('Prossimo catalogo rallentato'))}>Rallenta catalogo</button>
 <button onClick={()=>void fixture('fault',{mode:'intake-slow'}).then(()=>setMessage('Prossimi dati ingresso rallentati'))}>Rallenta dati ingresso</button>
 <button onClick={()=>{window.dispatchEvent(new Event('afterprint'));setMessage('Stampa simulata terminata')}}>Termina stampa simulata</button>
 <button onClick={()=>void fixture('export').then(()=>setMessage('Evidenze esportate'))}>Esporta evidenze</button>
 </div><p role="status">{message}</p></header>
 <div className="app-shell"><div className="main-area-clean"><div className="compact-topbar no-print">ClinicOS · anteprima sintetica</div><main className="page-content content-panel" style={{padding:16}}>
 {data&&actor?<PatientDetail key={`${profile}:${patientId}`} paziente={data.patient} cartella={data.chart} initialTab={'profilo' as any} assessmentDraftStore={store} consegne={[]} consegneSummary={null} consegneLoading={false} consegneError={null} consegneHasMore={false} onLoadMoreConsegne={noop} onRetryConsegne={noop} operatori={[]} camere={[]} camereLoadState="ready" camereLoadError={null} onRetryCamere={noop} canAssignRooms={false} onBack={noop} onAddConsegna={async()=>({kind:'failed',message:'Fuori scenario',uncertain:false}) as any} onUpdateConsegnaStato={noop} onUpdateCartella={updateChart} onUpdatePaziente={async()=>false} onAssignCamera={async()=>({ok:false})} operatoreNome={profile==='operator'?'Operatrice QA':'Responsabile QA'} operatoreId={actor.id} operatoreRole={actor.role}/>:<p>Caricamento cartella sintetica…</p>}
 </main></div></div></>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
