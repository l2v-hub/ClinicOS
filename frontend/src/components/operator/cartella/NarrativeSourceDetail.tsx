import type { ReactNode } from 'react';
import type { SourceRef } from '../../shared/sections/NarrativeClinicalSection';
import { hasNarrativeContent } from '../../../lib/clinicalNarrativePresentation';
import './NarrativeSourceDetail.css';

export interface NarrativeSectionDTO {
  sectionKey: string;
  title: string;
  originalText: string;
  reviewedText: string;
  displayText: string;
  annotations: import('../../shared/sections/NarrativeClinicalSection').BoldTag[];
  sourceReferences: SourceRef[];
  reviewStatus: string;
}

const reviewLabels: Record<string, string> = {
  pending: 'Da revisionare', reviewed: 'Revisionata', modified: 'Modificata manualmente',
  absent: 'Non presente nel documento', conflict: 'Conflitto da risolvere',
};

/** Source stays separate from current structured data. No merging or inferred clinical truth. */
export function NarrativeSourceDetail({ section, children }: {
  section: NarrativeSectionDTO; children: ReactNode;
}) {
  const references = (section.sourceReferences ?? []).filter(ref => ref.fileName);
  const hasText = [section.originalText, section.reviewedText, section.displayText].some(hasNarrativeContent);
  const status = section.reviewStatus === 'absent' && hasText
    ? 'Testo disponibile · stato della fonte da verificare'
    : reviewLabels[section.reviewStatus] ?? 'Stato della revisione non disponibile';
  return (
    <details className="clinical-source-detail" data-source-topic={section.sectionKey}>
      <summary>
        <span>Testo sorgente e revisione — {section.title}</span>
        <span className={section.reviewStatus === 'conflict' ? 'narrative-status narrative-status--conflict' : 'srev-source'}>{status}</span>
        <span className="srev-source">
          {references.length ? references.map(ref => `Fonte: ${ref.fileName}${ref.pageFrom != null ? ` · pagina ${ref.pageFrom}${ref.pageTo != null && ref.pageTo !== ref.pageFrom ? `–${ref.pageTo}` : ''}` : ''}`).join(' · ') : 'Provenienza non registrata'}
        </span>
      </summary>
      <p className="srev-source">Testo sorgente e sua revisione: non aggiornano automaticamente i dati correnti. L’assenza nel documento non conferma l’assenza clinica.</p>
      {!!section.reviewedText.trim() && section.reviewedText !== section.originalText && (
        <div>
          <strong>{references.length ? 'Testo importato originale' : 'Testo originale registrato'}</strong>
          <p className="clinical-source-detail__original">{section.originalText || 'Nessun testo originale registrato.'}</p>
        </div>
      )}
      {children}
    </details>
  );
}
