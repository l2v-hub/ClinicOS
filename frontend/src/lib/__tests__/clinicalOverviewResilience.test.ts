import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(
  new URL('../../components/operator/OperatorDashboard.tsx', import.meta.url),
  'utf8',
);
const notificationCenter = readFileSync(
  new URL('../../components/operator/DashboardNotificationCenter.tsx', import.meta.url),
  'utf8',
);
const notificationDetails = readFileSync(
  new URL('../../components/operator/buildDashboardNotificationSections.tsx', import.meta.url),
  'utf8',
);
const operatorKpis = readFileSync(
  new URL('../../components/operator/OperatorClinicalKpiBand.tsx', import.meta.url),
  'utf8',
);
const adminDashboard = readFileSync(
  new URL('../../components/admin/AdminDashboard.tsx', import.meta.url),
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
  assert.match(operatorKpis, /if \(!ready\)/);
  assert.match(operatorKpis, /value: '—'/);
  assert.match(notificationDetails, /Riepilogo clinico non disponibile/);
  assert.match(notificationDetails, /tone: 'warning'/);
  assert.match(dashboard, /<DashboardNotificationCenter/);
  assert.match(notificationCenter, /AccessibleDialogSurface/);
  assert.match(notificationDetails, /onClick=\{onRetryClinicalOverview\}/);
  assert.match(operatorKpis, /aria-busy=\{loading\}/);
  assert.match(operatorKpis, /somministrazioni\.inCorso \|\| somministrazioni\.fallito/);
  assert.doesNotMatch(dashboard, /loadingPazienti|totalePazienti/);
});

test('admin dashboard shares the same explicit unavailable-data and recovery contract', () => {
  assert.match(adminDashboard, /clinicalOverviewState: 'loading' \| 'ready' \| 'error'/);
  assert.match(adminDashboard, /clinicalOverviewReady \? value : '—'/);
  assert.match(adminDashboard, /Riepilogo clinico non disponibile/);
  assert.match(adminDashboard, /onClick=\{onRetryClinicalOverview\}/);
  assert.match(adminDashboard, /aria-busy=\{clinicalOverviewState === 'loading'\}/);
  assert.doesNotMatch(adminDashboard, /\{clinicalOverview !== null && \([\s\S]*Situazione Clinica/);
  assert.match(
    adminDashboard,
    /loadingPazienti \|\| clinicalOverviewState !== 'ready' \? '—' : totalePazienti/,
  );
  assert.match(app, /<AdminDashboard[\s\S]*clinicalOverviewState=\{clinicalOverviewState\}/);
});
