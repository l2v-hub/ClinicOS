import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { CartellaPaziente, Paziente } from '../../../types';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const ParametriTab = lazy(
  () => import('../cartella/ParametriTab').then(m => ({ default: m.ParametriTab }))
);

type VitalSignsEditorProps = SectionProps<never> & {
  cartella?: CartellaPaziente;
  paziente?: Paziente;
  onUpdate?: (patch: Partial<CartellaPaziente>) => void;
};

export function VitalSignsEditor({ mode, cartella, paziente, onUpdate, operatoreNome }: VitalSignsEditorProps) {
  if (mode === 'patient-chart' && cartella && onUpdate) {
    return (
      <Suspense fallback={null}>
        <ParametriTab
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
      I parametri vitali saranno disponibili nell&apos;ingresso (in arrivo).
    </p>
  );
}
