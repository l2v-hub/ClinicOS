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
  assert.match(source, /Segnalazioni precedenti/);
  assert.match(source, /legacyEntries\.slice\(0, DIARY_PAGE_SIZE\)/);
  assert.match(source, /hasMore \? 'voci caricate'/);
  assert.match(source, /loadMoreControllerRef\.current\?\.abort\(\)/);
});

test('patient diary replaces bounded windows, can return and filters on the server', async () => {
  const source = await readFile(componentUrl, 'utf8');
  assert.match(source, /setEntries\(allEntries\)/);
  assert.match(source, /historyCursors\.current\.push\(currentCursor\.current\)/);
  assert.match(source, /historyCursors\.current\.pop\(\)/);
  assert.match(source, /params\.set\('from', dateRange\.from\)/);
  assert.match(source, /params\.set\('to', dateRange\.to\)/);
  assert.ok((source.match(/setRefreshVersion\(\(version\) => version \+ 1\)/g) ?? []).length >= 3);
  assert.match(source, /request === readSequenceRef\.current/);
  const editor = await readFile(new URL('../../components/operator/ClinicalNoteEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /autore.*registrati automaticamente/);
  assert.doesNotMatch(source, />Nome autore<|>Tipo operatore</);
});
