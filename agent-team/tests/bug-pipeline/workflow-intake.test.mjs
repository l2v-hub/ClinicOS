import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('irrelevant label jobs are filtered before entering the serialized controller concurrency group', async () => {
  const workflow = await readFile(
    new URL('../../../.github/workflows/codex-bug-pipeline.yml', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(
    workflow,
    /^concurrency:/m,
    'workflow-level concurrency lets skipped label events replace a pending opt-in',
  );
  assert.match(workflow, /^    if:.*github\.event\.label\.name == 'codex-run'/m);
  assert.match(
    workflow,
    /^    concurrency:\n      group: codex-bug-pipeline-\$\{\{ github.repository \}\}\n      cancel-in-progress: false/m,
  );
});
