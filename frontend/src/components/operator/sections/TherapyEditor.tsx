import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { Paziente } from '../../../types';
import type { TherapyFormValue } from '../cartella/TherapyFormFields';
import { ClinicalSectionLoading } from '../ClinicalSectionLoading';
import { TherapyIntakeEditor } from './TherapyIntakeEditor';
import type { TherapyCorrectionTarget } from '../../shared/intake/intakeTherapyNavigation';
import type { TherapyTarget } from '../../../lib/patientTarget';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const TerapiaFarmacologicaTab = lazy(() =>
  import('../cartella/TerapiaFarmacologicaTab').then((m) => ({
    default: m.TerapiaFarmacologicaTab,
  })),
);

type TherapyEditorProps = SectionProps<TherapyFormValue[]> & {
  paziente?: Paziente;
  therapyCorrection?: TherapyCorrectionTarget | null;
  /** Diario terapia: riga da mettere a fuoco nella cartella (se non c'e', nessun errore). */
  focusTherapyId?: string;
  /** Direct access: sub-view, drug, day and band to land on (TerapiaFarmacologicaTab, W2). */
  therapyTarget?: TherapyTarget & { requestId: number };
};

export function TherapyEditor({
  mode,
  value,
  onChange,
  paziente,
  operatoreNome,
  therapyCorrection,
  focusTherapyId,
  therapyTarget,
}: TherapyEditorProps) {
  if (mode === 'patient-chart' && paziente) {
    // Pass-through only: the Terapia tab owns sub-view selection and the drug/slot highlight.
    const target = therapyTarget ? { therapyTarget } : {};
    return (
      <Suspense fallback={<ClinicalSectionLoading />}>
        <TerapiaFarmacologicaTab
          paziente={paziente}
          operatoreNome={operatoreNome ?? ''}
          focusTherapyId={focusTherapyId}
          {...target}
        />
      </Suspense>
    );
  }

  if (mode === 'intake') {
    return (
      <TherapyIntakeEditor
        value={value}
        onChange={onChange}
        operatoreNome={operatoreNome}
        therapyCorrection={therapyCorrection}
      />
    );
  }

  return (
    <p className="cr-empty">
      La terapia farmacologica sarà disponibile nell&apos;ingresso (in arrivo).
    </p>
  );
}
