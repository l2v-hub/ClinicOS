// Giro completo seed → wipe → seed sul database reale. DISTRUTTIVO: svuota i dati operativi del
// database a cui punta DATABASE_URL, quindi è opt-in e non gira mai insieme agli altri test:
//
//   SYNTHETIC_DATA_DESTRUCTIVE_TESTS=1 node --import tsx --test \
//     src/synthetic/__tests__/synthetic-data-destructive-db.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import {
  seedSyntheticData,
  syntheticDataAvailability,
  syntheticDataCounts,
  wipeSyntheticData,
} from '../index.js';
import { PRESERVED_TABLES, WIPED_TABLES, tableCounts } from '../wipe.js';

// Doppia chiave: opt-in esplicito E ambiente in cui l'API stessa sarebbe ammessa. Il test chiama
// il servizio direttamente, quindi applica qui la stessa guardia della rotta.
const optedIn = process.env.SYNTHETIC_DATA_DESTRUCTIVE_TESTS === '1';
const availability = syntheticDataAvailability();
const skip = !optedIn
  ? 'opt-in: SYNTHETIC_DATA_DESTRUCTIVE_TESTS=1 (svuota il database)'
  : !availability.enabled
    ? `ambiente non ammesso (${availability.tier}): ${availability.reason}`
    : false;

async function userTriggerStates() {
  return prisma.$queryRaw<Array<{ name: string; enabled: string }>>`
    SELECT tgname AS name, tgenabled::text AS enabled FROM pg_trigger
    WHERE NOT tgisinternal ORDER BY tgname`;
}

test(
  'seed idempotente, wipe completo anche sulle tabelle append-only, nuovo seed',
  { skip },
  async () => {
    // Un dato estraneo al dataset: il wipe deve eliminare tutto, non solo ciò che il seed ha creato.
    await prisma.patient.create({
      data: {
        medicalRecordNumber: `MRN-STRAY-${Date.now()}`,
        firstName: 'Estraneo',
        lastName: 'Al Dataset',
        dateOfBirth: new Date('1950-01-01T00:00:00.000Z'),
      },
    });
    const first = await seedSyntheticData(prisma);
    assert.ok(first.counts.patients >= 10, 'pazienti sintetici + il dato estraneo');
    assert.ok(first.counts.rooms >= 4 && first.counts.beds >= 8);
    assert.ok(first.counts.therapies >= 16 && first.counts.appointments >= 5);
    assert.ok(first.counts.consegne >= 5 && first.counts.diaryEntries >= 5);
    assert.ok(first.counts.parameterReadings >= 5 && first.counts.notes >= 2);
    assert.ok(first.counts.operatorSchedules >= 3 && first.counts.intakeDrafts >= 1);
    const cartella = await prisma.cartella.findUnique({
      where: { patientId: first.demoPatientId },
    });
    assert.ok(cartella, 'paziente demo con cartella completa');

    const again = await seedSyntheticData(prisma);
    assert.deepEqual(again.counts, first.counts, 'rieseguire il seed non duplica nulla');

    // Righe protette da trigger append-only: da sole non si possono cancellare… (createMany con
    // skipDuplicates: il test lascia apposta una riga dopo l'ultimo seed e deve restare rieseguibile)
    await prisma.diaryEntryAcknowledgement.createMany({
      skipDuplicates: true,
      data: {
        entryId: 'SEED-DIARY-005',
        patientId: 'SEED-PAZ-003',
        operatorId: 'SEED-OP-002',
        operatorName: 'Marco Rinaldi',
        operatorRole: 'oss',
      },
    });
    await prisma.consegnaAcknowledgement.createMany({
      skipDuplicates: true,
      data: {
        consegnaId: 'SEED-CONS-001',
        patientId: 'SEED-PAZ-001',
        operatorId: 'SEED-OP-001',
        operatorName: 'Laura Bianchi',
        operatorRole: 'infermiere',
      },
    });
    await prisma.consegnaReadReceipt.createMany({
      skipDuplicates: true,
      data: {
        consegnaId: 'SEED-CONS-002',
        patientId: 'SEED-PAZ-002',
        operatorId: 'SEED-OP-002',
        operatorName: 'Marco Rinaldi',
        operatorRole: 'oss',
      },
    });
    await assert.rejects(prisma.diaryEntryAcknowledgement.deleteMany({}), /append-only/);

    const preservedBefore = await tableCounts(
      prisma,
      PRESERVED_TABLES.filter((t) => t !== 'RosterEpoch'),
    );
    const epochBefore = await prisma.rosterEpoch.findUnique({ where: { id: 1 } });
    const triggersBefore = await userTriggerStates();

    // …il wipe sì, e solo dentro la propria transazione.
    const wiped = await wipeSyntheticData(prisma);
    assert.ok(wiped.totalDeleted > 0);
    assert.ok(wiped.deleted.DiaryEntryAcknowledgement >= 1);
    assert.ok(wiped.deleted.ConsegnaAcknowledgement >= 1);
    const afterWipe = await tableCounts(prisma, WIPED_TABLES);
    for (const table of WIPED_TABLES) assert.equal(afterWipe[table], 0, `${table} non vuota`);

    // Identità, policy, farmaci e audit intatti; roster invalidato; trigger tutti riattivati.
    assert.deepEqual(
      await tableCounts(
        prisma,
        PRESERVED_TABLES.filter((t) => t !== 'RosterEpoch'),
      ),
      preservedBefore,
    );
    const epochAfter = await prisma.rosterEpoch.findUnique({ where: { id: 1 } });
    assert.ok((epochAfter?.roster ?? 0n) > (epochBefore?.roster ?? 0n), 'roster epoch avanzato');
    assert.deepEqual(await userTriggerStates(), triggersBefore);
    assert.equal(
      triggersBefore.some((trigger) => trigger.enabled === 'D'),
      false,
      'nessun trigger disabilitato',
    );

    // Sistema pulito ma utilizzabile: un nuovo seed riparte da zero e crea esattamente il dataset
    // documentato (qualunque altro dato ci fosse prima del wipe non c'è più).
    const reseeded = await seedSyntheticData(prisma);
    const { operators, ...operational } = reseeded.counts;
    assert.deepEqual(operational, {
      patients: 9,
      rooms: 4,
      beds: 8,
      roomAssignments: 8,
      therapies: 16,
      appointments: 5,
      consegne: 5,
      diaryEntries: 5,
      parameterReadings: 5,
      notes: 2,
      intakeDrafts: 1,
      importJobs: 0,
      operatorSchedules: 3,
    });
    assert.ok(operators >= 4, 'gli operatori sono conservati dal wipe');
    await prisma.diaryEntryAcknowledgement.createMany({
      skipDuplicates: true,
      data: {
        entryId: 'SEED-DIARY-005',
        patientId: 'SEED-PAZ-003',
        operatorId: 'SEED-OP-002',
        operatorName: 'Marco Rinaldi',
        operatorRole: 'oss',
      },
    });
    await assert.rejects(prisma.diaryEntryAcknowledgement.deleteMany({}), /append-only/);
    assert.equal((await syntheticDataCounts(prisma)).patients, reseeded.counts.patients);
  },
);
