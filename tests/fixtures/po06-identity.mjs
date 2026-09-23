import { fixtureActors, seedParameterDatabase } from './parameter-database.mjs';

/** Synthetic-only cases shared by HTTP/browser verification. No external database access. */
export async function seedPo06Identity(prisma, db, today) {
  await seedParameterDatabase(db);
  const patients = [
    {
      id: 'po06-alba-1',
      firstName: 'Alba',
      lastName: 'Bianchi',
      codiceFiscale: 'BNCLBA40A41H501X',
      dateOfBirth: new Date('1940-01-01'),
    },
    {
      id: 'po06-alba-2',
      firstName: 'Alba',
      lastName: 'Bianchi',
      codiceFiscale: null,
      dateOfBirth: new Date('1951-06-12'),
    },
    {
      id: 'po06-long',
      firstName: 'Maria Francesca',
      lastName: 'Dall’Acqua Monteverde della Valle',
      codiceFiscale: null,
      dateOfBirth: null,
    },
    {
      id: 'po06-conflict',
      firstName: 'Carlo',
      lastName: 'Conflitto',
      codiceFiscale: null,
      dateOfBirth: null,
    },
    {
      id: 'po06-ended',
      firstName: 'Elena',
      lastName: 'Dimessa',
      codiceFiscale: null,
      dateOfBirth: null,
    },
    {
      id: 'po06-empty',
      firstName: 'Nora',
      lastName: 'Nuova',
      codiceFiscale: null,
      dateOfBirth: null,
    },
  ];
  await prisma.patient.createMany({
    data: patients.map((p) => ({
      ...p,
      registeredById: fixtureActors.operator.id,
      medicalRecordNumber: `INTERNAL-DO-NOT-DISPLAY-${p.id}`,
    })),
  });
  await prisma.cartella.createMany({
    data: patients.map((p) => ({
      patientId: p.id,
      data: {
        cameraNumero: p.id === 'po06-empty' ? '' : '99',
        lettoNumero: 'Z',
        parametriMensili: [],
      },
    })),
  });
  await prisma.cartella.update({
    where: { patientId: 'po06-empty' },
    data: { data: { parametriMensili: [] } },
  });
  await prisma.room.createMany({
    data: [
      { id: 'po06-room-12', numero: '12' },
      { id: 'po06-room-13', numero: '13' },
    ],
  });
  await prisma.bed.createMany({
    data: [
      { id: 'po06-bed-a', roomId: 'po06-room-12', label: 'A' },
      { id: 'po06-bed-b', roomId: 'po06-room-13', label: 'B' },
    ],
  });
  await prisma.patientRoomAssignment.createMany({
    data: [
      { patientId: 'po06-alba-1', roomId: 'po06-room-12', bedId: 'po06-bed-a', startDate: today },
      { patientId: 'po06-alba-2', roomId: 'po06-room-13', bedId: 'po06-bed-b', startDate: today },
      { patientId: 'po06-conflict', roomId: 'po06-room-12', bedId: 'po06-bed-b', startDate: today },
      {
        patientId: 'po06-ended',
        roomId: 'po06-room-12',
        bedId: 'po06-bed-a',
        startDate: '2020-01-01',
        endDate: '2020-01-02',
      },
    ],
  });
  await prisma.patientTherapy.createMany({
    data: ['po06-alba-1', 'po06-alba-2'].flatMap((patientId, p) =>
      Array.from({ length: 8 }, (_, i) => ({
        id: `${patientId}-therapy-${i}`,
        patientId,
        farmacoNome: `Farmaco sintetico ${p + 1}.${i + 1}`,
        dosaggio: '1 compressa',
        dataInizio: today,
        fasceMattina: true,
      })),
    ),
  });
  await prisma.consegna.createMany({
    data: [
      {
        id: 'po06-visible',
        pazienteId: 'po06-alba-1',
        pazienteNome: 'Alba Bianchi',
        note: 'Consegna sintetica autorizzata',
        creatoDaId: fixtureActors.operator.id,
      },
      {
        id: 'po06-restricted',
        pazienteId: 'vitals-qa-other',
        pazienteNome: 'Nome già visibile',
        note: 'Consegna assegnata: cartella fuori perimetro',
        creatoDaId: fixtureActors.outsider.id,
      },
    ].map((c) => ({
      ...c,
      scadenza: today,
      creatoDA: 'Operatore QA',
      operatoreAssegnato: 'Operatrice QA',
      operatoreAssegnatoId: fixtureActors.operator.id,
    })),
  });
  return patients;
}
