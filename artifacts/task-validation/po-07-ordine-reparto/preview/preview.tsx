import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PatientList } from '../../../../frontend/src/components/operator/PatientList';
import { MultiPatientParametri } from '../../../../frontend/src/components/operator/MultiPatientParametri';
import { TherapyRoundsPage } from '../../../../frontend/src/components/operator/TherapyRoundsPage';
import { RosterDefaultsPanel } from '../../../../frontend/src/components/admin/RosterDefaultsPanel';
import { useRosterOrder } from '../../../../frontend/src/lib/useRosterOrder';
import { RosterOrderContext } from '../../../../frontend/src/components/shared/RosterOrderContext';
import { setCurrentOperator, operatorHeaders } from '../../../../frontend/src/lib/operatorSession';
import { parseTherapySlotPage, mergeTherapySlotPages, buildTherapySlotPageUrl } from '../../../../frontend/src/lib/therapySlotPage';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';
import '../../../../frontend/src/components/operator/PatientList.css';

const fixture = async (path: string, body = {}) => fetch(`/fixture/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const emptyPage = { slots: [], pageInfo: { hasMore: false, nextCursor: null, loadedTherapies: 0, completeness: 'complete', summaryExact: true } };
function Workspace({ info, actor }: any) {
  const roster = useRosterOrder(`${actor.id}:${actor.role}`);
  const [view, setView] = useState('Pazienti'), [search, setSearch] = useState(''), [sex, setSex] = useState<any>('tutti');
  const [page, setPage] = useState<any>(emptyPage), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState(''), [date, setDate] = useState(info.today);
  async function load(cursor?: string) {
    setLoading(true); setError('');
    try {
      const response = await fetch(buildTherapySlotPageUrl('/api', date, cursor, roster.options), { headers: operatorHeaders() });
      if (!response.ok) throw new Error(`Lettura terapia: ${response.status}`);
      const incoming = parseTherapySlotPage(await response.json()); roster.accept(incoming.roster);
      setPage((old: any) => cursor ? { ...incoming,
        slots: mergeTherapySlotPages(old.slots, incoming.slots, incoming.pageInfo.summaryExact),
        pageInfo: { ...incoming.pageInfo, loadedTherapies: old.pageInfo.loadedTherapies + incoming.pageInfo.loadedTherapies,
          summaryExact: old.pageInfo.summaryExact || incoming.pageInfo.summaryExact } } : incoming);
    } catch (cause) { setError(String(cause)); } finally { setLoading(false); }
  }
  useEffect(() => { if (view === 'Terapia') void load(); }, [view, date, roster.requestKey]);
  return <RosterOrderContext.Provider value={roster}>
    <header style={{ background: '#dce8f5', padding: 12, marginBottom: 16 }}>
      <strong>PO07 · solo pazienti sintetici · {actor.id}</strong>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {['Pazienti', 'Parametri', 'Terapia'].map(label => <button key={label} className="btn-secondary" onClick={() => setView(label)}>{label}</button>)}
        <button className="btn-secondary" onClick={() => void fixture('fault', { mode: 'after-commit' }).then(() => setResult('Prossima risposta di salvataggio persa'))}>Simula risposta persa</button>
        <button className="btn-secondary" onClick={() => void fixture('change-roster').then(() => setResult('Posizione sintetica aggiornata: il prossimo cursore sarà obsoleto'))}>Modifica reparto sintetico</button>
        <button className="btn-secondary" onClick={() => void fixture('preference', { mode: 'error' }).then(() => roster.refresh())}>Errore preferenza</button>
        <button className="btn-secondary" onClick={() => void fixture('preference', { mode: 'normal' }).then(() => roster.refresh())}>Ripristina preferenza</button>
        <button className="btn-secondary" onClick={() => void fixture('export').then(() => setResult('Evidenze esportate'))}>Esporta evidenze</button>
      </div>
    </header>
    <p role="status">{result}</p>
    {actor.role === 'manager' && <RosterDefaultsPanel/>}
    {view === 'Pazienti' && <PatientList totalPatients={72} ricerca={search} onRicercaChange={setSearch} filtroSesso={sex} onFiltroSessoChange={setSex}
      operatorId={actor.id} operatorRole={actor.role} onSelect={patient => { setResult(`Cartella selezionata: ${patient.cognome}, ${patient.nome}`); void fixture('event', { type: 'chart', patientId: patient.id }); }}/>} 
    {view === 'Parametri' && <MultiPatientParametri operatoreNome="Operatrice QA" onSelectPaziente={id => { setResult(`Storico: ${id}`); void fixture('event', { type: 'history', patientId: id }); }}/>} 
    {view === 'Terapia' && <TherapyRoundsPage slots={page.slots} loading={loading && !page.slots.length} error={error || null} pageInfo={page.pageInfo}
      loadingMore={loading} loadMoreError={null} onLoad={setDate} onLoadMore={() => void load(page.pageInfo.nextCursor)}
      onConfirm={info => { void fixture('event', { type: 'therapy-confirm', info }); }} onNotAdministered={(info, reason, note) => { void fixture('event', { type: 'therapy-not-administered', info, reason, note }); }}/>} 
  </RosterOrderContext.Provider>;
}
function Preview() {
  const [info, setInfo] = useState<any>(null);
  const [actorKey, setActorKey] = useState('operator');
  useEffect(() => { void fetch('/fixture/info').then(r => r.json()).then(value => { setCurrentOperator(value.actors.operator); setInfo(value); }); }, []);
  return <main style={{ padding: 16 }}>{info ? <>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
      {['operator', 'outsider', 'manager'].map(key => <button className="btn-secondary" key={key}
        onClick={() => { setCurrentOperator(info.actors[key]); setActorKey(key); }}>Profilo sintetico {key}</button>)}
      <button className="btn-secondary" onClick={() => void fixture('preference', { mode: 'slow' })}>Rallenta preferenza al prossimo avvio</button>
    </div>
    <Workspace key={actorKey} info={info} actor={info.actors[actorKey]}/>
  </> : <p>Avvio fixture…</p>}</main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
