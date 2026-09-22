import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import { TerapiaFarmacologicaTab } from '../../../../frontend/src/components/operator/cartella/TerapiaFarmacologicaTab';
import { clearCachedGet } from '../../../../frontend/src/lib/cachedFetch';
import { setCurrentOperator } from '../../../../frontend/src/lib/operatorSession';
import type { PatientTherapyAPI, TherapyScheduleAPI, Paziente } from '../../../../frontend/src/types';

if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Local fixture only');
setCurrentOperator({ id: 'qa-operator', role: 'OPERATORE' });
const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') ?? 'happy';
const patientA: Paziente = { id: 'patient-a', firstName: 'Persona', lastName: 'Sintetica A', dateOfBirth: '1950-01-01', sex: 'F', medicalRecordNumber: 'QA-A' };
const patientB: Paziente = { ...patientA, id: 'patient-b', lastName: 'Sintetica B', medicalRecordNumber: 'QA-B' };
function therapy(id: string, patch: Partial<PatientTherapyAPI> = {}): PatientTherapyAPI {
  return {
    id, patientId: patientA.id, farmacoNome: `Farmaco demo ${id}`, dosaggio: 'Dose prescritta', viaSomministrazione: 'orale',
    tipo: 'periodica', stato: 'attiva', dataInizio: '2026-09-01', dataFine: '2026-09-30',
    fasceMattina: false, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false,
    orarioSpecifico: null, prescrittore: 'Prescrittore demo', operatoreInseritore: 'Operatore demo', note: null,
    dataSomministrazione: null, orarioSomministrazione: null, schedules: [],
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', ...patch,
  };
}
function schedule(id: string, time: string, n = 1, d = 1): TherapyScheduleAPI {
  return { id: `${id}-${time}`, therapyId: id, time, fascia: 'mattina', quantityNumerator: n, quantityDenominator: d, administrationUnit: 'compressa' };
}
const items = [
  therapy('A', { farmacoNome: 'Terapia demo mattino', schedules: [schedule('A', '08:00'), schedule('A', '10:00', 1, 2)] }),
  therapy('B', { farmacoNome: 'Terapia demo concomitante', orarioSpecifico: '08:00' }),
  therapy('C', { farmacoNome: 'Terapia demo notturna', schedules: [schedule('C', '00:00'), schedule('C', '23:59')] }),
  therapy('D', { farmacoNome: 'Terapia demo una tantum', tipo: 'una_tantum', dataSomministrazione: '2026-09-15', orarioSomministrazione: '12:25' }),
  therapy('E', { farmacoNome: 'Terapia demo martedì', giorniSettimana: '2', orarioSpecifico: '18:30' }),
  therapy('F', { farmacoNome: 'Terapia demo al bisogno', tipo: 'al_bisogno' }),
  therapy('G', { farmacoNome: 'Terapia demo senza orario', fasceSera: true }),
  therapy('H', { farmacoNome: 'Terapia demo futura', dataInizio: '2026-09-16', orarioSpecifico: '15:00' }),
];
const secondItems = [therapy('other', { patientId: patientB.id, farmacoNome: 'Terapia esclusiva paziente B', orarioSpecifico: '14:20' })];
const evidence = document.createElement('output'); evidence.id = 'qa-browser-evidence'; evidence.hidden = true; document.body.append(evidence);
const diagnostics: { requests: { path: string; status: number; scope: string }[]; errors: string[]; pending: number } = { requests: [], errors: [], pending: 0 };
const publish = () => { evidence.textContent = JSON.stringify(diagnostics); };
window.addEventListener('error', (event) => { diagnostics.errors.push(event.message); publish(); });
window.addEventListener('unhandledrejection', (event) => { diagnostics.errors.push(String(event.reason)); publish(); });
let healthy = scenario !== 'error';
let pauseNext = scenario === 'loading';
let releases: (() => void)[] = [];
publish();
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input), location.href);
  const path = url.pathname;
  const method = init.method ?? 'GET';
  if (method !== 'GET') throw new Error('Unexpected fixture mutation');
  const scope = url.searchParams.get('status') ?? 'reference';
  const isCalendar = scope === 'attiva';
  let payload: unknown;
  let status = 200;
  if (path.endsWith('/therapies/page')) {
    const data = scenario === 'empty' ? [] : path.includes('/patient-b/') ? secondItems : items;
    const cursor = url.searchParams.get('cursor');
    if (isCalendar && !healthy && cursor) { status = 503; payload = { error: 'Synthetic failure' }; }
    else {
      const values = isCalendar ? cursor ? data.slice(3) : data.slice(0, 3) : data;
      const more = isCalendar && !cursor && data.length > 3;
      payload = { items: scenario === 'foreign' && isCalendar ? secondItems : values, summary: cursor ? null : { total: data.length, active: data.length, inactive: 0 }, pageInfo: { hasMore: more, nextCursor: more ? 'next-page' : null } };
    }
    if (isCalendar && pauseNext) {
      pauseNext = false; diagnostics.pending++; publish();
      await new Promise<void>((resolve) => releases.push(resolve));
      diagnostics.pending--; publish();
    }
  } else if (path.endsWith('/farmaci/cerca')) payload = { query: url.searchParams.get('q'), esiti: [] };
  else if (path.endsWith('/medication-administrations/page')) payload = { items: [], pageInfo: { hasMore: false, nextCursor: null } };
  else if (path.endsWith('/therapy-slots')) payload = [];
  else throw new Error(`Unexpected fixture route: ${path}`);
  diagnostics.requests.push({ path, status, scope }); publish();
  return Response.json(payload, { status });
};

function Preview() {
  const [patient, setPatient] = useState(patientA);
  const [controlStatus, setControlStatus] = useState('Fixture pronta');
  return <>
    <style>{`.qa-record{max-width:1100px;margin:0 auto;padding:16px}.qa-controls{display:flex;gap:8px;flex-wrap:wrap;padding:8px 0}.qa-controls button{font-size:11px}.qa-record>h2{margin:12px 0;font-size:18px}body{overflow:auto}@media(max-width:600px){.qa-record{padding:8px}}`}</style>
    <main className="qa-record">
      <div className="qa-controls" aria-label="Controlli fixture">
        <button onClick={() => { setPatient(patient.id === patientA.id ? patientB : patientA); clearCachedGet(); }}>Cambia paziente QA</button>
        <button onClick={() => { healthy = true; setControlStatus('Servizio ripristinato'); }}>Ripristina servizio QA</button>
        <button onClick={() => { pauseNext = true; setControlStatus('Prossima lettura ritardata'); }}>Ritarda prossima lettura QA</button>
        <button onClick={() => { releases.forEach((release) => release()); releases = []; setControlStatus('Risposte rilasciate'); }}>Rilascia risposte QA</button>
        <output>{controlStatus}</output>
      </div>
      <h2>Cartella clinica · {patient.firstName} {patient.lastName}</h2>
      <TerapiaFarmacologicaTab paziente={patient} operatoreNome="Operatore demo" />
    </main>
  </>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
