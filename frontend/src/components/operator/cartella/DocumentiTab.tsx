import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartellaPaziente, DocumentoConsegnato, Paziente } from '../../../types';
import {
  ARCHIVE_CATEGORIES,
  buildDocumentArchive,
  DOCUMENT_TYPE_LABELS,
  filterDocumentArchive,
  archiveFolderLabel,
  type ArchiveFolder,
  type ArchiveStatus,
  type ArchiveEntry,
} from '../../../lib/patientDocumentArchive';
import { useDocumentArchive } from '../../../lib/useDocumentArchive';
import { ClinicalTableSection, fmtDate } from './shared';
import { archivePrintUnavailable, selectedArchiveDocuments } from '../../../lib/archivePrint';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { ArchivePrintDialog } from './ArchivePrintDialog';
import { ArchiveDocumentForm, DOCUMENT_STATUS_LABELS } from './ArchiveDocumentForm';
import { PatientArchivePreview } from './PatientArchivePreview';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { PatientArchiveTree } from './PatientArchiveTree';
import './PatientDocumentArchive.css';
import './PatientArchiveTree.css';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void | Promise<boolean>;
  operatoreNome: string;
  operatoreId?: string;
  operatoreRole?: string;
  focusDocumentId?: string;
  expectedAssessmentId?: string;
  onOpenAssessment?: (assessmentId: string) => void;
}

export function DocumentiTab(props: Props) {
  return (
    <DocumentArchiveWorkspace
      key={`${props.paziente.id}|${props.operatoreId}|${props.operatoreRole}`}
      {...props}
    />
  );
}

function DocumentArchiveWorkspace({
  cartella,
  paziente,
  onUpdate,
  operatoreNome,
  operatoreId,
  operatoreRole,
  focusDocumentId,
  expectedAssessmentId,
  onOpenAssessment,
}: Props) {
  const archive = useDocumentArchive(paziente.id, operatoreId, operatoreRole);
  const records = cartella.documentiConsegnati ?? [];
  const entries = useMemo(
    () => buildDocumentArchive(records, archive.documents),
    [records, archive.documents],
  );
  const [folder, setFolder] = useState<ArchiveFolder>({ category: 'tutti' });
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState<ArchiveStatus>('tutti');
  const [visible, setVisible] = useState(25);
  const [form, setForm] = useState<{ key: string; entry: ArchiveEntry | null } | null>(null);
  const [preview, setPreview] = useState<ArchiveEntry | null>(null);
  const [removing, setRemoving] = useState<ArchiveEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [printDocuments, setPrintDocuments] = useState<PatientDocumentMeta[] | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const filtered = filterDocumentArchive(entries, folder.category, query, archived, folder.type);
  const folderEntries = filterDocumentArchive(entries, 'tutti', query, archived);
  const selectFolder = (next: ArchiveFolder) => {
    setFolder(next);
    setVisible(25);
  };
  const selectedCategory = ARCHIVE_CATEGORIES.find((item) => item.id === folder.category);
  const complete = archive.status === 'ready';
  const focusedDocument = useRef('');
  useEffect(() => {
    const focusKey = `${focusDocumentId}:${expectedAssessmentId}`;
    if (!complete || !focusDocumentId || focusedDocument.current === focusKey) return;
    const timer = window.setTimeout(() => {
      focusedDocument.current = focusKey;
      const entry = entries.find(item => item.document?.id === focusDocumentId);
      if (!entry || (expectedAssessmentId && entry.document?.assessment?.id !== expectedAssessmentId)) setError('Documento della valutazione non disponibile nell’archivio corrente.');
      else setPreview(entry);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [complete, entries, focusDocumentId, expectedAssessmentId]);
  const selectedDocuments = selectedArchiveDocuments(entries, selected);
  const visibleDocuments = selectedArchiveDocuments(
    filtered.slice(0, visible),
    new Set(entries.flatMap((entry) => entry.document ? [entry.document.id] : [])),
  );
  const visibleSelected = visibleDocuments.filter((document) => selected.has(document.id)).length;
  const allVisibleSelected = visibleDocuments.length > 0 && visibleSelected === visibleDocuments.length;
  const hiddenSelected = selectedDocuments.length - visibleSelected;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = visibleSelected > 0 && !allVisibleSelected;
  }, [visibleSelected, allVisibleSelected]);
  useEffect(() => {
    if (complete) setSelected((current) => {
      const existing = new Set(entries.flatMap((entry) => entry.document ? [entry.document.id] : []));
      const next = new Set([...current].filter((id) => existing.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [entries, complete]);
  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const openForm = (entry: ArchiveEntry | null) => {
    setError('');
    setForm({ key: crypto.randomUUID(), entry });
  };
  async function update(recordsToSave: DocumentoConsegnato[]) {
    if (busy.current || form) return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      const ok = await onUpdate({ documentiConsegnati: recordsToSave });
      if (ok === false) throw new Error('Salvataggio non riuscito. Riprova.');
      if (alive.current) setRemoving(null);
    } catch {
      if (alive.current) setError('Salvataggio non riuscito. Riprova.');
    } finally {
      busy.current = false;
      if (alive.current) setSaving(false);
    }
  }
  return (
    <div className="cr-tab-content patient-document-archive">
      <div className="print-only print-form-header">
        <div className="print-form-header__title">ARCHIVIO DOCUMENTI</div>
        <div>
          {paziente.lastName} {paziente.firstName}
        </div>
      </div>
      <ClinicalTableSection
        title="Documenti paziente"
        count={complete ? entries.length : undefined}
        countLabel="documenti"
        actions={
          <>
            <button
              type="button"
              className="btn-secondary btn-sm no-print"
              disabled={!complete || !selectedDocuments.length || !!form || saving || !!printDocuments}
              onClick={() => setPrintDocuments(selectedDocuments)}
            >
              Stampa selezionati ({selectedDocuments.length})
            </button>
            <button
              type="button"
              className="btn-sm"
              disabled={!complete || !!form || saving || folder.category === 'valutazioni'}
              onClick={() => openForm(null)}
            >
              + Aggiungi
            </button>
          </>
        }
      >
        <div className="cts__body--padded">
          {form && (
            <ArchiveDocumentForm
              key={form.key}
              initial={form.entry}
              defaultType={folder.type ?? selectedCategory?.types[0]}
              records={records}
              patientId={paziente.id}
              operatorId={operatoreId}
              operatorRole={operatoreRole}
              operatorName={operatoreNome}
              onPersist={(next) => onUpdate({ documentiConsegnati: next })}
              onStored={archive.remember}
              onClose={() => setForm(null)}
            />
          )}
          <div className="patient-document-archive__filters no-print">
            <label>
              Cerca nell’archivio
              <input
                className="form-input"
                type="search"
                maxLength={120}
                placeholder="Descrizione, nome file, provenienza…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisible(25);
                }}
              />
            </label>
            <label>
              Mostra
              <select
                className="form-input"
                value={archived === 'tutti' ? 'tutti' : archived ? 'archiviati' : 'correnti'}
                onChange={(event) => {
                  setArchived(
                    event.target.value === 'tutti' ? 'tutti' : event.target.value === 'archiviati',
                  );
                  setVisible(25);
                }}
              >
                <option value="tutti">Tutti i documenti</option>
                <option value="correnti">Documenti correnti</option>
                <option value="archiviati">Documenti nello storico</option>
              </select>
            </label>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={archive.status === 'loading' || !!form || saving}
              onClick={archive.reload}
            >
              Aggiorna archivio
            </button>
          </div>
          <p className="patient-document-archive__intro">
            Qui trovi tutti i file e le foto salvati per il paziente, anche da esami, medicazioni e
            importazioni.
          </p>
          <div className="patient-document-archive__selection no-print">
            <label>
              <input ref={selectAllRef} type="checkbox" checked={allVisibleSelected}
                disabled={!complete || !visibleDocuments.length}
                onChange={() => setSelected((current) => {
                  const next = new Set(current);
                  for (const document of visibleDocuments)
                    if (allVisibleSelected) next.delete(document.id); else next.add(document.id);
                  return next;
                })} />
              Seleziona documenti visibili
            </label>
            <span role="status">{selectedDocuments.length} selezionati{hiddenSelected > 0 ? ` · ${hiddenSelected} non visibili in questo elenco` : ''}</span>
            {selected.size > 0 && <button type="button" className="btn-secondary btn-sm" onClick={() => setSelected(new Set())}>Deseleziona tutti</button>}
          </div>
          <div className="patient-document-archive__workspace">
            <PatientArchiveTree
              entries={folderEntries}
              selected={folder}
              complete={complete}
              onSelect={selectFolder}
            />
            <section
              className="patient-document-archive__results"
              aria-label="Contenuto della cartella"
            >
              <nav className="patient-document-archive__path" aria-label="Percorso documenti">
                <button type="button" onClick={() => selectFolder({ category: 'tutti' })}>
                  Documenti
                </button>
                {selectedCategory && (
                  <>
                    <span aria-hidden="true">/</span>
                    <button
                      type="button"
                      onClick={() => selectFolder({ category: selectedCategory.id })}
                    >
                      {selectedCategory.label}
                    </button>
                  </>
                )}
                {folder.type && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span aria-current="location">{DOCUMENT_TYPE_LABELS[folder.type]}</span>
                  </>
                )}
              </nav>
              <h3 className="patient-document-archive__folder-title">
                {archiveFolderLabel(folder)}
              </h3>
              {archive.status === 'loading' && (
                <p role="status">Caricamento dell’archivio completo…</p>
              )}
              {archive.status === 'error' && (
                <div className="patient-archive__error" role="alert">
                  <p>
                    Impossibile caricare tutti i file. Le schede visibili sono un elenco parziale.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={!!form || saving}
                    onClick={archive.reload}
                  >
                    Riprova archivio
                  </button>
                </div>
              )}
              {error && (
                <p role="alert" className="patient-archive__error">
                  {error}
                </p>
              )}
              {complete && (
                <p className="patient-document-archive__summary" role="status">
                  {filtered.length}{' '}
                  {filtered.length === 1 ? 'documento trovato' : 'documenti trovati'}
                </p>
              )}
              {complete && filtered.length === 0 && (
                <p className="cr-empty">
                  {query || folder.category !== 'tutti'
                    ? 'Nessun documento corrisponde alla ricerca.'
                    : 'Nessun documento in questa cartella.'}
                </p>
              )}
              {archive.status !== 'loading' && (
                <ul className="patient-document-archive__list">
                  {filtered.slice(0, visible).map((entry) => (
                    <li key={entry.id} className="patient-document-archive__item">
                      <div className="patient-document-archive__file-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        >
                          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                          <path d="M14 3v6h6M8 13h8M8 17h6" />
                        </svg>
                      </div>
                      <div className="patient-document-archive__details">
                        <label className="patient-document-archive__print-option no-print">
                          <input type="checkbox"
                            checked={!!entry.document && selected.has(entry.document.id)}
                            disabled={!complete || !!archivePrintUnavailable(entry)}
                            onChange={() => entry.document && toggleSelected(entry.document.id)}
                            aria-label={`Seleziona per la stampa: ${entry.title}`} />
                          {archivePrintUnavailable(entry) || 'Seleziona per la stampa'}
                        </label>
                        <button
                          type="button"
                          className="patient-document-archive__title"
                          onClick={() => setPreview(entry)}
                        >
                          {entry.title}
                        </button>
                        <div className="patient-document-archive__meta">
                          <span className="badge badge--blue">
                            {DOCUMENT_TYPE_LABELS[entry.type]}
                          </span>
                          {entry.archived && <span className="badge">Storico</span>}
                          <span>{fmtDate(entry.date)}</span>
                          <span>
                            {DOCUMENT_STATUS_LABELS[entry.record?.stato ?? 'ricevuto'] ??
                              'Da verificare'}
                          </span>
                        </div>
                        {entry.document ? (
                          <p>
                            {entry.document.originalName} ·{' '}
                            {(entry.document.sizeBytes / 1024 / 1024).toFixed(1)} MB
                          </p>
                        ) : (
                          <p>
                            {entry.unavailable
                              ? 'Allegato non disponibile'
                              : 'Nessun file allegato'}
                          </p>
                        )}
                        {entry.document?.assessment && <p>Valutata {formatFacilityLocalMinute(entry.document.assessment.assessedAt)} · Registrata {formatFacilityLocalMinute(entry.document.createdAt)}</p>}
                        {entry.record?.provenienza && (
                          <p>Provenienza: {entry.record.provenienza}</p>
                        )}
                        {entry.record?.scadenza && (
                          <p>Scadenza: {fmtDate(entry.record.scadenza)}</p>
                        )}
                        {entry.record?.firmatoDA && entry.record.firmatoDA !== 'non_firmato' && (
                          <p>Firmato da: {entry.record.firmatoDA}</p>
                        )}
                        {entry.record?.operatore && <p>Registrato da: {entry.record.operatore}</p>}
                        {entry.record?.note && (
                          <p className="patient-document-archive__notes">{entry.record.note}</p>
                        )}
                      </div>
                      <div className="patient-document-archive__actions no-print">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setPreview(entry)}
                        >
                          {entry.document ? 'Visualizza' : 'Dettagli'}
                        </button>
                        {entry.document?.assessment ? <button type="button" className="btn-secondary btn-sm" disabled={!onOpenAssessment} onClick={() => onOpenAssessment?.(entry.document!.assessment!.id)}>Apri valutazione</button> : <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={!complete || !!form || saving}
                          onClick={() => openForm(entry)}
                        >
                          Modifica dettagli
                        </button>}
                        {entry.record && !entry.document?.assessment && (
                          <button
                            type="button"
                            className="patient-document-archive__remove"
                            disabled={!complete || !!form || saving}
                            onClick={() => setRemoving(entry)}
                          >
                            Rimuovi scheda
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {filtered.length > visible && (
                <button
                  type="button"
                  className="btn-secondary btn-sm no-print"
                  onClick={() => setVisible((value) => value + 25)}
                >
                  Mostra altri documenti ({visible} di {filtered.length})
                </button>
              )}
            </section>
          </div>
        </div>
      </ClinicalTableSection>
      {preview && (
        <PatientArchivePreview
          key={preview.id}
          patientId={paziente.id}
          operatorId={operatoreId}
          operatorRole={operatoreRole}
          document={preview.document}
          title={preview.title}
          unavailable={preview.unavailable}
          onClose={() => setPreview(null)}
        />
      )}
      {printDocuments && <ArchivePrintDialog
        documents={printDocuments} patientId={paziente.id}
        operatorId={operatoreId} operatorRole={operatoreRole}
        onClose={() => setPrintDocuments(null)}
      />}
      {removing && (
        <ConfirmDialog
          open
          title="Rimuovi scheda documento"
          message={
            removing.document
              ? 'Rimuovere i dettagli della scheda? Il file originale rimane nell’archivio.'
              : 'Rimuovere questa registrazione?'
          }
          confirmLabel="Rimuovi scheda"
          onConfirm={() =>
            void update(records.filter((record) => record.id !== removing.record?.id))
          }
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
