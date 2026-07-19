// StepClinica — Step 3 of the intake wizard.
// Iterates the intake-eligible section registry and renders each editor in mode="intake".
// Controlled: no fetches here — parent IntakeWorkspace owns patchDraft via onUpdateSection.

import { useState, type ComponentType } from 'react';
import type { SectionProps } from '../../operator/sections/types';
import type { AllergiaItem, AllergyStatus } from '../../../types';
import { intakeSections } from '../../operator/sections/patientSections';
import { DischargeTherapyReview } from './DischargeTherapyReview';
import type { DischargeTherapyRow } from './dischargeTherapy';

// Maps lowercase intake section keys to the Italian uppercase keys used in sourceReferences.
const SECTION_KEY_TO_ITALIAN: Record<string, string> = {
  allergie: 'ALLERGIE',
  anamnesi: 'ANAMNESI',
  diagnosi: 'DIAGNOSI',
  terapia: 'TERAPIA',
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
        <p
          key={`${r.fileId ?? r.fileName ?? 'doc'}-${r.pageFrom ?? i}`}
          className="step-clinica__source-ref"
        >
          {r.fileName
            ? `Fonte: ${r.fileName}${r.pageFrom != null ? ` — pagina ${r.pageFrom}` : ''}${r.pageTo != null && r.pageTo !== r.pageFrom ? `–${r.pageTo}` : ''}`
            : 'Fonte: documento importato'}
        </p>
      ))}
    </div>
  );
}

export function StepClinica({
  data,
  onUpdateSection,
  operatoreNome,
  importedFields = [],
  narrative,
}: StepClinicaProps) {
  const sections = intakeSections();
  const [showSource, setShowSource] = useState<Record<string, boolean>>({});

  const narrativeData = narrative as NarrativeData | undefined;
  const sourceRefs: SourceReference[] = narrativeData?.sourceReferences ?? [];

  function refsForSection(sectionKey: string): SourceReference[] {
    const italianKey = SECTION_KEY_TO_ITALIAN[sectionKey];
    if (!italianKey) return [];
    return sourceRefs.filter((r) => r.sectionKey === italianKey);
  }

  const terapiaImport = Array.isArray(data.terapiaImport)
    ? (data.terapiaImport as DischargeTherapyRow[])
    : [];
  const manualTerapia = Array.isArray(data.terapia) ? (data.terapia as unknown[]) : [];
  // #235: therapy is "empty" when neither imported rows nor manual rows exist. The acceptance
  // label adapts to distinguish "nessuna terapia" from "non ancora revisionata".
  const therapyEmpty = terapiaImport.length === 0 && manualTerapia.length === 0;
  const accepted = (data._accepted ?? {}) as { demographics?: boolean; therapy?: boolean };
  const therapyAccepted = accepted.therapy === true;

  return (
    <>
      {terapiaImport.length > 0 && (
        <div className="step-clinica__section">
          <DischargeTherapyReview
            rows={terapiaImport}
            onChange={(v) => onUpdateSection('terapiaImport', v)}
          />
        </div>
      )}
      {/* #235: explicit therapy acceptance — required before the patient can be created. */}
      <div className="step-clinica__section">
        <label className="step-clinica__accept" data-testid="accept-therapy">
          <input
            type="checkbox"
            checked={therapyAccepted}
            onChange={(e) =>
              onUpdateSection('_accepted', { ...accepted, therapy: e.target.checked })
            }
          />
          <span>
            {therapyEmpty
              ? 'Confermo: nessuna terapia da inserire'
              : 'Confermo di aver revisionato la terapia proposta'}
          </span>
        </label>
      </div>
      {sections.map((def) => {
        const { sectionKey, title, component: Editor } = def;

        // Cast: the registry stores ComponentType<SectionProps<never>> for type-safety at
        // definition time; here we widen to SectionProps<unknown> for intake rendering.
        const EditorCast = Editor as unknown as ComponentType<
          SectionProps<unknown> & {
            allergie?: AllergiaItem[];
            status?: AllergyStatus;
            onStatusChange?: (s: AllergyStatus) => void;
          }
        >;

        // AnamnesisEditor requires an extra allergie prop (read-only card inside Anamnesi).
        // #265: AllergiesEditor needs status/onStatusChange wired to the draft, otherwise the
        // Presenti/Assenti/Paziente nega selection is rendered but never enters allergieStatus.
        const extraProps =
          sectionKey === 'anamnesi'
            ? { allergie: (data.allergie as AllergiaItem[]) ?? [] }
            : sectionKey === 'allergie'
              ? {
                  status: data.allergieStatus as AllergyStatus | undefined,
                  onStatusChange: (s: AllergyStatus) => onUpdateSection('allergieStatus', s),
                }
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
                    aria-expanded={!!showSource[sectionKey]}
                    onClick={() => setShowSource((p) => ({ ...p, [sectionKey]: !p[sectionKey] }))}
                  >
                    Confronta con la fonte
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
