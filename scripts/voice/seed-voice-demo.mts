// Synthetic residents for the Phase 5 voice browser E2E (never real data). Run AFTER
// scripts/assistant/seed-assistant-demo.mts (Phase 4 residents + simulated operators).
//   DATABASE_URL=<local DB> npx tsx scripts/voice/seed-voice-demo.mts
// • two nurse residents with the same surname (Ferri) → spoken «… per Ferri» is ambiguous
// • one doctor resident (Esposito) → out of the nurse's resident scope
// • a therapy due today at 20:00 for Marta Ferri (spoken administration is only PREPARED)
import { prisma } from '../../backend/src/lib/prisma.js';
import { facilityToday } from '../../backend/src/patients/parameter-reading-input.js';
import { createTherapyInTx } from '../../backend/src/therapies/therapy-create.js';

const RESIDENTS: [owner: string, firstName: string, lastName: string][] = [
  ['SIM-NURSE-1', 'Marta', 'Ferri'],
  ['SIM-NURSE-1', 'Marco', 'Ferri'],
  ['SIM-DOCTOR-1', 'Bruno', 'Esposito'],
];

const ids: Record<string, string> = {};
for (const [owner, firstName, lastName] of RESIDENTS) {
  const medicalRecordNumber = `DEMO-P5-${firstName}-${lastName}`;
  const existing = await prisma.patient.findFirst({ where: { medicalRecordNumber } });
  const row =
    existing ??
    (await prisma.patient.create({
      data: {
        medicalRecordNumber,
        firstName,
        lastName,
        dateOfBirth: new Date('1938-06-07T00:00:00.000Z'),
        sex: firstName.endsWith('a') ? 'F' : 'M',
        registeredById: owner,
      },
    }));
  ids[`${firstName} ${lastName}`] = row.id;
}
const today = facilityToday();
const marta = ids['Marta Ferri'];
const due = await prisma.patientTherapy.findFirst({
  where: { patientId: marta, farmacoNome: 'Ramipril', dataInizio: today },
});
if (!due) {
  await prisma.$transaction((tx) =>
    createTherapyInTx(tx, marta, {
      farmacoNome: 'Ramipril',
      dataInizio: today,
      commercialStrengthValue: 5,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      schedules: [
        { time: '20:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' },
      ],
      operatoreInseritore: 'Seed demo voce',
    }),
  );
}
console.log(JSON.stringify(ids));
await prisma.$disconnect();
