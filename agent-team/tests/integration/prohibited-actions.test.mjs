import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function files(root) {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await files(full));
    else if (/\.(mjs|json|md)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('runtime source contains no prohibited automatic action or bypass invocation', async () => {
  const sourceFiles = await files(path.resolve('agent-team/src'));
  const source = (await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  for (const pattern of [/dangerously-skip-permissions/, /dangerously-bypass-approvals/, /\bgh\s+pr\s+merge\b/, /\bgh\s+issue\s+close\b/, /\bvercel\s+deploy\b/, /\brailway\s+up\b/]) {
    assert.equal(pattern.test(source), false, `prohibited pattern: ${pattern}`);
  }
});
