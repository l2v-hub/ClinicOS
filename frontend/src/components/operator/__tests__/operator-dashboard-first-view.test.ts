import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(new URL('../OperatorDashboard.tsx', import.meta.url), 'utf8');
const kpis = readFileSync(new URL('../OperatorClinicalKpiBand.tsx', import.meta.url), 'utf8');
const sharedKpis = readFileSync(
  new URL('../../shared/DashboardKpiBand.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(new URL('../../shared/DashboardKpiBand.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../../App.tsx', import.meta.url), 'utf8');

test('operator first view (HMI 1 Turno): indicators, then Adesso with the compact notification center', () => {
  const kpiIndex = dashboard.indexOf('<OperatorClinicalKpiBand');
  const adessoIndex = dashboard.indexOf('<AdessoQueue');
  const notificationIndex = dashboard.indexOf('<DashboardNotificationCenter');

  assert.ok(kpiIndex >= 0);
  assert.ok(adessoIndex > kpiIndex);
  assert.ok(notificationIndex > adessoIndex);
  assert.match(dashboard, /<DashboardNotificationCenter\s+compact/);
  assert.match(dashboard, /<TurnoAppointments/);
  assert.match(dashboard, /<TurnoPatients/);
  assert.doesNotMatch(dashboard, /className="stats-grid"/);
  assert.doesNotMatch(dashboard, /className="progress-card-grid"/);
  assert.doesNotMatch(dashboard, /I Miei Pazienti|Appuntamenti Oggi|Consegne Aperte/);
});

test('management-only props are removed from the operator dashboard contract', () => {
  assert.doesNotMatch(dashboard, /totalePazienti|loadingPazienti/);
  const operatorCall = app.slice(
    app.indexOf('<OperatorDashboard'),
    app.indexOf('/>', app.indexOf('<OperatorDashboard')),
  );
  assert.doesNotMatch(operatorCall, /totalePazienti|loadingPazienti/);
});

test('HMI 1 Turno: title in the app header, no duplicate Pazienti button (it is in the rail)', () => {
  assert.match(dashboard, /<PageHeader title="Il mio turno"/);
  assert.doesNotMatch(dashboard, /operator-dashboard__patient-cta/);
});

test('clinical snapshot uses five native compact value cards', () => {
  assert.match(kpis, /<DashboardKpiBand/);
  assert.match(sharedKpis, /type="button"/);
  assert.equal((kpis.match(/id: '/g) ?? []).length, 5);
  for (const label of [
    'Parametri critici',
    'Rischi elevati',
    'Allergie gravi',
    'Ricoverati',
    'Terapie in ritardo',
  ]) {
    assert.match(kpis, new RegExp(label));
  }
  assert.match(kpis, /somministrazioni\.inCorso \|\| somministrazioni\.fallito/);
  assert.match(kpis, /status: loading \? 'Aggiornamento…' : 'Dato non disponibile'/);
  assert.match(sharedKpis, /\$\{item\.actionLabel\}/);
  assert.match(kpis, /\$\{somministrazioni\.inRitardo\} su \$\{somministrazioni\.daFare\} da fare/);
});

test('compact clinical cards stay scoped and responsive without horizontal scrolling', () => {
  assert.match(styles, /\.dashboard-kpi-band--5\s*\{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.dashboard-kpi-card\s*\{[\s\S]*?min-height: 102px/);
  assert.match(styles, /@media \(max-width: 1040px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /outline: 2px solid var\(--blue\)/);
  assert.doesNotMatch(styles, /(^|\n)\.kpi-alert-/);
});
