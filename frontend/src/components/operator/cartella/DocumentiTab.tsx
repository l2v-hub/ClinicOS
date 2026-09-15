import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartellaPaziente, DocumentoConsegnato, Paziente } from '../../../types';
import {
  ARCHIVE_CATEGORIES,
  buildDocumentArchive,
  DOCUMENT_TYPE_LABELS,
  filterDocumentArchive,
  type ArchiveCategory,
  type ArchiveEntry,
} from '../../../lib/patientDocumentArchive';
import { useDocumentArchive } from '../../../lib/useDocumentArchive';
import { ClinicalTableSection, PrintButton, fmtDate } from './shared';
import { ArchiveDocumentForm, DOCUMENT_STATUS_LABELS } from './ArchiveDocumentForm';
import { PatientArchivePreview } from './PatientArchivePreview';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import './PatientDocumentArchive.css';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void | Promise<boolean>;
  operatoreNome: string;
  operatoreId?: string;
  operatoreRole?: string;
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
}: Props) {
  const archive = useDocumentArchive(paziente.id, operatoreId, operatoreRole);
  const records = cartella.documentiConsegnati ?? [];
  const entries = useMemo(
    () => buildDocumentArchive(records, archive.documents),
    [records, archive.documents],
  );
  const [category, setCategory] = useState<ArchiveCategory | 'tutti'>('tutti');
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [visible, setVisible] = useState(25);
  const [form, setForm] = useState<{ key: string; entry: ArchiveEntry | null } | null>(null);
  const [preview, setPreview] = useState<ArchiveEntry | null>(null);
  const [removing, setRemoving] = useState<ArchiveEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  const [error, setError] = useState('');
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const filtered = filterDocumentArchive(entries, category, query, archived);
  const activeEntries = entries.filter((entry) => entry.archived === archived);
  const complete = archive.status === 'ready';
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
  function setArchivedEntry(entry: ArchiveEntry) {
    const record: DocumentoConsegnato = entry.record ?? {
      id: crypto.randomUUID(),
      tipo: entry.type,
      descrizione: entry.title,
      dataConsegna: entry.date,
      stato: 'ricevuto',
      firmatoDA: 'non_firmato',
      operatore: operatoreNome,
      note: '',
      patientDocumentId: entry.document?.id,
    };
    void update([
      { ...record, archiviato: !entry.archived },
      ...records.filter((item) => item.id !== record.id),
    ]);
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
            <PrintButton label="Stampa documenti visibili" />
            <button
              type="button"
              className="btn-sm"
              disabled={!complete || !!form || saving}
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
                value={archived ? 'archiviati' : 'correnti'}
                onChange={(event) => {
                  setArchived(event.target.value === 'archiviati');
                  setVisible(25);
                }}
              >
                <option value="correnti">Documenti correnti</option>
                <option value="archiviati">Documenti archiviati</option>
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
          <nav
            className="patient-document-archive__categories no-print"
            aria-label="Tipologie documenti"
          >
            {[{ id: 'tutti', label: 'Tutti' }, ...ARCHIVE_CATEGORIES].map((item) => (
              <button
                type="button"
                key={item.id}
                className={`patient-document-archive__category${category === item.id ? ' is-selected' : ''}`}
                aria-pressed={category === item.id}
                onClick={() => {
                  setCategory(item.id as ArchiveCategory | 'tutti');
                  setVisible(25);
                }}
              >
                {item.label}
                {complete && (
                  <span>
                    {item.id === 'tutti'
                      ? activeEntries.length
                      : filterDocumentArchive(entries, item.id as ArchiveCategory, '', archived)
                          .length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          {archive.status === 'loading' && <p role="status">Caricamento dell’archivio completo…</p>}
          {archive.status === 'error' && (
            <div className="patient-archive__error" role="alert">
              <p>Impossibile caricare tutti i file. Le schede visibili sono un elenco parziale.</p>
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
              {filtered.length} {filtered.length === 1 ? 'documento trovato' : 'documenti trovati'}
            </p>
          )}
          {complete && filtered.length === 0 && (
            <p className="cr-empty">
              {query || category !== 'tutti'
                ? 'Nessun documento corrisponde alla ricerca.'
                : 'Nessun documento in questa sezione.'}
            </p>
          )}
          {archive.status !== 'loading' && (
            <ul className="patient-document-archive__list">
              {filtered.slice(0, visible).map((entry) => (
                <li key={entry.id} className="patient-document-archive__item">
                  <div className="patient-document-archive__file-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <path d="M14 3v6h6M8 13h8M8 17h6" />
                    </svg>
                  </div>
                  <div className="patient-document-archive__details">
                    <button
                      type="button"
                      className="patient-document-archive__title"
                      onClick={() => setPreview(entry)}
                    >
                      {entry.title}
                    </button>
                    <div className="patient-document-archive__meta">
                      <span className="badge badge--blue">{DOCUMENT_TYPE_LABELS[entry.type]}</span>
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
                        {entry.unavailable ? 'Allegato non disponibile' : 'Nessun file allegato'}
                      </p>
                    )}
                    {entry.record?.provenienza && <p>Provenienza: {entry.record.provenienza}</p>}
                    {entry.record?.scadenza && <p>Scadenza: {fmtDate(entry.record.scadenza)}</p>}
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
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={!complete || !!form || saving}
                      onClick={() => openForm(entry)}
                    >
                      Modifica dettagli
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={!complete || !!form || saving}
                      onClick={() => setArchivedEntry(entry)}
                    >
                      {entry.archived ? 'Ripristina' : 'Archivia'}
                    </button>
                    {entry.record && (
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
