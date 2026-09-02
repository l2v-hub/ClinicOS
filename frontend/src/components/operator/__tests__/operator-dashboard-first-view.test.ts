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

test('operator first view contains notifications then the compact clinical band', () => {
  const notificationIndex = dashboard.indexOf('<DashboardNotificationCenter');
  const kpiIndex = dashboard.indexOf('<OperatorClinicalKpiBand');

  assert.ok(notificationIndex >= 0);
  assert.ok(kpiIndex > notificationIndex);
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

test('header patient action reuses the canonical secondary button', () => {
  assert.match(dashboard, /type="button"/);
  assert.match(dashboard, /className="btn-secondary operator-dashboard__patient-cta"/);
  assert.match(dashboard, /<IcoPazienti \/> Pazienti/);
  assert.match(dashboard, /onClick=\{\(\) => onNavigate\('pazienti'\)\}/);
});

test('clinical snapshot uses five native compact value cards', () => {
  assert.match(kpis, /<DashboardKpiBand/);
  assert.match(sharedKpis, /type="button"/);
  assert.equal((kpis.match(/id: '/g) ?? []).length, 5);
  for (const label of [
    'Parametri critici',
    'Rischi elevati',
    'Allergie gravi',
    'Ricoverati attivi',
    'Somministrazioni in ritardo',
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
