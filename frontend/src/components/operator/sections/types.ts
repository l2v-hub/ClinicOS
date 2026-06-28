import type { ComponentType } from 'react';

export type SectionMode = 'patient-chart' | 'intake' | 'review';

/** Every clinical editor is controlled: it renders `value` and reports edits via `onChange`.
 *  It never fetches or persists — the parent (chart / intake workspace / import review) owns that. */
export interface SectionProps<T = unknown> {
  mode: SectionMode;
  value: T;
  onChange: (next: T) => void;
  readOnly?: boolean;
  operatoreNome?: string;
}

export interface PatientSectionDefinition {
  sectionKey: string;
  title: string;
  component: ComponentType<SectionProps<never>>;
  availableDuringIntake: boolean;
  requiredDuringIntake: boolean;
  supportedByDocumentImport: boolean;
  permissions: string[];
}
