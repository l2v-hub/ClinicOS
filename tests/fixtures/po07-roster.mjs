import { fixtureActors } from './parameter-database.mjs';
import { seedPo06Identity } from './po06-identity.mjs';

/** Real SQL, synthetic patients only. Shared by browser, HTTP and benchmark. */
export async function seedPo07Roster(prisma, db, today, count = 64) {
  await seedPo06Identity(prisma, db, today);
  await db.query('UPDATE "Operator" SET "department" = $1 WHERE "id" = ANY($2::text[])', [
    'Reparto sintetico A',
    [fixtureActors.operator.id, fixtureActors.outsider.id, fixtureActors.manager.id],
  ]);
  const rooms = ['1A', '1B', '2A', '2B', '10A'];
  const beds = ['1', '2', '10', ''];
  const patients = Array.from({ length: count }, (_, i) => ({
    id: `po07-patient-${String(i).padStart(3, '0')}`,
    firstName: i % 13 === 0 ? 'Alba' : `Nome ${String(i).padStart(3, '0')}`,
    lastName:
      i % 13 === 0
        ? 'Bianchi'
        : `${i % 7 === 0 ? 'Àccenti' : 'Sintetico'} ${String(count - i).padStart(3, '0')}`,
    registeredById: fixtureActors.operator.id,
    dateOfBirth: new Date('1945-06-12'),
    medicalRecordNumber: `INTERNAL-PO07-${i}`,
  }));
  await prisma.patient.createMany({ data: patients });
  await prisma.cartella.createMany({
    data: patients.map((patient, i) => ({
      patientId: patient.id,
      data: {
        ...(i % 11 === 0
          ? {}
          : {
              cameraNumero: rooms[i % rooms.length],
              lettoNumero: beds[Math.floor(i / rooms.length) % beds.length],
            }),
        parametriMensili: [],
        annotazioni: 'CONTENUTO CLINICO NON RICHIESTO '.repeat(100),
      },
    })),
  });
  await prisma.patientTherapy.createMany({
    data: patients.flatMap((patient, i) =>
      Array.from({ length: (i % 4) + 1 }, (_, j) => ({
        id: `${patient.id}-therapy-${j}`,
        patientId: patient.id,
        farmacoNome: `Farmaco sintetico ${i}.${j}`,
        dosaggio: '1 compressa',
        dataInizio: today,
        fasceMattina: true,
      })),
    ),
  });
  return patients;
}
