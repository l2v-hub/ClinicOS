import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { Paziente } from '../../../types';
import type { TherapyFormValue } from '../cartella/TherapyFormFields';
import { ClinicalSectionLoading } from '../ClinicalSectionLoading';
import { TherapyIntakeEditor } from './TherapyIntakeEditor';
import type { TherapyCorrectionTarget } from '../../shared/intake/intakeTherapyNavigation';

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
};

export function TherapyEditor({
  mode,
  value,
  onChange,
  paziente,
  operatoreNome,
  therapyCorrection,
}: TherapyEditorProps) {
  if (mode === 'patient-chart' && paziente) {
    return (
      <Suspense fallback={<ClinicalSectionLoading />}>
        <TerapiaFarmacologicaTab paziente={paziente} operatoreNome={operatoreNome ?? ''} />
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
