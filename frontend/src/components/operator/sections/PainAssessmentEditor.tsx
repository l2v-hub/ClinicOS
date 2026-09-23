import { lazy, Suspense } from 'react';
import type { SectionProps } from './types';
import type { CartellaPaziente, Paziente, ScalaNRSValutazione } from '../../../types';
import { ClinicalSectionLoading } from '../ClinicalSectionLoading';
import { NrsLegacyContent } from '../assessments/NrsLegacyContent';
import type { PatientIntakeReviewState } from '../PatientIntakeReview';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const ScalaNRSTab = lazy(() =>
  import('../cartella/ScalaNRSTab').then((m) => ({ default: m.ScalaNRSTab })),
);

// ScalaNRSTab passes paziente to NRSModulo which reads paziente.firstName + paziente.lastName
// for the print header. Stub with empty strings so the form renders without crashing.
type PainAssessmentEditorProps = SectionProps<ScalaNRSValutazione[]> & {
  cartella?: CartellaPaziente;
  paziente?: Paziente;
  onUpdate?: (patch: Partial<CartellaPaziente>) => void;
  intakeReview?: PatientIntakeReviewState;
  onRetryIntake?: () => void;
};

export function PainAssessmentEditor({
  mode,
  value,
  cartella,
  paziente,
  intakeReview,
  onRetryIntake,
}: PainAssessmentEditorProps) {
  if (mode === 'patient-chart' && cartella) {
    return (
      <Suspense fallback={<ClinicalSectionLoading />}>
        <ScalaNRSTab
          cartella={cartella}
          paziente={paziente}
          intakeReview={intakeReview}
          onRetryIntake={onRetryIntake}
        />
      </Suspense>
    );
  }

  if (mode === 'intake') {
    return <NrsLegacyContent value={value} patient={paziente} title="Dati dolore precedenti della bozza" intake />;
  }

  return (
    <p className="cr-empty">
      Le valutazioni NRS precedenti sono consultabili in sola lettura.
    </p>
  );
}
