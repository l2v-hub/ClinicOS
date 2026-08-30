import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(
  new URL('../../components/operator/OperatorDashboard.tsx', import.meta.url),
  'utf8',
);

test('clinical overview owns an abortable retry without reloading unrelated dashboard feeds', () => {
  assert.match(app, /const loadClinicalOverview = useCallback\(async \(\) =>/);
  assert.match(app, /clinicalOverviewAbortRef\.current\?\.abort\(\)/);
  assert.match(app, /request !== clinicalOverviewRequestRef\.current/);
  assert.match(app, /setClinicalOverviewState\('error'\)/);
  assert.match(app, /onRetryClinicalOverview=\{\(\) => void loadClinicalOverview\(\)\}/);
});

test('operator dashboard never presents unavailable clinical metrics as verified zeroes', () => {
  assert.match(dashboard, /clinicalOverviewState: 'loading' \| 'ready' \| 'error'/);
  assert.match(dashboard, /clinicalOverviewReady \? value : '—'/);
  assert.match(dashboard, /Riepilogo clinico non disponibile/);
  assert.match(dashboard, /role="alert"/);
  assert.match(dashboard, /onClick=\{onRetryClinicalOverview\}/);
  assert.match(dashboard, /aria-busy=\{clinicalOverviewState === 'loading'\}/);
  assert.doesNotMatch(
    dashboard,
    /\{clinicalOverview !== null && \(\s*<div className="kpi-alert-grid"/,
  );
  assert.match(
    dashboard,
    /loadingPazienti \|\| clinicalOverviewState !== 'ready' \? '—' : totalePazienti/,
  );
});
