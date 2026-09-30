// Synthetic patients for the Phase 3 harness / live Agno E2E (never real data).
// Usage (repo root): DATABASE_URL=<local or demo DB> npx tsx scripts/skills/seed-demo-patients.ts
import { prisma } from '../../backend/src/lib/prisma.js';

const PATIENTS: [owner: string, firstName: string, lastName: string][] = [
  ['SIM-NURSE-1', 'Mario', 'Rossi'],
  ['SIM-NURSE-1', 'Anna', 'Bianchi'],
  ['SIM-NURSE-1', 'Luca', 'Bianchi'],
  ['SIM-OSS-1', 'Olga', 'Verdi'],
  ['SIM-DOCTOR-1', 'Dario', 'Neri'],
];

for (const [owner, firstName, lastName] of PATIENTS) {
  const medicalRecordNumber = `DEMO-P3-${firstName}-${lastName}`;
  const exists = await prisma.patient.findFirst({ where: { medicalRecordNumber } });
  if (!exists) {
    await prisma.patient.create({
      data: {
        medicalRecordNumber,
        firstName,
        lastName,
        dateOfBirth: new Date('1938-02-03T00:00:00.000Z'),
        sex: firstName.endsWith('a') ? 'F' : 'M',
        registeredById: owner,
      },
    });
  }
}
const rows = await prisma.patient.findMany({
  where: { medicalRecordNumber: { startsWith: 'DEMO-P3-' } },
  select: { id: true, firstName: true, lastName: true, registeredById: true },
});
console.log(JSON.stringify(rows));
await prisma.$disconnect();
