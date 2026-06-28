import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { Paziente } from '../../../types';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const TerapiaFarmacologicaTab = lazy(
  () => import('../cartella/TerapiaFarmacologicaTab').then(m => ({ default: m.TerapiaFarmacologicaTab }))
);

type TherapyEditorProps = SectionProps<never> & { paziente?: Paziente };

export function TherapyEditor({ mode, paziente, operatoreNome }: TherapyEditorProps) {
  if (mode === 'patient-chart' && paziente) {
    return (
      <Suspense fallback={null}>
        <TerapiaFarmacologicaTab
          paziente={paziente}
          operatoreNome={operatoreNome ?? ''}
        />
      </Suspense>
    );
  }

  return (
    <p className="cr-empty">
      La terapia farmacologica sarà disponibile nell&apos;ingresso (in arrivo).
    </p>
  );
}
