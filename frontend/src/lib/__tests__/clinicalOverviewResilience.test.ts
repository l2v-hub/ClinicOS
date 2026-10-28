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
import { buildTurnoChips } from '../turnoChips';
const sharedKpis = readFileSync(
  new URL('../../components/shared/DashboardKpiBand.tsx', import.meta.url),
  'utf8',
);
const adminDashboard = readFileSync(
  new URL('../../components/admin/AdminDashboard.tsx', import.meta.url),
  'utf8',
);
const adminKpis = readFileSync(
  new URL('../../components/admin/AdminDashboardKpiBands.tsx', import.meta.url),
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
  assert.match(notificationDetails, /Riepilogo clinico non disponibile/);
  assert.match(notificationDetails, /tone: 'warning'/);
  assert.match(dashboard, /<DashboardNotificationCenter/);
  assert.match(notificationCenter, /AccessibleDialogSurface/);
  assert.match(notificationDetails, /onClick=\{onRetryClinicalOverview\}/);
  assert.match(sharedKpis, /aria-busy=\{loading\}/);
  assert.doesNotMatch(dashboard, /loadingPazienti|totalePazienti/);
  // #445: chip in cima al Turno — un dato in caricamento non diventa «0», un errore si dice.
  const base = {
    urgentToTakeCharge: 0,
    urgentState: 'ready' as const,
    critici: 0,
    clinicalState: 'ready' as const,
    anomalie: { pazienti: 0, farmaci: 0, fallito: false },
    onOpenUrgent: () => {},
    onOpenCritici: () => {},
    onRetryClinical: () => {},
    onOpenAnomalie: () => {},
  };
  assert.deepEqual(buildTurnoChips(base), []);
  assert.deepEqual(buildTurnoChips({ ...base, critici: 3, clinicalState: 'loading' }), []);
  const failed = buildTurnoChips({ ...base, clinicalState: 'error', urgentState: 'error' });
  assert.deepEqual(
    failed.map((c) => c.label),
    ['Urgenze non disponibili', 'Parametri critici non disponibili · Riprova'],
  );
});

test('admin dashboard shares the same explicit unavailable-data and recovery contract', () => {
  assert.match(adminDashboard, /clinicalOverviewState: 'loading' \| 'ready' \| 'error'/);
  assert.match(adminDashboard, /buildAdminAttention/);
  assert.match(adminDashboard, /onRetryClinicalOverview/);
  assert.match(adminDashboard, /<AdminAttentionList/);
  assert.match(adminDashboard, /clinicalOverviewState === 'error'/);
  assert.match(adminDashboard, /Riprova dati clinici/);
  assert.match(adminDashboard, /sono mostrati gli ultimi dati disponibili/);
  assert.doesNotMatch(adminDashboard, /clinicalOverview\?\.critici \?\? 0/);
  assert.match(adminKpis, /if \(!ready\)/);
  assert.match(adminKpis, /value: '—'/);
  assert.match(adminKpis, /clinicalOverviewState === 'loading'/);
  assert.doesNotMatch(adminDashboard, /\{clinicalOverview !== null && \([\s\S]*Situazione Clinica/);
  assert.match(adminKpis, /value: loadingPazienti \? '—' : totalePazienti/);
  assert.match(app, /<AdminDashboard[\s\S]*clinicalOverviewState=\{clinicalOverviewState\}/);
});
