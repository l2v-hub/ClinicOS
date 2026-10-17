// Independent reproduction of the inspected test's control flow; synthetic deps only.
// This is NOT the application suite and makes no DB, browser, HTTP or inference calls.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../../../../backend/src/skills/__tests__/skills-e2e.test.ts', import.meta.url), 'utf8');
assert.match(source, /await reachedInterpreter;\s*slow = false;\s*try/);
let cleanupCalled = false;
let reached;
const reachedInterpreter = new Promise(resolve => { reached = resolve; });
test('inspected barrier entry outside try does not clean up when correction never enters interpreter', { timeout: 20 }, async () => {
  // A correction can complete early (or fail) before calling the injected interpreter.
  const correction = Promise.resolve({ status: 'DENIED' });
  await reachedInterpreter;
  try {
    assert.fail('Unreachable confirmation');
  } finally {
    cleanupCalled = true;
    reached();
    await correction;
  }
});
setTimeout(() => {
  console.log(JSON.stringify({ syntheticControlFlowOnly: true, elapsedMs: 50, cleanupCalled, expected: false, applicationSuiteExecuted: false }));
}, 50);
