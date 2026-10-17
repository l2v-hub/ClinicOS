// Disposable synthetic DB only; never takes an external database URL or Railway credential.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import pg from 'pg';
import { TARGET, inventoryDatabase, parseInventoryLog } from '../../../../scripts/maintenance/demo-patient-inventory.mjs';
const name = 'clinicos-qa-independent470';
const port = 55472;
const service = '50000000-0000-4000-8000-000000000470';
const env = {
  RAILWAY_PROJECT_ID: TARGET.projectId,
  RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
  RAILWAY_ENVIRONMENT_NAME: 'demo',
  RAILWAY_SERVICE_ID: service,
  EXPECTED_INVENTORY_SERVICE_ID: service,
  DATABASE_URL: 'postgresql://synthetic:local-only@postgres.railway.internal/railway',
};
const connection = {
  host: '127.0.0.1',
  port,
  database: 'railway',
  user: 'postgres',
  password: 'synthetic-only-470',
  connectionTimeoutMillis: 1000,
};
const fresh = () => new pg.Client(connection);
test(
  'real PostgreSQL enforces READ ONLY and inventories orphan import/draft plus all mixed records',
  { timeout: 60000 },
  async () => {
    assert.notEqual(
      spawnSync('docker', ['container', 'inspect', name], { stdio: 'ignore' }).status,
      0,
      'Refuse to reuse or remove an existing container',
    );
    let created = false;
    let admin;
    try {
      execFileSync(
        'docker',
        [
          'run',
          '--rm',
          '--name',
          name,
          '-e',
          'POSTGRES_PASSWORD=synthetic-only-470',
          '-e',
          'POSTGRES_DB=railway',
          '-p',
          '127.0.0.1:' + port + ':5432',
          '-d',
          'postgres:16',
        ],
        { stdio: 'pipe' },
      );
      created = true;
      for (let i = 0; i < 100; i++) {
        const candidate = fresh();
        try {
          await candidate.connect();
          admin = candidate;
          break;
        } catch {
          await candidate.end().catch(() => {});
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      assert.ok(admin, 'Disposable PostgreSQL SQL readiness required');
      await admin.query(`
      CREATE TABLE "Patient" (id text PRIMARY KEY);
      CREATE TABLE "User" (id text PRIMARY KEY);
      CREATE TABLE "Operator" (id text PRIMARY KEY);
      CREATE TABLE "AiAuditEvent" (id text PRIMARY KEY, "patientId" text);
      CREATE TABLE "Nota" (id text PRIMARY KEY, "pazienteId" text, "pazienteNome" text);
      CREATE TABLE "NotaRecipientState" (id text PRIMARY KEY, "notaId" text);
      CREATE TABLE "ImportJob" (id text PRIMARY KEY);
      CREATE TABLE "PatientIntakeDraft" (id text PRIMARY KEY);
      INSERT INTO "User" VALUES ('synthetic-user');
      INSERT INTO "Operator" VALUES ('synthetic-operator');
      INSERT INTO "ImportJob" VALUES ('synthetic-orphan-import');
      INSERT INTO "PatientIntakeDraft" VALUES ('synthetic-orphan-draft');
    `);
      const first = await inventoryDatabase(fresh(), env);
      assert.equal(first.patientDataEmpty, false);
      assert.equal(first.catalogTableCount, 8);
      assert.equal(first.catalogTables.length, 8);
      const firstLog = JSON.stringify({
        message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(first),
      });
      assert.deepEqual(parseInventoryLog(firstLog).catalogTables, first.catalogTables);
      const missingImport = structuredClone(first);
      missingImport.counts = missingImport.counts.filter((t) => t.table !== 'ImportJob');
      assert.throws(
        () =>
          parseInventoryLog(
            JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(missingImport) }),
          ),
        /INVENTORY_RESULT_TABLES_INVALID/,
      );
      assert.equal(first.counts.find((t) => t.table === 'Patient').rows, '0');
      assert.equal(first.counts.find((t) => t.table === 'ImportJob').rows, '1');
      assert.equal(first.counts.find((t) => t.table === 'PatientIntakeDraft').rows, '1');
      await admin.query('DELETE FROM "ImportJob"; DELETE FROM "PatientIntakeDraft"');
      const empty = await inventoryDatabase(fresh(), env);
      assert.equal(empty.patientDataEmpty, true);
      assert.equal(empty.counts.find((t) => t.table === 'User').rows, '1');
      assert.equal(empty.counts.find((t) => t.table === 'Operator').rows, '1');
      for (const sql of [
        `INSERT INTO "Nota" VALUES ('synthetic-note', NULL, NULL)`,
        `INSERT INTO "AiAuditEvent" VALUES ('synthetic-audit', NULL)`,
        `INSERT INTO "NotaRecipientState" VALUES ('synthetic-state', 'synthetic-absent-note')`,
      ]) {
        await admin.query(sql);
        const nonempty = await inventoryDatabase(fresh(), env);
        assert.equal(nonempty.patientDataEmpty, false);
        await admin.query(
          'DELETE FROM "NotaRecipientState"; DELETE FROM "Nota"; DELETE FROM "AiAuditEvent"',
        );
      }
      await admin.query('CREATE TABLE "UnknownClinicalRecords" (id text PRIMARY KEY)');
      const unknown = await inventoryDatabase(fresh(), env);
      assert.equal(unknown.patientDataEmpty, false);
      assert.deepEqual(unknown.unclassifiedTables, ['UnknownClinicalRecords']);
      assert.equal(
        parseInventoryLog(
          JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(unknown) }),
        ).patientDataEmpty,
        false,
      );
      await admin.query('DROP TABLE "UnknownClinicalRecords"');
      const probe = fresh();
      await probe.connect();
      try {
        await probe.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        await assert.rejects(
          probe.query(`INSERT INTO "Patient" VALUES ('must-not-write')`),
          (error) => error.code === '25006',
        );
        await probe.query('ROLLBACK');
      } finally {
        await probe.end();
      }
      assert.equal((await admin.query('SELECT count(*)::text AS n FROM "Patient"')).rows[0].n, '0');
      assert.equal((await admin.query('SELECT count(*)::text AS n FROM "User"')).rows[0].n, '1');
      assert.equal((await inventoryDatabase(fresh(), env)).patientDataEmpty, true);
    } finally {
      if (admin) await admin.end().catch(() => {});
      if (created) execFileSync('docker', ['rm', '-f', name], { stdio: 'pipe' });
    }
  },
);
