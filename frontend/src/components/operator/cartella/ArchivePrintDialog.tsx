import { useEffect, useId, useRef, useState } from 'react';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import { readArchiveDocumentContent } from '../../../lib/patientDocumentArchiveIO';
import { prepareArchivePrint } from '../../../lib/archivePrint';
import { createArchivePrintFrame } from '../../../lib/archivePrintFrame';
import { AccessibleDialogSurface } from '../../shared/AccessibleDialogSurface';

export function ArchivePrintDialog({ documents, patientId, operatorId, operatorRole, onClose }: {
  documents: PatientDocumentMeta[];
  patientId: string;
  operatorId?: string;
  operatorRole?: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState('Preparazione dei documenti…');
  const [error, setError] = useState('');
  const job = useRef<Awaited<ReturnType<typeof createArchivePrintFrame>> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 120_000);
    setStatus('loading'); setError('');
    setProgress('Preparazione dei documenti…');
    void (async () => {
      const { renderArchivePrint } = await import('../../../lib/renderArchivePrint');
      controller.signal.throwIfAborted();
      const pages = await prepareArchivePrint(documents, controller.signal, {
        read: (id, signal) => readArchiveDocumentContent({
          patientId, signal,
          getHeaders: () => documentAuthHeaders(patientId, operatorId, operatorRole),
        }, id),
        render: renderArchivePrint,
      }, (completed, total) => {
        if (active) setProgress(`Preparazione documenti: ${completed} di ${total}`);
      });
      const frame = await createArchivePrintFrame(pages, controller.signal);
      controller.signal.throwIfAborted();
      if (!active) { frame.dispose(); return; }
      job.current = frame;
      clearTimeout(timer);
      setProgress(`${documents.length} ${documents.length === 1 ? 'documento' : 'documenti'} · ${frame.pageCount} ${frame.pageCount === 1 ? 'pagina pronta' : 'pagine pronte'}`);
      setStatus('ready');
      frame.print();
    })().catch((cause) => {
      if (!active) return;
      clearTimeout(timer);
      job.current?.dispose(); job.current = null;
      setStatus('error');
      setError(timedOut ? 'Preparazione troppo lunga. Nessun documento è stato stampato. Riprova con meno file.'
        : cause instanceof Error ? cause.message : 'Impossibile preparare la stampa. Riprova.');
    });
    return () => {
      active = false; clearTimeout(timer); controller.abort();
      job.current?.dispose(); job.current = null;
    };
  }, [documents, patientId, operatorId, operatorRole, revision]);
  return (
    <AccessibleDialogSurface labelledBy={titleId} onClose={onClose} className="patient-archive-print-dialog no-print">
      <h3 id={titleId}>Stampa documenti selezionati</h3>
      {status === 'error' ? <p role="alert" className="patient-archive__error">{error}</p>
        : <p role="status" aria-live="polite">{progress}</p>}
      {status === 'ready' && <p>Completa la stampa nella finestra del browser. Se non si è aperta, premi “Riapri stampa”.</p>}
      <ul>{documents.map((document) => <li key={document.id}>{document.originalName}</li>)}</ul>
      <footer>
        <button type="button" className="btn-secondary" data-dialog-initial-focus onClick={onClose}>
          {status === 'loading' ? 'Annulla preparazione' : 'Chiudi'}
        </button>
        {status === 'error' && <button type="button" className="btn-primary" onClick={() => setRevision((value) => value + 1)}>Riprova stampa</button>}
        {status === 'ready' && <button type="button" className="btn-primary" onClick={() => {
          try { job.current?.print(); } catch { setStatus('error'); setError('Impossibile aprire la stampa. Riprova.'); }
        }}>Riapri stampa</button>}
      </footer>
    </AccessibleDialogSurface>
  );
}
