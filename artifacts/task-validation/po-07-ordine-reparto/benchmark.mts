import assert from 'node:assert/strict';
import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { startPo05Postgres } from '../../../tests/fixtures/po05-postgres.mjs';
import { fixtureActors, selectLocalParameterDatabase, closeParameterPrisma } from '../../../tests/fixtures/parameter-database.mjs';
import { seedPo07Roster } from '../../../tests/fixtures/po07-roster.mjs';

const root = process.cwd(), folder = resolve('artifacts/task-validation/po-07-ordine-reparto');
const database = await startPo05Postgres({ artifactRoot: resolve(folder, 'scratch') });
selectLocalParameterDatabase(database.url);
const { prisma } = await import('../../../backend/src/lib/prisma.js');
try {
  const { facilityToday } = await import('../../../backend/src/patients/parameter-reading-input.js');
  const today = facilityToday();
  await seedPo07Roster(prisma, database.db, today, 200);
  const { loadPatientIdentityPage } = await import('../../../backend/src/patients/identity-page.js');
  const { loadPatientParametersPage } = await import('../../../backend/src/patients/parameters-page.js');
  const { buildTherapySlotPage } = await import('../../../backend/src/therapies/therapy-slots.js');
  const output = [];
  for (const [name, load] of [
    ['patients50', () => loadPatientIdentityPage({ limit: '50' }, fixtureActors.operator)],
    ['parameters25', () => loadPatientParametersPage({ limit: '25', date: today, view: 'entry' }, fixtureActors.operator)],
    ['therapy100', () => buildTherapySlotPage(today, { registeredById: fixtureActors.operator.id }, { limit: 100 })],
  ] as const) {
    const times = []; let bytes = 0;
    for (let i = 0; i < 11; i++) {
      const start = performance.now(), value = await load();
      const elapsed = performance.now() - start;
      assert.equal('pageInfo' in value ? value.pageInfo.hasMore : value.hasMore, true);
      const serialized = JSON.stringify(value);
      assert.ok(!serialized.includes('CONTENUTO CLINICO NON RICHIESTO'));
      if (i) times.push(elapsed);
      bytes = Buffer.byteLength(serialized);
    }
    times.sort((a, b) => a - b);
    output.push({ name, medianMs: (times[4] + times[5]) / 2, p90Ms: times[8], responseBytes: bytes });
  }
  const paths = ['backend/src/patients/identity-page.ts', 'backend/src/patients/parameters-page.ts',
    'backend/src/patients/operational-identity.ts', 'backend/src/patients/alphabetical-order.ts',
    'backend/src/patients/patient-scope.ts', 'backend/src/patients/pagination.ts',
    'backend/src/therapies/therapy-slots.ts', 'prisma/schema.prisma',
    'tests/fixtures/po07-roster.mjs', 'tests/fixtures/po06-identity.mjs',
    'artifacts/task-validation/po-07-ordine-reparto/benchmark.mts'];
  for (const directory of ['backend/src/roster']) {
    if (await access(directory).then(() => true, () => false)) {
      for (const file of await readdir(directory)) if (file.endsWith('.ts')) paths.push(`${directory}/${file}`);
    }
  }
  for (const path of ['backend/src/therapies/therapy-candidate-page.ts', 'backend/src/therapies/therapy-query.ts', 'backend/src/therapies/therapy-administration-page.ts']) {
    if (await access(path).then(() => true, () => false)) paths.push(path);
  }
  const sources = await Promise.all(paths.map(async path => ({ path, sha256: createHash('sha256').update(await readFile(resolve(root, path))).digest('hex') })));
  await writeFile(resolve(folder, process.env.PO07_BENCHMARK_OUTPUT || 'baseline.json'), JSON.stringify({
    at: new Date().toISOString(), scenario: '208 authorized synthetic patients, 516 morning therapy items; 10 warm reads after one cold read; loopback PostgreSQL; all migrations; no clinical JSON payload',
    sources, migrations: database.applied, output,
  }, null, 2));
  console.log(JSON.stringify(output));
} finally { await closeParameterPrisma(prisma); await database.close(); }
