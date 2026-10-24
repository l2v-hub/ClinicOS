// Test-only entry, excluded from the production Vite entry. No real clinical data.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
// Preload the dev-only lazy graph before exercising UI; production remains lazy.
import '../src/components/shared/DischargeImportModal';
import { NewPatientFlow } from '../src/components/operator/NewPatientFlow';
import { job } from '../src/components/shared/import/__tests__/fixtures';
import '../src/index.css';
import '../src/App.css';
import '../src/design-system.css';

function Fixture() {
  const [path, setPath] = useState<'documenti' | 'manuale' | null>(null);
  const [resume, setResume] = useState<string>();
  const [navigation, setNavigation] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  return <div className={`app-shell${navOpen ? ' app-shell--nav-open' : ''}`}>
    <aside className="teams-sidebar"><button onClick={() => { setNavigation(n => n + 1); setNavOpen(false); }}>Pazienti QA</button></aside>
    <div className="main-area-clean">
      <header className="compact-topbar"><button aria-label="Apri navigazione" onClick={() => setNavOpen(x => !x)}>Menu</button><span>ClinicOS · QA sintetica #506</span><button onClick={() => setNavigation(n => n + 1)}>Profilo QA</button><button onClick={() => { setNavigation(n => n + 1); setPath(null); }}>Cambia pagina QA</button></header>
      <main className="page-content content-panel"><div>
        <h1>Nuovo ingresso · dati sintetici</h1><output aria-label="Navigazioni">{navigation}</output>
        <button onClick={() => { setResume(undefined); setPath('documenti'); }}>Importa dimissione</button>
        <button onClick={() => { setResume('draft-qa-506'); setPath('documenti'); }}>Riprendi bozza</button>
        {path && <NewPatientFlow initialPath={path} resumeDraftId={resume} operatorId="operator-qa-506" operatorRole="MEDICO" onClose={() => setPath(null)} onDone={() => { throw new Error('Patient confirmation is outside this QA'); }} />}
      </div></main>
    </div>
  </div>;
}
// Fixture data export used only by the browser runner through this local QA entry.
Object.assign(window, { issue506FixtureJob: job() });
createRoot(document.getElementById('root')!).render(<Fixture />);
