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
import './AssessmentCatalog.css';

type Action = 'open' | 'new' | 'resume';
interface ViewProps {
  cartella: CartellaPaziente;
  state: AssessmentCatalogState;
  localDraftTypes: ReadonlySet<string>;
  onRetry: () => void;
  onOpen: (module: ClinicalModule, action: Action, item?: AssessmentCatalogItem) => void;
  onNrs: () => void;
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
              Ultima compilazione: <strong>{time(item.latestFinal.assessedAt)}</strong>
            </p>
            <p className="assessment-catalog-secondary">
              Registrata {time(item.latestFinal.createdAt)} · Finalizzata{' '}
              {time(item.latestFinal.finalizedAt)}
            </p>
          </>
        ) : (
          <p>
            {item?.ownDraftCount
              ? 'Bozza personale · nessuna compilazione finale'
              : 'Nessuna compilazione finale'}
          </p>
        ))}
      {!!item?.ownDraftCount && (
        <p>
          {item.ownDraftCount} {item.ownDraftCount === 1 ? 'bozza personale' : 'bozze personali'}
          {item.latestOwnDraft ? ` · aggiornata ${time(item.latestOwnDraft.updatedAt)}` : ''}
        </p>
      )}
      {local && <p>Bozza locale da salvare</p>}
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
}: ViewProps) {
  return (
    <section className="assessment-catalog" aria-labelledby="assessment-catalog-title">
      <h2 id="assessment-catalog-title">Moduli</h2>
      <p>Apri un modulo o riprendi una bozza personale.</p>
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
              const item = state.data?.items.find((row) => row.type === module.type);
              const local = !!module.type && localDraftTypes.has(module.type);
              return (
                <article key={module.tab} className="assessment-catalog-row">
                  <div>
                    <h4>{module.label}</h4>
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
                      className="btn-secondary btn-sm"
                      aria-label={`Apri ${module.label}`}
                      onClick={() => onOpen(module, 'open', item)}
                    >
                      Apri
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      aria-label={`Nuova compilazione ${module.label}`}
                      onClick={() => onOpen(module, 'new', item)}
                    >
                      Nuova compilazione
                    </button>
                    {(local || !!item?.ownDraftCount) && (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        aria-label={`Riprendi bozza ${module.label}`}
                        onClick={() => onOpen(module, 'resume', item)}
                      >
                        Riprendi bozza
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
  const [store] = useState(() =>
    createAssessmentCatalogState(
      reader ?? createAssessmentCatalogReader(API_URL, patientId, operatorHeaders()),
      reader ? undefined : assessmentsCacheKey(patientId),
    ),
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useSyncExternalStore(draftStore.subscribe, draftStore.getVersion, draftStore.getVersion);
  useEffect(() => {
    void store.load();
    return () => store.dispose();
  }, [store]);
  const localDraftTypes = new Set(
    CLINICAL_MODULES.flatMap((module) =>
      module.type &&
      draftStore.list(patientId, module.type).some((draft) => draft.dirty || draft.pending)
        ? [module.type]
        : [],
    ),
  );
  return (
    <AssessmentCatalogView
      {...{ cartella, state, localDraftTypes, onOpen, onNrs }}
      onRetry={() => void store.load()}
    />
  );
}
