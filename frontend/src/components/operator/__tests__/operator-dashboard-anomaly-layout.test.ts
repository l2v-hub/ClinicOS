import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dashboard = readFileSync(new URL('../OperatorDashboard.tsx', import.meta.url), 'utf8');
const adminDashboard = readFileSync(
  new URL('../../admin/AdminDashboard.tsx', import.meta.url),
  'utf8',
);
const alertLimits = readFileSync(
  new URL('../../shared/dashboardAlertLimits.ts', import.meta.url),
  'utf8',
);
const styles = readFileSync(
  new URL('../cartella/AvvisoAnomalieFarmaci.css', import.meta.url),
  'utf8',
);

test('dashboard anomaly worklist is bounded in both dimensions', () => {
  assert.match(dashboard, /const MAX_DASHBOARD_ANOMALY_PATIENTS = 3/);
  assert.match(dashboard, /MAX_ANOMALIE_NEL_RIEPILOGO/);
  assert.match(dashboard, /anomalie\.pazienti\.slice\(0, MAX_DASHBOARD_ANOMALY_PATIENTS\)/);
  assert.match(dashboard, /p\.esito\.anomalie\.slice\(0, MAX_ANOMALIE_NEL_RIEPILOGO\)/);
  assert.match(dashboard, /Apri lista pazienti/);
  assert.match(dashboard, /\+\{p\.esito\.anomalie\.length - MAX_ANOMALIE_NEL_RIEPILOGO\}/);
});

test('operator and admin delay alerts share a bounded item layout', () => {
  assert.match(alertLimits, /MAX_DASHBOARD_DELAY_ITEMS = 3/);
  for (const source of [dashboard, adminDashboard]) {
    assert.match(source, /p\.voci\.slice\(0, MAX_DASHBOARD_DELAY_ITEMS\)/);
    assert.match(source, /p\.voci\.length - MAX_DASHBOARD_DELAY_ITEMS/);
    assert.match(source, /className="anomalie-reparto__farmaci-lista"/);
  }
  assert.match(adminDashboard, /import '\.\.\/operator\/cartella\/AvvisoAnomalieFarmaci\.css'/);
  assert.doesNotMatch(adminDashboard, /p\.voci\s*\.map\(/);
});

test('patient, drug chips and compact count have explicit visual hierarchy', () => {
  assert.match(dashboard, /className="anomalie-reparto__contenuto"/);
  assert.match(dashboard, /className="anomalie-reparto__nome"/);
  assert.match(dashboard, /className="anomalie-reparto__farmaci-lista"/);
  assert.match(dashboard, /className="anomalie-reparto__farmaco"/);
  assert.match(styles, /\.anomalie-reparto__contenuto\s*\{[\s\S]*?flex: 1 1 auto/);
  assert.match(
    styles,
    /\.anomalie-reparto__riga > \.indicatore-anomalie\s*\{[\s\S]*?width: max-content/,
  );
});

test('anomaly row exposes an intentional accessible name and keyboard focus', () => {
  assert.match(
    dashboard,
    /aria-label=\{`Apri \$\{p\.nome\}\. \$\{messaggioAnomalieCompatto\(p\.esito\)\}`\}/,
  );
  assert.match(dashboard, /className="coverage-alert" role="alert"/);
  assert.match(styles, /\.anomalie-reparto__riga:focus-visible/);
  assert.match(styles, /outline: 3px solid #8a5a00/);
  assert.match(styles, /outline-offset: 2px/);
});
