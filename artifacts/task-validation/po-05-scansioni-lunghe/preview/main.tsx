import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DischargeImportModal } from '../../../../frontend/src/components/shared/DischargeImportModal';
import { setCurrentOperator } from '../../../../frontend/src/lib/operatorSession';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/print-forms.css';

// Isolated fixture only: deterministic video, never a real device or patient document.
const camera = document.createElement('canvas');
camera.width = 1500; camera.height = 2100;
const context = camera.getContext('2d')!;
context.fillStyle = '#66717d'; context.fillRect(0, 0, 1500, 2100);
context.fillStyle = '#fff'; context.fillRect(100, 120, 1300, 1860);
context.fillStyle = '#152c45'; context.font = 'bold 48px sans-serif';
context.fillText('DOCUMENTO SINTETICO', 180, 280);
context.font = '32px sans-serif';
context.fillText('Collaudo scanner ClinicOS', 180, 355);
context.fillText('Nessun dato di pazienti reali', 180, 420);
for (let n = 0; n < 18; n++) context.fillText(`Riga di prova ${n + 1}: verifica ordine e leggibilita.`, 180, 540 + 65 * n);
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => camera.captureStream(15) });
setInterval(() => context.fillRect(1399, 1979, 1, 1), 100);

function Harness() {
  const [actor, setActor] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [scenario, setScenario] = useState('Standard');
  const control = async (action: string, enabled?: boolean) => {
    const response = await fetch('/fixture/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, enabled }) });
    if (response.ok) setScenario(action);
  };
  useEffect(() => { void fetch('/fixture/info').then(r => r.json()).then(info => { setCurrentOperator(info.actor); setActor(info.actor); }); }, []);
  return <main className="page-content content-panel" style={{ padding: 24 }}>
    <h1>Collaudo scansioni</h1>
    <p>Dati sintetici · fotocamera simulata · API e database locali</p>
    <details><summary>Controlli del collaudo sintetico</summary>
      <button onClick={() => void control('page17')}>Simula errore pagina 17</button>{' '}
      <button onClick={() => void control('conflicts', true)}>Simula lettere discordanti</button>{' '}
      <button onClick={() => void control('conflicts', false)}>Simula lettere concordanti</button>{' '}
      <button onClick={() => void control('upload-lost')}>Perdi prossima risposta upload</button>{' '}
      <button onClick={() => void control('patch-lost')}>Perdi prossima risposta bozza</button>
      <p role="status">Scenario: {scenario}</p>
    </details>
    <button className="btn-primary" disabled={!actor} onClick={() => setOpen(true)}>Apri importazione</button>
    {completed > 0 && <p role="status">Importazione confermata · {completed}</p>}
    {actor && <DischargeImportModal open={open} onClose={() => setOpen(false)} operatorId={actor.id} operatorRole={actor.role}
      onImported={() => setCompleted(value => value + 1)} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
