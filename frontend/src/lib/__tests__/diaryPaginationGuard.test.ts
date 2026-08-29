import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const componentUrl = new URL(
  '../../components/operator/cartella/DiarioPazienteTab.tsx',
  import.meta.url,
);

test('patient diary requests a bounded first page and follows an opaque cursor', async () => {
  const source = await readFile(componentUrl, 'utf8');
  assert.match(source, /const DIARY_PAGE_SIZE = 50/);
  assert.match(source, /params\.set\('limit', String\(DIARY_PAGE_SIZE\)\)/);
  assert.match(source, /if \(options\.cursor\) params\.set\('cursor', options\.cursor\)/);
  assert.match(source, /Carica altre voci/);
  assert.match(source, /legacyEntries\.slice\(0, DIARY_PAGE_SIZE\)/);
  assert.match(source, /hasMore \? 'voci caricate'/);
  assert.match(source, /loadMoreControllerRef\.current\?\.abort\(\)/);
});

test('patient diary append deduplicates and mutations refresh the first page', async () => {
  const source = await readFile(componentUrl, 'utf8');
  assert.match(source, /const seen = new Set\(previous\.map\(\(entry\) => entry\.id\)\)/);
  assert.match(source, /allEntries\.filter\(\(entry\) => !seen\.has\(entry\.id\)\)/);
  assert.ok((source.match(/setRefreshVersion\(\(version\) => version \+ 1\)/g) ?? []).length >= 3);
  assert.match(source, /request === readSequenceRef\.current/);
  assert.match(source, /Autore registrato automaticamente dall’account autenticato/);
  assert.doesNotMatch(source, />Nome autore<|>Tipo operatore</);
});
