import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const stylesUrl = new URL('../../print-forms.css', import.meta.url);

test('Invio PS uses a large A4-proportioned screen preview', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.invio-ps-box\s*\{[\s\S]*max-width:\s*1080px/);
  assert.match(
    styles,
    /\.invio-ps-doc\.fm\s*\{[\s\S]*width:\s*min\(794px, 100%\)[\s\S]*min-height:\s*1123px/,
  );
  assert.match(styles, /\.invio-ps-body\s*\{[\s\S]*overflow:\s*auto/);
});

test('Invio PS prints on a named portrait A4 page without screen framing', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /@page invio-ps-sheet\s*\{[\s\S]*size:\s*A4 portrait/);
  assert.match(styles, /\.invio-ps-doc\.fm\s*\{[\s\S]*page:\s*invio-ps-sheet/);
  assert.match(
    styles,
    /body:has\(\.invio-ps-overlay\) \.invio-ps-doc\.fm\s*\{[\s\S]*width:\s*100% !important[\s\S]*border:\s*none !important/,
  );
});

test('landscape clinical forms keep their own named A4 page', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.fm--landscape\s*\{[\s\S]*page:\s*landscape-sheet/);
  assert.match(styles, /@page landscape-sheet\s*\{[\s\S]*size:\s*A4 landscape/);
});
