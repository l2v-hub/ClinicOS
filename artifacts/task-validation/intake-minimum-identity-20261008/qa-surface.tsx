import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IntakeWorkspace } from '../../../frontend/src/components/shared/intake/IntakeWorkspace';
import '../../../frontend/src/App.css';
import '../../../frontend/src/index.css';
import '../../../frontend/src/design-system.css';
function QaSurface() {
  const [open, setOpen] = useState(true);
  const [created, setCreated] = useState('');
  return <><p>QA only: synthetic fixtures, mocked draft transport; no production access.</p>
    <output data-testid="qa-created">{created}</output>
    {open && <IntakeWorkspace open={open} importDraftId="qa-minimum" operatorId="qa-operator" operatorRole="operatore" onClose={() => setOpen(false)} onCreated={(id) => setCreated(id)} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<QaSurface />);
