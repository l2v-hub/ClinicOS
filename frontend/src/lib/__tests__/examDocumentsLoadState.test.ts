import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../components/operator/cartella/EsamiConsulenzeTab.tsx', import.meta.url),
  'utf8',
);

test('attachment metadata failures cannot masquerade as an empty clinical list', () => {
  assert.match(source, /status: 'loading' \| 'ready' \| 'error'/);
  assert.match(source, /if \(!response\.ok\) throw new Error/);
  assert.match(source, /current\.scope === documentScope/);
  assert.match(source, /\? \{ \.\.\.current, status: 'error' \}/);
  assert.match(source, /: \{ scope: documentScope, documents: \[\], status: 'error' \}/);
  assert.match(source, /documentStatus === 'loading'/);
  assert.match(source, /role="status"/);
  assert.match(source, /documentStatus === 'error'/);
  assert.match(source, /<LoadErrorState/);
  assert.match(source, /l’elenco potrebbe essere incompleto/);
  assert.match(source, /retryLabel="Riprova allegati"/);
  assert.match(source, /status: 'loading'/);
});
