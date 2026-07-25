import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import { generateKnowledgeBase } from '../generate.mjs';
import { sha256 } from '../lib/contracts.mjs';

function write(root, path, content) {
  const absolute = join(root, ...path.split('/'));
  mkdirSync(join(absolute, '..'), { recursive: true });
  writeFileSync(absolute, content);
}

function fixture(t, label) {
  const root = mkdtempSync(join(tmpdir(), `clinicos-nhw-determinism-${label}-`));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(
    root,
    'package.json',
    JSON.stringify({
      name: 'fixture',
      scripts: { build: 'node -e "process.exit(0)"' },
    }),
  );
  write(root, 'backend/package.json', JSON.stringify({ name: '@fixture/backend' }));
  write(
    root,
    'backend/src/app.ts',
    "import express from 'express';\nexport const app = express();\napp.get('/health', (_req, res) => res.status(200).json({ok:true}));\n",
  );
  write(root, 'backend/src/server.ts', "import { app } from './app.js';\napp.listen(3001);\n");
  write(root, 'frontend/package.json', JSON.stringify({ name: 'frontend' }));
  write(root, 'frontend/src/App.tsx', 'export function App() { return null; }\n');
  write(root, 'frontend/src/main.tsx', "import { App } from './App';\nvoid App;\n");
  write(root, 'frontend/.env.example', 'VITE_API_URL=http://localhost:3001\n');
  write(root, 'clinicos-ai-runtime/requirements.txt', 'fastapi>=0.110\n');
  write(
    root,
    'clinicos-ai-runtime/clinicos_ai/api/app.py',
    "from fastapi import FastAPI\napp = FastAPI()\n@app.get('/v1/runtime/health')\ndef health(): return {'ok': True}\n",
  );
  write(root, 'prisma/schema.prisma', 'model Patient {\n  id String @id @default(cuid())\n}\n');
  write(
    root,
    'prisma/migrations/20260101000000_init/migration.sql',
    'CREATE TABLE "Patient" ("id" TEXT NOT NULL, CONSTRAINT "Patient_pkey" PRIMARY KEY ("id"));\n',
  );
  write(
    root,
    'docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md',
    '# Fixture design\n',
  );
  return root;
}

function hashes(root) {
  const knowledgeRoot = join(root, 'docs', 'nhw');
  const records = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name, 'en'),
    )) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else {
        const content = readFileSync(absolute);
        records.push({
          path: relative(knowledgeRoot, absolute).replaceAll('\\', '/'),
          hash: sha256(content),
          hasCrLf: content.includes(Buffer.from('\r\n')),
        });
      }
    }
  }
  visit(knowledgeRoot);
  return records;
}

test('full generation is byte-identical across equivalent repositories and uses LF', async (t) => {
  const first = fixture(t, 'a');
  const second = fixture(t, 'b');

  const firstSummary = await generateKnowledgeBase({ repoRoot: first, stage: 'all' });
  const secondSummary = await generateKnowledgeBase({ repoRoot: second, stage: 'all' });
  const firstHashes = hashes(first);
  const secondHashes = hashes(second);

  assert.equal(firstSummary.stage, 'all');
  assert.equal(secondSummary.stage, 'all');
  assert.deepEqual(firstHashes, secondHashes);
  assert.equal(
    firstHashes.some((record) => record.hasCrLf),
    false,
  );
});
