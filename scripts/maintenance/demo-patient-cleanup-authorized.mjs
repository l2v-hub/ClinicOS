// Explicitly authorized fictional DEMO cleanup. Production is excluded.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  TARGET,
  verifyRuntime,
  inventoryDatabase,
  runInventory,
} from './demo-patient-inventory.mjs';

export const CLEANUP_TABLES = Object.freeze([
  'AiAuditEvent',
  'Appointment',
  'Cartella',
  'ClinicalNote',
  'ClinicalRecord',
  'Consegna',
  'ConsegnaAcknowledgement',
  'ConsegnaCreationReceipt',
  'DiaryEntryAcknowledgement',
  'ImportAudit',
  'ImportDocument',
  'ImportJob',
  'ImportMutation',
  'ImportProcessingUnit',
  'MedicationAdministration',
  'Nota',
  'NotaRecipientState',
  'Patient',
  'PatientAssessment',
  'PatientAssessmentAttestation',
  'PatientDiaryEntry',
  'PatientDocument',
  'PatientIntakeDocument',
  'PatientIntakeDraft',
  'PatientNarrativeSection',
  'PatientParameterReading',
  'PatientRoomAssignment',
  'PatientTherapy',
  'PrnAdministration',
  'TherapySchedule',
]);
export const PRESERVED_TABLES = Object.freeze([
  'AuthzPolicyVersion',
  'Bed',
  'Farmaco',
  'FarmacoImport',
  'FarmacoPrincipioAttivo',
  'Operator',
  'OperatorRosterPreference',
  'OperatorSchedule',
  'Room',
  'RosterContext',
  'RosterEpoch',
  'User',
  '_prisma_migrations',
]);
export const EXPECTED_CATALOG_SHA256 =
  '14770fae19038e341ae47af4e4301536592b25cae25f14085260cd017df2e7d6';
const expectedTables = [...CLEANUP_TABLES, ...PRESERVED_TABLES].sort();
const marker = 'CLINICOS_DEMO_CLEANUP ';
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const check = (value, code) => {
  if (!value) throw new Error(code);
};
const truncateGuards = new Map([
  ['AiAuditEvent:AiAuditEvent_no_truncate', 'clinicos_ai_audit_append_only'],
  [
    'ConsegnaAcknowledgement:ConsegnaAcknowledgement_no_truncate',
    'clinicos_consegna_ack_append_only',
  ],
  [
    'DiaryEntryAcknowledgement:DiaryEntryAcknowledgement_no_truncate',
    'clinicos_diary_ack_append_only',
  ],
  ['PrnAdministration:PrnAdministration_no_truncate', 'clinicos_prn_append_only'],
]);
const triggerQuery =
  "SELECT c.relname AS table,t.tgname AS name,t.tgenabled AS enabled,t.tgtype AS type,p.proname AS function FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND n.nspname='public' ORDER BY 1,2";
async function catalog(client) {
  const names = (
    await client.query(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename",
    )
  ).rows
    .map((t) => t.tablename)
    .sort();
  check(
    JSON.stringify(names) === JSON.stringify(expectedTables) &&
      createHash('sha256').update(JSON.stringify(names)).digest('hex') === EXPECTED_CATALOG_SHA256,
    'DEMO_CATALOG_CHANGED',
  );
  return names;
}
async function signatures(client, tables) {
  const result = [];
  for (const table of tables)
    result.push({
      table,
      ...(
        await client.query(
          `SELECT count(*)::text AS rows,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS digest FROM (SELECT md5(to_jsonb(t)::text) AS h FROM public.${quote(table)} t) s`,
        )
      ).rows[0],
    });
  return result;
}
async function counts(client, tables) {
  const result = [];
  for (const table of tables)
    result.push({
      table,
      rows: (await client.query(`SELECT count(*)::text AS n FROM public.${quote(table)}`)).rows[0]
        .n,
    });
  return result;
}
export async function cleanupDatabase(client, env, { simulateFailure = false } = {}) {
  verifyRuntime(env);
  let connected = false,
    committed = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query("SET LOCAL lock_timeout='10s'");
    await client.query("SET LOCAL statement_timeout='45s'");
    const identity = (
      await client.query(
        "SELECT current_database() AS database,current_setting('transaction_read_only') AS readonly",
      )
    ).rows[0];
    check(
      identity?.database === TARGET.database && identity.readonly === 'off',
      'DEMO_WRITE_IDENTITY_FAILED',
    );
    const tables = await catalog(client);
    await client.query(
      'LOCK TABLE ' +
        tables.map((t) => 'public.' + quote(t)).join(',') +
        ' IN SHARE ROW EXCLUSIVE MODE',
    );
    await catalog(client);
    const foreignKeys = (
      await client.query(
        "SELECT s.relname AS source,t.relname AS target,sn.nspname AS source_schema,tn.nspname AS target_schema,c.convalidated AS validated FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class s ON s.oid=c.conrelid JOIN pg_catalog.pg_namespace sn ON sn.oid=s.relnamespace JOIN pg_catalog.pg_class t ON t.oid=c.confrelid JOIN pg_catalog.pg_namespace tn ON tn.oid=t.relnamespace WHERE c.contype='f' AND (sn.nspname='public' OR tn.nspname='public') ORDER BY 1,2",
      )
    ).rows;
    check(
      foreignKeys.every(
        (k) =>
          k.source_schema === 'public' &&
          k.target_schema === 'public' &&
          tables.includes(k.source) &&
          tables.includes(k.target) &&
          k.validated,
      ),
      'UNVERIFIED_FOREIGN_KEY_CLOSURE',
    );
    check(
      !foreignKeys.some(
        (k) => PRESERVED_TABLES.includes(k.source) && CLEANUP_TABLES.includes(k.target),
      ),
      'PRESERVED_TABLE_REFERENCES_CLINICAL_DATA',
    );
    const unsafe = (
      await client.query(
        "SELECT count(*)::text AS n FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE t.tgisinternal AND n.nspname='public' AND t.tgenabled NOT IN ('O','A')",
      )
    ).rows[0].n;
    check(unsafe === '0', 'FOREIGN_KEY_TRIGGER_DISABLED');
    const invalid = (
      await client.query(
        "SELECT count(*)::text AS n FROM pg_catalog.pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated",
      )
    ).rows[0].n;
    check(invalid === '0', 'UNVALIDATED_CONSTRAINT');
    const unsupported = (
      await client.query(
        "SELECT count(*)::text AS n FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND (c.relrowsecurity OR c.relispartition OR c.relkind='p')",
      )
    ).rows[0].n;
    check(unsupported === '0', 'UNSUPPORTED_TABLE_SECURITY_OR_PARTITION');
    const beforePreserved = await signatures(client, PRESERVED_TABLES);
    const before = await counts(client, CLEANUP_TABLES);
    const triggers = (await client.query(triggerQuery)).rows;
    const exceptions = triggers.filter(
      (t) =>
        CLEANUP_TABLES.includes(t.table) && (t.type & 32) !== 0 && ['O', 'A'].includes(t.enabled),
    );
    check(
      exceptions.every((t) => truncateGuards.get(t.table + ':' + t.name) === t.function),
      'UNRECOGNIZED_TRUNCATE_TRIGGER',
    );
    for (const trigger of exceptions)
      await client.query(
        `ALTER TABLE public.${quote(trigger.table)} DISABLE TRIGGER ${quote(trigger.name)}`,
      );
    await client.query(
      'TRUNCATE TABLE ' + CLEANUP_TABLES.map((t) => 'public.' + quote(t)).join(','),
    );
    if (simulateFailure) throw new Error('SIMULATED_POST_TRUNCATE_FAILURE');
    for (const trigger of exceptions)
      await client.query(
        `ALTER TABLE public.${quote(trigger.table)} ${trigger.enabled === 'A' ? 'ENABLE ALWAYS' : 'ENABLE'} TRIGGER ${quote(trigger.name)}`,
      );
    const after = await counts(client, CLEANUP_TABLES);
    check(
      after.every((t) => t.rows === '0'),
      'CLINICAL_DATA_REMAINS',
    );
    check(
      JSON.stringify(beforePreserved) ===
        JSON.stringify(await signatures(client, PRESERVED_TABLES)),
      'PRESERVED_CONTENT_CHANGED',
    );
    check(
      JSON.stringify(triggers) === JSON.stringify((await client.query(triggerQuery)).rows),
      'TRIGGER_STATE_CHANGED',
    );
    await catalog(client);
    await client.query('COMMIT');
    committed = true;
    return {
      mode: 'authorized-demo-cleanup',
      committed: true,
      catalogSha256: EXPECTED_CATALOG_SHA256,
      tables: before.map((t) => ({ table: t.table, before: t.rows, after: '0' })),
      preservedTableCount: PRESERVED_TABLES.length,
      preservedContentUnchanged: true,
      triggerStatesUnchanged: true,
      foreignKeysEnabled: true,
      truncateTriggerExceptions: exceptions.map((t) => ({ table: t.table, name: t.name })),
      backupsVerified: false,
    };
  } finally {
    if (connected && !committed) await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
  }
}
export function parseCleanupLog(line) {
  let message;
  try {
    message = JSON.parse(line).message;
  } catch {
    return null;
  }
  if (typeof message !== 'string' || !message.startsWith(marker)) return null;
  let result;
  try {
    result = JSON.parse(message.slice(marker.length));
  } catch {
    throw new Error('CLEANUP_RESULT_INVALID');
  }
  check(
    result?.mode === 'authorized-demo-cleanup' &&
      result.committed === true &&
      result.catalogSha256 === EXPECTED_CATALOG_SHA256 &&
      result.preservedTableCount === 13 &&
      result.preservedContentUnchanged === true &&
      result.triggerStatesUnchanged === true &&
      result.foreignKeysEnabled === true &&
      result.backupsVerified === false &&
      Array.isArray(result.tables) &&
      result.tables.length === CLEANUP_TABLES.length &&
      JSON.stringify(result.tables.map((t) => t.table).sort()) ===
        JSON.stringify([...CLEANUP_TABLES].sort()) &&
      result.tables.every(
        (t) => typeof t.before === 'string' && /^\d+$/.test(t.before) && t.after === '0',
      ) &&
      Array.isArray(result.truncateTriggerExceptions) &&
      result.truncateTriggerExceptions.every((t) => truncateGuards.has(t.table + ':' + t.name)),
    'CLEANUP_RESULT_INVALID',
  );
  return {
    mode: result.mode,
    committed: true,
    catalogSha256: result.catalogSha256,
    tables: result.tables.map(({ table, before, after }) => ({ table, before, after })),
    preservedTableCount: 13,
    preservedContentUnchanged: true,
    triggerStatesUnchanged: true,
    foreignKeysEnabled: true,
    truncateTriggerExceptions: result.truncateTriggerExceptions.map(({ table, name }) => ({
      table,
      name,
    })),
    backupsVerified: false,
  };
}
function railway(args, options = {}) {
  const r = spawnSync('railway', args, {
    encoding: 'utf8',
    timeout: options.timeout ?? 30000,
    maxBuffer: 8 * 1024 * 1024,
  });
  check(r.status === 0, 'RAILWAY_COMMAND_REJECTED');
  if (!options.json) return r.stdout;
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error('RAILWAY_RESULT_INVALID');
  }
}
function deployCleanup({ serviceId, call }) {
  const directory = mkdtempSync(join(tmpdir(), 'clinicos-demo-cleanup-'));
  try {
    for (const file of ['demo-patient-cleanup-authorized.mjs', 'demo-patient-inventory.mjs'])
      copyFileSync(new URL(file, import.meta.url), join(directory, file));
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({ type: 'module', dependencies: { pg: '8.16.3' } }),
    );
    writeFileSync(
      join(directory, 'Dockerfile'),
      'FROM node:22-alpine\nWORKDIR /maintenance\nCOPY package.json ./\nRUN npm install --omit=dev --ignore-scripts --no-audit --no-fund\nCOPY *.mjs ./\nUSER node\nCMD ["node","demo-patient-cleanup-authorized.mjs","--worker"]\n',
    );
    writeFileSync(
      join(directory, 'railway.json'),
      JSON.stringify({
        build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
        deploy: { restartPolicyType: 'NEVER' },
      }),
    );
    call(
      [
        'up',
        directory,
        '--path-as-root',
        '--service',
        serviceId,
        '--environment',
        TARGET.environmentId,
        '--project',
        TARGET.projectId,
        '--detach',
        '--yes',
        '--json',
      ],
      { timeout: 120000 },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
export async function runAuthorizedCleanup({
  call = railway,
  deploy = deployCleanup,
  ...options
} = {}) {
  let cleanupResult,
    invalidResult = false;
  const wrappedCall = (args, settings) => {
    const output = call(args, settings);
    if (args[0] === 'logs')
      for (const line of output.split('\n')) {
        try {
          const parsed = parseCleanupLog(line);
          if (parsed) cleanupResult = parsed;
        } catch {
          invalidResult = true;
        }
      }
    return output;
  };
  // The existing reviewed launcher only accepts a real independent READ ONLY post-check.
  // The separate cleanup marker above describes the preceding authorized write transaction.
  const after = await runInventory({ ...options, call: wrappedCall, deploy });
  check(cleanupResult && !invalidResult && after.patientDataEmpty, 'AUTHORIZED_CLEANUP_UNVERIFIED');
  return {
    operation: 'authorized-demo-cleanup',
    cleanup: cleanupResult,
    independentAfter: after,
    sourceStorageVerified: false,
    backupsVerified: false,
  };
}
async function main() {
  try {
    const worker = process.argv.length === 3 && process.argv[2] === '--worker';
    check(worker || process.argv.length === 2, 'UNSUPPORTED_OPERATION');
    if (worker) {
      verifyRuntime(process.env);
      const { default: pg } = await import('pg');
      const client = () =>
        new pg.Client({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 15000,
        });
      const cleanup = await cleanupDatabase(client(), process.env);
      console.log(marker + JSON.stringify(cleanup));
      const after = await inventoryDatabase(client(), process.env);
      check(after.patientDataEmpty, 'POST_COMMIT_INVENTORY_NOT_EMPTY');
      console.log('CLINICOS_DEMO_INVENTORY ' + JSON.stringify(after));
    } else
      console.log(
        JSON.stringify(
          await runAuthorizedCleanup({
            onOwnedService: ({ serviceId, environmentId }) =>
              console.log(JSON.stringify({ ownedCleanupServiceId: serviceId, environmentId })),
          }),
        ),
      );
  } catch {
    console.error(
      JSON.stringify({ authorizedDemoCleanupFailed: true, code: 'AUTHORIZED_DEMO_CLEANUP_FAILED' }),
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
