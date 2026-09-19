import { useState } from 'react';
import type { CartellaPaziente, Paziente } from '../../types';
import { TopNav } from '../navigation/TopNav';
import { VitalSignsEditor } from './PatientDetailLazyTabs';
import { PatientParameterHistory } from './PatientParameterHistory';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  operatoreNome: string;
  operatoreId: string;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
}
export function PatientVitalSignsView({
  cartella,
  paziente,
  operatoreNome,
  operatoreId,
  onUpdate,
}: Props) {
  const [view, setView] = useState('history');
  return (
    <div className="patient-vital-signs">
      <TopNav
        variant="level3"
        items={[
          { key: 'history', label: 'Storico rilevazioni' },
          { key: 'grid', label: 'Griglia mensile' },
        ]}
        activeKey={view}
        onChange={setView}
        ariaLabel="Viste parametri vitali"
        idPrefix="vital-view"
        panelId="vital-panel"
      />
      <div id="vital-panel" role="tabpanel" aria-labelledby={`vital-view-${view}`}>
        {view === 'history' ? (
          <PatientParameterHistory
            key={`${paziente.id}:${operatoreId}`}
            patientId={paziente.id}
            cartella={cartella}
          />
        ) : (
          <>
            <p className="parameter-entry-help">
              Griglia e registrazioni precedenti. Le nuove rilevazioni della compilazione rapida
              sono in «Storico rilevazioni».
            </p>
            <VitalSignsEditor
              mode="patient-chart"
              cartella={cartella}
              paziente={paziente}
              onUpdate={onUpdate}
              operatoreNome={operatoreNome}
              value={undefined as never}
              onChange={() => {}}
            />
          </>
        )}
      </div>
    </div>
  );
}
