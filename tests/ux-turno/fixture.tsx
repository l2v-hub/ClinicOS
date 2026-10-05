// Isolated integration fixture; validation intercepts every API request.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../frontend/src/index.css';
import '../../frontend/src/App.css';
import '../../frontend/src/design-system.css';
import '../../frontend/src/app-additions.css';
import '../../frontend/src/components/operator/PatientRecordData.css';
import '../../frontend/src/components/operator/News2.css';
import '../../frontend/src/components/operator/PatientOverview.css';
import Sidebar from '../../frontend/src/components/shared/TeamsLikeSidebar';
import { HandoverEntryButton } from '../../frontend/src/components/shared/HandoverEntryButton';
import { OperatorDashboard } from '../../frontend/src/components/operator/OperatorDashboard';
import { VitalsOverview } from '../../frontend/src/components/operator/VitalsOverview';
import { DiarioPazienteTab } from '../../frontend/src/components/operator/cartella/DiarioPazienteTab';
import { TopbarTitleSlot } from '../../frontend/src/components/shared/topbarTitleSlot';
import { criticalHandoverCount } from '../../frontend/src/lib/handoverPreview';
import { URGENCY_ACKNOWLEDGED_EVENT } from '../../frontend/src/lib/urgency';
import { useDiaryUnreadCount } from '../../frontend/src/lib/useDiaryUnreadCount';
import { setCurrentOperator } from '../../frontend/src/lib/operatorSession';
import type { ConsegnaOverview } from '../../frontend/src/types';
import { setSessionCapabilities } from '../../frontend/src/lib/capabilities';
setSessionCapabilities({
  'administration.list_slots': { allowed: true },
  'consegne.list': { allowed: true },
  'parameters.create_reading': { allowed: true },
  'diary.create_entry': { allowed: true },
  'diary.list': { allowed: true },
  'diary.update_entry': { allowed: false },
  'diary.delete_entry': { allowed: false },
} as never);
const user = {
  id: 'reader',
  nome: 'Infermiere Test',
  ruolo: 'operatore' as const,
  iniziali: 'IT',
  reparto: 'Reparto Test',
};
const readings = [
  {
    id: 'r1',
    requestId: 'r1',
    patientId: 'patient-test',
    measuredAt: '2026-10-03T16:04:00Z',
    values: {
      fr: '16',
      spo2: '98',
      o2: 'no',
      pa: '120/80',
      fc: '78',
      coscienza: 'A',
      temperatura: '36',
    },
    authorOperatorId: 'writer',
    authorName: 'Infermiere Autore',
    createdAt: '2026-10-03T16:04:00Z',
  },
];
function Fixture() {
  const readingMode = new URLSearchParams(location.search).has('reading');
  useEffect(() => { if (readingMode) setCurrentOperator({ id: 'reader', role: 'infermiere' }); }, [readingMode]);
  const diaryUnreadCount = useDiaryUnreadCount(readingMode ? 'reader:infermiere' : null, readingMode);
  const [overview, setOverview] = useState<ConsegnaOverview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [page, setPage] = useState('operator-dashboard');
  const [titleSlot, setTitleSlot] = useState<HTMLDivElement | null>(null);
  const [target, setTarget] = useState('');
  const [drawer, setDrawer] = useState(false);
  async function refresh() {
    setState('loading');
    try {
      const response = await fetch('http://localhost:3001/consegne/overview');
      if (!response.ok) throw Error('unavailable');
      setOverview(await response.json());
      setState('ready');
    } catch {
      setState('error');
    }
  }
  useEffect(() => {
    void refresh();
    window.addEventListener(URGENCY_ACKNOWLEDGED_EVENT, refresh);
    return () => window.removeEventListener(URGENCY_ACKNOWLEDGED_EVENT, refresh);
  }, []);
  const count = criticalHandoverCount(overview, state);
  const nav = (key: string) => {
    setPage(key);
    setDrawer(false);
  };
  const select = (name: string, id?: string, landing?: unknown) => {
    setTarget(JSON.stringify({ name, id, landing }));
    nav('dettaglio-paziente');
  };
  return (
    <TopbarTitleSlot.Provider value={titleSlot}>
      <div className={`app-shell${drawer ? ' mobile-nav-open' : ''}`}>
        <Sidebar
          activeKey={page as never}
          utente={user}
          onNavigate={nav}
          unreadDiaryNotes={readingMode ? diaryUnreadCount : count}
        />
        <div className="main-area-clean">
          <div className="compact-topbar">
            <button
              className="topbar-hamburger"
              onClick={() => setDrawer(!drawer)}
              aria-label="Apri menu"
            >
              ☰
            </button>
            <div className="topbar-title" ref={setTitleSlot} />
            <div className="topbar-right">
              <HandoverEntryButton
                count={count}
                state={state}
                onOpen={() => nav('dettaglio-paziente')}
              />
              <button
                className="topbar-search topbar-assistant"
                title="Milo · assistente clinico AI"
              >
                Milo
              </button>
            </div>
          </div>
          <main className="page-content content-panel">
            {page === 'operator-dashboard' ? (
              <OperatorDashboard
                utente={user}
                consegneOverview={overview}
                consegneOverviewState={state}
                onRetryConsegne={refresh}
                agenda={[]}
                onNavigate={nav}
                onSelectPaziente={select}
                clinicalOverview={
                  {
                    totalPatients: 2,
                    dimessi: 0,
                    critici: 0,
                    rischiAlti: 0,
                    allergieGravi: 1,
                  } as never
                }
                clinicalOverviewState="ready"
                onRetryClinicalOverview={() => {}}
              />
            ) : (
              <div className="patient-record-view">
                <div className="cr-alert-band">
                  <button className="cr-alert-strip cr-alert-strip--allergie cr-alert-strip--severe">
                    <span>⚠</span>
                    <span>
                      <strong>Attenzione permanente · allergie gravi:</strong> Lattice
                    </span>
                    <span className="cr-alert-strip__link">Gestisci →</span>
                  </button>
                </div>
                <VitalsOverview
                  readings={readings}
                  state="ready"
                  stale={true}
                  onRetry={() => {}}
                  onOpenHistory={() => setTarget('history')}
                  onRecordNow={() => setTarget('record')}
                />
                <div className="cr-tab-content">
                  <DiarioPazienteTab pazienteId="patient-test" operatoreNome="Infermiere Test" />
                </div>
                <output data-testid="target">{target}</output>
              </div>
            )}
          </main>
        </div>
      </div>
    </TopbarTitleSlot.Provider>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
