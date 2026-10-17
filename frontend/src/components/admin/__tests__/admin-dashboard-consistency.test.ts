import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(new URL('../AdminDashboard.tsx', import.meta.url), 'utf8');
const workloadHeading = readFileSync(
  new URL('../OperatorWorkloadHeading.tsx', import.meta.url),
  'utf8',
);
const appStyles = readFileSync(new URL('../../../App.css', import.meta.url), 'utf8');
const adminKpis = readFileSync(new URL('../AdminDashboardKpiBands.tsx', import.meta.url), 'utf8');
const sharedKpis = readFileSync(
  new URL('../../shared/DashboardKpiBand.tsx', import.meta.url),
  'utf8',
);
const sharedStyles = readFileSync(
  new URL('../../shared/DashboardKpiBand.css', import.meta.url),
  'utf8',
);

test('admin first view prioritizes the actionable unified attention queue', () => {
  assert.match(dashboard, /<AdminAttentionList/);
  assert.match(dashboard, /buildAdminAttention/);
  assert.match(dashboard, /useUnreadUrgencies\(canReadDiary\)/);
  assert.match(dashboard, /useCan\('diary.list'\)/);
  assert.doesNotMatch(dashboard, /<DashboardNotificationCenter|<AdminDashboardKpiBands/);
  assert.doesNotMatch(dashboard, /<DashboardTherapyDeadlines/);
  assert.doesNotMatch(
    dashboard,
    /className="coverage-alert"|className="stats-grid"|className="stat-card|className="kpi-alert/,
  );
  assert.doesNotMatch(dashboard, /somministrazioni\.ritardi\.slice/);
});

test('room failures remain explicit and independently recoverable without stale occupancy claims', () => {
  assert.match(dashboard, /camereLoadState === 'error'/);
  assert.match(dashboard, /Occupazione non aggiornata/);
  assert.match(dashboard, /ultimi dati/);
  assert.match(dashboard, /onClick=\{onRetryCamere\}/);
  assert.match(dashboard, /camereLoadState === 'idle'/);
  assert.match(dashboard, /camereLoadState === 'loading'/);
  assert.match(dashboard, /canReadRooms &&/);
  assert.match(dashboard, /Configura camere/);
});

test('management and clinical values use one native shared KPI primitive', () => {
  assert.equal((adminKpis.match(/<DashboardKpiBand/g) ?? []).length, 2);
  assert.match(sharedKpis, /type="button"/);
  assert.match(sharedKpis, /aria-label=\{`\$\{item\.label\}/);
  assert.doesNotMatch(adminKpis, /role="button"|tabIndex=|onKeyDown=/);

  // UX2 W8: no aperta / in corso / completata in the KPI labels.
  assert.doesNotMatch(adminKpis, /Consegne aperte|Consegne in corso|status: 'in_corso'/);
  for (const label of [
    'Totale pazienti',
    'Operatori attivi',
    'Appuntamenti oggi',
    'Urgenze da prendere in carico',
    'Parametri critici',
    'Rischi alti/critici',
    'Urgenze prese in carico',
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

test('on-duty roster uses configured schedules and preserves the independent operator heading primitive', () => {
  assert.match(dashboard, /useCan\('operators.schedules'\)/);
  assert.match(dashboard, /operatorsOnDuty\(operatori, staffing.rows, staffing.now\)/);
  assert.match(dashboard, /currentStaff\.map/);
  assert.match(dashboard, /data-on-duty=\{operator.id\}/);
  assert.match(dashboard, /operator.pazientiAssegnati/);
  assert.match(dashboard, /Nessun orario configurato/);
  assert.match(dashboard, /Configura turni/);
  assert.match(workloadHeading, /import[\s\S]*IcoUser[\s\S]*from '\.\.\/\.\.\/icons'/);
  assert.match(workloadHeading, /className="dashboard-person-icon"[\s\S]*aria-hidden="true"/);
  assert.match(workloadHeading, /<IcoUser \/>/);
  assert.doesNotMatch(workloadHeading, /className="op-avatar-sm"[\s\S]*\{op\.iniziali\}/);
  assert.match(appStyles, /\.dashboard-person-icon\s*\{[^}]*width:\s*32px[^}]*height:\s*32px/s);
});
