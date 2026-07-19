import { useEffect, useState, useCallback } from 'react';
import { API_URL } from '../../../config';
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
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [compare, setCompare] = useState<{
    fileName?: string;
    page?: number;
    sourceText: string;
    title: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/patients/${patientId}/narrative-sections`);
      const data = await r.json();
      if (!r.ok) throw new Error();
      setSections(Array.isArray(data.sections) ? data.sections : []);
    } catch {
      setError('Impossibile caricare le sezioni cliniche.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(sectionKey: string, reviewedText: string) {
    setSavingKey(sectionKey);
    try {
      const r = await fetch(`${API_URL}/patients/${patientId}/narrative-sections/${sectionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedText }),
      });
      if (r.ok) {
        const dto = await r.json();
        setSections((prev) =>
          prev.map((s) => (s.sectionKey === sectionKey ? { ...s, ...dto } : s)),
        );
      }
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <p className="cr-empty">Caricamento sezioni cliniche…</p>;
  if (error) return <p className="cr-empty">{error}</p>;

  return (
    <div className="narrative-sections" data-testid="patient-narrative-sections">
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
