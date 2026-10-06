import { createRoot } from 'react-dom/client';
import { IntakeWorkspace } from '../../frontend/src/components/shared/intake/IntakeWorkspace';
import '../../frontend/src/index.css';
import '../../frontend/src/App.css';
import '../../frontend/src/design-system.css';

// Uses the actual intake workspace; all API requests are intercepted by the QA runner.
createRoot(document.getElementById('root')!).render(
  <IntakeWorkspace
    open
    onClose={() => {}}
    importDraftId="synthetic-intake"
    operatorId="synthetic-operator"
    operatorRole="MEDICO"
    operatoreNome="Operatore test"
  />,
);
