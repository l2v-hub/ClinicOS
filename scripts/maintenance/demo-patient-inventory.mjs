// Restricted demo maintenance: aggregate inventory only. Never emit URLs, rows or raw errors.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TARGET = Object.freeze({
  projectId: 'bddf5d1b-ee83-4362-8238-a79721f795e5',
  environmentId: '8021987e-8eaa-4bc8-a102-20566db5e6b4',
  environmentName: 'demo',
  backendServiceId: 'c000f011-0349-4ea9-9b56-13c625b5767b',
  backendServiceName: 'clinicos-backend',
  domain: 'clinicos-backend-demo.up.railway.app',
  databaseHost: 'postgres.railway.internal',
  database: 'railway',
});
const MARKER = 'CLINICOS_DEMO_INVENTORY ';
const patientTables = new Set([
  'DiaryEntryAcknowledgement',
  'DiaryEntryReadReceipt',
  'PatientDiaryEntry',
  'ConsegnaAcknowledgement',
  'ConsegnaReadReceipt',
  'ConsegnaCreationReceipt',
  'Consegna',
  'MedicationAdministration',
  'TherapyAdministrationReceipt',
  'PrnAdministration',
  'TherapySchedule',
  'PatientTherapy',
  'ClinicalNote',
  'ClinicalRecord',
  'Appointment',
  'PatientDocument',
  'PatientAssessmentAttestation',
  'PatientAssessment',
  'PatientIntakeDocument',
  'PatientNarrativeSection',
  'PatientParameterReading',
  'Cartella',
  'PatientRoomAssignment',
  'ImportAudit',
  'ImportDocument',
  'ImportProcessingUnit',
  'ImportMutation',
  'ImportJob',
  'PatientIntakeDraft',
  'Patient',
]);
const preservedTables = new Set([
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
  'User',
  '_prisma_migrations',
  'RosterEpoch',
]);
const mixedTables = new Set(['Nota', 'NotaRecipientState', 'AiAuditEvent']);
const requiredTables = [
  'Patient',
  'User',
  'Operator',
  'AiAuditEvent',
  'Nota',
  'NotaRecipientState',
];
const identifier = (value) => '"' + value.replaceAll('"', '""') + '"';
const check = (condition, code) => {
  if (!condition) throw new Error(code);
};
const count = (value) => typeof value === 'string' && /^\d+$/.test(value);
const uuid = (value) =>
  typeof value === 'string' &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);

export function verifyRuntime(env) {
  check(
    env.RAILWAY_PROJECT_ID === TARGET.projectId &&
      env.RAILWAY_ENVIRONMENT_ID === TARGET.environmentId &&
      env.RAILWAY_ENVIRONMENT_NAME === TARGET.environmentName,
    'DEMO_RUNTIME_IDENTITY_MISMATCH',
  );
  check(
    uuid(env.EXPECTED_INVENTORY_SERVICE_ID) &&
      env.RAILWAY_SERVICE_ID === env.EXPECTED_INVENTORY_SERVICE_ID &&
      env.RAILWAY_SERVICE_ID !== TARGET.backendServiceId,
    'INVENTORY_SERVICE_IDENTITY_MISMATCH',
  );
  verifyDatabaseUrl(env.DATABASE_URL);
}

function verifyDatabaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DEMO_DATABASE_BINDING_INVALID');
  }
  check(
    ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname === TARGET.databaseHost &&
      url.pathname === '/' + TARGET.database &&
      Boolean(url.username) &&
      Boolean(url.password),
    'DEMO_DATABASE_BINDING_MISMATCH',
  );
}

export async function inventoryDatabase(client, env) {
  verifyRuntime(env);
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '30s'");
    const identity = (
      await client.query(
        "SELECT current_database() AS database, current_setting('transaction_read_only') AS readonly",
      )
    ).rows[0];
    check(
      identity?.database === TARGET.database && identity?.readonly === 'on',
      'READ_ONLY_IDENTITY_FAILED',
    );
    const tables = (
      await client.query(
        "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename",
      )
    ).rows;
    check(
      tables.length > 0 &&
        tables.length < 1000 &&
        tables.every(
          (t) => typeof t.tablename === 'string' && /^[A-Za-z_][A-Za-z_0-9]*$/.test(t.tablename),
        ),
      'TABLE_CATALOG_INVALID',
    );
    const catalogTables = tables.map(({ tablename }) => tablename).sort();
    check(new Set(catalogTables).size === catalogTables.length, 'TABLE_CATALOG_INVALID');
    const catalogTableCount = catalogTables.length;
    const catalogSha256 = createHash('sha256').update(JSON.stringify(catalogTables)).digest('hex');
    const counts = [];
    for (const tablename of catalogTables) {
      const rows = (
        await client.query(`SELECT count(*)::text AS n FROM public.${identifier(tablename)}`)
      ).rows[0]?.n;
      check(count(rows), 'TABLE_COUNT_INVALID');
      counts.push({
        table: tablename,
        rows,
        kind: patientTables.has(tablename)
          ? 'patient'
          : preservedTables.has(tablename)
            ? 'preserved'
            : mixedTables.has(tablename)
              ? 'mixed'
              : 'unclassified',
      });
    }
    const names = new Set(counts.map((t) => t.table));
    check(
      requiredTables.every((t) => names.has(t)),
      'REQUIRED_TABLE_MISSING',
    );
    const patientAudits = (
      await client.query(
        'SELECT count(*)::text AS n FROM public."AiAuditEvent" WHERE "patientId" IS NOT NULL',
      )
    ).rows[0]?.n;
    const patientNotes = (
      await client.query(
        "SELECT count(*)::text AS n FROM public.\"Nota\" WHERE coalesce(\"pazienteId\",'') <> '' OR coalesce(\"pazienteNome\",'') <> ''",
      )
    ).rows[0]?.n;
    const orphanNoteStates = (
      await client.query(
        'SELECT count(*)::text AS n FROM public."NotaRecipientState" s WHERE NOT EXISTS (SELECT 1 FROM public."Nota" n WHERE n.id = s."notaId")',
      )
    ).rows[0]?.n;
    check([patientAudits, patientNotes, orphanNoteStates].every(count), 'LINKED_COUNT_INVALID');
    const foreignKeys = (
      await client.query(
        "SELECT source.relname AS source, target.relname AS target, c.conname AS name, c.confdeltype AS deletion, c.convalidated AS validated FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class source ON source.oid = c.conrelid JOIN pg_catalog.pg_class target ON target.oid = c.confrelid WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace ORDER BY 1, 2, 3",
      )
    ).rows;
    const unclassifiedTables = counts.filter((t) => t.kind === 'unclassified').map((t) => t.table);
    const patientDataEmpty =
      unclassifiedTables.length === 0 &&
      counts
        .filter((t) => t.kind === 'patient' || t.kind === 'mixed')
        .every((t) => t.rows === '0') &&
      [patientAudits, patientNotes, orphanNoteStates].every((n) => n === '0');
    return {
      mode: 'read-only',
      targetVerified: true,
      catalogTables,
      catalogTableCount,
      catalogSha256,
      counts,
      foreignKeys,
      linkedCounts: { patientAudits, patientNotes, orphanNoteStates },
      unclassifiedTables,
      patientDataEmpty,
      backupsVerified: false,
      deletionPerformed: false,
    };
  } finally {
    if (connected) await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
  }
}

function railway(args, { json = false, timeout = 30000 } = {}) {
  const result = spawnSync('railway', args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  check(result.status === 0, 'RAILWAY_COMMAND_REJECTED');
  if (!json) return result.stdout;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('RAILWAY_RESULT_INVALID');
  }
}

async function nativeApi(query, variables, { timeout = 30000 } = {}) {
  const response = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Project-Access-Token': process.env.RAILWAY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(timeout),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('RAILWAY_API_RESULT_INVALID');
  }
  check(response.ok && !payload.errors && payload.data, 'RAILWAY_API_REJECTED');
  return payload.data;
}

export async function verifyDemoBinding(call, api) {
  const config = call(['variables', '--service', TARGET.backendServiceId, '--json'], {
    json: true,
  });
  check(
    config.RAILWAY_PROJECT_ID === TARGET.projectId &&
      config.RAILWAY_ENVIRONMENT_ID === TARGET.environmentId &&
      config.RAILWAY_ENVIRONMENT_NAME === TARGET.environmentName &&
      config.RAILWAY_SERVICE_ID === TARGET.backendServiceId &&
      config.RAILWAY_SERVICE_NAME === TARGET.backendServiceName,
    'DEMO_BINDING_IDENTITY_MISMATCH',
  );
  verifyDatabaseUrl(config.DATABASE_URL);
  const data = await api(
    'query($environmentId:String!,$serviceId:String!){serviceInstance(environmentId:$environmentId,serviceId:$serviceId){domains{serviceDomains{domain} customDomains{domain}}}}',
    { environmentId: TARGET.environmentId, serviceId: TARGET.backendServiceId },
  );
  const domains = data.serviceInstance?.domains;
  check(
    Array.isArray(domains?.serviceDomains) && Array.isArray(domains?.customDomains),
    'DEMO_DOMAIN_RESULT_INVALID',
  );
  check(
    [...domains.serviceDomains, ...domains.customDomains].some((d) => d.domain === TARGET.domain),
    'DEMO_BACKEND_DOMAIN_MISMATCH',
  );
}

export function parseInventoryLog(raw) {
  let message;
  try {
    message = JSON.parse(raw).message;
  } catch {
    return null;
  }
  if (typeof message !== 'string' || !message.startsWith(MARKER)) return null;
  let result;
  try {
    result = JSON.parse(message.slice(MARKER.length));
  } catch {
    throw new Error('INVENTORY_RESULT_INVALID');
  }
  check(
    result &&
      result.mode === 'read-only' &&
      result.targetVerified === true &&
      result.deletionPerformed === false &&
      result.backupsVerified === false &&
      typeof result.patientDataEmpty === 'boolean' &&
      Array.isArray(result.catalogTables) &&
      result.catalogTables.length > 0 &&
      result.catalogTables.length < 1000 &&
      result.catalogTables.every(
        (t) => typeof t === 'string' && /^[A-Za-z_][A-Za-z_0-9]*$/.test(t),
      ) &&
      result.catalogTableCount === result.catalogTables.length &&
      typeof result.catalogSha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(result.catalogSha256) &&
      Array.isArray(result.counts) &&
      result.counts.length > 0 &&
      result.counts.every(
        (t) =>
          typeof t.table === 'string' &&
          /^[A-Za-z_][A-Za-z_0-9]*$/.test(t.table) &&
          count(t.rows) &&
          ['patient', 'preserved', 'mixed', 'unclassified'].includes(t.kind),
      ) &&
      Array.isArray(result.foreignKeys) &&
      result.foreignKeys.every(
        (k) =>
          ['source', 'target', 'name', 'deletion'].every(
            (key) => typeof k[key] === 'string' && /^[A-Za-z_0-9]+$/.test(k[key]),
          ) && typeof k.validated === 'boolean',
      ) &&
      Array.isArray(result.unclassifiedTables) &&
      result.unclassifiedTables.every(
        (t) => typeof t === 'string' && /^[A-Za-z_][A-Za-z_0-9]*$/.test(t),
      ) &&
      result.linkedCounts &&
      ['patientAudits', 'patientNotes', 'orphanNoteStates'].every((k) =>
        count(result.linkedCounts[k]),
      ),
    'INVENTORY_RESULT_INVALID',
  );
  const canonicalCatalog = [...result.catalogTables].sort();
  check(
    new Set(canonicalCatalog).size === canonicalCatalog.length &&
      JSON.stringify(result.catalogTables) === JSON.stringify(canonicalCatalog) &&
      createHash('sha256').update(JSON.stringify(canonicalCatalog)).digest('hex') ===
        result.catalogSha256,
    'INVENTORY_RESULT_CATALOG_INVALID',
  );
  const names = new Set(result.counts.map((t) => t.table));
  check(
    names.size === result.counts.length &&
      requiredTables.every((t) => names.has(t)) &&
      JSON.stringify([...names].sort()) === JSON.stringify(canonicalCatalog),
    'INVENTORY_RESULT_TABLES_INVALID',
  );
  check(
    result.counts.every(
      (t) =>
        t.kind ===
        (patientTables.has(t.table)
          ? 'patient'
          : preservedTables.has(t.table)
            ? 'preserved'
            : mixedTables.has(t.table)
              ? 'mixed'
              : 'unclassified'),
    ),
    'INVENTORY_RESULT_CLASSIFICATION_INVALID',
  );
  const unknown = result.counts
    .filter((t) => t.kind === 'unclassified')
    .map((t) => t.table)
    .sort();
  check(
    JSON.stringify([...result.unclassifiedTables].sort()) === JSON.stringify(unknown),
    'INVENTORY_RESULT_CLASSIFICATION_INVALID',
  );
  const empty =
    unknown.length === 0 &&
    result.counts
      .filter((t) => t.kind === 'patient' || t.kind === 'mixed')
      .every((t) => t.rows === '0') &&
    Object.values(result.linkedCounts).every((n) => n === '0');
  check(result.patientDataEmpty === empty, 'INVENTORY_RESULT_EMPTY_CLAIM_INVALID');
  // Rebuild output from explicitly permitted metadata/count fields. Discard unexpected fields.
  return {
    mode: result.mode,
    targetVerified: true,
    catalogTables: canonicalCatalog,
    catalogTableCount: canonicalCatalog.length,
    catalogSha256: result.catalogSha256,
    counts: result.counts.map(({ table, rows, kind }) => ({ table, rows, kind })),
    foreignKeys: result.foreignKeys.map(({ source, target, name, deletion, validated }) => ({
      source,
      target,
      name,
      deletion,
      validated,
    })),
    linkedCounts: Object.fromEntries(
      ['patientAudits', 'patientNotes', 'orphanNoteStates'].map((k) => [k, result.linkedCounts[k]]),
    ),
    unclassifiedTables: result.unclassifiedTables,
    patientDataEmpty: result.patientDataEmpty,
    backupsVerified: false,
    deletionPerformed: false,
  };
}

export async function runInventory({
  env = process.env,
  call = railway,
  api = nativeApi,
  deploy = deployWorker,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxPolls = 60,
  now = () => performance.now(),
  onOwnedService = () => {},
} = {}) {
  const deadline = now() + 8 * 60 * 1000;
  const timeoutWithin = (until, requested, code) => {
    const remaining = Math.floor(until - now());
    check(remaining > 0, code);
    return Math.min(requested, remaining);
  };
  const operationalTimeout = (requested) =>
    timeoutWithin(deadline, requested, 'INVENTORY_OPERATION_DEADLINE_EXCEEDED');
  const operationalCall = (args, options = {}) =>
    call(args, { ...options, timeout: operationalTimeout(options.timeout ?? 30000) });
  const operationalApi = (query, variables) =>
    api(query, variables, { timeout: operationalTimeout(30000) });
  check(env.RAILWAY_TOKEN, 'RAILWAY_DEMO_TOKEN_BINDING_MISSING');
  check(
    env.GITHUB_REF_NAME === 'codex/demo-470-completion' && /^\d+$/.test(env.GITHUB_RUN_ID ?? ''),
    'MAINTENANCE_BRANCH_REQUIRED',
  );
  await verifyDemoBinding(operationalCall, operationalApi);
  const before = operationalCall(
    [
      'service',
      'list',
      '--environment',
      TARGET.environmentId,
      '--project',
      TARGET.projectId,
      '--json',
    ],
    { json: true },
  );
  const name = 'clinicos-demo-readonly-' + env.GITHUB_RUN_ID;
  check(
    Array.isArray(before) && !before.some((s) => s.name === name),
    'TEMPORARY_SERVICE_ALREADY_EXISTS',
  );
  let serviceId;
  try {
    const created = await operationalApi(
      'mutation($input:ServiceCreateInput!){serviceCreate(input:$input){id name}}',
      {
        input: {
          projectId: TARGET.projectId,
          environmentId: TARGET.environmentId,
          name,
          variables: { DATABASE_URL: '${{clinicos-backend.DATABASE_URL}}' },
        },
      },
    );
    check(
      uuid(created.serviceCreate?.id) &&
        created.serviceCreate.name === name &&
        !before.some((s) => s.id === created.serviceCreate.id) &&
        created.serviceCreate.id !== TARGET.backendServiceId,
      'NEW_SERVICE_IDENTITY_UNVERIFIED',
    );
    serviceId = created.serviceCreate.id;
    onOwnedService({ serviceId, environmentId: TARGET.environmentId });
    await operationalApi(
      'mutation($input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:$input)}',
      {
        input: {
          projectId: TARGET.projectId,
          environmentId: TARGET.environmentId,
          serviceId,
          skipDeploys: true,
          replace: false,
          variables: { EXPECTED_INVENTORY_SERVICE_ID: serviceId },
        },
      },
    );
    operationalTimeout(120000);
    await deploy({ serviceId, call: operationalCall });
    operationalTimeout(1);
    let result;
    for (let i = 0; i < maxPolls; i++) {
      await wait(operationalTimeout(5000));
      operationalTimeout(1);
      let raw;
      try {
        raw = operationalCall(
          [
            'logs',
            '--service',
            serviceId,
            '--environment',
            TARGET.environmentId,
            '--json',
            '--lines',
            '100',
          ],
          { timeout: 5000 },
        );
      } catch {
        continue;
      }
      for (const line of raw.split('\n')) {
        const parsed = parseInventoryLog(line);
        if (parsed) result = parsed;
      }
      if (result) break;
    }
    operationalTimeout(1);
    check(result, 'PRIVATE_INVENTORY_RESULT_TIMEOUT');
    return result;
  } finally {
    if (serviceId) {
      const cleanupDeadline = now() + 90000;
      const cleanupTimeout = (requested) =>
        timeoutWithin(cleanupDeadline, requested, 'INVENTORY_CLEANUP_DEADLINE_EXCEEDED');
      const deleted = await api(
        'mutation($id:String!,$environmentId:String!){serviceDelete(id:$id,environmentId:$environmentId)}',
        { id: serviceId, environmentId: TARGET.environmentId },
        { timeout: cleanupTimeout(30000) },
      );
      check(deleted.serviceDelete === true, 'TEMPORARY_SERVICE_CLEANUP_REJECTED');
      const after = call(
        [
          'service',
          'list',
          '--environment',
          TARGET.environmentId,
          '--project',
          TARGET.projectId,
          '--json',
        ],
        { json: true, timeout: cleanupTimeout(30000) },
      );
      check(
        Array.isArray(after) && !after.some((s) => s.id === serviceId),
        'TEMPORARY_SERVICE_CLEANUP_FAILED',
      );
    }
  }
}

function deployWorker({ serviceId, call }) {
  const directory = mkdtempSync(join(tmpdir(), 'clinicos-demo-inventory-'));
  try {
    copyFileSync(new URL(import.meta.url), join(directory, 'inventory.mjs'));
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({ type: 'module', dependencies: { pg: '8.16.3' } }),
    );
    writeFileSync(
      join(directory, 'Dockerfile'),
      'FROM node:22-alpine\nWORKDIR /maintenance\nCOPY package.json ./\nRUN npm install --omit=dev --ignore-scripts --no-audit --no-fund\nCOPY inventory.mjs ./\nUSER node\nCMD ["node","inventory.mjs","--worker"]\n',
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

async function main() {
  const worker = process.argv.length === 3 && process.argv[2] === '--worker';
  try {
    check(process.argv.length === 2 || worker, 'UNSUPPORTED_OPERATION');
    let result;
    if (worker) {
      verifyRuntime(process.env);
      const { default: pg } = await import('pg');
      result = await inventoryDatabase(
        new pg.Client({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 15000,
        }),
        process.env,
      );
    } else
      result = await runInventory({
        onOwnedService: ({ serviceId, environmentId }) =>
          console.log(JSON.stringify({ temporaryInventoryServiceId: serviceId, environmentId })),
      });
    console.log((worker ? MARKER : '') + JSON.stringify(result));
  } catch {
    // Errors can contain connection strings or row fragments. Never forward them.
    console.error(
      JSON.stringify({
        demoInventoryFailed: true,
        deletionPerformed: false,
        code: 'DEMO_INVENTORY_FAILED',
      }),
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
