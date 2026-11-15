/**
 * ClinicOS — Demo Seed
 *
 * Self-contained: crea il proprio PrismaClient, cerca .env in più posizioni.
 * Idempotente via upsert su campi univoci.
 *
 * Locale:   npm run db:seed         (dalla root)
 * Railway:  node dist/seed.js       (dopo npm run build)
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { isRealProduction } from './lib/deployment.js';
import { seedDemoDataset } from './synthetic/demo-dataset.js';

// ── .env loading ───────────────────────────────────────────────────────────────
// Cerca .env in varie posizioni (root monorepo o backend/).
// Su Railway le env var sono già in process.env — dotenv diventa no-op.

async function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(process.cwd(), '../../.env'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const { config } = await import('dotenv');
        config({ path: p, override: false });
        console.log(`  .env caricato da: ${p}`);
      } catch {
        // dotenv non disponibile, ma DATABASE_URL potrebbe essere già in env
      }
      break;
    }
  }
}

// ── Prisma setup ───────────────────────────────────────────────────────────────

function buildPrisma(): PrismaClient {
  // Phase 9: demo identities/patients never enter a real production database.
  if (isRealProduction()) {
    console.error('❌  Seed demo rifiutato: deployment di produzione reale (CLINICOS_ENV).');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌  DATABASE_URL non impostato.');
    console.error("    Imposta DATABASE_URL nelle variabili d'ambiente o nel file .env");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  ClinicOS — Avvio seed demo…\n');

  await loadEnv();

  const prisma = buildPrisma();

  try {
    await seedDemoDataset(prisma, (line) => console.log(line));

    // ── Verifica finale ───────────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const totPazienti = await prisma.patient.count();
    const totCartelle = await prisma.clinicalRecord.count();
    const totNote = await prisma.clinicalNote.count();
    const totAppuntamenti = await prisma.appointment.count();
    const totTherapies = await prisma.patientTherapy.count();
    const totRooms = await prisma.room.count();
    const totBeds = await prisma.bed.count();
    const activePlacements = await prisma.patientRoomAssignment.count({
      where: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    });

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Seed completato. Totali nel DB:
  • Pazienti nel DB:       ${totPazienti}
  • Cartelle cliniche:     ${totCartelle}
  • Note cliniche:         ${totNote}
  • Appuntamenti:          ${totAppuntamenti}
  • Terapie:               ${totTherapies}
  • Camere / letti:        ${totRooms} / ${totBeds}
  • Posti occupati:        ${activePlacements}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌  Seed fallito:', e.message ?? e);
  process.exit(1);
});
