// Milo fase 5: i promemoria clinici sono visibili sul pulsante Milo senza aprire il pannello.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';

(globalThis as { React?: typeof React }).React = React;
const { BADGE_REFRESH_MS, badgeLabel } = await import('../AssistantEntryBadge');

test('the badge refreshes within seconds and names clinical reminders apart from news', () => {
  assert.ok(BADGE_REFRESH_MS <= 15_000);
  assert.equal(badgeLabel(3, 0), '3 novità da vedere');
  assert.equal(badgeLabel(3, 1), '1 promemoria clinico da vedere · 3 novità da vedere');
  assert.equal(badgeLabel(0, 2), '2 promemoria clinici da vedere · 0 novità da vedere');
});

test('the badge is mounted on the Milo button of the top bar and refreshes after a save', () => {
  const app = readFileSync(new URL('../../../App.tsx', import.meta.url), 'utf8');
  const button = app.slice(
    app.indexOf('data-testid="assistant-entry"'),
    app.indexOf('</button>', app.indexOf('data-testid="assistant-entry"')),
  );
  assert.match(button, /<AssistantEntryBadge refreshKey=\{assistantModeOpen\} \/>/);
  const badge = readFileSync(new URL('../AssistantEntryBadge.tsx', import.meta.url), 'utf8');
  assert.match(badge, /addEventListener\(PARAMETER_READING_SAVED_EVENT/);
});
