import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');

test('therapy slots are loaded only when an agenda is visible, including history navigation', () => {
  assert.match(
    app,
    /navKey !== 'agenda-operatore' && navKey !== 'agenda-admin'[\s\S]*void loadTherapySlots\(\)/,
  );
  assert.match(app, /\[utente, navKey, loadTherapySlots\]/);
  const sessionSection = app.slice(
    app.indexOf('// ── Fetch constant-size session data'),
    app.indexOf("navKey !== 'agenda-operatore'"),
  );
  assert.doesNotMatch(sessionSection, /loadTherapySlots\(\)/);
});

test('agenda follows the bounded page contract and aborts obsolete date requests', () => {
  assert.match(app, /buildTherapySlotPageUrl\(API_URL, d, options\.cursor\)/);
  assert.match(app, /therapyAbortControllerRef\.current\?\.abort\(\)/);
  assert.match(app, /mergeTherapySlotPages\(current, page\.slots, page\.pageInfo\.summaryExact\)/);
  assert.match(app, /append: true,[\s\S]*cursor: therapyPageInfo\.nextCursor/);
  assert.doesNotMatch(app, /cachedGetJson<unknown>\(`\$\{API_URL\}\/therapy-slots/);
  assert.match(app, /date: info\.date/);
  assert.match(app, /loadTherapySlots\(info\.date\)/);
});
