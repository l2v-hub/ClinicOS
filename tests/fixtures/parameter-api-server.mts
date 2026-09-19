import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { closeParameterPrisma, fixtureActors, fixturePatientIds, repositoryRoot, seedParameterDatabase, selectLocalParameterDatabase,
  startParameterApi, startParameterDatabase } from './parameter-database.mjs';

const dataDir = resolve(repositoryRoot, 'artifacts/task-validation/registrazione-rapida-e-storico-parametri-vitali/browser-db');
const database = await startParameterDatabase({ port: 15439, dataDir });
await seedParameterDatabase(database.db);
selectLocalParameterDatabase(database.url);
const { prisma } = await import('../../backend/src/lib/prisma.js');
const { createParameterReading, listParameterReadings } = await import('../../backend/src/patients/parameter-readings.js');
// Stable synthetic history on three distinct days, populated once per persistent fixture.
const history = await listParameterReadings(fixturePatientIds[0], {}, fixtureActors.operator);
if (history.readings.length === 0) {
  for (const [measuredAt, values] of [
    ['2026-09-17T06:10:00.000Z', { pa: '122/78', fc: '70', spo2: '98' }],
    ['2026-09-18T16:45:00.000Z', { temperatura: '36.7', dtx: '102', note: 'Controllo serale sintetico' }],
    ['2026-09-19T06:15:00.000Z', { pa: '120/80', spo2: '98', fc: '72' }],
  ] as const) await createParameterReading(fixturePatientIds[0], { requestId: randomUUID(), measuredAt, values }, fixtureActors.operator);
}
const api = await startParameterApi({ port: 3199, faults: true });
console.log(JSON.stringify({ ready: true, synthetic: true, api: api.url, databasePort: 15439, patientIds: fixturePatientIds,
  actor: fixtureActors.operator, migrated: database.applied, limits: 'PGlite multiplexes one PostgreSQL connection; not native PostgreSQL parallel isolation.' }));
async function shutdown() { await api.close(); await closeParameterPrisma(prisma); await database.close(); process.exit(0); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
