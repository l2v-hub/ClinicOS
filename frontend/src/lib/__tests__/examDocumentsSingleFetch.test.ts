import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../components/operator/cartella/EsamiConsulenzeTab.tsx', import.meta.url),
  'utf8',
);

test('exam, imaging and consultation attachments share one scoped metadata request', () => {
  assert.equal(source.match(/usePatientDocuments\(/g)?.length, 1);
  assert.doesNotMatch(source, /fetch\(`\$\{API_URL\}\/patients\/\$\{paziente\.id\}\/documents/);
  assert.match(source, /documents=\{documentsByType\.esame\}/);
  assert.match(source, /documents=\{documentsByType\.rx\}/);
  assert.match(source, /documents=\{documentsByType\.consulenza\}/);
  assert.equal(source.match(/onDocumentCreated=/g)?.length, 3);
  assert.equal(source.match(/metadataLoading=\{documentStatus === 'loading'\}/g)?.length, 3);
  assert.match(source, /disabled=\{busy \|\| metadataLoading\}/);
  assert.match(source, /document \? upsertDocument\(document\) : reloadDocuments\(\)/);
  assert.match(source, /Carica altri allegati/);
});
