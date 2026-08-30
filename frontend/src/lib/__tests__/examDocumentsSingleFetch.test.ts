import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../components/operator/cartella/EsamiConsulenzeTab.tsx', import.meta.url),
  'utf8',
);

test('exam, imaging and consultation attachments share one scoped metadata request', () => {
  assert.equal(
    source.match(/fetch\(`\$\{API_URL\}\/patients\/\$\{paziente\.id\}\/documents`/g)?.length,
    1,
  );
  assert.match(source, /const controller = new AbortController\(\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /return \(\) => controller\.abort\(\)/);
  assert.match(source, /documentState\.scope === documentScope/);
  assert.match(source, /documents=\{documentsByType\.esame\}/);
  assert.match(source, /documents=\{documentsByType\.rx\}/);
  assert.match(source, /documents=\{documentsByType\.consulenza\}/);
  assert.match(source, /onDocumentsChanged=\{reloadDocuments\}/);
});
