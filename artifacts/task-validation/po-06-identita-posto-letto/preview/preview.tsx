import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PatientRoster } from '../../../../frontend/src/components/operator/PatientRoster';
import { MultiPatientParametri } from '../../../../frontend/src/components/operator/MultiPatientParametri';
import { TherapySlotModal } from '../../../../frontend/src/components/operator/TherapySlotModal';
import { ConsegnePage } from '../../../../frontend/src/components/operator/ConsegnePage';
import { setCurrentOperator, operatorHeaders } from '../../../../frontend/src/lib/operatorSession';
import { parseTherapySlotPage } from '../../../../frontend/src/lib/therapySlotPage';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';
import '../../../../frontend/src/components/operator/PatientList.css';

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, { ...init, headers: { ...operatorHeaders(), 'Content-Type': 'application/json', ...init.headers } });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Errore'); return result;
}
const emit = (event: unknown) => fetch('/fixture/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
const noop = () => {};
function Preview() {
  const [data, setData] = useState<any>(null), [error, setError] = useState('');
  const [view, setView] = useState('Pazienti'), [modal, setModal] = useState(false), [result, setResult] = useState('');
  const [sort, setSort] = useState<any>({ field: 'patient', direction: 'asc' });
  useEffect(() => { void (async () => {
    const info = await fetch('/fixture/info').then(r => r.json()); setCurrentOperator(info.actor);
    const [patients, therapies, handovers] = await Promise.all([api('/patients/page?limit=50'), api(`/therapy-slots/page?limit=100&date=${info.today}`), api('/consegne?limit=20')]);
    setData({ ...info, patients, therapies: parseTherapySlotPage(therapies), handovers });
  })().catch(e => setError(e.message)); }, []);
  return <main style={{ padding: 16 }}>
    <header style={{ background: '#dce8f5', padding: 12, marginBottom: 20 }}>
      <strong>Verifica PO06 · esclusivamente dati sintetici</strong>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{['Pazienti', 'Parametri', 'Terapia', 'Consegne'].map(v => <button className="btn-secondary" key={v} onClick={() => setView(v)}>{v}</button>)}
        <button className="btn-secondary" onClick={() => void fetch('/fixture/failure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"enabled":true}' })}>Simula errore riepilogo</button>
        <button className="btn-secondary" onClick={() => void fetch('/fixture/export', { method: 'POST' }).then(() => setResult('Evidenze esportate'))}>Esporta evidenze</button>
      </div>
    </header>
    <div role="status">{result}</div>{error && <div role="alert">{error}</div>}
    {!data ? <p>Caricamento fixture…</p> : <>
      {view === 'Pazienti' && <div className="patient-list-view"><PatientRoster patients={data.patients.items} sort={sort} onSortChange={setSort} hasMore={false} loading={false} summaryMap={new Map()} consegneAperteMap={new Map()} anomalie={{ inCorso: false, fallito: false, verificaIncompleta: false, perPaziente: new Map(), pazienti: new Map() } as any} deleteEnabled={false} deletingId={null} onSelect={p => { setResult(`Cartella selezionata: ${p.lastName}, ${p.firstName}`); void emit({ type: 'chart', id: p.id }); }} onDelete={noop}/></div>}
      {view === 'Parametri' && <MultiPatientParametri operatoreNome="Operatrice QA" onSelectPaziente={id => { setResult(`Storico selezionato: ${id}`); void emit({ type: 'history', id }); }}/>} 
      {view === 'Terapia' && <button className="btn-primary" onClick={() => setModal(true)}>Apri somministrazioni sintetiche</button>}
      {view === 'Consegne' && <ConsegnePage consegne={data.handovers.items} summary={data.handovers.summary} operatori={[]} operatoreId={data.actor.id} isAdmin={false} onAdd={async c => { await api('/consegne', { method: 'POST', body: JSON.stringify(c) }); setResult('Consegna salvata nella fixture'); return true; }} onUpdate={noop} onUpdateStato={noop} onDelete={noop} loading={false} loadError={null} hasMore={false} onQueryChange={noop} onLoadMore={noop} onRetry={noop} onSelectPaziente={(name, id) => { setResult(`Cartella selezionata: ${name}`); void emit({ type: 'handover-chart', id }); }}/>} 
      {modal && <TherapySlotModal slot={data.therapies.slots.find((s: any) => s.fascia === 'mattina')} date={data.today} onClose={() => setModal(false)} onConfirm={info => { void emit({ type: 'therapy-confirm', info }); setResult(`Azione sintetica: ${info.drugName}`); }} onNotAdministered={(info, motivo, note) => { void emit({ type: 'therapy-not-administered', info, motivo, note }); }}/>} 
    </>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
