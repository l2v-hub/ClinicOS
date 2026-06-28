import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { CartellaPaziente, Paziente } from '../../../types';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const ScalaNRSTab = lazy(
  () => import('../cartella/ScalaNRSTab').then(m => ({ default: m.ScalaNRSTab }))
);

type PainAssessmentEditorProps = SectionProps<never> & {
  cartella?: CartellaPaziente;
  paziente?: Paziente;
  onUpdate?: (patch: Partial<CartellaPaziente>) => void;
};

export function PainAssessmentEditor({ mode, cartella, paziente, onUpdate, operatoreNome }: PainAssessmentEditorProps) {
  if (mode === 'patient-chart' && cartella && onUpdate) {
    return (
      <Suspense fallback={null}>
        <ScalaNRSTab
          cartella={cartella}
          paziente={paziente as Paziente}
          onUpdate={onUpdate}
          operatoreNome={operatoreNome ?? ''}
        />
      </Suspense>
    );
  }

  return (
    <p className="cr-empty">
      La valutazione del dolore (NRS) sarà disponibile nell&apos;ingresso (in arrivo).
    </p>
  );
}
