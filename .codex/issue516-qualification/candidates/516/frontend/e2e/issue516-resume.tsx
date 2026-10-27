// Synthetic test entry, separate from the production application entry.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NewPatientFlow } from '../src/components/operator/NewPatientFlow';
import { listDrafts, type DraftResponse } from '../src/components/shared/intake/intakeDraftApi';
import '../src/components/shared/DischargeImportModal';
import '../src/index.css';
import '../src/App.css';
import '../src/design-system.css';

const actor = { operatorId: 'operator-qa-516', operatorRole: 'MEDICO' };
function Fixture() {
  const [open, setOpen] = useState(new URLSearchParams(location.search).get('open') === '1');
  const [resume, setResume] = useState<string | undefined>('draft-qa-516');
  const [drafts, setDrafts] = useState<DraftResponse[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void listDrafts(actor)
      .then((rows) => {
        if (active) setDrafts(rows);
      })
      .catch(() => {
        if (active) setError('Synthetic draft list unavailable');
      });
    return () => {
      active = false;
    };
  }, [open]);
  function close() {
    history.replaceState({}, '', location.pathname);
    setOpen(false);
  }
  return (
    <div className="app-shell">
      <div className="main-area-clean">
        <header className="compact-topbar">ClinicOS · verifica sintetica #516</header>
        <main className="page-content content-panel">
          <h1>Pratiche salvate · dati sintetici</h1>
          {error && <p role="alert">{error}</p>}
          <output aria-label="Numero pratiche">{drafts.length}</output>
          <ul aria-label="Pratiche salvate">
            {drafts.map((draft) => (
              <li key={draft.id} data-draft-id={draft.id}>
                <button
                  onClick={() => {
                    setResume(draft.id);
                    history.replaceState({}, '', `${location.pathname}?open=1`);
                    setOpen(true);
                  }}
                >
                  Riprendi pratica sintetica
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setResume(undefined);
              setOpen(true);
            }}
          >
            Riprendi altra importazione
          </button>
          {open && (
            <NewPatientFlow
              initialPath="documenti"
              resumeDraftId={resume}
              {...actor}
              onClose={close}
              onDone={() => {
                throw new Error('Confirmation is outside this fixture');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
const mount = document.getElementById('root') as HTMLElement & {
  qa516Root?: ReturnType<typeof createRoot>;
};
// Keep the same React root if Vite refreshes this test entry after dependency scanning.
mount.qa516Root ??= createRoot(mount);
mount.qa516Root.render(<Fixture />);
