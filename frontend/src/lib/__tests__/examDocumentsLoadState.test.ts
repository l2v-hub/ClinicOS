import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../components/operator/cartella/EsamiConsulenzeTab.tsx', import.meta.url),
  'utf8',
);
const hookSource = readFileSync(new URL('../usePatientDocuments.ts', import.meta.url), 'utf8');

test('attachment metadata failures cannot masquerade as an empty clinical list', () => {
  assert.match(hookSource, /status: 'loading' \| 'ready' \| 'error'/);
  assert.match(hookSource, /if \(!response\.ok\) throw new Error/);
  assert.match(hookSource, /status: append \? previous\.status : 'error'/);
  assert.match(hookSource, /loadMoreError: append \? 'Impossibile caricare altri documenti\.'/);
  assert.match(source, /documentStatus === 'loading'/);
  assert.match(source, /role="status"/);
  assert.match(source, /documentStatus === 'error'/);
  assert.match(source, /<LoadErrorState/);
  assert.match(source, /l’elenco potrebbe essere incompleto/);
  assert.match(source, /retryLabel="Riprova allegati"/);
  assert.match(source, /L’elenco allegati mostrato è parziale/);
});
