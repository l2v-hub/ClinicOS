import { useEffect, useState, useSyncExternalStore } from 'react';
import { assessmentsCacheKey } from '../../../lib/patientTabSnapshots';
import { API_URL } from '../../../config';
import type { CartellaPaziente } from '../../../types';
import { operatorHeaders } from '../../../lib/operatorSession';
import type { AssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import {
  CLINICAL_MODULES,
  createAssessmentCatalogReader,
  legacyModuleDate,
  legacyModuleCount,
  type ClinicalModule,
  type AssessmentCatalogItem,
  type AssessmentCatalogReader,
} from '../../../lib/assessments/assessmentCatalog';
import {
  createAssessmentCatalogState,
  type AssessmentCatalogState,
} from '../../../lib/assessments/assessmentCatalogState';
import { useCan } from '../../../lib/capabilities';
import { assessmentDefinition } from '../../../lib/assessments/assessmentDefinition';
import './AssessmentCatalog.css';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import {
  hasLegacyDraft,
  deleteLegacyDraft,
  LEGACY_DRAFT_CHANGED,
} from '../../../lib/useLegacyModuleDraft';

type Action = 'history' | 'new' | 'resume';
interface ViewProps {
  cartella: CartellaPaziente;
  state: AssessmentCatalogState;
  localDraftTypes: ReadonlySet<string>;
  onRetry: () => void;
  onOpen: (module: ClinicalModule, action: Action, item?: AssessmentCatalogItem) => void;
  onNrs: () => void;
  /** F15: «Nuova compilazione» only with the create capability (OSS read-only). */
  canCreate?: boolean;
  onDeleteLocal?: (module: ClinicalModule) => void;
}
const time = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(new Date(value));
function Latest({
  module,
  cartella,
  item,
  state,
  local,
}: {
  module: ClinicalModule;
  cartella: CartellaPaziente;
  item?: AssessmentCatalogItem;
  state: AssessmentCatalogState;
  local: boolean;
}) {
  if (!module.type) {
    const date = legacyModuleDate(cartella, module.tab);
    const count = legacyModuleCount(cartella, module.tab);
    if (local)
      return (
        <>
          <span className="assessment-draft-chip">Bozza da riprendere</span>
          <p>
            {count === 0 ? 'Nessuna compilazione salvata' : `${count ?? '—'} compilazioni salvate`}
          </p>
        </>
      );
    if (count === 0) return <p>Nessuna compilazione</p>;
    if (count === null) return <p>Dati del modulo non disponibili</p>;
    return (
      <p>
        {date
          ? `${module.tab === 'contenzioni' ? 'Ultimo inizio riportato' : 'Ultima data riportata'}: ${date.split('-').reverse().join('/')}`
          : 'Data di compilazione non disponibile'}
      </p>
    );
  }
  return (
    <>
      {state.status === 'loading' && <p>Caricamento date e bozze…</p>}
      {state.status === 'error' && <p>Date e bozze non disponibili</p>}
      {state.status === 'ready' &&
        (item?.latestFinal ? (
          <>
            <p>
              Ultima completa: <strong>{time(item.latestFinal.assessedAt)}</strong>
            </p>
            <p className="assessment-catalog-secondary">
              Registrata {time(item.latestFinal.createdAt)} · Finalizzata{' '}
              {time(item.latestFinal.finalizedAt)}
            </p>
          </>
        ) : (
          <p>
            {item?.ownDraftCount
              ? 'Bozza personale · nessuna compilazione completa'
              : local ? 'Nessuna compilazione completa' : 'Nessuna compilazione'}
          </p>
        ))}
      {state.status === 'ready' && !!item?.ownDraftCount && (
        <p>
          {item.ownDraftCount} {item.ownDraftCount === 1 ? 'bozza salvata personale' : 'bozze salvate personali'}
          {item.latestOwnDraft ? ` · ultimo salvataggio confermato ${time(item.latestOwnDraft.updatedAt)}` : ''}
        </p>
      )}
      {local && <span className="assessment-draft-chip">Bozza da riprendere</span>}
    </>
  );
}
export function AssessmentCatalogView({
  cartella,
  state,
  localDraftTypes,
  onRetry,
  onOpen,
  onNrs,
  canCreate = true,
  onDeleteLocal,
}: ViewProps) {
  return (
    <section className="assessment-catalog" aria-label="Moduli clinici">
      {state.status === 'error' && (
        <p role="alert">
          {state.error}{' '}
          <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
            Riprova
          </button>
        </p>
      )}
      {['Assistenza e mobilizzazione', 'Scale di valutazione'].map((group) => (
        <section key={group}>
          <h3>{group}</h3>
          <div className="assessment-catalog-list">
            {CLINICAL_MODULES.filter((module) => module.group === group).map((module) => {
              const item = state.status === 'ready' ? state.data?.items.find((row) => row.type === module.type) : undefined;
              const local = localDraftTypes.has(module.type ?? module.tab);
              // Modern purposes reuse the current paper/model description. Braden wording
              // comes from the tracked blank sheet and existing app risk legend, not new thresholds.
              const purpose = module.type ? assessmentDefinition(module.type).description
                : module.tab === 'braden' ? 'Rischio di compromissione dell’integrità cutanea.'
                : module.tab === 'medicazioni' ? 'Scheda Medicazioni / Lesioni' : 'Contenzioni / Protezioni';
              return (
                <article key={module.tab} className="assessment-catalog-row">
                  <div>
                    <h4>{module.label}</h4>
                    <p className="assessment-catalog-purpose">{purpose}</p>
                    <Latest
                      module={module}
                      cartella={cartella}
                      state={state}
                      item={item}
                      local={local}
                    />
                  </div>
                  <div className="assessment-catalog-actions">
                    <button
                      type="button"
                      className="btn-secondary assessment-catalog-action"
                      aria-label={`Storico ${module.label}`}
                      onClick={() => onOpen(module, 'history', item)}
                    >
                      Storico
                    </button>
                    {canCreate && (
                      <button
                        type="button"
                        className="btn-primary assessment-catalog-action"
                        aria-label={`Compila ${module.label}`}
                        onClick={() => onOpen(module, 'new', item)}
                      >
                        Compila
                      </button>
                    )}
                    {canCreate && (local || !!item?.ownDraftCount) && (
                      <button
                        type="button"
                        className="btn-secondary assessment-catalog-action"
                        aria-label={`Riprendi bozza ${module.label}`}
                        onClick={() => onOpen(module, 'resume', item)}
                      >
                        Riprendi bozza
                      </button>
                    )}
                    {canCreate && local && onDeleteLocal && (
                      <button
                        type="button"
                        className="btn-secondary assessment-catalog-action"
                        aria-label={`Elimina bozza locale ${module.label}`}
                        onClick={() => onDeleteLocal(module)}
                      >
                        Elimina bozza locale
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <button type="button" className="btn-ghost" onClick={onNrs}>
        Storico NRS precedente
      </button>
    </section>
  );
}
export function AssessmentCatalog({
  patientId,
  operatorId,
  operatorRole,
  cartella,
  draftStore,
  onOpen,
  onNrs,
  reader,
}: {
  patientId: string;
  operatorId: string;
  operatorRole?: string;
  cartella: CartellaPaziente;
  draftStore: AssessmentDraftStore;
  onOpen: ViewProps['onOpen'];
  onNrs: () => void;
  reader?: AssessmentCatalogReader;
}) {
  return (
    <CatalogSession
      key={`${patientId}:${operatorId}:${operatorRole ?? ''}`}
      {...{ patientId, cartella, draftStore, onOpen, onNrs, reader }}
    />
  );
}
function CatalogSession({
  patientId,
  cartella,
  draftStore,
  onOpen,
  onNrs,
  reader,
}: {
  patientId: string;
  cartella: CartellaPaziente;
  draftStore: AssessmentDraftStore;
  onOpen: ViewProps['onOpen'];
  onNrs: () => void;
  reader?: AssessmentCatalogReader;
}) {
  // Mutable draft stores must be read again on every subscription notification.
  'use no memo';
  const [store] = useState(() =>
    createAssessmentCatalogState(
      reader ?? createAssessmentCatalogReader(API_URL, patientId, operatorHeaders()),
      reader ? undefined : assessmentsCacheKey(patientId),
    ),
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const canCreate = useCan('assessments.create_draft');
  const [deleting, setDeleting] = useState<ClinicalModule | null>(null);
  const [, setLegacyRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setLegacyRevision((v) => v + 1);
    window.addEventListener(LEGACY_DRAFT_CHANGED, refresh);
    return () => window.removeEventListener(LEGACY_DRAFT_CHANGED, refresh);
  }, []);
  useSyncExternalStore(draftStore.subscribe, draftStore.getVersion, draftStore.getVersion);
  useEffect(() => {
    void store.load();
    return () => store.dispose();
  }, [store]);
  const localDraftTypes = new Set(
    CLINICAL_MODULES.flatMap((module) =>
      module.type &&
      draftStore
        .list(patientId, module.type)
        .some((draft) => draft.dirty || draft.pending || draft.record?.status === 'draft')
        ? [module.type]
        : !module.type && hasLegacyDraft(patientId, module.tab)
          ? [module.tab]
          : [],
    ),
  );
  return (
    <>
      {draftStore.persistenceFailed() && (
        <p role="alert">
          Non è possibile conservare le modifiche dopo il ricaricamento. Salva la bozza in ClinicOS e attendi la conferma prima di uscire.
        </p>
      )}
      <AssessmentCatalogView
        {...{ cartella, state, localDraftTypes, onOpen, onNrs, canCreate }}
        onRetry={() => void store.load()}
        onDeleteLocal={setDeleting}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Eliminare la bozza locale?"
        message="Rimuove la compilazione conservata in questa finestra. Una bozza già salvata in ClinicOS resta nello storico personale. Un invio dall’esito incerto deve essere verificato prima di eliminarlo."
        confirmLabel="Elimina bozza"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting?.type)
            for (const draft of draftStore.list(patientId, deleting.type)) {
              if (!draft.busy && !draft.pending) draftStore.discard(draft.key);
            }
          else if (deleting) deleteLegacyDraft(patientId, deleting.tab);
          setDeleting(null);
        }}
      />
    </>
  );
}
