import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const scheduleSource = readFileSync(
  new URL('../../components/admin/OperatorSchedule.tsx', import.meta.url),
  'utf8',
);

test('operator schedules are loaded only on their admin navigation target', () => {
  const bootstrap = appSource
    .split('// ── Fetch constant-size session data')[1]
    ?.split('// Facility occupancy contains patient identity')[0];
  assert.ok(bootstrap);
  assert.doesNotMatch(bootstrap, /operators\/schedules/);
  assert.match(appSource, /utente\?\.ruolo === 'admin' && navKey === 'orari-operatori'/);
  assert.match(appSource, /fetch\(`\$\{API_URL\}\/operators\/schedules`/);
});

test('schedule reads are abortable, session-safe and retryable', () => {
  assert.match(appSource, /schedulesRequestSequenceRef/);
  assert.match(appSource, /schedulesAbortControllerRef/);
  assert.match(appSource, /signal: controller\.signal/);
  assert.match(appSource, /sessionEpoch !== sessionEpochRef\.current/);
  assert.match(appSource, /loadSchedules\(true\)/);
  assert.match(
    appSource,
    /key === 'orari-operatori' && navKey !== 'orari-operatori'[\s\S]*setSchedulesLoadError\(null\)/,
  );
  assert.match(
    appSource,
    /e\.state\.navKey === 'orari-operatori'[\s\S]*e\.state\.prevNavKey !== 'orari-operatori'/,
  );
  assert.match(scheduleSource, /role="status" aria-live="polite"/);
  assert.match(scheduleSource, /role="alert"/);
  assert.match(scheduleSource, />\s*Riprova\s*</);
});

test('a schedule save response cannot restore operational data after session rotation', () => {
  const saveBlock = appSource.split('async function saveSchedule')[1]?.split('// ── Cartella')[0];
  assert.ok(saveBlock);
  assert.match(saveBlock, /const mutationEpoch = sessionEpochRef\.current/);
  assert.match(saveBlock, /if \(mutationEpoch !== sessionEpochRef\.current\) return/);
  assert.ok(
    saveBlock.indexOf('if (mutationEpoch !== sessionEpochRef.current) return') <
      saveBlock.indexOf('setSchedules((prev)'),
  );
  assert.match(
    saveBlock,
    /catch \{[\s\S]*mutationEpoch === sessionEpochRef\.current[\s\S]*Impossibile salvare gli orari/,
  );
});
