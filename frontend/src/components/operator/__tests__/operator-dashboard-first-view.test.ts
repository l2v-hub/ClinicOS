import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(new URL('../OperatorDashboard.tsx', import.meta.url), 'utf8');
import { buildTurnoChips } from '../../../lib/turnoChips';
const sharedKpis = readFileSync(
  new URL('../../shared/DashboardKpiBand.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(new URL('../../shared/DashboardKpiBand.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../../App.tsx', import.meta.url), 'utf8');

test('operator first view (#445): action chips, then the queue to administer, no counters or notes', () => {
  const chipsIndex = dashboard.indexOf('<TurnoActionChips');
  const adessoIndex = dashboard.indexOf('<AdessoQueue');
  const notificationIndex = dashboard.indexOf('<DashboardNotificationCenter');

  assert.ok(chipsIndex >= 0);
  assert.ok(adessoIndex > chipsIndex);
  assert.ok(notificationIndex > adessoIndex);
  assert.match(dashboard, /<DashboardNotificationCenter\s+compact/);
  assert.match(dashboard, /<TurnoAppointments/);
  assert.match(dashboard, /<TurnoHandovers/);
  assert.doesNotMatch(dashboard, /OperatorClinicalKpiBand|dashboard-regime-note/);
  assert.doesNotMatch(dashboard, /<TurnoPatients/);
  assert.doesNotMatch(dashboard, /className="stats-grid"/);
  assert.doesNotMatch(dashboard, /className="progress-card-grid"/);
  assert.doesNotMatch(dashboard, /I Miei Pazienti|Appuntamenti Oggi|Consegne Aperte/);
  // La coda non ripete urgenze e farmaci da verificare: stanno nelle chip e in «Da leggere».
  assert.match(dashboard, /urgenti: \[\],\s*anomalie: \[\],/);
  assert.match(dashboard, /onAcknowledge=\{onAcknowledgeConsegna\}/);
  assert.match(app, /onAcknowledgeConsegna=\{acknowledgeConsegna\}/);
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

test('chips name only what needs an action and open the exact place', () => {
  const opened: string[] = [];
  const chips = buildTurnoChips({
    urgentToTakeCharge: 1,
    urgentState: 'ready',
    critici: 1,
    clinicalState: 'ready',
    anomalie: { pazienti: 1, farmaci: 3, fallito: false },
    onOpenUrgent: () => opened.push('urgenze'),
    onOpenCritici: () => opened.push('critici'),
    onRetryClinical: () => opened.push('retry'),
    onOpenAnomalie: () => opened.push('anomalie'),
  });
  assert.deepEqual(
    chips.map((c) => c.label),
    [
      '1 urgenza da prendere in carico',
      '1 parametro critico',
      '3 farmaci da far verificare al medico',
    ],
  );
  chips.forEach((c) => c.onOpen?.());
  assert.deepEqual(opened, ['urgenze', 'critici', 'anomalie']);
});

test('compact clinical cards stay scoped and responsive without horizontal scrolling', () => {
  assert.match(styles, /\.dashboard-kpi-band--5\s*\{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.dashboard-kpi-card\s*\{[\s\S]*?min-height: 102px/);
  assert.match(styles, /@media \(max-width: 1040px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /outline: 2px solid var\(--blue\)/);
  assert.doesNotMatch(styles, /(^|\n)\.kpi-alert-/);
});
