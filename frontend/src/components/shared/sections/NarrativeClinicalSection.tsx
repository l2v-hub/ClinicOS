import { useState } from 'react';
import { SemanticTaggedText } from './SemanticTaggedText';
import type { SemanticAnnotation, SemanticTag } from './types';

// Shared narrative clinical section (REQ-030). One faithful text block with semantic bold
// tags (no HTML, no dangerouslySetInnerHTML, no table). Editable: edits go to reviewedText,
// originalText is never modified; the imported text can always be restored.

// API/boldTag shape (REQ-028/029): { sectionKey, tagType, text, startOffset, endOffset }.
export interface BoldTag {
  sectionKey?: string;
  tagType: string;
  text: string;
  startOffset: number;
  endOffset: number;
}
export interface SourceRef {
  sectionKey?: string;
  fileName?: string;
  pageFrom?: number;
  pageTo?: number;
}

export interface NarrativeClinicalSectionProps {
  sectionKey: string;
  title: string;
  originalText: string;
  reviewedText: string;
  annotations: BoldTag[];
  sources: SourceRef[];
  critical?: boolean;
  editable: boolean;
  reviewStatus?: string;
  onSave?: (reviewedText: string) => void | Promise<void>;
  /** REQ-035 v2: open the source document side panel for this section. */
  onCompareSource?: () => void;
  busy?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Da revisionare',
  reviewed: 'Revisionata',
  modified: 'Modificata manualmente',
  absent: 'Non presente nel documento',
  conflict: 'Conflitto da risolvere',
};

function toAnnotations(tags: BoldTag[]): SemanticAnnotation[] {
  return (tags ?? [])
    .filter((t) => t && typeof t.text === 'string')
    .map((t) => ({ tag: t.tagType as SemanticTag, text: t.text, startOffset: t.startOffset, endOffset: t.endOffset }));
}

function sourceLabel(sources: SourceRef[]): string {
  if (!sources?.length) return '';
  return sources
    .filter((s) => s.fileName)
    .map((s) => `Fonte: ${s.fileName}${s.pageFrom != null ? ` — pagina ${s.pageFrom}${s.pageTo != null && s.pageTo !== s.pageFrom ? `-${s.pageTo}` : ''}` : ''}`)
    .join(' · ');
}

export function NarrativeClinicalSection(props: NarrativeClinicalSectionProps) {
  const { sectionKey, title, originalText, reviewedText, annotations, sources, critical, editable, reviewStatus, onCompareSource } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showSource, setShowSource] = useState(false);

  const displayText = reviewedText.trim() ? reviewedText : originalText;
  const isEmpty = !displayText.trim();
  const isModified = !!reviewedText.trim() && reviewedText !== originalText;
  const src = sourceLabel(sources);

  function startEdit() { setDraft(displayText); setEditing(true); }
  function cancel() { setEditing(false); }
  async function save() { await props.onSave?.(draft); setEditing(false); }
  function restoreOriginal() { setDraft(originalText); }

  return (
    <section
      id={`narr-${sectionKey}`}
      className={`narrative-section${critical ? ' narrative-section--critical' : ''}`}
      data-testid={`narr-${sectionKey}`}
    >
      <header className="narrative-section__head">
        <h3>{title}</h3>
        {reviewStatus && <span className={`narrative-status narrative-status--${reviewStatus}`}>{STATUS_LABEL[reviewStatus] ?? reviewStatus}</span>}
        {isModified && !editing && <span className="narrative-modified">Modificata</span>}
        <span className="narrative-section__actions">
          {onCompareSource && !editing && (
            <button type="button" className="srev-chip" onClick={onCompareSource}>Confronta con il documento</button>
          )}
          {src && !editing && (
            <button type="button" className="srev-chip" onClick={() => setShowSource((s) => !s)}>
              {showSource ? 'Nascondi fonte' : 'Visualizza fonte'}
            </button>
          )}
          {editable && !editing && !isEmpty && (
            <button type="button" className="srev-chip" onClick={startEdit}>Modifica</button>
          )}
        </span>
      </header>

      {editing ? (
        <div className="narrative-edit">
          <textarea
            className="srev-textarea"
            value={draft}
            disabled={props.busy}
            rows={Math.min(16, Math.max(4, draft.split('\n').length + 1))}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="narrative-edit__actions">
            <button type="button" className="btn-primary btn-sm" disabled={props.busy} onClick={save}>Salva</button>
            <button type="button" className="btn-ghost btn-sm" disabled={props.busy} onClick={cancel}>Annulla</button>
            <button type="button" className="btn-secondary btn-sm" disabled={props.busy || !originalText.trim()} onClick={restoreOriginal}>Ripristina testo importato</button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="narrative-empty">
          <p>Nessuna informazione disponibile.</p>
          {editable && <button type="button" className="btn-secondary btn-sm" onClick={startEdit}>Aggiungi informazioni</button>}
        </div>
      ) : (
        <>
          <SemanticTaggedText rawText={displayText} annotations={toAnnotations(annotations)} sourceTitle={src || undefined} />
          {showSource && src && <p className="srev-source">{src}</p>}
        </>
      )}
    </section>
  );
}
