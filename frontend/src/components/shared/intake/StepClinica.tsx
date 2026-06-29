// StepClinica — Step 3 of the intake wizard.
// Iterates the intake-eligible section registry and renders each editor in mode="intake".
// Controlled: no fetches here — parent IntakeWorkspace owns patchDraft via onUpdateSection.

import type { ComponentType } from 'react';
import type { SectionProps } from '../../operator/sections/types';
import type { AllergiaItem } from '../../../types';
import { intakeSections } from '../../operator/sections/patientSections';

interface StepClinicaProps {
  data: Record<string, unknown>;
  onUpdateSection: (key: string, value: unknown) => void;
  operatoreNome?: string;
}

export function StepClinica({ data, onUpdateSection, operatoreNome }: StepClinicaProps) {
  const sections = intakeSections();

  return (
    <>
      {sections.map((def) => {
        const { sectionKey, title, component: Editor } = def;

        // Cast: the registry stores ComponentType<SectionProps<never>> for type-safety at
        // definition time; here we widen to SectionProps<unknown> for intake rendering.
        const EditorCast = Editor as unknown as ComponentType<SectionProps<unknown> & { allergie?: AllergiaItem[] }>;

        // AnamnesisEditor requires an extra allergie prop (read-only card inside Anamnesi).
        const extraProps = sectionKey === 'anamnesi'
          ? { allergie: (data.allergie as AllergiaItem[]) ?? [] }
          : {};

        return (
          <div key={sectionKey} className="step-clinica__section">
            <div className="step-clinica__section-title">{title}</div>
            <EditorCast
              mode="intake"
              value={data[sectionKey]}
              onChange={(v) => onUpdateSection(sectionKey, v)}
              operatoreNome={operatoreNome}
              {...extraProps}
            />
          </div>
        );
      })}
    </>
  );
}
