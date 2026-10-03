import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');

test('mailbox remains available while shell badges use exact critical handover aggregate', () => {
  assert.match(appSource, /unreadCount=\{notesUnreadCount\}/);
  assert.match(appSource, /criticalHandovers=\{criticalHandoverCount\(consegneOverview, consegneOverviewState\)\}/);
  assert.doesNotMatch(appSource, /const unreadNotes = note\.filter/);
});

test('failed note mutation never restores a snapshot after the mailbox query changed', () => {
  assert.match(appSource, /mutationQuery === notesQueryRef\.current/);
  assert.match(appSource, /mutationRequest === notesRequestSequenceRef\.current/);
});

test('a pending note mutation cannot restore PHI after logout changes the session epoch', () => {
  assert.match(appSource, /const mutationSession = sessionEpochRef\.current/);
  assert.match(appSource, /if \(mutationSession !== sessionEpochRef\.current\) return false/);
});
