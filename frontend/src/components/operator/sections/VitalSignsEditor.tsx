import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { CartellaPaziente, Paziente } from '../../../types';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const ParametriTab = lazy(
  () => import('../cartella/ParametriTab').then(m => ({ default: m.ParametriTab }))
);

// ParametriTab has TWO mutation paths: the monthly grid patches `parametriMensili`
// and the "Aggiunta rapida parametro vitale" panel patches `parametriVitali`.
// The intake value is therefore a *slice* object carrying both keys, not a bare array,
// so the editor can forward whichever key the tab mutated without dropping data.
type VitalsSlice = Partial<Pick<CartellaPaziente, 'parametriMensili' | 'parametriVitali'>>;

// ParametriTab + ParametriModuloView access paziente.firstName and paziente.lastName
// for the print/modulo view header. Pass minimal stubs so the modulo renders blank
// labels instead of crashing when no real patient is available during intake.
const MINIMAL_PAZIENTE = { firstName: '', lastName: '' } as Paziente;

type VitalSignsEditorProps = SectionProps<VitalsSlice> & {
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
    // Both arrays default to [] (not undefined) because ParametriTab spreads/indexes them.
    const shim = {
      parametriMensili: value?.parametriMensili ?? [],
      parametriVitali: value?.parametriVitali ?? [],
    } as unknown as CartellaPaziente;
    return (
      <Suspense fallback={null}>
        <ParametriTab
          cartella={shim}
          paziente={paziente ?? MINIMAL_PAZIENTE}
          // Forward the WHOLE patch (parametriMensili OR parametriVitali) so neither
          // mutation path silently loses data; merge over the existing slice.
          onUpdate={(patch) => onChange({ ...(value ?? {}), ...patch })}
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
