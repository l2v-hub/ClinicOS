import { useMemo, useState } from 'react';
import { SemanticTaggedText } from './SemanticTaggedText';
import { SECTION_MAP, REVIEW_ORDER, TARGET_AREA_LABEL, allergyStatusLabel } from './sectionMapping';
import type { ConfirmPatient } from '../ImportReviewFull';
import type {
  SectionsResult,
  SectionData,
  SectionKey,
  ReviewStatus,
  ReviewedSection,
  MedicationLine,
} from './types';

// REQ-027 review surface: maps the canonical clinical sections into the ClinicOS areas,
// renders the faithful text with semantic bold tags, keeps provenance, lets the operator
// accept / modify / exclude each section, and never overwrites the original rawText
// (manual edits are kept separately as reviewedText). Nothing is saved until "Crea paziente".

interface Props {
  sections: SectionsResult;
  documents: { id: string; filename: string }[];
  busy?: boolean;
  onConfirm: (
    patient: ConfirmPatient,
    cartella: Record<string, unknown>,
    opts: { confirmAllergyConflict: boolean },
  ) => void;
  onBack: () => void;
  /** REQ-032: open the source document/page for a section in the preview panel. */
  onOpenSource?: (fileName: string, page?: number) => void;
}

const ANAG_PREFILL: Array<[keyof ConfirmPatient, string]> = [
  ['firstName', 'Nome'],
  ['lastName', 'Cognome'],
  ['dateOfBirth', 'Data di nascita'],
  ['sex', 'Sesso'],
  ['codiceFiscale', 'Codice fiscale'],
  ['address', 'Indirizzo'],
  ['phone', 'Telefono'],
  ['email', 'Email'],
];

function toIso(v: string): string {
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec((v || '').trim());
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v;
}

export function ImportSectionsReview({
  sections,
  documents,
  busy,
  onConfirm,
  onBack,
  onOpenSource,
}: Props) {
  const docName = useMemo(() => {
    const map = new Map(documents.map((d) => [d.id, d.filename]));
    return (fileId?: string) =>
      (fileId && map.get(fileId)) || documents[0]?.filename || 'documento';
  }, [documents]);

  const byKey = useMemo(() => {
    const m = new Map<SectionKey, SectionData>();
    for (const s of sections.sections ?? []) m.set(s.sectionKey, s);
    return m;
  }, [sections]);

  const demo = (sections.demographics ?? {}) as Record<string, string>;
  const [patient, setPatient] = useState<ConfirmPatient>({
    firstName: demo.firstName ?? '',
    lastName: demo.lastName ?? '',
    dateOfBirth: toIso(demo.dateOfBirth ?? ''),
    sex: demo.sex ?? '',
    email: demo.email ?? '',
    phone: demo.phone ?? '',
    address: demo.address ?? '',
    codiceFiscale: demo.codiceFiscale ?? '',
  });

  // Per-section review state. Default accepted; the operator can modify/exclude.
  const [status, setStatus] = useState<Record<string, ReviewStatus>>({});
  const [reviewed, setReviewed] = useState<Record<string, string>>({});
  const [showSource, setShowSource] = useState<Record<string, boolean>>({});
  const [allergyAck, setAllergyAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allergy = sections.allergies ?? { status: 'not_documented' };
  const allergyNeedsAck = allergy.status === 'conflicting' || allergy.status === 'unclear';
  const allergySection = byKey.get('ALLERGIES');

  function sourcesFor(s: SectionData): { fileName: string; pageNumber?: number }[] {
    const ranges = s.sourceRanges ?? [];
    if (ranges.length === 0) return [{ fileName: docName(undefined) }];
    return ranges.map((r) => ({ fileName: docName(r.fileId), pageNumber: r.pageNumber }));
  }
  function sourceLabel(srcs: { fileName: string; pageNumber?: number }[]): string {
    return srcs
      .map((s) => `Fonte: ${s.fileName}${s.pageNumber != null ? ` — pagina ${s.pageNumber}` : ''}`)
      .join(' · ');
  }

  function setSt(key: string, st: ReviewStatus) {
    setStatus((p) => ({ ...p, [key]: st }));
    if (st === 'modified' && reviewed[key] == null) {
      const sec = byKey.get(key as SectionKey);
      if (sec) setReviewed((p) => ({ ...p, [key]: sec.reviewedText ?? sec.rawText }));
    }
  }

  function handleSubmit() {
    setError(null);
    if (!patient.firstName.trim() || !patient.lastName.trim() || !patient.dateOfBirth.trim()) {
      setError('Nome, cognome e data di nascita sono obbligatori.');
      return;
    }
    if (allergyNeedsAck && !allergyAck) {
      setError(
        'Le informazioni sulle allergie richiedono conferma esplicita prima del salvataggio.',
      );
      return;
    }
    const documentSections: ReviewedSection[] = (sections.sections ?? []).map((s) => {
      const st = status[s.sectionKey] ?? 'accepted';
      const map = SECTION_MAP[s.sectionKey];
      return {
        sectionKey: s.sectionKey,
        targetArea: map.targetArea,
        title: map.title,
        rawText: s.rawText, // original, never overwritten
        reviewedText: st === 'modified' ? (reviewed[s.sectionKey] ?? null) : null,
        annotations: s.annotations ?? [],
        sources: sourcesFor(s),
        reviewStatus: st,
      };
    });
    const cartella: Record<string, unknown> = {
      _importSections: true,
      documentSections,
      // NOTE: do NOT write `allergie` here — that key is a structured Allergy[] in the patient
      // record and an object would crash `.filter`. Narrative allergy lives in documentSections.
      _allergyNarrative: {
        status: allergy.status,
        rawText: allergy.rawText ?? allergySection?.rawText ?? '',
        acknowledged: allergyAck || !allergyNeedsAck,
      },
    };
    onConfirm({ ...patient, dateOfBirth: toIso(patient.dateOfBirth) }, cartella, {
      confirmAllergyConflict: allergyAck,
    });
  }

  const clinicalKeys = REVIEW_ORDER.filter(
    (k) => k !== 'PATIENT_DEMOGRAPHICS' && k !== 'ALLERGIES',
  );

  return (
    <div className="sections-review" data-testid="sections-review">
      {/* ── Anagrafica ── */}
      <section className="srev-card" data-testid="srev-PATIENT_DEMOGRAPHICS">
        <header className="srev-card__head">
          <h3>Anagrafica</h3>
          <span className="srev-area">{TARGET_AREA_LABEL.ANAGRAFICA}</span>
        </header>
        <div className="srev-anag-grid">
          {ANAG_PREFILL.map(([field, lbl]) => (
            <label key={field} className="srev-field">
              <span>{lbl}</span>
              <input
                type={field === 'dateOfBirth' ? 'date' : 'text'}
                value={(patient[field] as string) ?? ''}
                disabled={busy}
                onChange={(e) => setPatient((p) => ({ ...p, [field]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </section>

      {/* ── Allergie (sempre visibile, prioritaria) ── */}
      <section
        className={`srev-card srev-allergy srev-allergy--${allergy.status}`}
        data-testid="srev-ALLERGIES"
      >
        <header className="srev-card__head">
          <h3>⚠ Allergie</h3>
          <span className="srev-area">{allergyStatusLabel(allergy.status)}</span>
        </header>
        {(allergy.rawText || allergySection?.rawText) && (
          <SemanticTaggedText
            rawText={allergy.rawText || allergySection?.rawText || ''}
            annotations={allergySection?.annotations}
            sourceTitle={
              allergy.sourceFileId
                ? `Fonte: ${docName(allergy.sourceFileId)}${allergy.sourcePage != null ? ` — pagina ${allergy.sourcePage}` : ''}`
                : undefined
            }
          />
        )}
        {(allergy.sourceFileId || allergySection) && (
          <p className="srev-source">
            {allergy.sourceFileId
              ? `Fonte: ${docName(allergy.sourceFileId)}${allergy.sourcePage != null ? ` — pagina ${allergy.sourcePage}` : ''}`
              : sourceLabel(sourcesFor(allergySection!))}
            {onOpenSource && (
              <button
                type="button"
                className="srev-chip srev-chip--inline"
                onClick={() =>
                  onOpenSource(
                    allergy.sourceFileId
                      ? docName(allergy.sourceFileId)
                      : sourcesFor(allergySection!)[0]?.fileName,
                    allergy.sourcePage ?? sourcesFor(allergySection!)[0]?.pageNumber,
                  )
                }
              >
                Vai alla fonte
              </button>
            )}
          </p>
        )}
        {allergyNeedsAck && (
          <label className="srev-ack">
            <input
              type="checkbox"
              checked={allergyAck}
              disabled={busy}
              onChange={(e) => setAllergyAck(e.target.checked)}
            />
            <span>
              Confermo di aver verificato le informazioni sulle allergie (
              {allergyStatusLabel(allergy.status)}). Il salvataggio non assume "nessuna allergia".
            </span>
          </label>
        )}
      </section>

      {/* ── Sezioni cliniche ── */}
      {clinicalKeys.map((key) => {
        const s = byKey.get(key);
        if (!s) return null;
        const map = SECTION_MAP[key];
        const st = status[key] ?? 'accepted';
        const srcs = sourcesFor(s);
        const isHomeTherapy = key === 'DISCHARGE_HOME_THERAPY';
        return (
          <section
            key={key}
            className={`srev-card srev-section${map.priority ? ' srev-section--priority' : ''}${st === 'excluded' ? ' is-excluded' : ''}`}
            data-testid={`srev-${key}`}
          >
            <header className="srev-card__head">
              <h3>{map.title}</h3>
              <span className="srev-area">{TARGET_AREA_LABEL[map.targetArea]}</span>
              <span className="srev-actions">
                <button
                  type="button"
                  className={`srev-chip${st === 'accepted' ? ' is-on' : ''}`}
                  disabled={busy}
                  onClick={() => setSt(key, 'accepted')}
                >
                  Accetta
                </button>
                <button
                  type="button"
                  className={`srev-chip${st === 'modified' ? ' is-on' : ''}`}
                  disabled={busy}
                  onClick={() => setSt(key, 'modified')}
                >
                  Modifica
                </button>
                <button
                  type="button"
                  className={`srev-chip${st === 'excluded' ? ' is-on' : ''}`}
                  disabled={busy}
                  onClick={() => setSt(key, 'excluded')}
                >
                  Escludi
                </button>
                <button
                  type="button"
                  className="srev-chip"
                  disabled={busy}
                  onClick={() => {
                    setShowSource((p) => ({ ...p, [key]: !p[key] }));
                    const f = srcs[0];
                    if (f && onOpenSource) onOpenSource(f.fileName, f.pageNumber);
                  }}
                >
                  {showSource[key] ? 'Nascondi fonte' : 'Confronta con la fonte'}
                </button>
              </span>
            </header>

            {st === 'modified' ? (
              <textarea
                className="srev-textarea"
                value={reviewed[key] ?? s.rawText}
                disabled={busy}
                onChange={(e) => setReviewed((p) => ({ ...p, [key]: e.target.value }))}
                rows={Math.min(14, Math.max(4, s.rawText.split('\n').length + 1))}
              />
            ) : st === 'excluded' ? (
              <p className="srev-excluded-note">
                Sezione esclusa dal salvataggio (il testo originale resta conservato).
              </p>
            ) : (
              <SemanticTaggedText
                rawText={s.rawText}
                annotations={s.annotations}
                sourceTitle={sourceLabel(srcs)}
              />
            )}

            {/* Terapia: medicinali strutturati + righe originali integrali */}
            {isHomeTherapy && (s.medications?.length ?? 0) > 0 && (
              <MedTable meds={s.medications!} />
            )}

            {(showSource[key] || st === 'modified') && (
              <div className="srev-source-panel">
                <p className="srev-source">{sourceLabel(srcs)}</p>
                {st === 'modified' && (
                  <details>
                    <summary>Testo originale (non sovrascritto)</summary>
                    <SemanticTaggedText rawText={s.rawText} annotations={s.annotations} />
                  </details>
                )}
              </div>
            )}
            {!showSource[key] && st !== 'modified' && st !== 'excluded' && (
              <p className="srev-source">{sourceLabel(srcs)}</p>
            )}
          </section>
        );
      })}

      {error && <p className="import-modal__error">{error}</p>}

      <footer className="srev-foot">
        <button className="btn-ghost" disabled={busy} onClick={onBack}>
          Indietro
        </button>
        <button className="btn-success" disabled={busy} onClick={handleSubmit}>
          Crea paziente
        </button>
      </footer>
    </div>
  );
}

function MedTable({ meds }: { meds: MedicationLine[] }) {
  return (
    <table className="srev-med-table">
      <thead>
        <tr>
          <th>Farmaco</th>
          <th>Dose</th>
          <th>Quando</th>
          <th>Frequenza</th>
          <th>Via</th>
          <th>Durata</th>
        </tr>
      </thead>
      <tbody>
        {meds.map((m, i) => {
          const incomplete = !m.medicationName || !m.dose || !m.frequency;
          return (
            <tr key={i} className={incomplete ? 'is-incomplete' : ''}>
              {incomplete ? (
                <td colSpan={6} className="srev-med-raw">
                  <span className="srev-med-flag">
                    Riga non completamente riconosciuta — testo originale:
                  </span>
                  <code>{m.exactText}</code>
                </td>
              ) : (
                <>
                  <td>{m.medicationName}</td>
                  <td>{m.dose}</td>
                  <td>{m.schedule || '—'}</td>
                  <td>{m.frequency}</td>
                  <td>{m.route || '—'}</td>
                  <td>{m.duration || '—'}</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
