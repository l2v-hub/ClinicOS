// QA-only real components, synthetic identities; never imported by the production entry.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../frontend/src/index.css';
import '../../frontend/src/App.css';
import '../../frontend/src/design-system.css';
import '../../frontend/src/app-additions.css';
import { TerapiaFarmacologicaTab } from '../../frontend/src/components/operator/cartella/TerapiaFarmacologicaTab';
import { setSessionCapabilities } from '../../frontend/src/lib/capabilities';
import type { Paziente } from '../../frontend/src/types';

const patient = { id: 'patient-test', firstName: 'Paziente', lastName: 'Test' } as Paziente;
const capabilities = (writer: boolean) => Object.fromEntries([
  'therapy.create', 'therapy.update', 'therapy.delete', 'administration.confirm',
  'administration.record_not_administered', 'administration.list_slots',
].map(id => [id, { allowed: writer, effect: writer ? 'ALLOWED' : 'DENIED' }]));
setSessionCapabilities(capabilities(true) as never);
function Fixture() {
  const [writer, setWriter] = useState(true);
  return <main style={{ padding: 16, minWidth: 0 }}>
    <p>Collaudo locale · solo dati sintetici</p>
    <button type="button" onClick={() => {
      setSessionCapabilities(capabilities(!writer) as never);
      setWriter(!writer);
    }}>Ruolo: {writer ? 'prescrittore' : 'sola lettura'}</button>
    <TerapiaFarmacologicaTab paziente={patient} operatoreNome="Medico Test" />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
