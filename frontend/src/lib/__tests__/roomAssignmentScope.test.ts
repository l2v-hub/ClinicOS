import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSource = readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');
const roomsSource = readFileSync(
  fileURLToPath(new URL('../../components/admin/RoomsManagement.tsx', import.meta.url)),
  'utf8',
);

test('camera synchronization requests only the bounded active room-assignment scope', () => {
  assert.match(
    appSource,
    /patients\/\$\{pazienteId\}\/room-assignments\?scope=active/,
    'camera synchronization must not download the full room-assignment history',
  );
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
