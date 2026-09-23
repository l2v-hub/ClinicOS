import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Paziente } from '../../../types';
import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import { readArchiveDocumentMetadata } from '../../../lib/patientDocumentArchiveIO';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import {
  createAssessmentClient,
  type AssessmentClient,
} from '../../../lib/assessments/assessmentClient';
import {
  createAssessmentDraftStore,
  submitAssessment,
  type AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import { useAssessmentExitGuard } from '../../../lib/assessments/useAssessmentExitGuard';
import type { AssessmentDto } from '../../../lib/assessments/assessmentTypes';
import { PAINAD } from '../../../lib/assessments/painadDefinition';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { ClinicalTableSection } from '../cartella/shared';
import { PatientArchivePreview } from '../cartella/PatientArchivePreview';
import { AssessmentForm } from './AssessmentForm';
import { AssessmentSummary } from './AssessmentSummary';
import { AssessmentFinal } from './AssessmentFinal';
import { AssessmentHistory } from './AssessmentHistory';
import { useAssessmentHistory } from './useAssessmentHistory';
import './AssessmentWorkspace.css';
export interface AssessmentWorkspaceProps {
  patient: Paziente;
  operatorId?: string;
  operatorRole?: string;
  operatorName: string;
  draftStore?: AssessmentDraftStore;
  initialAssessmentId?: string;
  onOpenArchive?: (documentId: string, assessmentId: string) => void;
  client?: AssessmentClient;
}
export function AssessmentWorkspace(props: AssessmentWorkspaceProps) {
  return (
    <AssessmentSession
      key={`${props.patient.id}:${props.operatorId}:${props.operatorRole}`}
      {...props}
    />
  );
}
function AssessmentSession({
  patient,
  operatorId,
  operatorRole,
  operatorName,
  draftStore,
  initialAssessmentId,
  onOpenArchive,
  client: providedClient,
}: AssessmentWorkspaceProps) {
  const [store] = useState(() => draftStore ?? createAssessmentDraftStore());
  const workspaceRef = useRef<HTMLDivElement>(null);
  const identityRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const workspace = workspaceRef.current;
    const identity = identityRef.current;
    if (!workspace || !identity) return;
    const measure = () =>
      workspace.style.setProperty('--assessment-identity-height', `${identity.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(identity);
    return () => observer.disconnect();
  }, []);
  const [client] = useState(
    () => providedClient ?? createAssessmentClient(API_URL, operatorHeaders()),
  );
  useAssessmentExitGuard(store);
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = useRef<string | null>(null);
  const life = useRef(0);
  const reads = useRef(0);
  const requests = useRef(new Set<AbortController>());
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfLock = useRef(false);
  const [pdfDocument, setPdfDocument] = useState<PatientDocumentMeta | null>(null);
  const [confirm, setConfirm] = useState<'discard' | 'accept' | 'rebase' | null>(null);
  const history = useAssessmentHistory(patient.id, client);
  const draft = selectedKey ? store.get(selectedKey) : undefined;
  const record = draft?.record;
  const localDrafts = store.list(patient.id).filter((item) => item.dirty || item.pending);
  useEffect(() => {
    const version = ++life.current;
    const active = requests.current;
    return () => {
      life.current = version + 1;
      active.forEach((controller) => controller.abort());
      active.clear();
      if (!draftStore) store.clear();
    };
  }, [draftStore, store]);
  function select(key: string | null) {
    reads.current++;
    selected.current = key;
    setSelectedKey(key);
    setReading(false);
    setError('');
    setPdfDocument(null);
    setConfirm(null);
  }
  async function open(id: string) {
    const request = ++reads.current;
    const version = life.current;
    const controller = new AbortController();
    requests.current.add(controller);
    setReading(true);
    setError('');
    try {
      const incoming = await client.get(patient.id, id, controller.signal);
      if (controller.signal.aborted || version !== life.current || request !== reads.current)
        return;
      if (incoming.status === 'draft' && incoming.author.operatorId !== operatorId)
        throw new Error('Bozza non disponibile per questo autore.');
      select(store.load(incoming));
    } catch (cause) {
      if (!controller.signal.aborted && version === life.current && request === reads.current)
        setError(cause instanceof Error ? cause.message : 'Valutazione non disponibile.');
    } finally {
      requests.current.delete(controller);
      if (version === life.current && request === reads.current) setReading(false);
    }
  }
  useEffect(() => {
    if (!initialAssessmentId) return;
    const timer = window.setTimeout(() => {
      void open(initialAssessmentId);
    }, 0);
    return () => window.clearTimeout(timer);
    // Session key fences patient/actor changes; an explicit entry ID opens one record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssessmentId]);
  function create(predecessor?: AssessmentDto) {
    try {
      select(store.create(patient.id, predecessor));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Valutazione non disponibile.');
    }
  }
  async function save(preview = false, finalize = false) {
    if (!selectedKey) return;
    const key = selectedKey;
    const version = life.current;
    const existing = store.get(key);
    if (preview && existing?.record && !existing.dirty && !existing.pending) {
      store.preview(key);
      return;
    }
    const token = store.begin(key, finalize ? 'finalize' : 'save');
    if (!token) return;
    const ok = await submitAssessment(store, token, client, () => version === life.current);
    if (version !== life.current || selected.current !== key) return;
    if (ok) {
      history.refresh();
      if (preview) store.preview(key);
    }
  }
  async function reconcile() {
    if (!draft?.record) return;
    const request = ++reads.current;
    const key = draft.key;
    const version = life.current;
    const controller = new AbortController();
    requests.current.add(controller);
    setReading(true);
    setError('');
    try {
      const incoming = await client.get(patient.id, draft.record.id, controller.signal);
      if (
        !controller.signal.aborted &&
        version === life.current &&
        selected.current === key &&
        request === reads.current &&
        store.get(key) === draft
      )
        store.remote(key, incoming);
    } catch (cause) {
      if (
        !controller.signal.aborted &&
        version === life.current &&
        selected.current === key &&
        request === reads.current
      )
        setError(cause instanceof Error ? cause.message : 'Verifica non riuscita.');
    } finally {
      requests.current.delete(controller);
      if (version === life.current && selected.current === key && request === reads.current)
        setReading(false);
    }
  }
  async function pdfAction(retry: boolean) {
    if (!record || record.status !== 'final' || pdfLock.current) return;
    const key = selectedKey;
    const version = life.current;
    pdfLock.current = true;
    setPdfBusy(true);
    setError('');
    try {
      const incoming = retry
        ? await client.retryPdf(patient.id, record.id)
        : await client.get(patient.id, record.id);
      if (version === life.current && selected.current === key) {
        store.load(incoming);
        history.refresh();
      }
    } catch (cause) {
      if (version === life.current && selected.current === key)
        setError(
          cause instanceof Error
            ? cause.message
            : 'PDF non disponibile. La valutazione finale è conservata.',
        );
    } finally {
      pdfLock.current = false;
      if (version === life.current) setPdfBusy(false);
    }
  }
  async function openPdf() {
    if (!record?.pdf?.documentId || pdfLock.current) return;
    const key = selectedKey;
    const version = life.current;
    const controller = new AbortController();
    requests.current.add(controller);
    pdfLock.current = true;
    setPdfBusy(true);
    setError('');
    try {
      const document = await readArchiveDocumentMetadata(
        {
          patientId: patient.id,
          signal: controller.signal,
          getHeaders: () => documentAuthHeaders(patient.id, operatorId, operatorRole),
        },
        record.pdf.documentId,
      );
      if (document.assessment?.id !== record.id)
        throw new Error('Documento non associato a questa valutazione.');
      if (!controller.signal.aborted && version === life.current && selected.current === key)
        setPdfDocument(document);
    } catch (cause) {
      if (!controller.signal.aborted && version === life.current && selected.current === key)
        setError(cause instanceof Error ? cause.message : 'PDF non disponibile.');
    } finally {
      requests.current.delete(controller);
      pdfLock.current = false;
      if (version === life.current) setPdfBusy(false);
    }
  }
  return (
    <div className="assessment-workspace" ref={workspaceRef}>
      <div className="assessment-patient" ref={identityRef}>
        <PatientIdentity patient={patient} />
      </div>
      <ClinicalTableSection
        title={PAINAD.title}
        actions={
          <button type="button" className="btn-primary" onClick={() => create()}>
            Nuova valutazione PAINAD
          </button>
        }
      >
        <div className="cts__body--padded">
          <p>{PAINAD.description}</p>
          <p className="assessment-hint">
            Compilatore: {operatorName}. Le bozze locali restano in questa sessione; salva la bozza
            per ritrovarla dopo l’accesso successivo.
          </p>
          {localDrafts.length > 0 && (
            <div className="assessment-local">
              <span>Compilazioni da completare in questa sessione</span>
              {localDrafts.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="btn-secondary"
                  onClick={() => select(item.key)}
                >
                  {item.predecessorId ? 'Riprendi rettifica' : 'Riprendi compilazione'}
                  {item.pending ? ' · esito da verificare' : ''}
                </button>
              ))}
            </div>
          )}
          {reading && <p role="status">Lettura della valutazione…</p>}
          {error && <p role="alert">{error}</p>}
          {draft && (
            <section aria-label="Scheda PAINAD">
              {record?.status === 'final' ? (
                <AssessmentFinal
                  record={record}
                  busy={pdfBusy}
                  onPdf={() => void openPdf()}
                  onRefreshPdf={(retry) => void pdfAction(retry)}
                  onOpenArchive={onOpenArchive}
                  onOpenRecord={(id) => void open(id)}
                  onCorrect={() => create(record)}
                />
              ) : draft.preview && record ? (
                <>
                  <AssessmentSummary record={record} />
                  <p>
                    Dopo la finalizzazione il contenuto resta immutabile. Eventuali correzioni
                    richiederanno una rettifica.
                  </p>
                  <div className="assessment-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={draft.busy || !!draft.pending}
                      onClick={() => store.edit(draft.key)}
                    >
                      Torna alla compilazione
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={draft.busy || !!draft.pending}
                      onClick={() => void save(false, true)}
                    >
                      {draft.busy ? 'Finalizzazione…' : 'Conferma e finalizza'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {record && !draft.dirty && !draft.pending && (
                    <p role="status" className="assessment-saved">
                      Bozza salvata · versione {record.version} · {record.author.name}
                    </p>
                  )}
                  <AssessmentForm
                    draft={draft}
                    store={store}
                    onSave={() => void save()}
                    onPreview={() => void save(true)}
                  />
                </>
              )}
              {draft.failure && (
                <div role="alert">
                  <p>{draft.failure.message}</p>
                  <div className="assessment-actions">
                    {draft.pending && draft.failure.uncertain && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={draft.busy}
                        onClick={() => void save(false, draft.pending?.kind === 'finalize')}
                      >
                        Riprova la stessa richiesta
                      </button>
                    )}
                    {draft.record && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={reading || draft.busy}
                        onClick={() => void reconcile()}
                      >
                        Verifica versione salvata
                      </button>
                    )}
                  </div>
                </div>
              )}
              {draft.remote && (
                <section className="assessment-conflict">
                  <h3>Versione salvata {draft.remote.version}</h3>
                  <p>
                    Stato: {draft.remote.status === 'final' ? 'finale' : 'bozza'}. I tuoi campi sono
                    ancora conservati.
                  </p>
                  <AssessmentSummary record={draft.remote} />
                  <div className="assessment-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setConfirm('accept')}
                    >
                      Riprendi versione salvata
                    </button>
                    {draft.remote.status === 'draft' && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setConfirm('rebase')}
                      >
                        Mantieni le mie risposte
                      </button>
                    )}
                  </div>
                </section>
              )}
              {record?.status !== 'final' && (
                <div className="assessment-actions">
                  <button
                    type="button"
                    className="link-btn"
                    disabled={draft.busy}
                    onClick={() => select(null)}
                  >
                    Chiudi · conserva compilazione
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={draft.busy}
                    onClick={() => setConfirm('discard')}
                  >
                    Scarta modifiche locali
                  </button>
                </div>
              )}
            </section>
          )}
          <AssessmentHistory history={history} onOpen={(item) => void open(item.id)} />
        </div>
      </ClinicalTableSection>
      <ConfirmDialog
        open={!!confirm}
        title={
          confirm === 'discard'
            ? 'Scartare le modifiche locali?'
            : 'Confermare la versione da usare?'
        }
        message={
          confirm === 'discard'
            ? 'I dati locali verranno rimossi. Un salvataggio già avvenuto o ancora incerto non viene annullato: verifica lo storico.'
            : confirm === 'accept'
              ? 'I campi locali saranno sostituiti dalla versione letta dal server.'
              : 'Le tue risposte resteranno nella compilazione e il prossimo salvataggio aggiornerà la versione letta dal server.'
        }
        confirmLabel="Conferma"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!draft) return;
          if (confirm === 'discard') {
            store.discard(draft.key);
            select(null);
          } else {
            store.resolve(draft.key, confirm === 'rebase');
            setConfirm(null);
          }
        }}
      />
      {pdfDocument && (
        <PatientArchivePreview
          key={`${patient.id}:${pdfDocument.id}`}
          patientId={patient.id}
          operatorId={operatorId}
          operatorRole={operatorRole}
          document={pdfDocument}
          title="PAINAD · PDF archiviato"
          onClose={() => setPdfDocument(null)}
        />
      )}
    </div>
  );
}
