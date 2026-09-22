import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IntakeWorkspace } from '../../../../frontend/src/components/shared/intake/IntakeWorkspace';
import { PatientDetail } from '../../../../frontend/src/components/operator/PatientDetail';
import { createDefaultCartella } from '../../../../frontend/src/mockData';
import { setCurrentOperator } from '../../../../frontend/src/lib/operatorSession';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/print-forms.css';

function Harness() {
  const [info, setInfo] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [importId, setImportId] = useState<string | undefined>();
  const [patient, setPatient] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/fixture/info').then(r => r.json()).then(data => { setCurrentOperator(data.actor); setInfo(data); }); }, []);
  if (!info) return <p>Preparazione dati sintetici…</p>;
  const headers = { 'Content-Type': 'application/json', 'X-Operator-Id': info.actor.id, 'X-Operator-Role': info.actor.role };
  async function loaded(id: string) {
    const p = await fetch(`/api/patients/${id}`, { headers }).then(r => r.json());
    const c = await fetch(`/api/patients/${id}/cartella`, { headers }).then(r => r.json());
    setPatient(p); setChart({ ...createDefaultCartella(id), ...(c.data ?? c) });
  }
  async function update(id: string, data: unknown) {
    const r = await fetch(`/api/patients/${id}`, { method: 'PATCH', headers, body: JSON.stringify(data) });
    const result = await r.json();
    if (!r.ok) { setError(result.error); return false; }
    setPatient(result); return true;
  }
  return <main className="page-content content-panel" style={{ padding: 20 }}>
    <p>Collaudo locale · tutti i dati sono sintetici</p>
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <button className="btn-primary" onClick={() => { setImportId(undefined); setOpen(true); }}>Ingresso manuale</button>
      <button className="btn-secondary" onClick={() => { setImportId(info.importDraftId); setOpen(true); }}>Revisione importata</button>
      <button className="btn-secondary" onClick={() => { void fetch('/fixture/state').then(r => r.json()).then(s => { const p = s.patients.filter(p => !p.id.startsWith('vitals-')).at(-1); if (p) void loaded(p.id); }); }}>Riapri scheda salvata</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {patient && chart && <PatientDetail key={patient.id} paziente={patient} cartella={chart} consegne={[]} consegneSummary={null} consegneLoading={false} consegneError={null} consegneHasMore={false} onLoadMoreConsegne={() => {}} onRetryConsegne={() => {}} operatori={[]} camere={[]} camereLoadState="ready" camereLoadError={null} onRetryCamere={() => {}} canAssignRooms={false} onBack={() => setPatient(null)} onAddConsegna={() => {}} onUpdateConsegnaStato={() => {}} onUpdateCartella={async () => true} onUpdatePaziente={update} onAssignCamera={async () => ({ ok: false })} operatoreNome="Operatrice QA" operatoreId={info.actor.id} operatoreRole={info.actor.role} />}
    <IntakeWorkspace open={open} onClose={() => setOpen(false)} onCreated={id => void loaded(id)} importDraftId={importId} operatorId={info.actor.id} operatorRole={info.actor.role} operatoreNome="Operatrice QA" />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
