import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartellaPaziente, DocumentoConsegnato, Paziente } from '../../../types';
import {
  ARCHIVE_CATEGORIES,
  buildDocumentArchive,
  filterDocumentArchive,
  archiveFolderLabel,
  type ArchiveFolder,
  type ArchiveStatus,
  type ArchiveEntry,
} from '../../../lib/patientDocumentArchive';
import { useDocumentArchive } from '../../../lib/useDocumentArchive';
import { ClinicalTableSection } from './shared';
import { selectedArchiveDocuments } from '../../../lib/archivePrint';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { ArchivePrintDialog } from './ArchivePrintDialog';
import { ArchiveDocumentForm } from './ArchiveDocumentForm';
import { ArchiveEmptyState, isEmptyArchive } from './ArchiveEmptyState';
import { ArchiveResultList } from './ArchiveResultList';
import { useCan } from '../../../lib/capabilities';
import { PatientArchivePreview } from './PatientArchivePreview';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { PatientArchiveTree } from './PatientArchiveTree';
import './PatientDocumentArchive.css';
import './PatientArchiveTree.css';
import type { AssessmentTarget, AssessmentType } from '../../../lib/assessments/assessmentTypes';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void | Promise<boolean>;
  operatoreNome: string;
  operatoreId?: string;
  operatoreRole?: string;
  focusDocumentId?: string;
  expectedAssessmentId?: string;
  expectedAssessmentType?: AssessmentType;
  onOpenAssessment?: (assessment: AssessmentTarget) => void;
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
  expectedAssessmentType,
  onOpenAssessment,
}: Props) {
  const archive = useDocumentArchive(paziente.id, operatoreId, operatoreRole);
  const canUpload = useCan('documents.upload');
  const canSave = useCan('clinical_record.save');
  const canClassify = useCan('documents.update_type');
  const canAdd = canUpload && canSave;
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
  const filtered = filterDocumentArchive(
    entries,
    folder.category,
    query,
    archived,
    folder.type,
    folder.assessmentType,
  );
  const folderEntries = filterDocumentArchive(entries, 'tutti', query, archived);
  const selectFolder = (next: ArchiveFolder) => {
    setFolder(next);
    setVisible(25);
  };
  const selectedCategory = ARCHIVE_CATEGORIES.find((item) => item.id === folder.category);
  const complete = archive.status === 'ready';
  const empty = isEmptyArchive(archive.status, entries.length);
  const formAllowed = form?.entry ? canSave && (!form.entry.document || canClassify) : canAdd;
  const focusedDocument = useRef('');
  useEffect(() => {
    const focusKey = `${focusDocumentId}:${expectedAssessmentId}:${expectedAssessmentType}`;
    if (!complete || !focusDocumentId || focusedDocument.current === focusKey) return;
    const timer = window.setTimeout(() => {
      focusedDocument.current = focusKey;
      const entry = entries.find((item) => item.document?.id === focusDocumentId);
      if (
        !entry ||
        (expectedAssessmentId && entry.document?.assessment?.id !== expectedAssessmentId) ||
        (expectedAssessmentType && entry.document?.assessment?.type !== expectedAssessmentType)
      )
        setError('Documento della valutazione non disponibile nell’archivio corrente.');
      else setPreview(entry);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [complete, entries, focusDocumentId, expectedAssessmentId, expectedAssessmentType]);
  const selectedDocuments = selectedArchiveDocuments(entries, selected);
  const visibleDocuments = selectedArchiveDocuments(
    filtered.slice(0, visible),
    new Set(entries.flatMap((entry) => (entry.document ? [entry.document.id] : []))),
  );
  const visibleSelected = visibleDocuments.filter((document) => selected.has(document.id)).length;
  const allVisibleSelected =
    visibleDocuments.length > 0 && visibleSelected === visibleDocuments.length;
  const hiddenSelected = selectedDocuments.length - visibleSelected;
  useEffect(() => {
    if (selectAllRef.current)
      selectAllRef.current.indeterminate = visibleSelected > 0 && !allVisibleSelected;
  }, [visibleSelected, allVisibleSelected]);
  useEffect(() => {
    if (complete)
      setSelected((current) => {
        const existing = new Set(
          entries.flatMap((entry) => (entry.document ? [entry.document.id] : [])),
        );
        const next = new Set([...current].filter((id) => existing.has(id)));
        return next.size === current.size ? current : next;
      });
  }, [entries, complete]);
  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const openForm = (entry: ArchiveEntry | null) => {
    if (!complete || (entry ? !canSave || (!!entry.document && !canClassify) : !canAdd)) return;
    setError('');
    setForm({ key: crypto.randomUUID(), entry });
  };
  async function update(recordsToSave: DocumentoConsegnato[]) {
    if (busy.current || form || !canSave) return;
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
          !empty && (
            <>
              <button
                type="button"
                className="btn-secondary btn-sm no-print"
                disabled={
                  !complete || !selectedDocuments.length || !!form || saving || !!printDocuments
                }
                onClick={() => setPrintDocuments(selectedDocuments)}
              >
                Stampa selezionati ({selectedDocuments.length})
              </button>
              {canAdd && (
                <button
                  type="button"
                  className="btn-sm"
                  disabled={!complete || !!form || saving || folder.category === 'valutazioni'}
                  onClick={() => openForm(null)}
                >
                  + Aggiungi
                </button>
              )}
            </>
          )
        }
      >
        <div className="cts__body--padded">
          {form && formAllowed && (
            <ArchiveDocumentForm
              key={form.key}
              initial={form.entry}
              defaultType={folder.type ?? selectedCategory?.types[0]}
              records={records}
              patientId={paziente.id}
              operatorId={operatoreId}
              operatorRole={operatoreRole}
              operatorName={operatoreNome}
              canClassify={canClassify}
              onPersist={(next) => onUpdate({ documentiConsegnati: next })}
              onStored={archive.remember}
              onClose={() => setForm(null)}
            />
          )}
          {empty && !(form && formAllowed) && (
            <ArchiveEmptyState canAdd={canAdd} onAdd={() => openForm(null)} />
          )}
          {empty && error && (
            <p role="alert" className="patient-archive__error">
              {error}
            </p>
          )}
          {!empty && (
            <>
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
                        event.target.value === 'tutti'
                          ? 'tutti'
                          : event.target.value === 'archiviati',
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
                Qui trovi tutti i file e le foto salvati per il paziente, anche da esami,
                medicazioni e importazioni.
              </p>
              <div className="patient-document-archive__selection no-print">
                <label>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={!complete || !visibleDocuments.length}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        for (const document of visibleDocuments)
                          if (allVisibleSelected) next.delete(document.id);
                          else next.add(document.id);
                        return next;
                      })
                    }
                  />
                  Seleziona documenti visibili
                </label>
                <span role="status">
                  {selectedDocuments.length} selezionati
                  {hiddenSelected > 0 ? ` · ${hiddenSelected} non visibili in questo elenco` : ''}
                </span>
                {selected.size > 0 && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setSelected(new Set())}
                  >
                    Deseleziona tutti
                  </button>
                )}
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
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => selectFolder({ category: 'tutti' })}
                    >
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
                        <span aria-current="location">{archiveFolderLabel(folder)}</span>
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
                        Impossibile caricare tutti i file. Le schede visibili sono un elenco
                        parziale.
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
                    <ArchiveResultList
                      entries={filtered.slice(0, visible)}
                      selected={selected}
                      complete={complete}
                      formOpen={!!form}
                      saving={saving}
                      canSave={canSave}
                      canClassify={canClassify}
                      onToggle={toggleSelected}
                      onPreview={setPreview}
                      onEdit={openForm}
                      onRemove={setRemoving}
                      onOpenAssessment={onOpenAssessment}
                    />
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
            </>
          )}
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
      {printDocuments && (
        <ArchivePrintDialog
          documents={printDocuments}
          patientId={paziente.id}
          operatorId={operatoreId}
          operatorRole={operatoreRole}
          onClose={() => setPrintDocuments(null)}
        />
      )}
      {removing && canSave && (
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
