// Synthetic resident «Nanni Miriam» for the Phase 10 E2E bug hunt (never real data).
// Usage (repo root, after scripts/assistant/seed-assistant-demo.mts):
//   DATABASE_URL=<local DB> npx tsx scripts/e2e/seed-phase10-demo.mts
import { prisma } from '../../backend/src/lib/prisma.js';
import { facilityToday } from '../../backend/src/patients/parameter-reading-input.js';
import { createTherapyInTx } from '../../backend/src/therapies/therapy-create.js';

const medicalRecordNumber = 'DEMO-P10-Miriam-Nanni';
const patient =
  (await prisma.patient.findFirst({ where: { medicalRecordNumber } })) ??
  (await prisma.patient.create({
    data: {
      medicalRecordNumber,
      firstName: 'Miriam',
      lastName: 'Nanni',
      dateOfBirth: new Date('1936-11-12T00:00:00.000Z'),
      sex: 'F',
      registeredById: 'SIM-NURSE-1',
    },
  }));

const today = facilityToday();
const therapies = [
  { farmacoNome: 'Ramipril', strength: 5, times: ['08:00'] },
  { farmacoNome: 'Metformina', strength: 500, times: ['08:00', '20:00'] },
  { farmacoNome: 'Pantoprazolo', strength: 20, times: ['12:00'] },
];
for (const t of therapies) {
  const exists = await prisma.patientTherapy.findFirst({
    where: { patientId: patient.id, farmacoNome: t.farmacoNome },
  });
  if (exists) continue;
  await prisma.$transaction((tx) =>
    createTherapyInTx(tx, patient.id, {
      farmacoNome: t.farmacoNome,
      dataInizio: today,
      commercialStrengthValue: t.strength,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      schedules: t.times.map((time) => ({
        time,
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      })),
      operatoreInseritore: 'Seed demo P10',
      prescrittore: 'Dr. Medico Uno',
      ...(t.farmacoNome === 'Metformina' ? { note: 'Dopo il pasto' } : {}),
    }),
  );
}
// UX 2026-10-03 (W2): a synthetic PRN («al bisogno») prescription for the in-place PRN flow.
if (
  !(await prisma.patientTherapy.findFirst({
    where: { patientId: patient.id, farmacoNome: 'Paracetamolo', tipo: 'al_bisogno' },
  }))
) {
  await prisma.patientTherapy.create({
    data: {
      patientId: patient.id,
      farmacoNome: 'Paracetamolo',
      dosaggio: '1000 mg compressa',
      viaSomministrazione: 'orale',
      tipo: 'al_bisogno',
      stato: 'attiva',
      dataInizio: today,
      prescrittore: 'Dr. Medico Uno',
      note: 'Se dolore > 4/10 o febbre > 38 °C; massimo 3 dosi al giorno',
      operatoreInseritore: 'Seed demo P10',
    },
  });
}
console.log(JSON.stringify({ nanni: patient.id }));
await prisma.$disconnect();
