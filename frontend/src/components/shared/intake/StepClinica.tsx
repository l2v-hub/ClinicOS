// StepClinica — Step 3 of the intake wizard.
// Iterates the intake-eligible section registry and renders each editor in mode="intake".
// Controlled: no fetches here — parent IntakeWorkspace owns patchDraft via onUpdateSection.

import { useState, type ComponentType } from 'react';
import type { SectionProps } from '../../operator/sections/types';
import type { AllergiaItem } from '../../../types';
import { intakeSections } from '../../operator/sections/patientSections';

// Maps lowercase intake section keys to the Italian uppercase keys used in sourceReferences.
const SECTION_KEY_TO_ITALIAN: Record<string, string> = {
  allergie: 'ALLERGIE',
  anamnesi: 'ANAMNESI',
  diagnosi: 'DIAGNOSI',
  terapia:  'TERAPIA',
};

interface SourceReference {
  sectionKey: string;
  fileId?: string;
  fileName?: string;
  pageFrom?: number;
  pageTo?: number;
}

interface NarrativeData {
  sourceReferences?: SourceReference[];
}

interface StepClinicaProps {
  data: Record<string, unknown>;
  onUpdateSection: (key: string, value: unknown) => void;
  operatoreNome?: string;
  /** Top-level keys seeded from the import (e.g. ['anagrafica','anamnesi','diagnosi','allergie']). */
  importedFields?: string[];
  /** The _narrative object from the draft data (has sourceReferences). */
  narrative?: Record<string, unknown>;
}

/** Inline compare panel for a single import section. */
function SourceComparePanel({ refs }: { refs: SourceReference[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="step-clinica__source-panel" role="complementary" aria-label="Fonte documento">
      {refs.map((r, i) => (
        <p key={i} className="step-clinica__source-ref">
          {r.fileName
            ? `Fonte: ${r.fileName}${r.pageFrom != null ? ` — pagina ${r.pageFrom}` : ''}${r.pageTo != null && r.pageTo !== r.pageFrom ? `–${r.pageTo}` : ''}`
            : 'Fonte: documento importato'}
        </p>
      ))}
    </div>
  );
}

export function StepClinica({ data, onUpdateSection, operatoreNome, importedFields = [], narrative }: StepClinicaProps) {
  const sections = intakeSections();
  const [showSource, setShowSource] = useState<Record<string, boolean>>({});

  const narrativeData = narrative as NarrativeData | undefined;
  const sourceRefs: SourceReference[] = narrativeData?.sourceReferences ?? [];

  function refsForSection(sectionKey: string): SourceReference[] {
    const italianKey = SECTION_KEY_TO_ITALIAN[sectionKey];
    if (!italianKey) return [];
    return sourceRefs.filter((r) => r.sectionKey === italianKey);
  }

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

        const isImported = importedFields.includes(sectionKey);
        const refs = refsForSection(sectionKey);
        const hasSource = refs.length > 0;

        return (
          <div key={sectionKey} className="step-clinica__section">
            {isImported && (
              <div className="step-clinica__provenance">
                <span className="step-clinica__badge">Importato dal documento</span>
                {hasSource && (
                  <button
                    type="button"
                    className="step-clinica__compare-btn"
                    onClick={() => setShowSource((p) => ({ ...p, [sectionKey]: !p[sectionKey] }))}
                  >
                    {showSource[sectionKey] ? 'Nascondi fonte' : 'Confronta con la fonte'}
                  </button>
                )}
              </div>
            )}
            {isImported && showSource[sectionKey] && hasSource && (
              <SourceComparePanel refs={refs} />
            )}
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
