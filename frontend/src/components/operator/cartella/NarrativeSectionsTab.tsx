import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import {
  NarrativeClinicalSection,
  type BoldTag,
  type SourceRef,
} from '../../shared/sections/NarrativeClinicalSection';
import { DocumentSourcePanel } from '../../shared/DocumentSourcePanel';

// Scheda Paziente — narrative clinical sections (REQ-030). Always shows the canonical
// sections as faithful text blocks (REQ-029 API); editable, originalText never overwritten.

interface SectionDTO {
  sectionKey: string;
  title: string;
  originalText: string;
  reviewedText: string;
  displayText: string;
  annotations: BoldTag[];
  sourceReferences: SourceRef[];
  reviewStatus: string;
}

interface NarrativeSectionsTabProps {
  patientId: string;
  operatoreId?: string;
  operatoreRole?: string;
}

export function NarrativeSectionsTab({
  patientId,
  operatoreId,
  operatoreRole,
}: NarrativeSectionsTabProps) {
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const loadSequence = useRef(0);
  const saveSequence = useRef(0);
  const activePatientId = useRef(patientId);
  const [compare, setCompare] = useState<{
    fileName?: string;
    page?: number;
    sourceText: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    activePatientId.current = patientId;
  }, [patientId]);

  useEffect(() => {
    const controller = new AbortController();
    const sequence = ++loadSequence.current;
    void (async () => {
      setLoading(true);
      setError(null);
      setSaveError(null);
      try {
        const r = await fetch(`${API_URL}/patients/${patientId}/narrative-sections`, {
          headers: operatorHeaders(),
          signal: controller.signal,
        });
        const data = await r.json();
        if (!r.ok) throw new Error();
        if (sequence === loadSequence.current) {
          setSections(Array.isArray(data.sections) ? data.sections : []);
        }
      } catch (loadError) {
        if (
          !controller.signal.aborted &&
          sequence === loadSequence.current &&
          !(loadError instanceof DOMException && loadError.name === 'AbortError')
        ) {
          setError('Impossibile caricare le sezioni cliniche.');
        }
      } finally {
        if (sequence === loadSequence.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [patientId, reloadVersion]);

  async function save(sectionKey: string, reviewedText: string) {
    const requestedPatientId = patientId;
    const sequence = ++saveSequence.current;
    setSavingKey(sectionKey);
    setSaveError(null);
    try {
      const r = await fetch(
        `${API_URL}/patients/${requestedPatientId}/narrative-sections/${sectionKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
          body: JSON.stringify({ reviewedText }),
        },
      );
      if (!r.ok) throw new Error(`Salvataggio non riuscito (${r.status})`);
      const dto = await r.json();
      if (activePatientId.current === requestedPatientId) {
        setSections((prev) =>
          prev.map((s) => (s.sectionKey === sectionKey ? { ...s, ...dto } : s)),
        );
      }
    } catch (saveFailure) {
      if (activePatientId.current === requestedPatientId) {
        setSaveError(
          saveFailure instanceof Error
            ? `${saveFailure.message}. Riprova senza chiudere questa scheda.`
            : 'Salvataggio non riuscito. Riprova senza chiudere questa scheda.',
        );
      }
      throw saveFailure;
    } finally {
      if (sequence === saveSequence.current) setSavingKey(null);
    }
  }

  if (loading) return <p className="cr-empty">Caricamento sezioni cliniche…</p>;
  if (error)
    return (
      <div className="alert alert--error" role="alert">
        <span className="alert__text">{error}</span>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => setReloadVersion((v) => v + 1)}
        >
          Riprova
        </button>
      </div>
    );

  return (
    <div className="narrative-sections" data-testid="patient-narrative-sections">
      {saveError && (
        <div className="alert alert--error" role="alert">
          <span className="alert__text">{saveError}</span>
        </div>
      )}
      {sections.map((s) => {
        const ref = (s.sourceReferences ?? [])[0] as
          { fileName?: string; pageFrom?: number } | undefined;
        return (
          <NarrativeClinicalSection
            key={s.sectionKey}
            sectionKey={s.sectionKey}
            title={s.title}
            originalText={s.originalText}
            reviewedText={s.reviewedText}
            annotations={s.annotations}
            sources={s.sourceReferences}
            critical={s.sectionKey === 'ALLERGIES' && s.reviewStatus === 'conflict'}
            editable
            reviewStatus={s.reviewStatus}
            busy={savingKey === s.sectionKey}
            onSave={(text) => save(s.sectionKey, text)}
            onCompareSource={
              ref || (s.displayText || '').trim()
                ? () =>
                    setCompare({
                      fileName: ref?.fileName,
                      page: ref?.pageFrom,
                      sourceText: s.displayText || s.originalText,
                      title: `Fonte — ${s.title}`,
                    })
                : undefined
            }
          />
        );
      })}
      {compare && (
        <DocumentSourcePanel
          patientId={patientId}
          sourceTarget={{ fileName: compare.fileName, page: compare.page }}
          sourceText={compare.sourceText}
          title={compare.title}
          onClose={() => setCompare(null)}
          operatorId={operatoreId}
          operatorRole={operatoreRole}
        />
      )}
    </div>
  );
}
