import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { generateKnowledgeBase } from '../generate.mjs';
import {
  buildMigrationLineage,
  parseMigration,
  parsePrismaSchema,
} from '../lib/prisma-extractor.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(here, 'fixtures', 'prisma');
const schemaText = readFileSync(join(fixtureRoot, 'schema.prisma'), 'utf8');
const migrationText = readFileSync(
  join(fixtureRoot, 'migrations', '20260101000000_init', 'migration.sql'),
  'utf8',
);

test('parses Prisma models, fields, relations, indexes, and constraints', () => {
  const catalog = parsePrismaSchema(schemaText, 'schema.prisma');

  assert.equal(catalog.models.length, 3);
  assert.deepEqual(catalog.enums[0].values, ['SCHEDULED', 'COMPLETED']);
  const patient = catalog.models.find((model) => model.name === 'Patient');
  const fiscalCode = patient.fields.find((field) => field.name === 'fiscalCode');
  const owner = patient.fields.find((field) => field.name === 'owner');
  assert.equal(fiscalCode.nullable, true);
  assert.equal(fiscalCode.unique, true);
  assert.equal(owner.relation.target, 'User');
  assert.equal(owner.relation.cardinality, 'required-one');
  assert.equal(owner.relation.onDelete, 'Cascade');
  assert.deepEqual(patient.uniqueConstraints[0].fields, ['ownerId', 'fiscalCode']);
  assert.deepEqual(patient.indexes[0].fields, ['ownerId']);
  assert.equal(
    catalog.models
      .find((model) => model.name === 'Appointment')
      .fields.find((field) => field.name === 'status').default,
    'SCHEDULED',
  );
});

test('parses ordered SQL operations and destructive migration behavior', () => {
  const migration = parseMigration(migrationText, '20260101000000_init');

  assert.deepEqual(
    migration.operations.map((operation) => operation.type),
    ['create-table', 'create-unique-index', 'create-table', 'drop-column'],
  );
  assert.equal(migration.destructive, true);
  assert.match(migration.operations[0].statementHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(migration.operations[0], 'sql'), false);
});

test('reconciles migration history with the current schema', () => {
  const schema = parsePrismaSchema(schemaText, 'schema.prisma');
  const migration = parseMigration(migrationText, '20260101000000_init');
  const lineage = buildMigrationLineage(schema, [migration]);

  assert.deepEqual(lineage.currentModels, ['Appointment', 'Patient', 'User']);
  assert.deepEqual(lineage.migrationIds, ['20260101000000_init']);
  assert.deepEqual(lineage.currentOnlyModels, ['Appointment']);
});

test('writes Prisma and migration catalogs through the staged generator', async (t) => {
  const outputRoot = mkdtempSync(join(tmpdir(), 'clinicos-nhw-prisma-'));
  t.after(() => rmSync(outputRoot, { recursive: true, force: true }));

  const summary = await generateKnowledgeBase({
    repoRoot: fixtureRoot,
    outputRoot,
    stage: 'prisma',
  });

  assert.equal(summary.stage, 'prisma');
  assert.equal(summary.models, 3);
  assert.equal(summary.migrations, 1);
  assert.match(readFileSync(join(outputRoot, 'catalog', 'prisma-models.jsonl'), 'utf8'), /Patient/);
  assert.match(
    readFileSync(join(outputRoot, 'catalog', 'migration-lineage.jsonl'), 'utf8'),
    /20260101000000_init/,
  );
});
