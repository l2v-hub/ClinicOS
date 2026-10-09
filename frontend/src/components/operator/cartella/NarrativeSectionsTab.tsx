import { useEffect, useRef, useState, type ReactNode } from 'react';
import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import {
  pendingSessionCache,
  readSessionCache,
  writeSessionCache,
} from '../../../lib/sessionCache';
import { narrativeCacheKey } from '../../../lib/patientTabSnapshots';
import {
  NarrativeClinicalSection,
} from '../../shared/sections/NarrativeClinicalSection';
import { DocumentSourcePanel } from '../../shared/DocumentSourcePanel';
import { NarrativeSourceDetail, type NarrativeSectionDTO as SectionDTO } from './NarrativeSourceDetail';
import { STRUCTURED_CLINICAL_TOPICS, partitionNarrativeSections, type StructuredClinicalTopic } from '../../../lib/clinicalNarrativePresentation';

// Scheda Paziente — narrative clinical sections (REQ-030). Always shows the canonical
// sections as faithful text blocks (REQ-029 API); editable, originalText never overwritten.

interface NarrativeSectionsTabProps {
  patientId: string;
  operatoreId?: string;
  operatoreRole?: string;
  renderCurrentTopic?: (topic: StructuredClinicalTopic, sourceDetail: ReactNode) => ReactNode;
  refreshVersion?: number;
}

export function NarrativeSectionsTab({
  patientId,
  operatoreId,
  operatoreRole,
  renderCurrentTopic,
  refreshVersion,
}: NarrativeSectionsTabProps) {
  // Sezioni gia' mostrate in sessione per questo paziente: compaiono subito e si rivalidano.
  const cachedSections = readSessionCache<SectionDTO[]>(narrativeCacheKey(patientId));
  const [sections, setSections] = useState<SectionDTO[]>(() => cachedSections ?? []);
  const [loading, setLoading] = useState(!cachedSections);
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
      setLoading(readSessionCache(narrativeCacheKey(patientId)) === undefined);
      setError(null);
      setSaveError(null);
      // Lettura anticipata gia' in volo (apertura scheda): si aspetta quella, niente doppia richiesta.
      const pendingRead = pendingSessionCache(narrativeCacheKey(patientId));
      if (pendingRead) {
        await pendingRead;
        const cached = readSessionCache<SectionDTO[]>(narrativeCacheKey(patientId));
        if (cached && !controller.signal.aborted && sequence === loadSequence.current) {
          setSections(cached);
          setLoading(false);
          return;
        }
      }
      try {
        const r = await fetch(`${API_URL}/patients/${patientId}/narrative-sections`, {
          headers: operatorHeaders(),
          signal: controller.signal,
        });
        const data = await r.json();
        if (!r.ok) throw new Error();
        if (sequence === loadSequence.current) {
          const next: SectionDTO[] = Array.isArray(data.sections) ? data.sections : [];
          setSections(next);
          writeSessionCache(narrativeCacheKey(patientId), next);
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
  }, [patientId, reloadVersion, refreshVersion]);

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

  function renderSource(s: SectionDTO, defaultOpen = true) {
    const ref = (s.sourceReferences ?? []).find(source => source.fileName);
    return (
      <NarrativeClinicalSection
        key={s.sectionKey}
        sectionKey={s.sectionKey}
        title={`${s.reviewedText.trim() ? 'Testo rivisto' : ref ? 'Testo importato' : 'Testo sorgente'} — ${s.title}`}
        originalText={s.originalText}
        reviewedText={s.reviewedText}
        annotations={s.annotations}
        sources={s.sourceReferences}
        critical={s.reviewStatus === 'conflict'}
        editable
        defaultOpen={defaultOpen}
        reviewStatus={s.reviewStatus}
        busy={savingKey === s.sectionKey}
        onSave={(text) => save(s.sectionKey, text)}
        onCompareSource={ref || (s.originalText || s.displayText || '').trim()
          ? () => setCompare({ fileName: ref?.fileName, page: ref?.pageFrom,
              sourceText: s.originalText || s.displayText,
              title: `Fonte originale — ${s.title}` }) : undefined}
      />
    );
  }
  const { standalone, empty } = partitionNarrativeSections(sections);

  return (
    <div className="narrative-sections" data-testid="patient-narrative-sections">
      {loading && <p className="cr-empty" role="status">Caricamento testo sorgente… I dati correnti restano consultabili.</p>}
      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__text">{error} I dati correnti restano consultabili.</span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setReloadVersion(v => v + 1)}>Riprova</button>
        </div>
      )}
      {saveError && (
        <div className="alert alert--error" role="alert">
          <span className="alert__text">{saveError}</span>
        </div>
      )}
      {renderCurrentTopic && STRUCTURED_CLINICAL_TOPICS.map(topic => {
        const section = sections.find(s => s.sectionKey === topic);
        const sourceDetail = loading || error || !section
          ? <p className="srev-source">Testo sorgente non disponibile per questo argomento; non conferma l’assenza clinica.</p>
          : <NarrativeSourceDetail section={section}>{renderSource(section)}</NarrativeSourceDetail>;
        return <div key={topic} data-clinical-topic={topic}>{renderCurrentTopic(topic, sourceDetail)}</div>;
      })}
      {!loading && !error && (
        <>
          {(renderCurrentTopic ? standalone : sections.filter(s => !empty.includes(s))).map(s => renderSource(s))}
          {empty.length > 0 && (
            <details className="clinical-source-detail" data-testid="document-absences">
              <summary>{empty.length} argomenti senza testo sorgente: {empty.map(s => s.title).join(', ')}</summary>
              <p className="srev-source">Non presente nel documento non significa assente nel paziente. I dati correnti vanno consultati separatamente.</p>
              {empty.map(s => renderSource(s, false))}
            </details>
          )}
        </>
      )}
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
