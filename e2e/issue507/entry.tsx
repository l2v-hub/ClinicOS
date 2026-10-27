// Test-only entry: mounted by issue507-smoke.mjs, never linked from the product.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PatientDetail } from '../../frontend/src/components/operator/PatientDetail';
// Preload the development-only lazy graph; production still owns its normal lazy boundary.
import '../../frontend/src/components/operator/cartella/TerapiaFarmacologicaTab';
import { StepClinica } from '../../frontend/src/components/shared/intake/StepClinica';
import { setCurrentOperator } from '../../frontend/src/lib/operatorSession';
import { setSessionCapabilities } from '../../frontend/src/lib/capabilities';
import type { Paziente } from '../../frontend/src/types';
import '../../frontend/src/App.css';

setCurrentOperator({ id: 'synthetic-doctor', role: 'medico' });
setSessionCapabilities(Object.fromEntries(
  ['therapy.list', 'therapy.create', 'therapy.update', 'therapy.delete', 'clinical_record.get']
    .map((key) => [key, { allowed: true }]),
));

function Harness() {
  const cold = new URLSearchParams(location.search).has('cold');
  const [patientId, setPatientId] = useState('synthetic-patient');
  const [admission, setAdmission] = useState(cold ? '' : '2026-09-15');
  const [data, setData] = useState<Record<string, unknown>>({
    ingresso: { dataPresa: cold ? '' : '2026-09-12' }, terapia: [],
  });
  const patient = { id: patientId, firstName: 'Synthetic', lastName: 'Patient' } as Paziente;
  return <main style={{ padding: 24 }}>
    <h1>Issue 507 — synthetic component checks</h1>
    <label>Chart admission context <input aria-label="Chart admission context" value={admission}
      onChange={(event) => setAdmission(event.target.value)} /></label>
    <button onClick={() => setPatientId('synthetic-patient-two')}>Switch synthetic patient</button>
    <section aria-label="Chart therapy">
      <PatientDetail key={patientId} paziente={patient} operatoreNome="Synthetic Doctor"
        operatoreId="synthetic-doctor" operatoreRole="medico"
        cartella={{ pazienteId: patientId, statoRicovero: 'ricoverato', allergie: [],
          allergieStatus: 'assenti', diagnosi: [], farmaci: [], indicatoriRischio: [],
          noteClinica: [], visite: [], parametriVitali: [], terapie: [], interventi: [],
          documentiConsegnati: [], diarioInfermieristico: [], diarioMedico: [],
          medicazioniFerite: [], contenzioni: [], valutazioniBraden: [], anamnesi: {}, pianoCura: {},
          presaInCarico: { dataIngresso: admission } } as any}
        consegne={[]} consegneSummary={null} consegneLoading={false} consegneError={null}
        consegneHasMore={false} onLoadMoreConsegne={() => {}} onRetryConsegne={() => {}}
        operatori={[]} camere={[]} camereLoadState="ready" camereLoadError={null}
        onRetryCamere={() => {}} canAssignRooms={false} onBack={() => {}}
        onAddConsegna={async () => true as any} onAcknowledgeConsegna={() => {}}
        onUpdateCartella={async () => true} onUpdatePaziente={async () => true}
        onAssignCamera={async () => ({ ok: true })}
        initialTab="terapia-farmacologica"
        navigationTarget={{ patientId, requestId: 1, tab: 'terapia-farmacologica',
          therapy: { subView: 'nuova' } } as any} />
    </section>
    <hr />
    <label>Intake admission context <input aria-label="Intake admission context"
      value={(data.ingresso as { dataPresa: string }).dataPresa}
      onChange={(event) => setData((current) => ({ ...current,
        ingresso: { dataPresa: event.target.value } }))} /></label>
    <section aria-label="Intake therapy">
      <StepClinica data={data} only={['terapia']} therapyBlock={false}
        onUpdateSection={(key, value) => setData((current) => ({ ...current, [key]: value }))} />
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Harness />);
