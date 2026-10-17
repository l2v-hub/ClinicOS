import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TARGET } from '../demo-patient-inventory.mjs';
import {
  cleanupDatabase,
  parseCleanupLog,
  runAuthorizedCleanup,
  CLEANUP_TABLES,
  PRESERVED_TABLES,
  EXPECTED_CATALOG_SHA256,
} from '../demo-patient-cleanup-authorized.mjs';
const id = '50000000-0000-4000-8000-000000000473';
const cleanup = () => ({
  mode: 'authorized-demo-cleanup',
  committed: true,
  catalogSha256: EXPECTED_CATALOG_SHA256,
  tables: CLEANUP_TABLES.map((table) => ({
    table,
    before: table === 'ImportJob' ? '10' : '0',
    after: '0',
  })),
  preservedTableCount: 13,
  preservedContentUnchanged: true,
  triggerStatesUnchanged: true,
  foreignKeysEnabled: true,
  truncateTriggerExceptions: [],
  backupsVerified: false,
});
const inventory = () => {
  const catalogTables = [...CLEANUP_TABLES, ...PRESERVED_TABLES].sort();
  return {
    mode: 'read-only',
    targetVerified: true,
    catalogTables,
    catalogTableCount: 43,
    catalogSha256: createHash('sha256').update(JSON.stringify(catalogTables)).digest('hex'),
    counts: catalogTables.map((table) => ({
      table,
      rows: PRESERVED_TABLES.includes(table) ? '1' : '0',
      kind: PRESERVED_TABLES.includes(table)
        ? 'preserved'
        : ['AiAuditEvent', 'Nota', 'NotaRecipientState'].includes(table)
          ? 'mixed'
          : 'patient',
    })),
    foreignKeys: [],
    linkedCounts: { patientAudits: '0', patientNotes: '0', orphanNoteStates: '0' },
    unclassifiedTables: [],
    patientDataEmpty: true,
    backupsVerified: false,
    deletionPerformed: false,
  };
};
const wrap = (prefix, data) => JSON.stringify({ message: prefix + JSON.stringify(data) });
test('wrong runtime target cannot connect or mutate', async () => {
  let connected = false;
  await assert.rejects(
    cleanupDatabase(
      {
        connect: async () => {
          connected = true;
        },
      },
      { RAILWAY_ENVIRONMENT_NAME: 'production' },
    ),
  );
  assert.equal(connected, false);
});
test('cleanup result projects only counts/invariants and rejects forged completion', () => {
  const report = cleanup();
  report.secret = 'must-not-forward';
  assert.equal(
    JSON.stringify(parseCleanupLog(wrap('CLINICOS_DEMO_CLEANUP ', report))).includes(
      'must-not-forward',
    ),
    false,
  );
  for (const mutate of [
    (r) => r.tables.pop(),
    (r) => {
      r.tables[0].after = '1';
    },
    (r) => {
      r.preservedContentUnchanged = false;
    },
    (r) => {
      r.catalogSha256 = '0'.repeat(64);
    },
    (r) => {
      r.truncateTriggerExceptions = [{ table: 'User', name: 'auth_guard' }];
    },
  ]) {
    const data = cleanup();
    mutate(data);
    assert.throws(() => parseCleanupLog(wrap('CLINICOS_DEMO_CLEANUP ', data)));
  }
});
test('bounded reused launcher requires separate committed cleanup evidence and independent zero inventory, then removes owned service', async () => {
  for (const bad of [null, 'cleanup-marker-missing', 'post-check-nonempty']) {
    const mutations = [],
      config = {
        RAILWAY_PROJECT_ID: TARGET.projectId,
        RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
        RAILWAY_ENVIRONMENT_NAME: 'demo',
        RAILWAY_SERVICE_ID: TARGET.backendServiceId,
        RAILWAY_SERVICE_NAME: TARGET.backendServiceName,
        DATABASE_URL: 'postgresql://synthetic:local@postgres.railway.internal/railway',
      };
    const after = inventory();
    if (bad === 'post-check-nonempty') {
      after.counts.find((t) => t.table === 'Patient').rows = '1';
      after.patientDataEmpty = false;
    }
    const call = (args) =>
      args[0] === 'variables'
        ? config
        : args[0] === 'service'
          ? []
          : args[0] === 'logs'
            ? (bad === 'cleanup-marker-missing'
                ? ''
                : wrap('CLINICOS_DEMO_CLEANUP ', cleanup()) + '\n') +
              wrap('CLINICOS_DEMO_INVENTORY ', after)
            : '';
    const api = async (query, variables) => {
      if (query.startsWith('query'))
        return {
          serviceInstance: {
            domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] },
          },
        };
      mutations.push({ query, variables });
      if (query.includes('serviceCreate'))
        return { serviceCreate: { id, name: 'clinicos-demo-readonly-473' } };
      if (query.includes('serviceDelete')) return { serviceDelete: true };
      return {};
    };
    const run = () =>
      runAuthorizedCleanup({
        env: {
          RAILWAY_TOKEN: 'synthetic-only',
          GITHUB_REF_NAME: 'codex/demo-470-completion',
          GITHUB_RUN_ID: '473',
        },
        call,
        api,
        deploy: async () => {},
        wait: async () => {},
        maxPolls: 1,
      });
    if (bad) await assert.rejects(run(), /AUTHORIZED_CLEANUP_UNVERIFIED/);
    else {
      const result = await run();
      assert.equal(result.cleanup.committed, true);
      assert.equal(result.independentAfter.patientDataEmpty, true);
      assert.equal(result.backupsVerified, false);
      assert.equal(result.sourceStorageVerified, false);
    }
    assert.equal(mutations.filter((m) => m.query.includes('serviceDelete')).length, 1);
  }
});
test('new workflow operations preserve old production scope and require demo secret/branch', () => {
  const yaml = readFileSync(
    new URL('../../../.github/workflows/deploy-backend.yml', import.meta.url),
    'utf8',
  );
  for (const name of [
    'demo-cleanup',
    'demo-storage-backups',
    'demo-post-inventory',
    'demo-online-browser',
  ]) {
    const section = yaml.split('  ' + name + ':\n')[1]?.split(/\n  [a-z][a-z-]+:\n/)[0];
    assert.ok(section, name);
    assert.match(section, /codex\/demo-470-completion/);
  }
  assert.match(yaml, /playwright@1\.61\.1/);
  assert.match(yaml, /snapshots:false|demo-online-empty-browser\.mjs/);
  for (const name of ['backup-cleanup', 'online-cleanup', 'native-snapshots', 'inspect-worker'])
    assert.match(
      yaml.split('  ' + name + ':\n')[1].split('\n  ')[0],
      /codex\/production-inventory-2026-10-13/,
    );
});
