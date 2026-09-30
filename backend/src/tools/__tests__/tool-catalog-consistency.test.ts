// The catalog of record and the default registry must describe the same tools: an exposed tool
// without catalog entry/test evidence, or a catalogued TOOL without registry entry, fails here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { allToolDefinitions } from '../index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const catalogPath = path.join(
  repoRoot,
  '.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json',
);

interface CatalogEntry {
  capability_id: string;
  domain: string;
  type: string;
  technical_state: string;
  exposure: string;
  invocability: string;
  tool_candidate: string | null;
  test: { file: string; result: string } | null;
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { capabilities: CatalogEntry[] };
const byId = new Map(catalog.capabilities.map((c) => [c.capability_id, c]));

test('every registered tool is catalogued as TOOL with passing test evidence on disk', () => {
  for (const tool of allToolDefinitions) {
    const entry = byId.get(tool.name);
    assert.ok(entry, `tool ${tool.name} missing from CAPABILITY_CATALOG.json`);
    assert.equal(entry!.exposure, 'TOOL', `${tool.name} exposure`);
    assert.ok(
      ['READY', 'WRAP'].includes(entry!.technical_state),
      `${tool.name} must be READY/WRAP`,
    );
    assert.equal(entry!.invocability, 'TESTED', `${tool.name} invocability`);
    assert.equal(entry!.test?.result, 'pass', `${tool.name} test result`);
    assert.ok(existsSync(path.join(repoRoot, entry!.test!.file)), `${tool.name} test file exists`);
    assert.equal(entry!.domain.length > 0, true);
  }
});

test('every catalogued TOOL is registered; no GAP is exposed as a tool', () => {
  const registered = new Set(allToolDefinitions.map((t) => t.name));
  for (const entry of catalog.capabilities) {
    if (entry.exposure === 'TOOL') {
      assert.ok(registered.has(entry.capability_id), `${entry.capability_id} not registered`);
    }
    if (entry.technical_state === 'GAP') {
      assert.notEqual(entry.exposure, 'TOOL', `${entry.capability_id} is GAP but exposed`);
    }
    if (entry.invocability === 'TESTED') {
      assert.equal(
        entry.test?.result,
        'pass',
        `${entry.capability_id} TESTED without passing test`,
      );
    }
  }
});

test('capability ids are unique and machine-readable', () => {
  const ids = catalog.capabilities.map((c) => c.capability_id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/, id);
});
