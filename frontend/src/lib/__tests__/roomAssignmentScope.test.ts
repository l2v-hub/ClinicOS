import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSource = readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');
const roomsSource = readFileSync(
  fileURLToPath(new URL('../../components/admin/RoomsManagement.tsx', import.meta.url)),
  'utf8',
);
const dashboardSource = readFileSync(
  fileURLToPath(new URL('../../components/admin/AdminDashboard.tsx', import.meta.url)),
  'utf8',
);
const patientDetailSource = readFileSync(
  fileURLToPath(new URL('../../components/operator/PatientDetail.tsx', import.meta.url)),
  'utf8',
);

test('camera synchronization requests only the bounded active room-assignment scope', () => {
  assert.match(
    appSource,
    /patients\/\$\{pazienteId\}\/room-assignments\?scope=active/,
    'camera synchronization must not download the full room-assignment history',
  );
  const synchronization = appSource
    .split('async function syncCameraAssignment')[1]
    ?.split('async function updatePaziente')[0];
  assert.ok(synchronization);
  assert.doesNotMatch(synchronization, /fetch\(`\$\{API_URL\}\/admin\/rooms/);
  assert.match(synchronization, /const room = camere\.find/);
});

test('room editor mirrors server bounds and never persists derived occupancy', () => {
  assert.match(roomsSource, /MAX_FACILITY_NOTE_LENGTH\s*=\s*2_000/);
  assert.doesNotMatch(roomsSource, /<option value="occupato">/);
  assert.match(roomsSource, /bed\.stato === 'manutenzione' \? 'manutenzione' : 'libero'/);
});

test('facility loading is abortable and exposes retry instead of a false zero snapshot', () => {
  assert.match(roomsSource, /new AbortController\(\)/);
  assert.match(roomsSource, /fetchFacilityData\(controller\.signal\)/);
  assert.match(roomsSource, /if \(!roomsRes\.ok \|\| !occRes\.ok\)/);
  assert.match(roomsSource, />\s*Riprova\s*</);
  assert.match(roomsSource, /hidden=\{!occupancy\}/);
});

test('App does not download facility rooms during ordinary login bootstrap', () => {
  const bootstrap = appSource
    .split('// ── Fetch constant-size session data')[1]
    ?.split('// Facility occupancy contains patient identity')[0];
  assert.ok(bootstrap);
  assert.doesNotMatch(bootstrap, /loadCamere\(\)/);
  assert.match(
    appSource,
    /utente\?\.ruolo === 'admin'[\s\S]+navKey === 'admin-dashboard'[\s\S]+navKey === 'dettaglio-paziente'/,
  );
});

test('navigation-scoped room reads reject stale responses and expose a retryable state', () => {
  assert.match(appSource, /camereRequestSequenceRef/);
  assert.match(appSource, /camereAbortControllerRef/);
  assert.match(appSource, /signal: controller\.signal/);
  assert.match(appSource, /request !== camereRequestSequenceRef\.current/);
  assert.match(appSource, /setCamereLoadError\('Dati camere non disponibili\. Riprova\.'\)/);
  assert.match(appSource, /loadCamere\(true\)/);
});

test('room consumers never present a failed load as zero occupancy or an empty assignment list', () => {
  assert.match(dashboardSource, /roomSnapshotAvailable/);
  assert.match(dashboardSource, /Caricamento occupazione struttura/);
  assert.match(dashboardSource, />\s*Riprova\s*<IcoArrow/);
  assert.match(patientDetailSource, /canManageRooms && \(\s*<button[\s\S]+Modifica assegnazione/);
  assert.match(patientDetailSource, /disabled=\{!roomDataReady\}/);
  assert.match(patientDetailSource, /<RoomDataNotice \/>/);
});
