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

// ── Helpers ────────────────────────────────────────────────────────────────────

function dob(yyyy: number, mm: number, dd: number) {
  return new Date(`${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
}

function futureDate(daysFromNow: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  ClinicOS — Avvio seed demo…\n');

  await loadEnv();

  const prisma = buildPrisma();

  try {
    // ── 1. Users ──────────────────────────────────────────────────────────────
    const usersData = [
      {
        id: 'SEED-USER-001',
        email: 'admin.demo@clinicos.demo',
        fullName: 'Admin Demo',
        role: 'MANAGER' as const,
      },
      {
        id: 'SEED-USER-002',
        email: 'laura.bianchi@clinicos.demo',
        fullName: 'Laura Bianchi',
        role: 'OPERATOR' as const,
      },
      {
        id: 'SEED-USER-003',
        email: 'marco.rinaldi@clinicos.demo',
        fullName: 'Marco Rinaldi',
        role: 'OPERATOR' as const,
      },
      {
        id: 'SEED-USER-004',
        email: 'giulia.ferri@clinicos.demo',
        fullName: 'Giulia Ferri',
        role: 'OPERATOR' as const,
      },
    ];

    for (const u of usersData) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { fullName: u.fullName, role: u.role },
        create: {
          id: u.id,
          email: u.email,
          passwordHash: 'DEMO_SEED_NOT_A_REAL_HASH',
          fullName: u.fullName,
          role: u.role,
        },
      });
    }
    console.log(`  ✓  users upserted:     ${usersData.length}`);

    // ── 2. Operators ──────────────────────────────────────────────────────────
    const operatorsData = [
      {
        id: 'SEED-OP-001',
        userId: 'SEED-USER-002',
        licenseNumber: 'INF-DEMO-001',
        department: 'Reparto A — Medicina Interna',
        phone: '+39 333 100 2001',
      },
      {
        id: 'SEED-OP-002',
        userId: 'SEED-USER-003',
        licenseNumber: 'OPS-DEMO-001',
        department: 'Reparto B — Chirurgia',
        phone: '+39 333 100 2002',
      },
      {
        id: 'SEED-OP-003',
        userId: 'SEED-USER-004',
        licenseNumber: 'FIS-DEMO-001',
        department: 'Riabilitazione',
        phone: '+39 333 100 2003',
      },
      {
        id: 'SEED-OP-004',
        userId: 'SEED-USER-001',
        licenseNumber: null as string | null,
        department: 'Amministrazione',
        phone: null as string | null,
      },
    ];

    for (const op of operatorsData) {
      await prisma.operator.upsert({
        where: { userId: op.userId },
        update: { department: op.department, phone: op.phone },
        create: {
          id: op.id,
          userId: op.userId,
          licenseNumber: op.licenseNumber,
          department: op.department,
          phone: op.phone,
        },
      });
    }
    console.log(`  ✓  operators upserted: ${operatorsData.length}`);

    // ── 3. Patients ───────────────────────────────────────────────────────────
    const patientsData = [
      {
        id: 'SEED-PAZ-001',
        medicalRecordNumber: 'MRN-DEMO-001',
        firstName: 'Mario',
        lastName: 'Ferrioli',
        dateOfBirth: dob(1948, 3, 15),
        sex: 'M',
        email: 'mario.ferrioli@demo.it',
        phone: '+39 333 200 1001',
        address: 'Via Garibaldi 12, 20121 Milano MI',
        emergencyContactName: 'Rosa Ferrioli',
        emergencyContactPhone: '+39 333 200 1002',
        registeredById: 'SEED-OP-001',
      },

      {
        id: 'SEED-PAZ-002',
        medicalRecordNumber: 'MRN-DEMO-002',
        firstName: 'Anna',
        lastName: 'Martini',
        dateOfBirth: dob(1955, 7, 22),
        sex: 'F',
        email: 'anna.martini@demo.it',
        phone: '+39 333 200 2001',
        address: 'Corso Buenos Aires 44, 20124 Milano MI',
        emergencyContactName: 'Piero Martini',
        emergencyContactPhone: '+39 333 200 2002',
        registeredById: 'SEED-OP-001',
      },

      {
        id: 'SEED-PAZ-003',
        medicalRecordNumber: 'MRN-DEMO-003',
        firstName: 'Giorgio',
        lastName: 'Bassi',
        dateOfBirth: dob(1942, 11, 3),
        sex: 'M',
        email: 'giorgio.bassi@demo.it',
        phone: '+39 333 200 3001',
        address: 'Via Roma 7, 10121 Torino TO',
        emergencyContactName: 'Carla Bassi',
        emergencyContactPhone: '+39 333 200 3002',
        registeredById: 'SEED-OP-002',
      },

      {
        id: 'SEED-PAZ-004',
        medicalRecordNumber: 'MRN-DEMO-004',
        firstName: 'Teresa',
        lastName: 'Lombardi',
        dateOfBirth: dob(1961, 5, 8),
        sex: 'F',
        email: 'teresa.lombardi@demo.it',
        phone: '+39 333 200 4001',
        address: 'Via Dante 33, 40121 Bologna BO',
        emergencyContactName: 'Franco Lombardi',
        emergencyContactPhone: '+39 333 200 4002',
        registeredById: 'SEED-OP-002',
      },

      {
        id: 'SEED-PAZ-005',
        medicalRecordNumber: 'MRN-DEMO-005',
        firstName: 'Carlo',
        lastName: 'Neri',
        dateOfBirth: dob(1938, 9, 27),
        sex: 'M',
        email: 'carlo.neri@demo.it',
        phone: '+39 333 200 5001',
        address: 'Piazza Navona 2, 00186 Roma RM',
        emergencyContactName: 'Luisa Neri',
        emergencyContactPhone: '+39 333 200 5002',
        registeredById: 'SEED-OP-003',
      },

      {
        id: 'SEED-PAZ-006',
        medicalRecordNumber: 'MRN-DEMO-006',
        firstName: 'Lucia',
        lastName: 'Gatti',
        dateOfBirth: dob(1970, 2, 14),
        sex: 'F',
        email: 'lucia.gatti@demo.it',
        phone: '+39 333 200 6001',
        address: 'Via Verdi 18, 50121 Firenze FI',
        emergencyContactName: 'Marco Gatti',
        emergencyContactPhone: '+39 333 200 6002',
        registeredById: 'SEED-OP-003',
      },

      {
        id: 'SEED-PAZ-007',
        medicalRecordNumber: 'MRN-DEMO-007',
        firstName: 'Roberto',
        lastName: 'Mancini',
        dateOfBirth: dob(1958, 12, 1),
        sex: 'M',
        email: 'roberto.mancini@demo.it',
        phone: '+39 333 200 7001',
        address: 'Via Manzoni 55, 20121 Milano MI',
        emergencyContactName: 'Paola Mancini',
        emergencyContactPhone: '+39 333 200 7002',
        registeredById: 'SEED-OP-001',
      },

      {
        id: 'SEED-PAZ-008',
        medicalRecordNumber: 'MRN-DEMO-008',
        firstName: 'Elena',
        lastName: 'Moretti',
        dateOfBirth: dob(1985, 6, 30),
        sex: 'F',
        email: 'elena.moretti@demo.it',
        phone: '+39 333 200 8001',
        address: 'Via Leopardi 9, 20123 Milano MI',
        emergencyContactName: 'Stefano Moretti',
        emergencyContactPhone: '+39 333 200 8002',
        registeredById: 'SEED-OP-002',
      },
    ];

    for (const p of patientsData) {
      await prisma.patient.upsert({
        where: { medicalRecordNumber: p.medicalRecordNumber },
        update: {
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          email: p.email,
          address: p.address,
          emergencyContactName: p.emergencyContactName,
          emergencyContactPhone: p.emergencyContactPhone,
        },
        create: p,
      });
    }
    console.log(`  ✓  patients upserted:  ${patientsData.length}`);

    // ── 4. Clinical Records ───────────────────────────────────────────────────
    const recordsData = [
      {
        id: 'SEED-CR-001',
        patientId: 'SEED-PAZ-001',
        authorOperatorId: 'SEED-OP-001',
        chiefComplaint: 'Dolori articolari arti inferiori, difficoltà deambulazione',
        diagnosis: 'Artrosi severa bilaterale ginocchio — gonartrosi IV grado',
        treatmentPlan: 'Fisioterapia quotidiana, antinfiammatori, valutazione ortopedica',
      },

      {
        id: 'SEED-CR-002',
        patientId: 'SEED-PAZ-002',
        authorOperatorId: 'SEED-OP-001',
        chiefComplaint: 'Dispnea da sforzo, edemi arti inferiori, affaticamento',
        diagnosis: 'Scompenso cardiaco cronico — NYHA classe II',
        treatmentPlan: 'Monitoraggio PA 3×/die, diuretici, dieta iposodica',
      },

      {
        id: 'SEED-CR-003',
        patientId: 'SEED-PAZ-003',
        authorOperatorId: 'SEED-OP-002',
        chiefComplaint: 'Caduta — frattura femore dx — post-op giorno 3',
        diagnosis: 'Frattura pertrocanterica femore destro — osteosintesi chiodo endomidollare',
        treatmentPlan: 'Mobilizzazione progressiva, fisioterapia, profilassi TVP',
      },

      {
        id: 'SEED-CR-004',
        patientId: 'SEED-PAZ-004',
        authorOperatorId: 'SEED-OP-002',
        chiefComplaint: 'Ictus ischemico emisfero sinistro — deficit motorio emilato destro',
        diagnosis: 'Stroke ischemico ACM sinistra — emiplegia destra, afasia parziale',
        treatmentPlan: 'Riabilitazione neuromotoria, logopedia, anticoagulanti',
      },

      {
        id: 'SEED-CR-005',
        patientId: 'SEED-PAZ-005',
        authorOperatorId: 'SEED-OP-003',
        chiefComplaint: 'Ipertensione non controllata, cefalea ricorrente',
        diagnosis: 'Ipertensione arteriosa essenziale grado II — insufficienza renale lieve',
        treatmentPlan: 'Monitoraggio PA 2×/die, dieta iposodica, revisione terapia',
      },

      {
        id: 'SEED-CR-006',
        patientId: 'SEED-PAZ-006',
        authorOperatorId: 'SEED-OP-003',
        chiefComplaint: 'Dolore lombare cronico irradiato, riduzione forza arti inferiori',
        diagnosis: 'Ernia discale L4-L5 con radicolopatia — stenosi canale spinale',
        treatmentPlan: 'Fisioterapia specifica, FANS, valutazione neurochirurgica',
      },

      {
        id: 'SEED-CR-007',
        patientId: 'SEED-PAZ-007',
        authorOperatorId: 'SEED-OP-001',
        chiefComplaint: 'Diabete mellito tipo 2 scompensato, ulcera piede sinistro',
        diagnosis: 'DM tipo 2 — piede diabetico ulcerato Wagner 2 — neuropatia periferica',
        treatmentPlan: 'Medicazione avanzata ulcera, ottimizzazione glicemia, antibioticoterapia',
      },

      {
        id: 'SEED-CR-008',
        patientId: 'SEED-PAZ-008',
        authorOperatorId: 'SEED-OP-002',
        chiefComplaint: 'Post-operatorio appendicectomia laparoscopica — decorso regolare',
        diagnosis: 'Appendicite acuta — appendicectomia laparoscopica',
        treatmentPlan: 'Monitoraggio ferita, dieta progressiva, profilassi antibiotica',
      },
    ];

    for (const cr of recordsData) {
      await prisma.clinicalRecord.upsert({
        where: { id: cr.id },
        update: {
          chiefComplaint: cr.chiefComplaint,
          diagnosis: cr.diagnosis,
          treatmentPlan: cr.treatmentPlan,
        },
        create: cr,
      });
    }
    console.log(`  ✓  clinical records upserted: ${recordsData.length}`);

    // ── 5. Clinical Notes ─────────────────────────────────────────────────────
    const notesData = [
      {
        id: 'SEED-CN-001',
        clinicalRecordId: 'SEED-CR-001',
        authorOperatorId: 'SEED-OP-001',
        note: 'PA 130/80. Dolore VAS 5/10 a riposo, 7/10 alla mobilizzazione. Paziente collaborante.',
      },
      {
        id: 'SEED-CN-002',
        clinicalRecordId: 'SEED-CR-001',
        authorOperatorId: 'SEED-OP-003',
        note: 'Fisioterapia: flessione anca destra +10°. Paziente motivato e puntuale.',
      },
      {
        id: 'SEED-CN-003',
        clinicalRecordId: 'SEED-CR-002',
        authorOperatorId: 'SEED-OP-001',
        note: 'SpO2 96%, FC 78, PA 145/90. Edemi invariati. Peso mattutino +0.5 kg.',
      },
      {
        id: 'SEED-CN-004',
        clinicalRecordId: 'SEED-CR-002',
        authorOperatorId: 'SEED-OP-002',
        note: 'ECG: RS, nessuna modificazione. Rivalutazione cardiologica programmata per giovedì.',
      },
      {
        id: 'SEED-CN-005',
        clinicalRecordId: 'SEED-CR-003',
        authorOperatorId: 'SEED-OP-002',
        note: 'Primo tentativo stazione eretta con assistenza. Ben tollerato. VAS 3/10.',
      },
      {
        id: 'SEED-CN-006',
        clinicalRecordId: 'SEED-CR-003',
        authorOperatorId: 'SEED-OP-003',
        note: 'Mobilizzazione passiva arto operato. Ferita chirurgica in buone condizioni.',
      },
      {
        id: 'SEED-CN-007',
        clinicalRecordId: 'SEED-CR-004',
        authorOperatorId: 'SEED-OP-002',
        note: 'Logopedia: comprensione verbale in miglioramento, espressione ancora compromessa.',
      },
      {
        id: 'SEED-CN-008',
        clinicalRecordId: 'SEED-CR-004',
        authorOperatorId: 'SEED-OP-003',
        note: 'Fisioterapia neuromotoria: migliorata tonicità arto superiore destro. Cammino con deambulatore.',
      },
      {
        id: 'SEED-CN-009',
        clinicalRecordId: 'SEED-CR-005',
        authorOperatorId: 'SEED-OP-003',
        note: 'PA mattutina 168/98, serale 155/92. Contattato medico per rivalutazione ramipril.',
      },
      {
        id: 'SEED-CN-010',
        clinicalRecordId: 'SEED-CR-006',
        authorOperatorId: 'SEED-OP-003',
        note: 'Esercizi stabilizzazione lombare tollerati. Riduzione dolore irradiato arto sinistro.',
      },
      {
        id: 'SEED-CN-011',
        clinicalRecordId: 'SEED-CR-007',
        authorOperatorId: 'SEED-OP-001',
        note: 'Medicazione ulcera: tessuto di granulazione presente, margini migliorati. Glicemia 187 mg/dL.',
      },
      {
        id: 'SEED-CN-012',
        clinicalRecordId: 'SEED-CR-007',
        authorOperatorId: 'SEED-OP-002',
        note: 'Educazione terapeutica su gestione piede diabetico e controllo glicemico domiciliare.',
      },
      {
        id: 'SEED-CN-013',
        clinicalRecordId: 'SEED-CR-008',
        authorOperatorId: 'SEED-OP-002',
        note: 'Decorso post-operatorio regolare. VAS 2/10. Prima mobilizzazione autonoma effettuata.',
      },
    ];

    for (const cn of notesData) {
      await prisma.clinicalNote.upsert({
        where: { id: cn.id },
        update: { note: cn.note },
        create: cn,
      });
    }

    // ── 6. Appointments ───────────────────────────────────────────────────────
    const appointmentsData = [
      {
        id: 'SEED-APP-001',
        patientId: 'SEED-PAZ-001',
        operatorId: 'SEED-OP-003',
        createdByUserId: 'SEED-USER-002',
        scheduledAt: futureDate(1, 9, 30),
        durationMinutes: 45,
        reason: 'Seduta fisioterapia — mobilizzazione arti inferiori',
        status: 'SCHEDULED' as const,
      },
      {
        id: 'SEED-APP-002',
        patientId: 'SEED-PAZ-002',
        operatorId: 'SEED-OP-001',
        createdByUserId: 'SEED-USER-002',
        scheduledAt: futureDate(1, 11, 0),
        durationMinutes: 30,
        reason: 'Monitoraggio parametri cardiaci settimanale',
        status: 'SCHEDULED' as const,
      },
      {
        id: 'SEED-APP-003',
        patientId: 'SEED-PAZ-003',
        operatorId: 'SEED-OP-003',
        createdByUserId: 'SEED-USER-003',
        scheduledAt: futureDate(2, 10, 0),
        durationMinutes: 60,
        reason: 'Fisioterapia post-operatoria — primo appoggio con deambulatore',
        status: 'SCHEDULED' as const,
      },
      {
        id: 'SEED-APP-004',
        patientId: 'SEED-PAZ-004',
        operatorId: 'SEED-OP-003',
        createdByUserId: 'SEED-USER-003',
        scheduledAt: futureDate(2, 14, 30),
        durationMinutes: 60,
        reason: 'Riabilitazione neuromotoria — sessione intensiva',
        status: 'SCHEDULED' as const,
      },
      {
        id: 'SEED-APP-005',
        patientId: 'SEED-PAZ-007',
        operatorId: 'SEED-OP-001',
        createdByUserId: 'SEED-USER-002',
        scheduledAt: futureDate(3, 8, 0),
        durationMinutes: 20,
        reason: 'Medicazione piede diabetico — controllo ulcera',
        status: 'SCHEDULED' as const,
      },
    ];

    for (const ap of appointmentsData) {
      await prisma.appointment.upsert({
        where: { id: ap.id },
        update: { scheduledAt: ap.scheduledAt, reason: ap.reason },
        create: ap,
      });
    }

    // ── 7. Patient Therapies ─────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);

    const therapiesData = [
      // Mario Ferrioli - SEED-PAZ-001
      {
        id: 'SEED-THER-001',
        patientId: 'SEED-PAZ-001',
        farmacoNome: 'Lasix',
        dosaggio: '25 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },
      {
        id: 'SEED-THER-002',
        patientId: 'SEED-PAZ-001',
        farmacoNome: 'Cardioaspirina',
        dosaggio: '100 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: false,
        fascePranzo: true,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },

      // Anna Martini - SEED-PAZ-002
      {
        id: 'SEED-THER-003',
        patientId: 'SEED-PAZ-002',
        farmacoNome: 'Pantoprazolo',
        dosaggio: '40 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },
      {
        id: 'SEED-THER-004',
        patientId: 'SEED-PAZ-002',
        farmacoNome: 'Tachipirina',
        dosaggio: '1000 mg',
        viaSomministrazione: 'orale',
        tipo: 'una_tantum',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: false,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        dataSomministrazione: today,
        orarioSomministrazione: '20:00',
        prescrittore: 'Dr. Demo',
        note: 'Una tantum per febbre',
      },

      // Giorgio Bassi - SEED-PAZ-003
      {
        id: 'SEED-THER-005',
        patientId: 'SEED-PAZ-003',
        farmacoNome: 'Clexane',
        dosaggio: '4000 UI',
        viaSomministrazione: 'SC',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: false,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
        note: 'Profilassi TVP post-frattura',
      },
      {
        id: 'SEED-THER-006',
        patientId: 'SEED-PAZ-003',
        farmacoNome: 'Paracetamolo',
        dosaggio: '1000 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },

      // Teresa Lombardi - SEED-PAZ-004
      {
        id: 'SEED-THER-007',
        patientId: 'SEED-PAZ-004',
        farmacoNome: 'Aspirina',
        dosaggio: '100 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },
      {
        id: 'SEED-THER-008',
        patientId: 'SEED-PAZ-004',
        farmacoNome: 'Eparina',
        dosaggio: '5000 UI',
        viaSomministrazione: 'SC',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: false,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },

      // Carlo Neri - SEED-PAZ-005
      {
        id: 'SEED-THER-009',
        patientId: 'SEED-PAZ-005',
        farmacoNome: 'Ramipril',
        dosaggio: '10 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },
      {
        id: 'SEED-THER-010',
        patientId: 'SEED-PAZ-005',
        farmacoNome: 'Amlodipina',
        dosaggio: '5 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: false,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },
      {
        id: 'SEED-THER-011',
        patientId: 'SEED-PAZ-005',
        farmacoNome: 'Cortisone',
        dosaggio: '25 mg',
        viaSomministrazione: 'IM',
        tipo: 'una_tantum',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
        dataSomministrazione: today,
        orarioSomministrazione: '08:00',
        prescrittore: 'Dr. Demo',
        note: 'Una tantum per crisi ipertensiva',
      },

      // Lucia Gatti - SEED-PAZ-006
      {
        id: 'SEED-THER-012',
        patientId: 'SEED-PAZ-006',
        farmacoNome: 'Ibuprofene',
        dosaggio: '600 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: true,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },

      // Roberto Mancini - SEED-PAZ-007
      {
        id: 'SEED-THER-013',
        patientId: 'SEED-PAZ-007',
        farmacoNome: 'Metformina',
        dosaggio: '500 mg',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
      },
      {
        id: 'SEED-THER-014',
        patientId: 'SEED-PAZ-007',
        farmacoNome: 'Amoxicillina',
        dosaggio: '1g',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
        note: 'Antibioticoterapia piede diabetico',
      },

      // Elena Moretti - SEED-PAZ-008
      {
        id: 'SEED-THER-015',
        patientId: 'SEED-PAZ-008',
        farmacoNome: 'Cefazolina',
        dosaggio: '1g',
        viaSomministrazione: 'IV',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: true,
        fasceNotte: false,
        prescrittore: 'Dr. Demo',
        note: 'Profilassi post-appendicectomia',
      },
      {
        id: 'SEED-THER-016',
        patientId: 'SEED-PAZ-008',
        farmacoNome: 'Ketorolac',
        dosaggio: '30 mg',
        viaSomministrazione: 'IM',
        tipo: 'una_tantum',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: false,
        fascePranzo: false,
        fascePomeriggio: true,
        fasceSera: false,
        fasceNotte: false,
        dataSomministrazione: today,
        orarioSomministrazione: '16:00',
        prescrittore: 'Dr. Demo',
        note: 'Dolore post-operatorio',
      },
    ];

    for (const t of therapiesData) {
      await prisma.patientTherapy.upsert({
        where: { id: t.id },
        update: {
          farmacoNome: t.farmacoNome,
          dosaggio: t.dosaggio,
          stato: t.stato,
          dataInizio: t.dataInizio,
        },
        create: t,
      });
    }
    console.log(`  ✓  therapies upserted: ${therapiesData.length}`);

    // ── Verifica finale ───────────────────────────────────────────────────────
    const totPazienti = await prisma.patient.count();
    const totCartelle = await prisma.clinicalRecord.count();
    const totNote = await prisma.clinicalNote.count();
    const totAppuntamenti = await prisma.appointment.count();
    const totTherapies = await prisma.patientTherapy.count();

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Seed completato. Totali nel DB:
  • Pazienti nel DB:       ${totPazienti}
  • Cartelle cliniche:     ${totCartelle}
  • Note cliniche:         ${totNote}
  • Appuntamenti:          ${totAppuntamenti}
  • Terapie:               ${totTherapies}
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
