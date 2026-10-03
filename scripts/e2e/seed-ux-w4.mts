// Synthetic fixtures for the UX direct-access W4 browser evidence (never real data).
// Usage (repo root, after seed-assistant-demo.mts + seed-phase10-demo.mts):
//   DATABASE_URL=<local DB> node_modules/.bin/tsx scripts/e2e/seed-ux-w4.mts
// Adds to «Nanni Miriam» (owner SIM-NURSE-1): allergies with names, a critical parameter, a high
// risk, and one URGENT diary entry written by the doctor. Idempotent.
import { prisma } from '../../backend/src/lib/prisma.js';
import { facilityToday } from '../../backend/src/patients/parameter-reading-input.js';

const patient = await prisma.patient.findFirstOrThrow({
  where: { medicalRecordNumber: 'DEMO-P10-Miriam-Nanni' },
});
const chart = await prisma.cartella.findUnique({ where: { patientId: patient.id } });
const data = { ...((chart?.data as Record<string, unknown> | null) ?? {}) };
data.allergie = [
  { allergene: 'Penicillina', reazione: 'Orticaria', gravita: 'grave', documentato: '2026-09-01' },
  { allergene: 'Lattice', reazione: 'Dermatite', gravita: 'moderata', documentato: '2026-09-01' },
  {
    allergene: 'Acido acetilsalicilico',
    reazione: 'Broncospasmo',
    gravita: 'grave',
    documentato: '2026-09-01',
  },
];
data.parametriVitali = [
  { etichetta: 'PA', valore: '85/50', unita: 'mmHg', stato: 'critico', rilevato: '08:10' },
];
data.indicatoriRischio = [
  {
    id: 'w4-r1',
    tipo: 'caduta',
    livello: 'alto',
    descrizione: 'Morse 55',
    dataValutazione: facilityToday(),
    operatore: 'Infermiere 1',
  },
];
await prisma.cartella.upsert({
  where: { patientId: patient.id },
  create: { patientId: patient.id, data },
  update: { data },
});

const title = 'W4 · Febbre improvvisa';
const existing = await prisma.patientDiaryEntry.findFirst({
  where: { patientId: patient.id, title },
});
const entry =
  existing ??
  (await prisma.patientDiaryEntry.create({
    data: {
      patientId: patient.id,
      authorType: 'medico',
      authorName: 'Medico 1',
      title,
      content: 'TC 39.2 °C alle 09:00. Emocolture e rivalutazione entro 2 ore.',
      priority: 'urgente',
      entryDateTime: `${facilityToday()}T09:05`,
    },
  }));
// OSS resident: one ordinary diary entry, to show that Modifica/Elimina are hidden for the OSS.
const olga = await prisma.patient.findFirst({
  where: { registeredById: 'SIM-OSS-1', lastName: 'Verdi' },
});
if (
  olga &&
  !(await prisma.patientDiaryEntry.findFirst({
    where: { patientId: olga.id, title: 'W4 · Igiene' },
  }))
)
  await prisma.patientDiaryEntry.create({
    data: {
      patientId: olga.id,
      authorType: 'oss',
      authorName: 'OSS 1',
      title: 'W4 · Igiene',
      content: 'Igiene completa, cute integra.',
      entryDateTime: `${facilityToday()}T08:30`,
    },
  });
console.log(
  JSON.stringify({ patientId: patient.id, urgentEntryId: entry.id, olgaId: olga?.id ?? null }),
);
await prisma.$disconnect();
