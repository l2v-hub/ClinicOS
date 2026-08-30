import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sources = ['CampoFarmaco', 'RicercaFarmaco'].map((component) =>
  readFileSync(
    new URL(`../../components/operator/cartella/${component}.tsx`, import.meta.url),
    'utf8',
  ),
);

test('both medication searches abort obsolete network requests', () => {
  for (const source of sources) {
    assert.match(source, /const controller = new AbortController\(\)/);
    assert.match(source, /signal: controller\.signal/);
    assert.match(source, /controller\.abort\(\)/);
    assert.match(source, /error as Error\)\?\.name !== 'AbortError'/);
    assert.match(source, /clearTimeout\(attesa\)/);
    assert.match(source, /if \(annullato\) return/);
  }
});
