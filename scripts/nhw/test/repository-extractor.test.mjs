import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { generateKnowledgeBase } from '../generate.mjs';
import { buildInventory } from '../lib/inventory.mjs';
import { extractRepositorySurfaces } from '../lib/repository-extractor.mjs';

function write(root, path, content) {
  const absolute = join(root, ...path.split('/'));
  mkdirSync(join(absolute, '..'), { recursive: true });
  writeFileSync(absolute, content);
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'clinicos-nhw-repository-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(
    root,
    'package.json',
    JSON.stringify({
      name: 'fixture',
      workspaces: ['frontend', 'backend'],
      scripts: { build: 'npm run build -w frontend' },
    }),
  );
  write(root, 'frontend/package.json', JSON.stringify({ name: 'frontend' }));
  write(root, 'backend/package.json', JSON.stringify({ name: '@clinicos/backend' }));
  write(root, 'clinicos-ai-runtime/requirements.txt', 'fastapi>=0.110\n');
  write(
    root,
    '.github/workflows/deploy.yml',
    `name: Deploy
on:
  push:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - run: echo "\${{ secrets.RAILWAY_TOKEN }}"
`,
  );
  write(
    root,
    'docker-compose.yml',
    `services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    volumes:
      - db:/var/lib/postgresql/data
`,
  );
  write(
    root,
    'railway.json',
    JSON.stringify({ deploy: { startCommand: 'node backend/dist/server.js' } }),
  );
  write(root, 'frontend/vercel.json', JSON.stringify({ rewrites: [] }));
  write(root, 'frontend/.env.example', 'VITE_API_URL=http://localhost:3001\n');
  write(root, 'scripts/deploy.ps1', 'npm.cmd run build\n');
  write(root, 'agent-team/src/cli.mjs', 'export function main() {}\n');
  write(root, 'prisma/schema.prisma', 'model User { id String @id }\n');
  write(root, 'backend/src/patient.test.ts', 'export const tested = true;\n');
  write(root, 'requirements/REQ-001.md', '# REQ-001\n');
  write(root, 'docs/nhw/11-quality/tests/unit/generated.md', '# Generated test unit\n');
  write(
    root,
    'docs/nhw/12-repository/requirements/req-999-generated.md',
    '# Generated requirement unit\n',
  );
  write(root, 'artifacts/task-validation/1/screenshot.png', Buffer.from([1, 2, 3]));
  return root;
}

test('extracts projects, scripts, workflows, containers, and configuration names', async (t) => {
  const root = fixture(t);
  const inventory = await buildInventory(root);
  const result = extractRepositorySurfaces(root, inventory);

  assert.deepEqual(
    result.projects.map((project) => project.name),
    [
      'agent-team',
      'backend',
      'clinicos-ai-runtime',
      'fixture',
      'frontend',
      'prisma',
      'repository-automation',
    ],
  );
  assert.ok(result.packageScripts.some((script) => script.name === 'build'));
  assert.deepEqual(result.workflows[0].jobs, ['deploy']);
  assert.deepEqual(result.workflows[0].secretNames, ['RAILWAY_TOKEN']);
  assert.equal(result.containers[0].image, 'postgres:16-alpine');
  assert.deepEqual(result.containers[0].ports, ['5432:5432']);
  assert.deepEqual(
    result.configurationDeclarations.map((record) => record.name),
    ['VITE_API_URL'],
  );
});

test('classifies tests, requirements, deployments, and binary artifacts', async (t) => {
  const root = fixture(t);
  const inventory = await buildInventory(root);
  const result = extractRepositorySurfaces(root, inventory);

  assert.equal(result.testSurfaces.length, 1);
  assert.equal(result.testSurfaces[0].type, 'unit');
  assert.equal(result.requirements.length, 1);
  assert.equal(result.requirements[0].requirementId, 'REQ-001');
  assert.ok(result.deployments.some((deployment) => deployment.platform === 'railway'));
  assert.ok(result.deployments.some((deployment) => deployment.platform === 'vercel'));
  const artifact = result.artifacts.find((record) => record.path.endsWith('screenshot.png'));
  assert.equal(artifact.contentIncluded, false);
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
});

test('writes repository catalogs through the staged generator', async (t) => {
  const root = fixture(t);
  const outputRoot = join(root, 'generated', 'docs', 'nhw');
  const summary = await generateKnowledgeBase({
    repoRoot: root,
    outputRoot,
    stage: 'repository',
  });

  assert.equal(summary.stage, 'repository');
  assert.equal(summary.projects, 7);
  assert.match(
    readFileSync(join(outputRoot, 'catalog', 'projects.json'), 'utf8'),
    /clinicos-ai-runtime/,
  );
  assert.match(
    readFileSync(join(outputRoot, 'catalog', 'test-surfaces.jsonl'), 'utf8'),
    /patient\.test\.ts/,
  );
});
