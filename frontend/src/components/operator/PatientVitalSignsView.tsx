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
          { key: 'month', label: 'Mensile' },
          { key: 'grid', label: 'Griglia precedente' },
        ]}
        activeKey={view}
        onChange={setView}
        ariaLabel="Viste parametri vitali"
        idPrefix="vital-view"
        panelId="vital-panel"
      />
      <div id="vital-panel" role="tabpanel" aria-labelledby={`vital-view-${view}`}>
        {view === 'history' || view === 'month' ? (
          <PatientParameterHistory
            key={`${view}:${paziente.id}:${operatoreId}`}
            patientId={paziente.id}
            cartella={cartella}
            mode={view === 'month' ? 'month' : 'history'}
          />
        ) : (
          <>
            <p className="parameter-entry-help">
              Griglia delle registrazioni precedenti, ancora modificabile. Le nuove rilevazioni,
              complete di data e ora, sono nello storico e nella vista Mensile.
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
