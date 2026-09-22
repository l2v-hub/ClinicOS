import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TerapiaFarmacologicaTab } from '../../../../frontend/src/components/operator/cartella/TerapiaFarmacologicaTab';
import { RicercaFarmaco } from '../../../../frontend/src/components/operator/cartella/RicercaFarmaco';
import { setCurrentOperator } from '../../../../frontend/src/lib/operatorSession';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/print-forms.css';

function Harness() {
  const [info, setInfo] = useState<any>(null);
  const [mode, setMode] = useState('therapy');
  const [failed, setFailed] = useState(false);
  useEffect(() => { void fetch('/fixture/info').then(r => r.json()).then(d => { setCurrentOperator(d.actor); setInfo(d); }); }, []);
  if (!info) return <p>Preparazione catalogo sintetico…</p>;
  return <main className="page-content content-panel" style={{ padding: 20 }}>
    <p>Collaudo locale · catalogo e paziente sintetici</p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      <button className="btn-secondary" onClick={() => setMode('therapy')}>Terapia del paziente</button>
      <button className="btn-secondary" onClick={() => setMode('catalog')}>Catalogo farmaci</button>
      <button className="btn-secondary" onClick={async () => { await fetch('/fixture/failure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !failed }) }); setFailed(!failed); }}>{failed ? 'Ripristina servizio' : 'Simula servizio non raggiungibile'}</button>
    </div>
    <h1>ALFA ANNA · camera 11 · letto A</h1>
    {mode === 'therapy' ? <TerapiaFarmacologicaTab paziente={info.patient} operatoreNome="Operatrice QA" /> : <RicercaFarmaco />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
