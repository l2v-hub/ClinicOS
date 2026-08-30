import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sources = [
  readFileSync(new URL('../../components/operator/OperatorAgenda.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../../components/admin/AdminAgenda.tsx', import.meta.url), 'utf8'),
];

test('operator and admin agendas expose the same accessible navigation contract', () => {
  for (const source of sources) {
    assert.match(source, /role="group" aria-label="Visualizzazione agenda"/);
    assert.match(source, /aria-pressed=\{view === v\}/);
    assert.match(source, /aria-label="Intervallo precedente"/);
    assert.match(source, /aria-label="Vai a oggi"/);
    assert.match(source, /aria-label="Intervallo successivo"/);
  }
});
