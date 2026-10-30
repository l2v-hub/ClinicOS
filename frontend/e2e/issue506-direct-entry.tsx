// Test-only entry, not imported by the production entry. No real authentication or patient data.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PatientList } from '../src/components/operator/PatientList';
import { AIImportStatus } from '../src/components/shared/AIImportStatus';
import { setCurrentOperator } from '../src/lib/operatorSession';
import { setSessionCapabilities } from '../src/lib/capabilities';
import '../src/index.css';
import '../src/App.css';
import '../src/design-system.css';

// Explicit, synthetic UI-session projection. Server/API behavior is intercepted by the runner.
setCurrentOperator({ id: 'operator-qa-direct506', role: 'MEDICO' });
setSessionCapabilities({
  'intake.create_draft': { allowed: true, effect: 'ALLOWED', requiresConfirmation: false },
  'patients.list_page': { allowed: true, effect: 'ALLOWED', requiresConfirmation: false },
  'administration.list_slots': { allowed: false, effect: 'DENIED', requiresConfirmation: false },
  'patients.clinical_summary': { allowed: false, effect: 'DENIED', requiresConfirmation: false },
});

function Fixture() {
  const [search, setSearch] = useState('');
  const [sex, setSex] = useState<'tutti' | 'M' | 'F'>('tutti');
  const [navOpen, setNavOpen] = useState(false);
  const [showList, setShowList] = useState(true);
  const [navigation, setNavigation] = useState(0);
  const defaultDialog = new URLSearchParams(location.search).has('dialog');
  const forbidConfirmation = () => { throw new Error('Patient confirmation is outside synthetic presentation QA'); };
  return <div className={`app-shell${navOpen ? ' app-shell--nav-open' : ''}`}>
    <aside className="teams-sidebar">
      <button className="teams-sidebar__item" onClick={() => { setShowList(true); setNavOpen(false); setNavigation(n => n + 1); }}>Pazienti QA</button>
    </aside>
    <div className="main-area-clean">
      <header className="compact-topbar">
        <button aria-label="Apri navigazione" onClick={() => setNavOpen(x => !x)}>Menu</button>
        <span>ClinicOS · solo dati sintetici #506</span>
        <button className="topbar-back" onClick={() => { setShowList(false); setNavigation(n => n + 1); }}>Cambia pagina QA</button>
        <output aria-label="Navigazioni">{navigation}</output>
      </header>
      <main className="page-content content-panel"><div>
        {defaultDialog ? <AIImportStatus onImported={forbidConfirmation} /> : showList ?
          <PatientList totalPatients={0} ricerca={search} onRicercaChange={setSearch}
            filtroSesso={sex} onFiltroSessoChange={setSex} onSelect={forbidConfirmation}
            onImported={forbidConfirmation} operatorId="operator-qa-direct506" operatorRole="MEDICO" /> :
          <h1>Pagina QA alternativa</h1>}
      </div></main>
    </div>
  </div>;
}

// Deliberately NO import/preload of DischargeImportModal: the runner tests the actual lazy fallback.
createRoot(document.getElementById('root')!).render(<Fixture />);
