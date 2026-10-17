import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TARGET } from '../demo-patient-inventory.mjs';
import {
  purgeTemporarySources,
  inspectStorageBinding,
  eraseVerifiedSnapshots,
  runStorageMaintenance,
} from '../demo-storage-backups.mjs';
const uuid = '50000000-0000-4000-8000-000000000470',
  backupId = '50000000-0000-4000-8000-000000000471';
const env = {
  RAILWAY_PROJECT_ID: TARGET.projectId,
  RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
  RAILWAY_ENVIRONMENT_NAME: 'demo',
  RAILWAY_SERVICE_ID: TARGET.backendServiceId,
};
test('actual synthetic filesystem counts/erase are exact and unrelated files survive', async () => {
  const base = await fs.mkdtemp(join(tmpdir(), 'clinicos-470-files-')),
    root = join(base, 'imports');
  try {
    await fs.mkdir(join(root, 'synthetic-job'), { recursive: true });
    await fs.writeFile(join(root, 'synthetic-job', 'source'), '123');
    await fs.writeFile(join(root, 'other'), '45');
    await fs.writeFile(join(base, 'preserve'), 'keep');
    const options = { env: { ...env, AI_UPLOAD_DIR: root }, expectedDirectory: root };
    const before = await purgeTemporarySources(options);
    assert.deepEqual(before.before, { files: 2, directories: 1, bytes: 5 });
    assert.equal(before.empty, false);
    const after = await purgeTemporarySources({ ...options, erase: true });
    assert.equal(after.empty, true);
    assert.equal(await fs.readFile(join(base, 'preserve'), 'utf8'), 'keep');
    assert.equal((await purgeTemporarySources(options)).empty, true);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});
test('source cleanup refuses wrong runtime, custom config, symlinks and leaves outside content intact', async () => {
  const base = await fs.mkdtemp(join(tmpdir(), 'clinicos-470-files-negative-')),
    root = join(base, 'imports');
  try {
    await fs.mkdir(root);
    await fs.writeFile(join(base, 'preserve'), 'keep');
    await fs.symlink(join(base, 'preserve'), join(root, 'link'));
    await assert.rejects(
      purgeTemporarySources({
        env: { ...env, AI_UPLOAD_DIR: root },
        expectedDirectory: root,
        erase: true,
      }),
      /SOURCE_SYMLINK_REFUSED/,
    );
    await assert.rejects(
      purgeTemporarySources({
        env: { ...env, RAILWAY_ENVIRONMENT_ID: 'production' },
        expectedDirectory: root,
        erase: true,
      }),
      /SOURCE_RUNTIME_TARGET_MISMATCH/,
    );
    await assert.rejects(
      purgeTemporarySources({
        env: { ...env, AI_UPLOAD_DIR: base },
        expectedDirectory: root,
        erase: true,
      }),
      /UNEXPECTED_SOURCE_DIRECTORY/,
    );
    assert.equal(await fs.readFile(join(base, 'preserve'), 'utf8'), 'keep');
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});
test('snapshot removal only uses IDs from verified exact demo volume and independently rechecks zero', async () => {
  const calls = [];
  let removed = false;
  const api = async (query, variables) => {
    calls.push({ query, variables });
    if (query.startsWith('query'))
      return { volumeInstanceBackupList: removed ? [] : [{ id: backupId }] };
    removed = true;
    return { volumeInstanceBackupDelete: { workflowId: 'synthetic-workflow' } };
  };
  const binding = { volume: { id: uuid, volumeId: uuid, environmentId: TARGET.environmentId } };
  const result = await eraseVerifiedSnapshots(binding, api, { erase: true, wait: async () => {} });
  assert.equal(result.before, 1);
  assert.equal(result.after, 0);
  assert.equal(result.removed, 1);
  assert.equal(calls.filter((c) => c.query.startsWith('query')).length, 2);
  assert.deepEqual(calls.find((c) => c.query.startsWith('mutation')).variables, {
    backupId,
    instanceId: uuid,
  });
  await assert.rejects(
    eraseVerifiedSnapshots({ volume: { ...binding.volume, environmentId: 'production' } }, api, {
      erase: true,
    }),
    /SNAPSHOT_VOLUME_IDENTITY_MISMATCH/,
  );
});
test('failed snapshot deletion or persistent backup count cannot claim empty', async () => {
  const binding = { volume: { id: uuid, volumeId: uuid, environmentId: TARGET.environmentId } };
  for (const rejected of [true, false])
    await assert.rejects(
      eraseVerifiedSnapshots(
        binding,
        async (query) =>
          query.startsWith('query')
            ? { volumeInstanceBackupList: [{ id: backupId }] }
            : { volumeInstanceBackupDelete: rejected ? null : { workflowId: 'synthetic' } },
        { erase: true, wait: async () => {} },
      ),
    );
});

function storageFixture({
  publicRuntime = false,
  extraVolume = false,
  wrongDatabase = false,
  wrongRuntime = false,
  customDirectory = false,
  externalPersistence = false,
} = {}) {
  const dbId = '50000000-0000-4000-8000-000000000472',
    runtimeId = '50000000-0000-4000-8000-000000000473';
  const common = {
    RAILWAY_PROJECT_ID: TARGET.projectId,
    RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
    RAILWAY_ENVIRONMENT_NAME: 'demo',
  };
  const backend = {
    ...common,
    RAILWAY_SERVICE_ID: TARGET.backendServiceId,
    RAILWAY_SERVICE_NAME: TARGET.backendServiceName,
    DATABASE_URL: 'postgresql://synthetic:local@postgres.railway.internal/railway',
    AI_RUNTIME_URL: wrongRuntime
      ? 'http://unrelated.railway.internal:8000'
      : publicRuntime
        ? 'https://synthetic-runtime-demo.up.railway.app'
        : 'http://ai.railway.internal:8000',
    ...(customDirectory ? { AI_UPLOAD_DIR: '/unsafe' } : {}),
  };
  const services = [
    { id: TARGET.backendServiceId, name: TARGET.backendServiceName },
    { id: dbId, name: 'Postgres' },
    { id: runtimeId, name: 'clinicos-ai-runtime' },
  ];
  const call = (args) =>
    args[0] === 'service'
      ? services
      : args.includes(TARGET.backendServiceId)
        ? backend
        : args.includes(dbId)
          ? {
              ...common,
              RAILWAY_PRIVATE_DOMAIN: TARGET.databaseHost,
              PGDATA: '/var/lib/postgresql/data/pgdata',
              RAILWAY_VOLUME_MOUNT_PATH: '/var/lib/postgresql/data',
              DATABASE_URL: wrongDatabase
                ? backend.DATABASE_URL.replace('local@', 'different@')
                : backend.DATABASE_URL,
            }
          : {
              ...common,
              RAILWAY_PRIVATE_DOMAIN: 'ai.railway.internal',
              ...(externalPersistence ? { DATABASE_URL: backend.DATABASE_URL } : {}),
            };
  const native = async (query) =>
    query.includes('serviceInstance(environmentId:')
      ? {
          serviceInstance: {
            domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] },
          },
        }
      : {
          environment: {
            id: TARGET.environmentId,
            projectId: TARGET.projectId,
            volumeInstances: {
              pageInfo: { hasNextPage: false },
              edges: [
                {
                  node: {
                    id: uuid,
                    volumeId: uuid,
                    serviceId: dbId,
                    environmentId: TARGET.environmentId,
                    mountPath: '/var/lib/postgresql/data',
                    state: 'READY',
                  },
                },
                ...(extraVolume
                  ? [
                      {
                        node: {
                          id: backupId,
                          volumeId: backupId,
                          serviceId: TARGET.backendServiceId,
                          environmentId: TARGET.environmentId,
                          mountPath: '/uploads',
                        },
                      },
                    ]
                  : []),
              ],
            },
            serviceInstances: {
              pageInfo: { hasNextPage: false },
              edges: services
                .filter((s) => s.id !== dbId)
                .map((s) => ({
                  node: {
                    serviceId: s.id,
                    serviceName: s.name,
                    environmentId: TARGET.environmentId,
                    domains: {
                      serviceDomains: [{ domain: 'synthetic-runtime-demo.up.railway.app' }],
                      customDomains: [],
                    },
                    activeDeployments: [{ id: uuid }],
                    latestDeployment: { id: uuid, instances: [{ id: uuid, status: 'RUNNING' }] },
                  },
                })),
            },
          },
        };
  return { call, native };
}
test('volume/database/runtime binding is exact and unknown persistence prevents maintenance', async () => {
  const fixture = storageFixture();
  const verified = await inspectStorageBinding(fixture.call, fixture.native);
  assert.equal(verified.volume.volumeId, uuid);
  assert.equal(verified.volume.environmentId, TARGET.environmentId);
  const publicFixture = storageFixture({ publicRuntime: true });
  assert.ok(await inspectStorageBinding(publicFixture.call, publicFixture.native));
  for (const options of [
    { extraVolume: true },
    { wrongDatabase: true },
    { wrongRuntime: true },
    { customDirectory: true },
    { externalPersistence: true },
  ]) {
    const f = storageFixture(options);
    await assert.rejects(inspectStorageBinding(f.call, f.native));
  }
});

test('storage deadline prevents subsequent snapshot or filesystem writes after slow metadata', async () => {
  const fixture = storageFixture();
  let clock = 0,
    writes = 0;
  const native = async (query, variables) => {
    const result = await fixture.native(query, variables);
    if (query.includes('environment(id:')) clock = 480001;
    if (query.startsWith('mutation')) writes++;
    return result;
  };
  const call = (args, options) => {
    if (args[0] === 'ssh') writes++;
    return fixture.call(args, options);
  };
  await assert.rejects(
    runStorageMaintenance({
      env: { RAILWAY_TOKEN: 'synthetic', GITHUB_REF_NAME: 'codex/demo-470-completion' },
      erase: true,
      call,
      native,
      now: () => clock,
      wait: async () => {},
    }),
    /STORAGE_DEADLINE_EXCEEDED/,
  );
  assert.equal(writes, 0);
});
