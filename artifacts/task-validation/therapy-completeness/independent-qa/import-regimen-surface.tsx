// QA-only entry: compiled outside frontend/dist, never imported by the application.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TerapiaFarmacologicaTab } from '../../../frontend/src/components/operator/cartella/TerapiaFarmacologicaTab';
import { DischargeTherapyReview } from '../../../frontend/src/components/shared/intake/DischargeTherapyReview';
import { parseTherapyLine } from '../../../backend/src/intake/parse-discharge-therapy';
import type { DischargeTherapyRow } from '../../../frontend/src/components/shared/intake/dischargeTherapy';
import { setSessionCapabilities } from '../../../frontend/src/lib/capabilities';
import { setCurrentOperator } from '../../../frontend/src/lib/operatorSession';
import '../../../frontend/src/index.css';
import '../../../frontend/src/print-forms.css';
import '../../../frontend/src/App.css';
import '../../../frontend/src/design-system.css';

setSessionCapabilities({}); // Deny all writes, also in the real dose controls.
setCurrentOperator({ id: 'qa-synthetic-operator', role: 'infermiere' });
const scenario = new URLSearchParams(location.search).get('scenario');
const syntheticLetter = scenario === 'adversarial' ? '(23) Delta CPR 10 MG (OS) 1 Cpr non al bisogno\n4) Gamma CPR 10 MG (OS) 1 Cpr ore 08:00 e al bisogno\n5. Epsilon CPR 10 MG (OS) 1 Cpr al bisogno massimo 2 volte al giorno' :
  '1. Alfa CPR 10 MG (OS) 1 Cpr ore 08:00\nBeta CPR 10 MG (OS) 1 Cpr al bisogno massimo 2 volte al giorno';
function ImportSurface() {
  const [rows, setRows] = React.useState<DischargeTherapyRow[]>(() => {
    const saved = sessionStorage.getItem('qa-only-import-regimen');
    return saved ? JSON.parse(saved) : syntheticLetter.split('\n').map(parseTherapyLine);
  });
  return <main style={{ padding: 16 }}>
    <h1>Verifica sintetica · importazione e regime</h1>
    <p>Bozza solo nel browser QA. Nessun paziente reale o scrittura API.</p>
    <DischargeTherapyReview rows={rows} sourceText={syntheticLetter} onChange={next => {
      setRows(next); sessionStorage.setItem('qa-only-import-regimen', JSON.stringify(next));
    }} />
  </main>;
}
function Surface() {
  const [patientId, setPatientId] = React.useState('synthetic-patient');
  return <main style={{ padding: 16 }}>
    <h1>Verifica sintetica · completezza prescrizioni</h1>
    <p>Nessun paziente reale. Trasporto intercettato; nessuna scrittura consentita.</p>
    <button onClick={() => setPatientId('synthetic-other')}>QA: cambia paziente sintetico</button>
    <TerapiaFarmacologicaTab paziente={{ id: patientId, medicalRecordNumber: 'QA-SYNTHETIC',
      firstName: 'Sintetico', lastName: 'Verifica', dateOfBirth: null, sex: null, email: null, phone: null }}
      operatoreNome="Operatore sintetico" />
  </main>;
}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('intake') ? <ImportSurface /> : <Surface />);
