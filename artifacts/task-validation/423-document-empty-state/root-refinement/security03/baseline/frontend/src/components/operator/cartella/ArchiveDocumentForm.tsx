import { useEffect, useRef, useState } from 'react';
import type { DocumentoConsegnato, StatoDocumento, TipoDocumento } from '../../../types';
import { localIsoDate } from '../../../lib/appointmentRange';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import {
  ARCHIVE_CATEGORIES,
  DOCUMENT_TYPE_LABELS,
  type ArchiveEntry,
} from '../../../lib/patientDocumentArchive';
import {
  classifyArchiveDocument,
  DOCUMENT_ACCEPT,
  saveArchiveEntry,
  uploadArchiveDocument,
  validateArchiveFile,
} from '../../../lib/patientDocumentArchiveIO';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { PatientArchivePreview } from './PatientArchivePreview';
import { CameraCapture } from '../../shared/CameraCapture';

export const DOCUMENT_STATUS_LABELS: Record<StatoDocumento, string> = {
  ricevuto: 'Ricevuto',
  mancante: 'Mancante',
  da_verificare: 'Da verificare',
  firmato: 'Firmato',
  scaduto: 'Scaduto',
};

export function ArchiveDocumentForm({
  initial,
  defaultType,
  records,
  patientId,
  operatorId,
  operatorRole,
  operatorName,
  onPersist,
  onStored,
  onClose,
}: {
  initial: ArchiveEntry | null;
  defaultType?: TipoDocumento;
  records: DocumentoConsegnato[];
  patientId: string;
  operatorId?: string;
  operatorRole?: string;
  operatorName: string;
  onPersist: (records: DocumentoConsegnato[]) => void | Promise<boolean>;
  onStored: (document: PatientDocumentMeta) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DocumentoConsegnato>(() => ({
    id: initial?.record?.id ?? crypto.randomUUID(),
    tipo:
      (initial?.type ?? defaultType) === 'patient_assessment'
        ? 'documento_identita'
        : (initial?.type ?? defaultType ?? 'documento_identita'),
    descrizione: initial?.record?.descrizione ?? '',
    dataConsegna: initial?.date ?? localIsoDate(),
    stato: initial?.record?.stato ?? 'ricevuto',
    firmatoDA: initial?.record?.firmatoDA ?? 'non_firmato',
    operatore: operatorName,
    note: initial?.record?.note ?? '',
    provenienza: initial?.record?.provenienza ?? '',
    scadenza: initial?.record?.scadenza ?? '',
    archiviato: initial?.archived,
    patientDocumentId: initial?.record?.patientDocumentId ?? initial?.document?.id,
  }));
  const [file, setFile] = useState<File | null>(null);
  const [stored, setStored] = useState(initial?.document ?? null);
  const storedRef = useRef(stored);
  const controllerRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  function selectFile(selected: File) {
    if (busyRef.current || storedRef.current) return;
    const validation = validateArchiveFile(selected);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setFile(selected);
    setPreview(true);
  }
  const set = (patch: Partial<DocumentoConsegnato>) =>
    setForm((current) => ({ ...current, ...patch }));
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  async function save() {
    if (busyRef.current) return;
    if (!validDate(form.dataConsegna) || (form.scadenza && !validDate(form.scadenza))) {
      setError('Verifica le date del documento.');
      return;
    }
    if (!initial && !file && !storedRef.current && form.stato !== 'mancante') {
      setError('Seleziona il file da archiviare oppure indica il documento come mancante.');
      return;
    }
    busyRef.current = true;
    setSaving(true);
    setError('');
    const controller = new AbortController();
    controllerRef.current = controller;
    const scope = {
      patientId,
      signal: controller.signal,
      getHeaders: () => documentAuthHeaders(patientId, operatorId, operatorRole),
    };
    try {
      await saveArchiveEntry(
        {
          record: {
            ...form,
            descrizione: form.descrizione.trim() || DOCUMENT_TYPE_LABELS[form.tipo],
          },
          records,
          file,
          stored: storedRef.current,
          signal: controller.signal,
        },
        {
          upload: (selected, type) => uploadArchiveDocument(scope, selected, type),
          classify: (id, type) => classifyArchiveDocument(scope, id, type),
          remember: (document) => {
            storedRef.current = document;
            setStored(document);
            setFile(null);
            onStored(document);
          },
          persist: onPersist,
        },
      );
      if (!controller.signal.aborted) onClose();
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'Salvataggio non riuscito. Riprova.');
    } finally {
      busyRef.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  return (
    <div className="cr-inline-form patient-archive-form">
      <h3>{initial ? 'Modifica documento' : 'Nuovo documento'}</h3>
      <fieldset disabled={saving}>
        <div className="form-row-2col">
          <label>
            Tipo documento
            <select
              className="form-input"
              value={form.tipo}
              onChange={(event) => set({ tipo: event.target.value as TipoDocumento })}
            >
              {ARCHIVE_CATEGORIES.filter((category) => category.id !== 'valutazioni').map(
                (category) => (
                  <optgroup label={category.label} key={category.id}>
                    {category.types.map((type) => (
                      <option value={type} key={type}>
                        {DOCUMENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </select>
          </label>
          <label>
            Stato
            <select
              className="form-input"
              value={form.stato}
              onChange={(event) => set({ stato: event.target.value as StatoDocumento })}
            >
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data ricezione
            <input
              className="form-input"
              type="date"
              value={form.dataConsegna}
              onChange={(event) => set({ dataConsegna: event.target.value })}
            />
          </label>
          <label>
            Scadenza
            <input
              className="form-input"
              type="date"
              value={form.scadenza}
              onChange={(event) => set({ scadenza: event.target.value })}
            />
          </label>
          <label>
            Provenienza
            <input
              className="form-input"
              maxLength={200}
              value={form.provenienza}
              onChange={(event) => set({ provenienza: event.target.value })}
              placeholder="Paziente, familiare, centro medico…"
            />
          </label>
          <label>
            Firmato da
            <select
              className="form-input"
              value={form.firmatoDA}
              onChange={(event) => set({ firmatoDA: event.target.value })}
            >
              <option value="non_firmato">Non firmato</option>
              <option value="paziente">Paziente</option>
              <option value="tutore">Tutore</option>
              <option value="familiare">Familiare</option>
              <option value="medico">Medico</option>
            </select>
          </label>
        </div>
        <label>
          Descrizione
          <input
            className="form-input"
            maxLength={200}
            value={form.descrizione}
            onChange={(event) => set({ descrizione: event.target.value })}
            placeholder={DOCUMENT_TYPE_LABELS[form.tipo]}
          />
        </label>
        <label>
          Note
          <textarea
            className="form-input"
            maxLength={2000}
            value={form.note}
            onChange={(event) => set({ note: event.target.value })}
            rows={2}
          />
        </label>
        <div className="patient-archive-form__file">
          {stored ? (
            <>
              <strong>File archiviato</strong>
              <span>{stored.originalName}</span>
            </>
          ) : (
            <div className="patient-archive-form__upload">
              <p>Allegato · PDF, JPEG, JPG o PNG, massimo 15 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={DOCUMENT_ACCEPT}
                aria-label="Seleziona documento"
                hidden
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  event.target.value = '';
                  if (selected) selectFile(selected);
                }}
              />
              <div className="patient-archive-form__upload-actions">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Carica file
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setCameraOpen(true)}
                >
                  Scatta foto
                </button>
              </div>
            </div>
          )}
          {(file || stored) && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setPreview(true)}>
              Anteprima{file ? ` · ${file.name}` : ''}
            </button>
          )}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="patient-archive__error">
          {error}
        </p>
      )}
      <div className="cr-inline-form__actions">
        <button type="button" className="btn-secondary btn-sm" disabled={saving} onClick={onClose}>
          Annulla
        </button>
        <button
          type="button"
          className="btn-success btn-sm"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Salvataggio…' : 'Salva documento'}
        </button>
      </div>
      {cameraOpen && (
        <CameraCapture
          open
          outputFormat="pdf"
          onClose={() => setCameraOpen(false)}
          onCapture={(photo) => {
            setCameraOpen(false);
            selectFile(photo);
          }}
          onFallbackImport={() => {
            setCameraOpen(false);
            fileInputRef.current?.click();
          }}
        />
      )}
      {preview && !cameraOpen && (
        <PatientArchivePreview
          key={stored?.id ?? file?.name}
          patientId={patientId}
          operatorId={operatorId}
          operatorRole={operatorRole}
          document={stored ?? undefined}
          file={file}
          title={DOCUMENT_TYPE_LABELS[form.tipo]}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
