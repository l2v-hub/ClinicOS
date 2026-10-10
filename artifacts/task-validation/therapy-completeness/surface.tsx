// QA-only entry: compiled outside frontend/dist, never imported by the application.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TerapiaFarmacologicaTab } from '../../../frontend/src/components/operator/cartella/TerapiaFarmacologicaTab';
import { setSessionCapabilities } from '../../../frontend/src/lib/capabilities';
import { setCurrentOperator } from '../../../frontend/src/lib/operatorSession';
import '../../../frontend/src/index.css';
import '../../../frontend/src/print-forms.css';
import '../../../frontend/src/App.css';
import '../../../frontend/src/design-system.css';

setSessionCapabilities({}); // Deny all writes, also in the real dose controls.
setCurrentOperator({ id: 'qa-synthetic-operator', role: 'infermiere' });
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
createRoot(document.getElementById('root')!).render(<Surface />);
