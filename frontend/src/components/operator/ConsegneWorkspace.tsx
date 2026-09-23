import { useEffect, useState } from 'react';
import { createConsegnaDraftStore, type ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import type { ConsegneEntry } from '../../lib/consegneNavigation';
import { useConsegneExitGuard } from '../../lib/useConsegneExitGuard';
import { PageHeader } from '../shared/PageHeader';
import { ConsegnePage, type ConsegnePageProps } from './ConsegnePage';
import { ConsegneRounds } from './ConsegneRounds';
import './ConsegneRounds.css';
export interface ConsegneWorkspaceProps extends ConsegnePageProps {
  sessionKey: string;
  entry?: ConsegneEntry;
  draftStore?: ConsegnaDraftStore;
  onModeChange?: (mode: 'rounds' | 'feed') => void;
}
export function ConsegneWorkspace(props: ConsegneWorkspaceProps) {
  return <WorkspaceSession key={props.sessionKey} {...props} />;
}
function WorkspaceSession({
  entry,
  draftStore: provided,
  onModeChange,
  ...feed
}: ConsegneWorkspaceProps) {
  const [store] = useState(() => provided ?? createConsegnaDraftStore());
  useConsegneExitGuard(store);
  useEffect(
    () => () => {
      if (!provided) store.clear();
    },
    [store, provided],
  );
  const [mode, setMode] = useState(entry?.mode ?? 'rounds');
  const [visited, setVisited] = useState(mode === 'rounds');
  const entryMode = entry?.mode;
  const entryKey = entry?.key;
  useEffect(() => {
    if (!entryMode) return;
    const timer = window.setTimeout(() => {
      setMode(entryMode);
      if (entryMode === 'rounds') setVisited(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [entryKey, entryMode]);
  const change = (next: typeof mode) => {
    setMode(next);
    if (next === 'rounds') setVisited(true);
    onModeChange?.(next);
  };
  return (
    <div className="handover-workspace">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Consegne' }]}
        title="Consegne"
        subtitle="Scrivi durante il giro oppure consulta il Feed delle consegne."
      />
      <div className="handover-workspace__tabs" role="group" aria-label="Vista consegne">
        <button
          type="button"
          className={mode === 'rounds' ? 'btn-primary' : 'btn-secondary'}
          aria-pressed={mode === 'rounds'}
          onClick={() => change('rounds')}
        >
          Giro pazienti
        </button>
        <button
          type="button"
          className={mode === 'feed' ? 'btn-primary' : 'btn-secondary'}
          aria-pressed={mode === 'feed'}
          onClick={() => change('feed')}
        >
          Feed consegne
        </button>
      </div>
      {visited && (
        <div hidden={mode !== 'rounds'}>
          <ConsegneRounds
            store={store}
            operatori={feed.operatori}
            onAdd={feed.onAdd}
            active={mode === 'rounds'}
          />
        </div>
      )}
      {mode === 'feed' && (
        <ConsegnePage
          key={entry?.key ?? 0}
          {...feed}
          embedded
          draftStore={store}
          initialQuery={entry?.query}
          initialPatientId={entry?.query?.patientId}
          initialFiltroStato={entry?.query?.status ?? feed.initialFiltroStato}
          focusId={entry?.focusId ?? feed.focusId}
        />
      )}
      <p className="handover-workspace__memory">
        Le bozze restano disponibili durante questa sessione. Ricaricando la pagina o uscendo dalla
        sessione vengono perse.
      </p>
    </div>
  );
}
