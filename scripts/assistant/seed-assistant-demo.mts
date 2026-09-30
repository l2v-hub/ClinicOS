// Synthetic residents for the Phase 4 AI Assistant browser E2E / demo (never real data).
// Usage (repo root): DATABASE_URL=<local DB> npx tsx scripts/assistant/seed-assistant-demo.mts
import { prisma } from '../../backend/src/lib/prisma.js';
import { facilityToday } from '../../backend/src/patients/parameter-reading-input.js';
import { createTherapyInTx } from '../../backend/src/therapies/therapy-create.js';
import { SIMULATED_IDENTITIES, ensureSimulatedIdentity } from '../../backend/src/authz/simulator.js';

// Owners first: the simulated operators (same function the simulator login uses).
for (const identity of SIMULATED_IDENTITIES) await ensureSimulatedIdentity(identity);

const RESIDENTS: [key: string, owner: string, firstName: string, lastName: string][] = [
  ['doc', 'SIM-DOCTOR-1', 'Dario', 'Neri'],
  ['nurse', 'SIM-NURSE-1', 'Nora', 'Galli'],
  ['nurse2', 'SIM-NURSE-1', 'Nino', 'Conti'],
  ['oss', 'SIM-OSS-1', 'Olga', 'Verdi'],
];

const ids: Record<string, string> = {};
for (const [key, owner, firstName, lastName] of RESIDENTS) {
  const medicalRecordNumber = `DEMO-P4-${firstName}-${lastName}`;
  const existing = await prisma.patient.findFirst({ where: { medicalRecordNumber } });
  const row =
    existing ??
    (await prisma.patient.create({
      data: {
        medicalRecordNumber,
        firstName,
        lastName,
        dateOfBirth: new Date('1939-04-05T00:00:00.000Z'),
        sex: firstName.endsWith('a') ? 'F' : 'M',
        registeredById: owner,
      },
    }));
  ids[key] = row.id;
}

// A therapy due today at 08:00 for Nora Galli (administration flow), once.
const today = facilityToday();
const due = await prisma.patientTherapy.findFirst({
  where: { patientId: ids.nurse, farmacoNome: "Furosemide", dataInizio: today },
});
if (!due) {
  await prisma.$transaction((tx) =>
    createTherapyInTx(tx, ids.nurse, {
      farmacoNome: 'Furosemide',
      dataInizio: today,
      commercialStrengthValue: 25,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      schedules: [
        { time: '08:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' },
      ],
      operatoreInseritore: 'Seed demo',
    }),
  );
}
console.log(JSON.stringify(ids));
await prisma.$disconnect();
