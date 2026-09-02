import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dashboard = readFileSync(new URL('../OperatorDashboard.tsx', import.meta.url), 'utf8');
const notificationCenter = readFileSync(
  new URL('../DashboardNotificationCenter.tsx', import.meta.url),
  'utf8',
);
const notificationDetails = readFileSync(
  new URL('../buildDashboardNotificationSections.tsx', import.meta.url),
  'utf8',
);
const notificationStyles = readFileSync(
  new URL('../DashboardNotificationCenter.css', import.meta.url),
  'utf8',
);
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
  assert.match(alertLimits, /MAX_DASHBOARD_NOTIFICATION_PATIENTS = 10/);
  assert.match(notificationDetails, /MAX_ANOMALIE_NEL_RIEPILOGO/);
  assert.match(
    notificationDetails,
    /anomalie\.pazienti\.slice\(0, MAX_DASHBOARD_NOTIFICATION_PATIENTS\)/,
  );
  assert.match(
    notificationDetails,
    /somministrazioni\.ritardi\.slice\(0, MAX_DASHBOARD_NOTIFICATION_PATIENTS\)/,
  );
  assert.match(notificationDetails, /p\.esito\.anomalie\.slice\(0, MAX_ANOMALIE_NEL_RIEPILOGO\)/);
  assert.match(notificationDetails, /Apri lista pazienti/);
  assert.match(
    notificationDetails,
    /\+\{p\.esito\.anomalie\.length - MAX_ANOMALIE_NEL_RIEPILOGO\}/,
  );
});

test('operator and admin reuse the same bounded notification details', () => {
  assert.match(alertLimits, /MAX_DASHBOARD_DELAY_ITEMS = 3/);
  assert.match(notificationDetails, /p\.voci\.slice\(0, MAX_DASHBOARD_DELAY_ITEMS\)/);
  assert.match(notificationDetails, /p\.voci\.length - MAX_DASHBOARD_DELAY_ITEMS/);
  assert.match(notificationDetails, /className="anomalie-reparto__farmaci-lista"/);
  assert.match(adminDashboard, /<DashboardNotificationCenter/);
  assert.match(adminDashboard, /buildDashboardNotificationSections/);
  assert.match(adminDashboard, /agendaNav: 'agenda-admin'/);
  assert.doesNotMatch(adminDashboard, /somministrazioni\.ritardi\.slice/);
  assert.doesNotMatch(adminDashboard, /className="coverage-alert"/);
});

test('patient, drug chips and compact count have explicit visual hierarchy', () => {
  assert.match(notificationDetails, /className="anomalie-reparto__contenuto"/);
  assert.match(notificationDetails, /className="anomalie-reparto__nome"/);
  assert.match(notificationDetails, /className="anomalie-reparto__farmaci-lista"/);
  assert.match(notificationDetails, /className="anomalie-reparto__farmaco"/);
  assert.match(styles, /\.anomalie-reparto__contenuto\s*\{[\s\S]*?flex: 1 1 auto/);
  assert.match(
    styles,
    /\.anomalie-reparto__riga > \.indicatore-anomalie\s*\{[\s\S]*?width: max-content/,
  );
});

test('anomaly row exposes an intentional accessible name and keyboard focus', () => {
  assert.match(
    notificationDetails,
    /aria-label=\{`Apri \$\{p\.nome\}\. \$\{messaggioAnomalieCompatto\(p\.esito\)\}`\}/,
  );
  assert.match(dashboard, /<DashboardNotificationCenter/);
  assert.doesNotMatch(dashboard, /className="coverage-alert" role="alert"/);
  assert.match(notificationCenter, /AccessibleDialogSurface/);
  assert.match(notificationCenter, /aria-haspopup="dialog"/);
  assert.match(notificationCenter, /aria-pressed=\{activeTone === tone\}/);
  assert.match(styles, /\.anomalie-reparto__riga:focus-visible/);
  assert.match(styles, /outline: 3px solid #8a5a00/);
  assert.match(styles, /outline-offset: 2px/);
});

test('notification bar keeps all severity labels visible and responsive', () => {
  assert.match(notificationCenter, /label: 'Allarmi'/);
  assert.match(notificationCenter, /label: 'Warning'/);
  assert.match(notificationCenter, /label: 'Avvisi'/);
  assert.match(notificationCenter, /data-dialog-initial-focus/);
  assert.match(notificationStyles, /position: sticky/);
  assert.match(notificationStyles, /dashboard-notification-bar--loading/);
  assert.match(notificationStyles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(notificationStyles, /min-height: 44px/);
  assert.match(notificationStyles, /max-height: 320px/);
  assert.match(notificationStyles, /overflow-y: auto/);
});
