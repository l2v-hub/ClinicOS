import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConsegneWorkspace } from '../../../../frontend/src/components/operator/ConsegneWorkspace';
import { useRosterOrder } from '../../../../frontend/src/lib/useRosterOrder';
import { RosterOrderContext } from '../../../../frontend/src/components/shared/RosterOrderContext';
import { createConsegna } from '../../../../frontend/src/lib/consegnaCreation';
import { buildConsegnaFeedUrl, mergeConsegnaPage } from '../../../../frontend/src/lib/consegneFeed';
import { setCurrentOperator, operatorHeaders } from '../../../../frontend/src/lib/operatorSession';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';

const fixture = (path: string, body = {}) => fetch(`/fixture/${path}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r => r.json());
function Workspace({info, actor}:any) {
  const roster = useRosterOrder(`${actor.id}:${actor.role}`);
  const [query,setQuery] = useState<any>({}), [feed,setFeed] = useState<any>({items:[],summary:{open:0,urgentOpen:0},pageInfo:{hasMore:false,nextCursor:null}});
  const [loading,setLoading] = useState(false), [error,setError] = useState<string|null>(null), [result,setResult] = useState('');
  const [entry,setEntry] = useState<any>({mode:'rounds',key:0});
  const load = useCallback(async (cursor?:string) => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(buildConsegnaFeedUrl('/api',query,cursor),{headers:operatorHeaders()});
      if (!response.ok) throw new Error(`Feed ${response.status}`);
      const page = await response.json();
      setFeed((old:any) => ({...page,items:mergeConsegnaPage(old.items,page.items,Boolean(cursor))}));
    } catch (error) { setError(String(error)); } finally { setLoading(false); }
  },[query]);
  useEffect(() => { void load(); },[load]);
  const onQueryChange = useCallback((next:any) => setQuery((old:any) => JSON.stringify(old) === JSON.stringify(next) ? old : next),[]);
  const onAdd = useCallback(async (request:any) => {
    const outcome = await createConsegna('/api',request,{headers:operatorHeaders()});
    if (outcome.kind === 'saved') { void load(); setResult(`Ricevuta verificata ${outcome.record.pazienteId} · ${outcome.record.id}`); }
    return outcome;
  },[load]);
  const update = async (id:string,patch:any) => {
    const response = await fetch(`/api/consegne/${id}`,{method:'PUT',headers:{...operatorHeaders(),'Content-Type':'application/json'},body:JSON.stringify(patch)});
    if(response.ok) void load(); return response.ok;
  };
  const operators = Object.entries(info.actors).map(([name,actor]:any) => ({id:actor.id,nome:name === 'operator'?'Operatrice':'Collega',cognome:'QA',ruolo:'infermiere',email:'qa@synthetic.invalid',telefono:'',reparto:'Reparto sintetico',stato:'attivo',pazientiAssegnati:0,appuntamentiOggi:0,iniziali:'QA',colore:'#2563eb'}));
  return <RosterOrderContext.Provider value={roster}>
    <header style={{background:'#dce8f5',padding:12,marginBottom:16}}>
      <strong>PO08 · solo pazienti sintetici · {actor.id}</strong>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
        <button className="btn-secondary" onClick={() => void fixture('fault',{mode:'after-commit'}).then(() => setResult('Prossima risposta persa dopo commit'))}>Simula risposta persa</button>
        <button className="btn-secondary" onClick={() => void fixture('fault',{mode:'delay'}).then(() => setResult('Prossimo salvataggio rallentato'))}>Rallenta salvataggio</button>
        <button className="btn-secondary" onClick={() => void fixture('fault',{mode:'summary'}).then(() => setResult('Prossimo riepilogo indisponibile'))}>Errore riepilogo</button>
        <button className="btn-secondary" onClick={() => void fixture('change-roster').then(() => setResult('Camera sintetica modificata'))}>Modifica camera sintetica</button>
        <button className="btn-secondary" onClick={() => setEntry({mode:'feed',query:{status:'attive'},focusId:'po08-urgent',key:Date.now()})}>Ingresso dashboard</button>
        <button className="btn-secondary" onClick={() => setEntry({mode:'rounds',key:Date.now()})}>Ingresso generale</button>
        <button className="btn-secondary" onClick={() => void fixture('export').then(() => setResult('Evidenze esportate'))}>Esporta evidenze</button>
      </div><p role="status">{result}</p>
    </header>
    <main style={{maxWidth:1400,margin:'auto',padding:16}}>
      <ConsegneWorkspace sessionKey={`${actor.id}:${actor.role}`} entry={entry} consegne={feed.items} summary={feed.summary}
        operatori={operators} operatoreId={actor.id} isAdmin={actor.role === 'manager'} onAdd={onAdd}
        onUpdate={update} onUpdateStato={(id:any,stato:any) => {void update(id,{stato});}}
        onDelete={(id:any) => {void fetch(`/api/consegne/${id}`,{method:'DELETE',headers:operatorHeaders()}).then(() => load());}}
        loading={loading} loadError={error} hasMore={feed.pageInfo.hasMore} onQueryChange={onQueryChange}
        onLoadMore={() => void load(feed.pageInfo.nextCursor)} onRetry={() => void load()}
        onSelectPaziente={(name:any,id:any) => setResult(`Cartella richiesta: ${name} · ${id}`)} />
    </main>
  </RosterOrderContext.Provider>;
}
function Preview() {
  const [info,setInfo] = useState<any>(null), [profile,setProfile] = useState('operator');
  useEffect(() => { void fetch('/fixture/info').then(r => r.json()).then(data => {setCurrentOperator(data.actors.operator);setInfo(data);}); },[]);
  if (!info) return <p>Preparazione del collaudo sintetico…</p>;
  return <><label>Profilo sintetico <select value={profile} onChange={event => {setCurrentOperator(info.actors[event.target.value]);setProfile(event.target.value);}}>
    {Object.keys(info.actors).map(key => <option key={key}>{key}</option>)}</select></label>
    <Workspace key={profile} info={info} actor={info.actors[profile]}/></>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
