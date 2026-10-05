import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../frontend/src/index.css';
import '../../frontend/src/App.css';
import '../../frontend/src/design-system.css';
import '../../frontend/src/app-additions.css';
import '../../frontend/src/components/operator/ConsegneRounds.css';
import { DiarioPazienteTab } from '../../frontend/src/components/operator/cartella/DiarioPazienteTab';
import { ConsegnaComposer } from '../../frontend/src/components/operator/ConsegnaComposer';
import { ConsegneRounds } from '../../frontend/src/components/operator/ConsegneRounds';
import { createConsegna } from '../../frontend/src/lib/consegnaCreation';
import { createConsegnaDraftStore } from '../../frontend/src/lib/consegnaDrafts';
import { setSessionCapabilities } from '../../frontend/src/lib/capabilities';
import { identityPatient } from '../../frontend/src/components/operator/__tests__/operationalIdentity.fixtures';
import type { DiarioEntry } from '../../frontend/src/types';
const legacy: DiarioEntry[] = new URLSearchParams(location.search).has('legacy')
  ? Array.from({ length: 120 }, (_, i) => ({
      id: `legacy-test-${i}`,
      data: '2026-09-01',
      ora: '08:00',
      turno: 'mattina',
      tipo: 'ordinario',
      testo: 'Storico legacy sintetico',
      operatore: 'Operatore Test',
      createdAt: '2026-09-01T08:00',
    }))
  : [];
const caps = (doctor: boolean) =>
  Object.fromEntries(
    [
      'diary.list',
      'diary.create',
      'diary.update_entry',
      'consegne.list',
      'consegne.create',
      'diary.create_with_therapy',
    ].map((id) => [
      id,
      { allowed: id !== 'diary.create_with_therapy' || doctor, effect: 'ALLOWED' as const },
    ]),
  );
setSessionCapabilities(caps(false));
function Fixture() {
  const rounds = new URLSearchParams(location.search).has('rounds');
  const [doctor, setDoctor] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [store] = useState(() => {
    const drafts = createConsegnaDraftStore();
    if (rounds) drafts.bindStorage('synthetic-rounds');
    return drafts;
  });
  const [saved, setSaved] = useState(0);
  const [view, setView] = useState('diary');
  useEffect(
    () => setSessionCapabilities({ ...caps(doctor), 'consegne.create': { allowed: !readOnly } }),
    [doctor, readOnly],
  );
  if (rounds)
    return (
      <div className="app-shell">
        <nav className="teams-sidebar" aria-label="Navigazione sintetica">
          <span style={{ color: '#fff', padding: 16 }}>Consegne</span>
        </nav>
        <div className="main-area-clean">
          <div className="compact-topbar">
            <h1 style={{ fontSize: 20 }}>Consegne</h1>
            <button data-testid="toggle-writing" onClick={() => setReadOnly((value) => !value)}>
              Permesso sintetico
            </button>
          </div>
          <main className="page-content content-panel">
            <div className="handover-workspace">
              <ConsegneRounds
                store={store}
                operatori={[]}
                active
                onAdd={(request) =>
                  createConsegna('http://localhost:3001', request, { headers: {} })
                }
              />
            </div>
          </main>
        </div>
      </div>
    );
  return (
    <main style={{ maxWidth: 1000, margin: 'auto', padding: 16 }}>
      <h1>Flussi sintetici di validazione</h1>
      <button onClick={() => setView('diary')}>Diario test</button>
      <button onClick={() => setView('handover')}>Consegna test</button>
      <button onClick={() => setDoctor((v) => !v)}>
        Ruolo: {doctor ? 'Medico' : 'Infermiere'}
      </button>
      <span data-testid="save-count">{saved}</span>
      {view === 'diary' ? (
        <DiarioPazienteTab
          pazienteId={identityPatient.id}
          operatoreNome="Operatore Test"
          legacyInfermieristico={legacy}
        />
      ) : (
        <ConsegnaComposer
          patient={identityPatient}
          store={store}
          operatori={[]}
          onSave={() => setSaved((v) => v + 1)}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
