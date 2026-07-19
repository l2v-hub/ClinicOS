import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { CartellaPaziente, Paziente, ScalaNRSValutazione } from '../../../types';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const ScalaNRSTab = lazy(() =>
  import('../cartella/ScalaNRSTab').then((m) => ({ default: m.ScalaNRSTab })),
);

// ScalaNRSTab passes paziente to NRSModulo which reads paziente.firstName + paziente.lastName
// for the print header. Stub with empty strings so the form renders without crashing.
const MINIMAL_PAZIENTE = { firstName: '', lastName: '' } as Paziente;

type PainAssessmentEditorProps = SectionProps<ScalaNRSValutazione[]> & {
  cartella?: CartellaPaziente;
  paziente?: Paziente;
  onUpdate?: (patch: Partial<CartellaPaziente>) => void;
};

export function PainAssessmentEditor({
  mode,
  value,
  onChange,
  cartella,
  paziente,
  onUpdate,
  operatoreNome,
}: PainAssessmentEditorProps) {
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

  if (mode === 'intake') {
    // Build a synthetic cartella shim carrying the intake draft NRS data.
    const shim = {
      valutazioniNRS: value ?? [],
    } as unknown as CartellaPaziente;
    return (
      <Suspense fallback={null}>
        <ScalaNRSTab
          cartella={shim}
          paziente={paziente ?? MINIMAL_PAZIENTE}
          onUpdate={(patch) =>
            onChange((patch.valutazioniNRS as ScalaNRSValutazione[]) ?? value ?? [])
          }
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
