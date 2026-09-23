import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { startPo05Postgres } from '../../../tests/fixtures/po05-postgres.mjs';
import { selectLocalParameterDatabase, seedParameterDatabase, fixtureActors, closeParameterPrisma } from '../../../tests/fixtures/parameter-database.mjs';
const root = resolve(process.env.PO06_CANDIDATE_ROOT || '.');
const folder = resolve('artifacts/task-validation/po-06-identita-posto-letto');
const moduleAt = (path: string) => import(pathToFileURL(resolve(root, path)).href);
const database = await startPo05Postgres({ repositoryRoot: root, artifactRoot: resolve(folder, 'scratch') });
selectLocalParameterDatabase(database.url);
await seedParameterDatabase(database.db);
const { prisma } = await moduleAt('backend/src/lib/prisma.ts');
try {
  const patients = Array.from({ length: 200 }, (_, i) => ({ id: `po06-bench-${i}`, medicalRecordNumber: `po06-synthetic-${i}`, firstName: 'Sintetico', lastName: `Paziente ${String(i).padStart(3, '0')}`, registeredById: fixtureActors.operator.id }));
  await prisma.patient.createMany({ data: patients });
  await prisma.cartella.createMany({ data: patients.map((p, i) => ({ patientId: p.id, data: { cameraNumero: String(i % 20 + 1), lettoNumero: i % 2 ? 'A' : 'B', annotazioni: 'Testo sintetico '.repeat(500), parametriMensili: [] } })) });
  const { loadPatientIdentityPage } = await moduleAt('backend/src/patients/identity-page.ts');
  const { loadPatientParametersPage } = await moduleAt('backend/src/patients/parameters-page.ts');
  const output = [];
  for (const [name, load, query] of [
    ['patients', loadPatientIdentityPage, { limit: '50' }],
    ['parameters', loadPatientParametersPage, { limit: '25', view: 'entry', date: '2026-09-23' }],
  ] as const) {
    const times = []; let bytes = 0;
    for (let i = 0; i < 11; i++) {
      const start = performance.now(); const value = await load(query, fixtureActors.operator);
      const elapsed = performance.now() - start;
      assert.equal(value.items.length, Number(query.limit)); assert.equal(value.hasMore, true);
      assert.ok(!JSON.stringify(value).includes('Testo sintetico'));
      if (i > 0) times.push(elapsed); bytes = Buffer.byteLength(JSON.stringify(value));
    }
    times.sort((a,b) => a-b);
    output.push({ name, pageSize: Number(query.limit), medianMs: (times[4] + times[5]) / 2, p90Ms: times[8], responseBytes: bytes });
  }
  const sources = [];
  for (const path of ['backend/src/patients/identity-page.ts', 'backend/src/patients/parameters-page.ts', 'backend/src/patients/patient-scope.ts', 'prisma/schema.prisma']) {
    sources.push({ path, sha256: createHash('sha256').update(await readFile(resolve(root, path))).digest('hex') });
  }
  const identityPath = 'backend/src/patients/operational-identity.ts';
  if (await access(resolve(root, identityPath)).then(() => true, () => false)) {
    sources.push({ path: identityPath, sha256: createHash('sha256').update(await readFile(resolve(root, identityPath))).digest('hex') });
  }
  const result = { candidateRoot: root, at: new Date().toISOString(), scenario: '202 authorized synthetic patients; 200 legacy locations, oversized unrelated cartella text; loopback PostgreSQL; 10 warm reads after one cold read', sources, output };
  await writeFile(resolve(folder, process.env.PO06_BENCHMARK_OUTPUT || 'baseline.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(output));
} finally { await closeParameterPrisma(prisma); await database.close(); }
