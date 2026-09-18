import { useEffect, useRef, useState } from 'react';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import {
  DOCUMENT_ACCEPT,
  uploadArchiveDocument,
  validateArchiveFile,
} from '../../../lib/patientDocumentArchiveIO';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { CameraCapture } from '../../shared/CameraCapture';
import { PatientArchivePreview } from './PatientArchivePreview';
import { saveClinicalAttachment } from '../../../lib/clinicalAttachments';

type DocumentReference = Pick<PatientDocumentMeta, 'id' | 'originalName'>;
function AttachmentIcon({ camera = false }: { camera?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {camera ? (
        <>
          <path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z" />
          <circle cx="12" cy="13" r="4" />
        </>
      ) : (
        <>
          <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
        </>
      )}
    </svg>
  );
}
interface Props {
  patientId: string;
  documentType: string;
  operatorId?: string;
  operatorRole?: string;
  documents: DocumentReference[];
  metadataLoading?: boolean;
  cameraFormat?: 'jpeg' | 'pdf';
  onDocumentCreated: (document: PatientDocumentMeta) => void | boolean | Promise<void | boolean>;
}

/** A changed patient/operator unmounts pending captures, previews and uploads. */
export function ClinicalAttachments(props: Props) {
  return (
    <AttachmentSession
      key={`${props.patientId}:${props.operatorId}:${props.operatorRole}:${props.documentType}`}
      {...props}
    />
  );
}

function AttachmentSession({
  patientId,
  documentType,
  operatorId,
  operatorRole,
  documents,
  metadataLoading = false,
  cameraFormat = 'pdf',
  onDocumentCreated,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stored, setStored] = useState<PatientDocumentMeta | null>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<DocumentReference | 'local' | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  function selectFile(next: File) {
    const invalid = validateArchiveFile(next);
    setError(invalid ?? '');
    if (invalid) return;
    setStored(null);
    setFile(next);
  }

  async function save() {
    if (!file || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError('');
    let uploaded = stored;
    try {
      await saveClinicalAttachment({
        stored,
        signal: controller.signal,
        upload: () =>
          uploadArchiveDocument(
            {
              patientId,
              signal: controller.signal,
              getHeaders: () => documentAuthHeaders(patientId, operatorId, operatorRole),
            },
            file,
            documentType,
          ),
        remember: (document) => {
          uploaded = document;
          setStored(document);
        },
        link: onDocumentCreated,
      });
      setFile(null);
      setStored(null);
    } catch {
      if (!controller.signal.aborted)
        setError(
          uploaded
            ? 'Foto conservata nell’archivio. Collegamento alla medicazione non riuscito: riprova.'
            : 'Caricamento non riuscito. Il file selezionato è conservato: riprova.',
        );
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className="section-photos" data-testid={`photos-${documentType}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          hidden
          disabled={busy || metadataLoading}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = '';
            if (selected) selectFile(selected);
          }}
        />
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={busy || metadataLoading}
          onClick={() => inputRef.current?.click()}
        >
          <AttachmentIcon /> Carica file
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={busy || metadataLoading}
          onClick={() => setCamera(true)}
        >
          <AttachmentIcon camera /> Scatta foto
        </button>
        {metadataLoading && <span role="status">Caricamento allegati…</span>}
      </div>
      {file && (
        <div className="cr-inline-form" style={{ marginTop: 8 }}>
          <p>{file.name}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setPreview('local')}
            >
              Anteprima
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? 'Salvataggio…' : stored ? 'Riprova collegamento' : 'Salva allegato'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setStored(null);
                setError('');
                setPreview(null);
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {documents.length > 0 && (
        <ul
          className="section-photos__list"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '8px 0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {documents.map((document) => (
            <li key={document.id}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPreview(document)}
              >
                {document.originalName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {camera && (
        <CameraCapture
          open
          onClose={() => setCamera(false)}
          outputFormat={cameraFormat}
          onFallbackImport={() => {
            setCamera(false);
            inputRef.current?.click();
          }}
          onCapture={(captured) => {
            setCamera(false);
            selectFile(captured);
          }}
        />
      )}
      {preview && (
        <PatientArchivePreview
          patientId={patientId}
          operatorId={operatorId}
          operatorRole={operatorRole}
          document={preview === 'local' ? undefined : preview}
          file={preview === 'local' ? file : undefined}
          title="Anteprima allegato"
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
