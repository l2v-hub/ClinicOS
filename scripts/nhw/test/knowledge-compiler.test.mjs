import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildCoreKnowledge, buildOperationalKnowledge } from '../lib/knowledge-compiler.mjs';
import { buildDiscoveryRecords, synchronizeKnowledgeRecords } from '../lib/knowledge-pipeline.mjs';
import { renderKnowledgeUnit } from '../lib/markdown.mjs';

const HASH = 'a'.repeat(64);

function catalogs() {
  return {
    projects: {
      projects: [
        {
          id: 'project.backend',
          name: 'backend',
          kind: 'node-package',
          path: 'backend',
          manifestPath: 'backend/package.json',
        },
      ],
      packageScripts: [
        {
          id: 'component.repository.package-script.backend.build',
          name: 'build',
          command: 'tsc',
          packageName: 'backend',
          sourcePath: 'backend/package.json',
        },
      ],
      workflows: [],
      containers: [],
      deployments: [],
      requirements: [],
    },
    typescriptSymbols: [
      {
        id: 'component.backend.patient-service',
        name: 'PatientService',
        kind: 'class',
        exported: true,
        testSource: false,
        sourcePath: 'backend/src/patient-service.ts',
        lineStart: 2,
        lineEnd: 20,
        consumers: ['backend/src/routes/patients.ts'],
      },
    ],
    pythonSymbols: [],
    expressRoutes: [
      {
        id: 'api.backend.get-patients',
        method: 'GET',
        mountedPath: '/patients',
        responseStatuses: [200, 500],
        requestReads: ['req.query'],
        persistenceCalls: ['prisma.patient.findMany'],
        middleware: ['requireAuth'],
        sideEffects: [],
        sourcePath: 'backend/src/routes/patients.ts',
        lineStart: 5,
        lineEnd: 30,
      },
    ],
    fastapiRoutes: [],
    frontendRequests: [],
    prismaModels: [
      {
        id: 'data.model.patient',
        name: 'Patient',
        sourcePath: 'prisma/schema.prisma',
        lineStart: 2,
        lineEnd: 10,
        fields: [
          {
            name: 'id',
            type: 'String',
            nullable: false,
            list: false,
            id: true,
            unique: false,
            default: 'cuid()',
            relation: null,
          },
        ],
        indexes: [],
        uniqueConstraints: [],
        primaryKeys: [],
      },
    ],
    migrations: [
      {
        id: 'data.migration.20260101000000-init',
        migrationId: '20260101000000_init',
        sourcePath: 'prisma/migrations/20260101000000_init/migration.sql',
        destructive: false,
        operations: [{ order: 1, type: 'create-table', target: 'Patient' }],
      },
    ],
    configuration: [
      {
        id: 'config.discovered.database-url',
        name: 'DATABASE_URL',
        runtimes: ['typescript'],
        declared: true,
        sources: [{ path: 'backend/.env.example', lineStart: 1, lineEnd: 1 }],
      },
    ],
    tests: [
      {
        id: 'test.repository.backend.patient.test.ts',
        path: 'backend/src/patient.test.ts',
        type: 'unit',
        framework: 'node-test',
      },
    ],
  };
}

function inventory() {
  return [
    {
      path: 'backend/package.json',
      pathType: 'file',
      classification: 'configuration-source',
      sha256: HASH,
    },
    {
      path: 'backend/src/patient-service.ts',
      pathType: 'file',
      classification: 'semantic-source',
      sha256: HASH,
    },
    {
      path: 'backend/src/routes/patients.ts',
      pathType: 'file',
      classification: 'semantic-source',
      sha256: HASH,
    },
    {
      path: 'prisma/schema.prisma',
      pathType: 'file',
      classification: 'semantic-source',
      sha256: HASH,
    },
    {
      path: 'prisma/migrations/20260101000000_init/migration.sql',
      pathType: 'file',
      classification: 'semantic-source',
      sha256: HASH,
    },
    {
      path: 'backend/.env.example',
      pathType: 'file',
      classification: 'configuration-source',
      sha256: HASH,
    },
    {
      path: 'backend/src/patient.test.ts',
      pathType: 'file',
      classification: 'test-source',
      sha256: HASH,
    },
    {
      path: 'docs/nhw/schemas/graph-node.schema.json',
      pathType: 'file',
      classification: 'configuration-source',
      sha256: HASH,
    },
  ];
}

test('builds atomic core units for projects, public components, entities, models, and migrations', () => {
  const records = buildCoreKnowledge({
    catalogs: catalogs(),
    inventory: inventory(),
    inventoryHash: HASH,
  });
  const ids = new Set(records.map((record) => record.unit.id));

  assert.ok(ids.has('system.clinicos'));
  assert.ok(ids.has('project.backend'));
  assert.ok(ids.has('component.backend.patient-service'));
  assert.ok(ids.has('entity.patient'));
  assert.ok(ids.has('data.model.patient'));
  assert.ok(ids.has('data.migration.20260101000000-init'));
  assert.ok(ids.has('context.patient-registry'));
  assert.ok(records.every((record) => renderKnowledgeUnit(record.unit).endsWith('\n')));
  assert.equal(new Set(records.map((record) => record.unit.id)).size, records.length);
});

test('builds operational units for endpoints, configuration, tests, scripts, flows, and findings', () => {
  const records = buildOperationalKnowledge({
    catalogs: catalogs(),
    inventory: inventory(),
    inventoryHash: HASH,
  });
  const byId = new Map(records.map((record) => [record.unit.id, record.unit]));

  assert.match(byId.get('api.backend.get-patients').sections.Inputs, /req\.query/);
  assert.match(byId.get('api.backend.get-patients').sections.Outputs, /200/);
  assert.match(
    byId.get('api.backend.get-patients').sections.Dependencies,
    /prisma\.patient\.findMany/,
  );
  assert.ok(byId.has('config.discovered.database-url'));
  assert.ok(byId.has('test.repository.backend.patient.test.ts'));
  assert.ok(byId.has('component.repository.package-script.backend.build'));
  assert.ok(byId.has('flow.patient-lifecycle'));
  assert.ok(byId.has('runtime.backend.express-startup'));
  assert.ok(byId.has('value.api.authentication-contract'));
  assert.ok(byId.has('config.environment.railway'));
  assert.ok(byId.has('integration.azure-entra-id'));
  assert.ok(byId.has('test.governance.quality-gate'));
  assert.ok(byId.has('finding.drift.readme-backend-port'));
  assert.ok(
    byId
      .get('flow.application-startup')
      .relations.some((relation) => relation.target === 'system.clinicos'),
  );
  assert.ok(
    records.some((record) =>
      record.unit.sources.some(
        (source) => source.path === 'docs/nhw/schemas/graph-node.schema.json',
      ),
    ),
  );
  assert.ok([...byId.keys()].some((identifier) => identifier.startsWith('finding.')));
});

test('builds the required semantic discovery set while excluding private and test symbols', () => {
  const fixtureCatalogs = catalogs();
  fixtureCatalogs.typescriptSymbols.push(
    {
      id: 'component.backend.private-helper',
      name: 'privateHelper',
      kind: 'function',
      exported: false,
      testSource: false,
      sourcePath: 'backend/src/private.ts',
      lineStart: 1,
      lineEnd: 2,
    },
    {
      id: 'component.backend.test-helper',
      name: 'testHelper',
      kind: 'function',
      exported: true,
      testSource: true,
      sourcePath: 'backend/src/private.test.ts',
      lineStart: 1,
      lineEnd: 2,
    },
  );
  const discoveries = buildDiscoveryRecords(fixtureCatalogs);
  const ids = new Set(discoveries.map((record) => record.id));

  assert.ok(ids.has('project.backend'));
  assert.ok(ids.has('component.backend.patient-service'));
  assert.ok(ids.has('api.backend.get-patients'));
  assert.ok(ids.has('data.model.patient'));
  assert.ok(ids.has('data.migration.20260101000000-init'));
  assert.ok(ids.has('config.discovered.database-url'));
  assert.ok(ids.has('test.repository.backend.patient.test.ts'));
  assert.equal(ids.has('component.backend.private-helper'), false);
  assert.equal(ids.has('component.backend.test-helper'), false);
});

test('synchronizes generator-owned unit directories and removes stale generated files', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'clinicos-nhw-knowledge-sync-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const stale = join(root, 'docs', 'nhw', '04-components', 'backend', 'stale.md');
  mkdirSync(join(stale, '..'), { recursive: true });
  writeFileSync(stale, 'stale\n');
  const records = buildCoreKnowledge({
    catalogs: catalogs(),
    inventory: inventory(),
    inventoryHash: HASH,
  });

  const result = synchronizeKnowledgeRecords(root, 'core', records);

  assert.equal(existsSync(stale), false);
  assert.ok(result.written > 0);
  assert.equal(result.deleted, 1);
  assert.ok(records.every((record) => existsSync(join(root, ...record.path.split('/')))));
});
