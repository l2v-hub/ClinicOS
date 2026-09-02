import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(new URL('../AdminDashboard.tsx', import.meta.url), 'utf8');
const adminKpis = readFileSync(new URL('../AdminDashboardKpiBands.tsx', import.meta.url), 'utf8');
const sharedKpis = readFileSync(
  new URL('../../shared/DashboardKpiBand.tsx', import.meta.url),
  'utf8',
);
const sharedStyles = readFileSync(
  new URL('../../shared/DashboardKpiBand.css', import.meta.url),
  'utf8',
);
const details = readFileSync(
  new URL('../../operator/buildDashboardNotificationSections.tsx', import.meta.url),
  'utf8',
);

test('admin first view uses the shared compact notification center', () => {
  const notificationIndex = dashboard.indexOf('<DashboardNotificationCenter');
  const kpiIndex = dashboard.indexOf('<AdminDashboardKpiBands');

  assert.ok(notificationIndex >= 0);
  assert.ok(kpiIndex > notificationIndex);
  assert.match(dashboard, /buildDashboardNotificationCounts/);
  assert.match(dashboard, /buildDashboardNotificationSections/);
  assert.match(dashboard, /agendaNav: 'agenda-admin'/);
  assert.match(details, /agendaNav = 'agenda-operatore'/);
  assert.doesNotMatch(dashboard, /className="coverage-alert"/);
  assert.doesNotMatch(dashboard, /className="stats-grid"/);
  assert.doesNotMatch(dashboard, /className="stat-card/);
  assert.doesNotMatch(dashboard, /className="kpi-alert/);
  assert.doesNotMatch(dashboard, /somministrazioni\.ritardi\.slice/);
});

test('admin-only room failures remain counted and recoverable inside notifications', () => {
  assert.match(dashboard, /roomWarningCount = camereLoadState === 'error' \? 1 : 0/);
  assert.match(dashboard, /warning: baseNotificationCounts\.warning \+ roomWarningCount/);
  assert.match(dashboard, /total: baseNotificationCounts\.total \+ roomWarningCount/);
  assert.match(dashboard, /id: 'occupazione-non-disponibile'/);
  assert.match(dashboard, /onClick=\{onRetryCamere\}/);
  assert.match(dashboard, /camereLoadState === 'idle'/);
  assert.match(dashboard, /camereLoadState === 'loading'/);
});

test('management and clinical values use one native shared KPI primitive', () => {
  assert.equal((adminKpis.match(/<DashboardKpiBand/g) ?? []).length, 2);
  assert.match(sharedKpis, /type="button"/);
  assert.match(sharedKpis, /aria-label=\{`\$\{item\.label\}/);
  assert.doesNotMatch(adminKpis, /role="button"|tabIndex=|onKeyDown=/);

  for (const label of [
    'Totale pazienti',
    'Operatori attivi',
    'Appuntamenti oggi',
    'Consegne aperte',
    'Parametri critici',
    'Rischi alti/critici',
    'Consegne in corso',
    'Dimessi in archivio',
    'Somministrazioni in ritardo',
  ]) {
    assert.match(adminKpis, new RegExp(label));
  }
});

test('shared KPI layout has equal card geometry and responsive no-overflow grids', () => {
  assert.match(sharedStyles, /\.dashboard-kpi-band--4\s*\{[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(sharedStyles, /\.dashboard-kpi-band--5\s*\{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(sharedStyles, /\.dashboard-kpi-card\s*\{[\s\S]*?min-width: 0/);
  assert.match(sharedStyles, /\.dashboard-kpi-card\s*\{[\s\S]*?min-height: 102px/);
  assert.match(sharedStyles, /@media \(max-width: 1040px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(sharedStyles, /@media \(max-width: 700px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(sharedStyles, /\.dashboard-kpi-card:focus-visible/);
  assert.doesNotMatch(sharedStyles, /overflow-x:\s*(auto|scroll)/);
});
