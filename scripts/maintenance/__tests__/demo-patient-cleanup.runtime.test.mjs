// Run under flock /tmp/clinicos-browser-qa.lock for the complete Docker lifecycle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import {
  cleanupDatabase,
  CLEANUP_TABLES,
  PRESERVED_TABLES,
} from '../demo-patient-cleanup-authorized.mjs';
import { TARGET, inventoryDatabase, parseInventoryLog } from '../demo-patient-inventory.mjs';
const name = 'clinicos-qa-maint470-cleanup3',
  port = 55473;
const conn = {
  host: '127.0.0.1',
  port,
  user: 'postgres',
  password: 'synthetic-cleanup-only-470',
  database: 'railway',
  connectionTimeoutMillis: 1000,
};
const workerId = '50000000-0000-4000-8000-000000000473';
const env = {
  RAILWAY_PROJECT_ID: TARGET.projectId,
  RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
  RAILWAY_ENVIRONMENT_NAME: 'demo',
  RAILWAY_SERVICE_ID: workerId,
  EXPECTED_INVENTORY_SERVICE_ID: workerId,
  DATABASE_URL: 'postgresql://synthetic:local-only@postgres.railway.internal/railway',
};
const quote = (s) => '"' + s.replaceAll('"', '""') + '"';
const all = [...CLEANUP_TABLES, ...PRESERVED_TABLES].sort();
const fresh = () => new pg.Client(conn);
test(
  'full43-table real PostgreSQL cleanup handles restricted/self/cascade/orphan records, rollback and preserved invariants',
  { timeout: 90000 },
  async () => {
    assert.notEqual(
      spawnSync('docker', ['container', 'inspect', name], { stdio: 'ignore' }).status,
      0,
    );
    let owned = false,
      admin;
    try {
      execFileSync(
        'docker',
        [
          'run',
          '--rm',
          '--name',
          name,
          '-e',
          'POSTGRES_PASSWORD=' + conn.password,
          '-e',
          'POSTGRES_DB=railway',
          '-p',
          '127.0.0.1:' + port + ':5432',
          '-d',
          'postgres:16',
        ],
        { stdio: 'pipe' },
      );
      owned = true;
      for (let i = 0; i < 100; i++) {
        const c = fresh();
        try {
          await c.connect();
          admin = c;
          break;
        } catch {
          await c.end().catch(() => {});
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      assert.ok(admin, 'Actual PostgreSQL readiness required');
      for (const table of all)
        await admin.query(
          `CREATE TABLE ${quote(table)}(id text PRIMARY KEY,payload text NOT NULL DEFAULT 'synthetic-only')`,
        );
      await admin.query(
        'ALTER TABLE "AiAuditEvent" ADD COLUMN "patientId" text;ALTER TABLE "Nota" ADD COLUMN "pazienteId" text,ADD COLUMN "pazienteNome" text;ALTER TABLE "NotaRecipientState" ADD COLUMN "notaId" text',
      );
      const metadata = JSON.parse(
        readFileSync(
          new URL(
            '../../../artifacts/task-validation/maintenance-470/live-inventory.json',
            import.meta.url,
          ),
          'utf8',
        ),
      );
      for (const [i, k] of metadata.foreignKeys.entries())
        await admin.query(
          `ALTER TABLE ${quote(k.source)} ADD COLUMN ${quote('fk' + i)} text REFERENCES ${quote(k.target)}(id) ON DELETE ${{ c: 'CASCADE', r: 'RESTRICT', n: 'SET NULL' }[k.deletion]}`,
        );
      for (const table of all)
        await admin.query(`INSERT INTO ${quote(table)}(id)VALUES($1)`, ['synthetic-' + table]);
      for (const [i, k] of metadata.foreignKeys.entries())
        if (k.source !== k.target)
          await admin.query(`UPDATE ${quote(k.source)} SET ${quote('fk' + i)}=$1`, [
            'synthetic-' + k.target,
          ]);
      const self = metadata.foreignKeys.findIndex(
        (k) => k.source === 'PatientAssessment' && k.target === 'PatientAssessment',
      );
      await admin.query(
        `INSERT INTO "PatientAssessment"(id,${quote('fk' + self)})VALUES('synthetic-correction','synthetic-PatientAssessment')`,
      );
      await admin.query(
        `CREATE FUNCTION clinicos_ai_audit_append_only()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'immutable synthetic audit';END$$;CREATE TRIGGER "AiAuditEvent_no_truncate" BEFORE TRUNCATE ON "AiAuditEvent" FOR EACH STATEMENT EXECUTE FUNCTION clinicos_ai_audit_append_only();CREATE FUNCTION synthetic_row_delete_guard()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic row guard';END$$;CREATE TRIGGER "PatientAssessment_guard" BEFORE DELETE ON "PatientAssessment" FOR EACH ROW EXECUTE FUNCTION synthetic_row_delete_guard()`,
      );
      const fingerprint = async () => {
        const result = [];
        for (const table of all)
          result.push({
            table,
            ...(
              await admin.query(
                `SELECT count(*)::text AS rows,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS digest FROM(SELECT md5(to_jsonb(t)::text)AS h FROM ${quote(table)} t)s`,
              )
            ).rows[0],
          });
        return result;
      };
      const baseline = await fingerprint();
      await assert.rejects(
        cleanupDatabase(fresh(), env, { simulateFailure: true }),
        /SIMULATED_POST_TRUNCATE_FAILURE/,
      );
      assert.deepEqual(
        await fingerprint(),
        baseline,
        'Rollback restores every selected and preserved row',
      );
      await assert.rejects(
        admin.query('TRUNCATE TABLE "AiAuditEvent"'),
        /immutable synthetic audit/,
      );
      await admin.query('CREATE TABLE "UnknownClinicalData"(id text)');
      await assert.rejects(cleanupDatabase(fresh(), env), /DEMO_CATALOG_CHANGED/);
      await admin.query('DROP TABLE "UnknownClinicalData"');
      await admin.query('ALTER TABLE "User" ADD COLUMN patient_ref text REFERENCES "Patient"(id)');
      await assert.rejects(
        cleanupDatabase(fresh(), env),
        /PRESERVED_TABLE_REFERENCES_CLINICAL_DATA/,
      );
      await admin.query('ALTER TABLE "User" DROP COLUMN patient_ref');
      await admin.query(
        'CREATE SCHEMA outside;CREATE TABLE outside.reference(id text REFERENCES public."Patient"(id))',
      );
      await assert.rejects(cleanupDatabase(fresh(), env), /UNVERIFIED_FOREIGN_KEY_CLOSURE/);
      await admin.query('DROP TABLE outside.reference;DROP SCHEMA outside');
      const internal = (
        await admin.query(
          `SELECT tgname FROM pg_trigger WHERE tgrelid='"Patient"'::regclass AND tgisinternal LIMIT 1`,
        )
      ).rows[0].tgname;
      await admin.query(`ALTER TABLE "Patient" DISABLE TRIGGER ${quote(internal)}`);
      await assert.rejects(cleanupDatabase(fresh(), env), /FOREIGN_KEY_TRIGGER_DISABLED/);
      await admin.query(`ALTER TABLE "Patient" ENABLE TRIGGER ${quote(internal)}`);
      await admin.query(
        `ALTER TABLE "ImportJob" ADD CONSTRAINT synthetic_invalid CHECK(payload<>'impossible') NOT VALID`,
      );
      await assert.rejects(cleanupDatabase(fresh(), env), /UNVALIDATED_CONSTRAINT/);
      await admin.query('ALTER TABLE "ImportJob" DROP CONSTRAINT synthetic_invalid');
      await admin.query('ALTER TABLE "ImportJob" ENABLE ROW LEVEL SECURITY');
      await assert.rejects(
        cleanupDatabase(fresh(), env),
        /UNSUPPORTED_TABLE_SECURITY_OR_PARTITION/,
      );
      await admin.query('ALTER TABLE "ImportJob" DISABLE ROW LEVEL SECURITY');
      await admin.query(
        'CREATE TRIGGER unknown_truncate BEFORE TRUNCATE ON "ImportJob" FOR EACH STATEMENT EXECUTE FUNCTION clinicos_ai_audit_append_only()',
      );
      await assert.rejects(cleanupDatabase(fresh(), env), /UNRECOGNIZED_TRUNCATE_TRIGGER/);
      await admin.query('DROP TRIGGER unknown_truncate ON "ImportJob"');
      assert.deepEqual(
        await fingerprint(),
        baseline,
        'Every rejected operation preserves contents',
      );
      const result = await cleanupDatabase(fresh(), env);
      assert.equal(result.committed, true);
      assert.equal(result.tables.length, 30);
      assert.equal(result.preservedTableCount, 13);
      assert.equal(result.preservedContentUnchanged, true);
      assert.deepEqual(result.truncateTriggerExceptions, [
        { table: 'AiAuditEvent', name: 'AiAuditEvent_no_truncate' },
      ]);
      const after = await fingerprint();
      assert.ok(after.filter((r) => CLEANUP_TABLES.includes(r.table)).every((r) => r.rows === '0'));
      assert.deepEqual(
        after.filter((r) => PRESERVED_TABLES.includes(r.table)),
        baseline.filter((r) => PRESERVED_TABLES.includes(r.table)),
      );
      await assert.rejects(
        admin.query('TRUNCATE TABLE "AiAuditEvent"'),
        /immutable synthetic audit/,
      );
      const rowguard = (
        await admin.query(`SELECT tgenabled FROM pg_trigger WHERE tgname='PatientAssessment_guard'`)
      ).rows[0];
      assert.equal(rowguard.tgenabled, 'O');
      const independent = await inventoryDatabase(fresh(), env);
      assert.equal(independent.patientDataEmpty, true);
      assert.equal(independent.catalogTableCount, 43);
      assert.equal(
        parseInventoryLog(
          JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(independent) }),
        ).patientDataEmpty,
        true,
      );
    } finally {
      if (admin) await admin.end().catch(() => {});
      if (owned) execFileSync('docker', ['rm', '-f', name], { stdio: 'pipe' });
    }
  },
);
