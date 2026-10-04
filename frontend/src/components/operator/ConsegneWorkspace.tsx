import { useEffect, useState } from 'react';
import { createConsegnaDraftStore, type ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import type { ConsegneEntry } from '../../lib/consegneNavigation';
import { useConsegneExitGuard } from '../../lib/useConsegneExitGuard';
import { PageHeader } from '../shared/PageHeader';
import { type ConsegnePageProps } from './ConsegnePage';
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
  onModeChange: _onModeChange,
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
  return (
    <div className="handover-workspace">
      <PageHeader title="Consegne" subtitle="Giro pazienti e diario delle segnalazioni" />
      <ConsegneRounds store={store} operatori={feed.operatori} onAdd={feed.onAdd} active
        initialPatientId={entry?.query?.patientId} />
      <p className="handover-workspace__memory">
        Le bozze personali restano disponibili dopo il ricaricamento in questa scheda e vengono rimosse all’uscita dall’account.
      </p>
    </div>
  );
}
