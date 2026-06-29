import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { CartellaPaziente, Paziente, ParametriMensili } from '../../../types';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const ParametriTab = lazy(
  () => import('../cartella/ParametriTab').then(m => ({ default: m.ParametriTab }))
);

// ParametriTab + ParametriModuloView access paziente.firstName and paziente.lastName
// for the print/modulo view header. Pass minimal stubs so the modulo renders blank
// labels instead of crashing when no real patient is available during intake.
const MINIMAL_PAZIENTE = { firstName: '', lastName: '' } as Paziente;

type VitalSignsEditorProps = SectionProps<ParametriMensili[]> & {
  cartella?: CartellaPaziente;
  paziente?: Paziente;
  onUpdate?: (patch: Partial<CartellaPaziente>) => void;
};

export function VitalSignsEditor({ mode, value, onChange, cartella, paziente, onUpdate, operatoreNome }: VitalSignsEditorProps) {
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

  if (mode === 'intake') {
    // Build a synthetic cartella shim with the intake draft data.
    // parametriVitali must be [] (not undefined) because ParametriTab spreads it on quick-add.
    const shim = {
      parametriMensili: value ?? [],
      parametriVitali: [],
    } as unknown as CartellaPaziente;
    return (
      <Suspense fallback={null}>
        <ParametriTab
          cartella={shim}
          paziente={paziente ?? MINIMAL_PAZIENTE}
          onUpdate={(patch) => onChange((patch.parametriMensili as ParametriMensili[]) ?? (value ?? []))}
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
