import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const tabUrl = new URL(
  '../../components/operator/cartella/NarrativeSectionsTab.tsx',
  import.meta.url,
);
const sectionUrl = new URL(
  '../../components/shared/sections/NarrativeClinicalSection.tsx',
  import.meta.url,
);

test('narrative loading aborts stale requests and applies only the latest sequence', async () => {
  const source = await readFile(tabUrl, 'utf8');
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /sequence === loadSequence\.current/);
  assert.match(source, /return \(\) => controller\.abort\(\)/);
});

test('narrative save failures stay visible and preserve the draft for retry', async () => {
  const [tabSource, sectionSource] = await Promise.all([
    readFile(tabUrl, 'utf8'),
    readFile(sectionUrl, 'utf8'),
  ]);
  assert.match(tabSource, /if \(!r\.ok\) throw new Error/);
  assert.match(tabSource, /role="alert"/);
  assert.match(tabSource, /Riprova senza chiudere questa scheda/);
  assert.match(sectionSource, /catch \{/);
  assert.match(sectionSource, /Keep the draft open/);
});
