// Synthetic QA surface. Never imported by the production entry.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../frontend/src/index.css';
import '../../frontend/src/App.css';
import '../../frontend/src/app-additions.css';
import '../../frontend/src/design-system.css';
import '../../frontend/src/components/operator/PatientRecordData.css';
import { WidgetGroup } from '../../frontend/src/components/shared/WidgetGroup';
import { ClinicalCard } from '../../frontend/src/components/shared/ClinicalCard';
import { ClinicalTableSection } from '../../frontend/src/components/operator/cartella/shared';
import { useLegacyModuleDraft } from '../../frontend/src/lib/useLegacyModuleDraft';
import { setCurrentOperator } from '../../frontend/src/lib/operatorSession';
import { LegacyDraftTools } from '../../frontend/src/components/operator/assessments/LegacyDraftTools';
import { PatientAdmissionPrint } from '../../frontend/src/components/operator/PatientAdmissionPrint';
import { PatientContacts } from '../../frontend/src/components/operator/PatientContacts';
import { createAssessmentDraftStore } from '../../frontend/src/lib/assessments/assessmentDraftStore';
import { createConsegnaDraftStore } from '../../frontend/src/lib/consegnaDrafts';
import { useConsegnaDraft } from '../../frontend/src/lib/useConsegnaDraft';
import { AssessmentWorkspace } from '../../frontend/src/components/operator/assessments/AssessmentWorkspace';
import { setSessionCapabilities } from '../../frontend/src/lib/capabilities';
const scope = new URLSearchParams(location.search).get('operator') ?? 'qa-a';
setCurrentOperator({ id: scope, role: 'infermiere' });
setSessionCapabilities(
  Object.fromEntries(
    [
      'assessments.read',
      'assessments.create_draft',
      'assessments.update_draft',
      'assessments.finalize',
    ].map((id) => [id, { allowed: true, effect: 'ALLOWED' }]),
  ) as never,
);
const patient = {
  id: 'patient-qa',
  firstName: 'Persona',
  lastName: 'Sintetica',
  email: 'qa@example.test',
  phone: '0000000000',
  emergencyContactName: 'Referente sintetico',
} as never;
const chart = {
  presaInCarico: {
    motivoIngresso: 'Ingresso sintetico',
    condizioniIniziali: 'Condizioni sintetiche',
    documentiRicevuti: ['Documento test'],
    mobilita: 'Autonomia sintetica',
  },
  contattoEmergenzaRel: 'Referente',
} as never;
function Legacy({ module }: { module: string }) {
  const draft = useLegacyModuleDraft('patient-qa', module, { note: '' }, true);
  return (
    <ClinicalCard title={module}>
      <label htmlFor={`note-${module}`}>Nota {module}</label>
      <textarea
        id={`note-${module}`}
        value={draft.form.note}
        onChange={(e) => draft.setForm({ note: e.target.value })}
      />
      <LegacyDraftTools dirty={draft.dirty} error={draft.error} onDelete={draft.remove} />
    </ClinicalCard>
  );
}
function Fixture() {
  const [text, setText] = useState('');
  const [assessment] = useState(() => {
    const s = createAssessmentDraftStore();
    s.bindStorage(`${scope}:infermiere`);
    return s;
  });
  const [handovers] = useState(() => {
    const s = createConsegnaDraftStore();
    s.bindStorage(`${scope}:infermiere`);
    return s;
  });
  const draft = useConsegnaDraft(handovers, 'patient-qa');
  return (
    <main className="patient-record-view" style={{ padding: 16, maxWidth: 1000, margin: 'auto' }}>
      <p>QA · dati sintetici</p>
      <WidgetGroup>
        <ClinicalTableSection title="Editor da conservare">
          <label>
            Testo widget
            <input value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        </ClinicalTableSection>
        <ClinicalCard title="Dati di ingresso">
          <PatientContacts patient={patient} chart={chart} onEdit={() => {}} />
        </ClinicalCard>
        {['medicazioni', 'contenzioni', 'braden'].map((module) => (
          <Legacy key={module} module={module} />
        ))}
        <ClinicalCard title="Consegna personale">
          <label htmlFor="note-handover">Testo consegna</label>
          <textarea
            id="note-handover"
            value={draft.fields.note}
            onChange={(e) => handovers.update('patient-qa', { note: e.target.value })}
          />
          <button onClick={() => handovers.discard('patient-qa')}>Elimina consegna locale</button>
        </ClinicalCard>
      </WidgetGroup>
      <section className="qa-print-surface" aria-label="Stampa ingresso">
        <style>
          {'.qa-print-surface .patient-record-print__facts { grid-template-columns:1fr; }'}
        </style>
        <PatientAdmissionPrint patient={patient} chart={chart} />
      </section>
      <AssessmentWorkspace
        patient={patient}
        operatorId={scope}
        operatorRole="infermiere"
        operatorName="Operatore QA"
        type="painad"
        draftStore={assessment}
      />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
