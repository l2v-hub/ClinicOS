import React from 'react';
import { DischargeTherapyReview } from '../../../frontend/src/components/shared/intake/DischargeTherapyReview';
import { ImportProposalsReview, type ImportProposal } from '../../../frontend/src/components/shared/intake/ImportProposalsReview';
import { IntakeTherapySummary } from '../../../frontend/src/components/shared/intake/IntakeTherapySummary';
import { buildIntakeTherapyReview } from '../../../frontend/src/components/shared/intake/intakeTherapies';
import type { DischargeTherapyRow } from '../../../frontend/src/components/shared/intake/dischargeTherapy';
import fixture from './reconciliation-fixture.json';
export function ReconciliationSurface() {
  const [rows, setRows] = React.useState<DischargeTherapyRow[]>(() => {
    const saved = sessionStorage.getItem('qa-only-structured-inventory');
    return saved ? JSON.parse(saved) : fixture.rows;
  });
  const [mode, setMode] = React.useState('review');
  return <main style={{ padding: 16 }}>
    <h1>Verifica sintetica · inventario estratto</h1>
    <p>Fonte generata dal helper backend reale. Bozza solo nel browser; nessuna scrittura API/DB.</p>
    <button onClick={() => setMode('review')}>QA: revisione</button>{' '}
    <button onClick={() => setMode('proposals')}>QA: proposte</button>{' '}
    <button onClick={() => setMode('summary')}>QA: riepilogo</button>
    {mode === 'review' && <DischargeTherapyReview rows={rows} onChange={next => {
      setRows(next); sessionStorage.setItem('qa-only-structured-inventory', JSON.stringify(next));
    }} />}
    {mode === 'proposals' && <ImportProposalsReview proposals={fixture.proposals as ImportProposal[]} busy={false} onDecision={() => {}} />}
    {mode === 'summary' && buildIntakeTherapyReview({ terapiaImport: rows }).map(t => <IntakeTherapySummary key={t.index} therapy={t} busy={false} />)}
  </main>;
}
