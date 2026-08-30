import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { AGNOS_TURN_WINDOW, agnosHistoryWindow, revealPreviousAgnosTurns } from './agnosHistory';

test('long assistant histories initially render only the latest 80 turns with real indexes', () => {
  const turns = Array.from({ length: 200 }, (_, index) => `turn-${index}`);
  const window = agnosHistoryWindow(turns, AGNOS_TURN_WINDOW);

  assert.equal(window.hiddenCount, 120);
  assert.equal(window.items.length, 80);
  assert.deepEqual(window.items[0], { index: 120, turn: 'turn-120' });
  assert.deepEqual(window.items.at(-1), { index: 199, turn: 'turn-199' });
});

test('history disclosure grows in bounded blocks without changing pending indexes', () => {
  const turns = Array.from({ length: 200 }, (_, index) => index);
  const visibleCount = revealPreviousAgnosTurns(AGNOS_TURN_WINDOW);
  const window = agnosHistoryWindow(turns, visibleCount);

  assert.equal(visibleCount, 160);
  assert.equal(window.hiddenCount, 40);
  assert.equal(window.items[159]?.index, 199);
});

test('Agnos panel TTS inspects only the latest turn and preserves absolute pending indexes', () => {
  const source = readFileSync(new URL('../AgnosPanel.tsx', import.meta.url), 'utf8');
  assert.match(source, /const latestIndex = turns\.length - 1/);
  assert.match(source, /latestIndex <= lastSpokenIndexRef\.current/);
  assert.doesNotMatch(source, /turns\.forEach/);
  assert.match(source, /visibleHistory\.items\.map\(\(\{ turn: t, index: i \}\)/);
  assert.match(source, /pending\?\.turnIndex === i/);
  assert.match(source, /setVisibleTurnCount\(AGNOS_TURN_WINDOW\)/);
});
