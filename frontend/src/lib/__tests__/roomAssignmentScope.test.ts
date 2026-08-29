import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSource = readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');

test('camera synchronization requests only the bounded active room-assignment scope', () => {
  assert.match(
    appSource,
    /patients\/\$\{pazienteId\}\/room-assignments\?scope=active/,
    'camera synchronization must not download the full room-assignment history',
  );
});
