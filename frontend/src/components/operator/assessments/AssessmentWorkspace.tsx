import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Paziente } from '../../../types';
import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
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
import type {
  AssessmentDto,
  AssessmentType,
  AssessmentTarget,
} from '../../../lib/assessments/assessmentTypes';
import { assessmentDefinition } from '../../../lib/assessments/assessmentDefinition';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { ClinicalTableSection } from '../cartella/shared';
import { PatientArchivePreview } from '../cartella/PatientArchivePreview';
import { AssessmentForm } from './AssessmentForm';
import { TransfersForm } from './TransfersForm';
import { TinettiForm } from './TinettiForm';
import { MnaForm } from './MnaForm';
import { GdsForm } from './GdsForm';
import { AssessmentAttestations } from './AssessmentAttestations';
import { AssessmentSummary } from './AssessmentSummary';
import { AssessmentFinal } from './AssessmentFinal';
import { AssessmentHistory } from './AssessmentHistory';
import { useAssessmentHistory } from './useAssessmentHistory';
import { useAssessmentPdf } from './useAssessmentPdf';
import './AssessmentWorkspace.css';
import './Transfers.css';
import './Tinetti.css';
import './Mna.css';
import './Gds.css';
export interface AssessmentWorkspaceProps {
  patient: Paziente;
  operatorId?: string;
  operatorRole?: string;
  operatorName: string;
  draftStore?: AssessmentDraftStore;
  type?: AssessmentType;
  initialAssessment?: AssessmentTarget;
  initialAssessmentId?: string;
  initialDraftKey?: string;
  onOpenArchive?: (documentId: string, assessment: AssessmentTarget) => void;
  client?: AssessmentClient;
  children?: ReactNode;
}
export function AssessmentWorkspace(props: AssessmentWorkspaceProps) {
  return (
    <AssessmentSession
      key={`${props.patient.id}:${props.operatorId}:${props.operatorRole}:${props.type ?? 'painad'}`}
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
  type = 'painad',
  initialAssessment,
  initialAssessmentId,
  initialDraftKey,
  onOpenArchive,
  client: providedClient,
  children,
}: AssessmentWorkspaceProps) {
  const definition = assessmentDefinition(type);
  const Form =
    type === 'painad'
      ? AssessmentForm
      : type === 'tinetti'
        ? TinettiForm
        : type === 'mna'
          ? MnaForm
          : type === 'gds15'
            ? GdsForm
            : TransfersForm;
  const entryId = initialAssessment?.type === type ? initialAssessment.id : initialAssessmentId;
  const [currentEmpty, setCurrentEmpty] = useState(false);
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
  const [confirm, setConfirm] = useState<'discard' | 'accept' | 'rebase' | null>(null);
  const history = useAssessmentHistory(patient.id, client, type);
  const draft = selectedKey ? store.get(selectedKey) : undefined;
  const record = draft?.record;
  const { pdfBusy, pdfDocument, setPdfDocument, pdfAction, openPdf } = useAssessmentPdf({
    record,
    selectedKey,
    life,
    selected,
    patient,
    operatorId,
    operatorRole,
    client,
    store,
    refresh: history.refresh,
    setError,
  });
  const localDrafts = store.list(patient.id, type).filter((item) => item.dirty || item.pending);
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
  async function open(id?: string) {
    const request = ++reads.current;
    const version = life.current;
    const controller = new AbortController();
    requests.current.add(controller);
    setReading(true);
    setError('');
    try {
      const incoming = id
        ? await client.get(patient.id, id, controller.signal, type)
        : await client.current(patient.id, type, controller.signal);
      if (controller.signal.aborted || version !== life.current || request !== reads.current)
        return;
      if (!incoming) {
        setCurrentEmpty(true);
        select(null);
        return;
      }
      if (incoming.type !== type) throw new Error('Tipo di scheda non corrispondente.');
      setCurrentEmpty(false);
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
    if (!initialDraftKey && !entryId && type === 'painad') return;
    const timer = window.setTimeout(() => {
      if (initialDraftKey) {
        const local = store.get(initialDraftKey);
        if (local?.patientId === patient.id && local.type === type) select(local.key);
        else setError('Bozza locale non disponibile per questo paziente e modulo.');
        return;
      }
      void open(entryId);
    }, 0);
    return () => window.clearTimeout(timer);
    // Session key fences patient/actor changes; an explicit entry ID opens one record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, initialDraftKey, type]);
  function create(predecessor?: AssessmentDto) {
    try {
      select(store.create(patient.id, predecessor, type));
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
      const incoming = await client.get(patient.id, draft.record.id, controller.signal, type);
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
  return (
    <div className="assessment-workspace" ref={workspaceRef}>
      <div className="assessment-patient" ref={identityRef}>
        <PatientIdentity patient={patient} />
      </div>
      <ClinicalTableSection
        title={definition.title}
        actions={
          <button type="button" className="btn-primary" onClick={() => create()}>
            {type === 'painad' ? 'Nuova valutazione PAINAD' : 'Nuova compilazione'}
          </button>
        }
      >
        <div className="cts__body--padded">
          <p>{definition.description}</p>
          {type !== 'painad' && (
            <div className="assessment-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={reading}
                onClick={() => void open()}
              >
                Apri scheda corrente
              </button>
            </div>
          )}
          {currentEmpty && !draft && (
            <p>Nessuna scheda finale corrente. Avvia una nuova compilazione.</p>
          )}
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
            <section aria-label={`Scheda ${definition.title}`}>
              {record?.status === 'final' ? (
                <>
                  <AssessmentFinal
                    record={record}
                    busy={pdfBusy}
                    onPdf={() => void openPdf()}
                    onRefreshPdf={(retry) => void pdfAction(retry)}
                    onOpenArchive={onOpenArchive}
                    onOpenRecord={(id) => void open(id)}
                    onCorrect={() => create(record)}
                  />
                  {record.type === 'postural_transfers' && record.snapshotSha256 && (
                    <AssessmentAttestations
                      key={`${record.id}:${record.snapshotSha256}`}
                      patientId={patient.id}
                      assessmentId={record.id}
                      snapshotSha256={record.snapshotSha256}
                      operatorId={operatorId}
                      client={client}
                    />
                  )}
                </>
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
                  <Form
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
      {children}
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
          title={`${definition.title} · PDF archiviato`}
          onClose={() => setPdfDocument(null)}
        />
      )}
    </div>
  );
}
