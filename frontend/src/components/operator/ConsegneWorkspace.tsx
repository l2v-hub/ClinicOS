import { useEffect, useState } from 'react';
import { createConsegnaDraftStore, type ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import type { ConsegneEntry } from '../../lib/consegneNavigation';
import { useConsegneExitGuard } from '../../lib/useConsegneExitGuard';
import { PageHeader } from '../shared/PageHeader';
import { type ConsegnePageProps } from './ConsegnePage';
import { ConsegneRounds } from './ConsegneRounds';
import { ConsegnePage } from './ConsegnePage';
import { ConsegneUnreadQueue } from './ConsegneUnreadQueue';
import './ConsegneRounds.css';
export interface ConsegneWorkspaceProps extends ConsegnePageProps {
  sessionKey: string;
  entry?: ConsegneEntry;
  draftStore?: ConsegnaDraftStore;
  onModeChange?: (mode: 'rounds' | 'feed' | 'unread') => void;
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
  const [mode, setMode] = useState(entry?.mode ?? 'unread');
  const [patientId, setPatientId] = useState(entry?.query?.patientId);
  useEffect(() => {
    setMode(entry?.mode ?? 'unread');
    setPatientId(entry?.query?.patientId);
  }, [entry?.key, entry?.mode, entry?.query?.patientId]);
  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);
  useConsegneExitGuard(store);
  useEffect(
    () => () => {
      if (!provided) store.clear();
    },
    [store, provided],
  );
  return (
    <div className="handover-workspace">
      <PageHeader title="Consegne" subtitle="Conferme di lettura e diario delle segnalazioni" />
      <div className="ds-chip-group" role="group" aria-label="Vista consegne">
        <button
          type="button"
          className="ds-chip"
          aria-pressed={mode === 'unread'}
          onClick={() => setMode('unread')}
        >
          Non confermate
        </button>
        <button
          type="button"
          className="ds-chip"
          aria-pressed={mode === 'rounds'}
          onClick={() => setMode('rounds')}
        >
          Per paziente
        </button>
        {entry?.mode === 'feed' && (
          <button
            type="button"
            className="ds-chip"
            aria-pressed={mode === 'feed'}
            onClick={() => setMode('feed')}
          >
            Consegne filtrate
          </button>
        )}
      </div>
      {mode === 'unread' && (
        <ConsegneUnreadQueue
          onPatient={(patient) => {
            setPatientId(patient.id);
            setMode('rounds');
          }}
        />
      )}
      {mode === 'rounds' && (
        <ConsegneRounds
          key={patientId ?? 'rounds'}
          store={store}
          operatori={feed.operatori}
          onAdd={feed.onAdd}
          active
          initialPatientId={patientId}
        />
      )}
      {mode === 'feed' && (
        <ConsegnePage
          key={entry?.key}
          {...feed}
          embedded
          draftStore={store}
          initialQuery={entry?.query}
          initialPatientId={entry?.query?.patientId}
        />
      )}
      <p className="handover-workspace__memory">
        Le bozze personali restano disponibili dopo il ricaricamento in questa scheda e vengono
        rimosse all’uscita dall’account.
      </p>
    </div>
  );
}
