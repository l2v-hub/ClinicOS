// Scenari di prova per Milo (dati SOLO sintetici, chiavi fisse `SEED-MILO-…`): coprono i casi d'uso
// su cui si provano gli agenti.
//   1. andamento di una settimana di parametri, con un paziente in peggioramento (Bassi), uno con
//      pressione in salita (Ferrioli) e uno stabile (Martini);
//   2. chi ha registrato i parametri e chi ha fatto l'ultima visita (un medico con i suoi turni);
//   3. camere singole e doppie occupate con una dimissione prevista (letto che si libera);
//   5. una terapia appena conclusa, prescritta dal medico (avviso di fine terapia).
// Idempotente: upsert con chiavi fisse; le rilevazioni hanno un requestId deterministico per giorno,
// quindi ripetere il seed lo stesso giorno non duplica nulla e un seed nei giorni successivi
// aggiunge la settimana nuova.

import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { createParameterReading } from '../patients/parameter-readings.js';
import { ParameterReadingError } from '../patients/parameter-reading-input.js';
import { OPERATOR_SCHEDULE_DAYS } from '../operators/schedule-contract.js';

const NURSE = { id: 'SEED-OP-001', name: 'Laura Bianchi' };
const OSS = { id: 'SEED-OP-002', name: 'Marco Rinaldi' };
export const MILO_DOCTOR = {
  userId: 'SEED-USER-005',
  operatorId: 'SEED-OP-005',
  name: 'Stefano Galli',
  email: 'stefano.galli@clinicos.demo',
};

function isoDay(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function stableUuid(key: string): string {
  const hex = createHash('sha256').update(`clinicos-synthetic:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// ── 1. Medico con turni ─────────────────────────────────────────────────────────────────────

async function seedDoctor(prisma: PrismaClient): Promise<void> {
  await prisma.user.upsert({
    where: { email: MILO_DOCTOR.email },
    update: { fullName: MILO_DOCTOR.name },
    create: {
      id: MILO_DOCTOR.userId,
      email: MILO_DOCTOR.email,
      passwordHash: 'DEMO_SEED_NOT_A_REAL_HASH',
      fullName: MILO_DOCTOR.name,
      role: 'OPERATOR',
    },
  });
  await prisma.operator.upsert({
    where: { userId: MILO_DOCTOR.userId },
    update: { ruolo: 'medico', department: 'Reparto A — Medicina Interna' },
    create: {
      id: MILO_DOCTOR.operatorId,
      userId: MILO_DOCTOR.userId,
      licenseNumber: 'MED-DEMO-001',
      ruolo: 'medico',
      department: 'Reparto A — Medicina Interna',
      phone: '+39 333 100 2005',
    },
  });
  await prisma.operatorSchedule.upsert({
    where: { operatorId: MILO_DOCTOR.operatorId },
    update: {},
    create: {
      operatorId: MILO_DOCTOR.operatorId,
      data: {
        turni: OPERATOR_SCHEDULE_DAYS.map((giorno) => ({
          giorno,
          oraInizio: '08:00',
          oraFine: '14:00',
          disponibile: giorno !== 'domenica',
        })),
        note: 'Orario di prova del medico (dati sintetici).',
      },
    },
  });
}

// ── 2. Settimana di parametri (mattina infermiera, sera OSS) ──────────────────────────────────

type Values = Record<string, string>;
/** Valori per giorno (0 = 7 giorni fa … 6 = ieri) e fascia. */
const WEEK: Array<{ patientId: string; series: (day: number, evening: boolean) => Values }> = [
  {
    // Peggioramento: febbre in salita, saturazione in calo, frequenza respiratoria in aumento.
    patientId: 'SEED-PAZ-003',
    series: (d, evening) => ({
      pa: `${125 - d * 2}/${78 - d}`,
      fc: String(82 + d * 4 + (evening ? 3 : 0)),
      spo2: String(97 - Math.floor(d / 2) - (evening && d > 3 ? 1 : 0)),
      temperatura: (36.6 + d * 0.25 + (evening ? 0.2 : 0)).toFixed(1),
      fr: String(16 + d + (evening ? 1 : 0)),
      o2: d >= 5 ? 'si' : 'no',
      coscienza: 'A',
    }),
  },
  {
    // Pressione in salita, il resto stabile.
    patientId: 'SEED-PAZ-001',
    series: (d, evening) => ({
      pa: `${132 + d * 5 + (evening ? 4 : 0)}/${82 + d * 2}`,
      fc: String(76 + d + (evening ? 2 : 0)),
      spo2: '96',
      temperatura: '36.5',
      fr: '16',
      o2: 'no',
      coscienza: 'A',
      ...(evening ? {} : { evacuazione: d % 2 === 0 ? 'Sì' : 'No' }),
    }),
  },
  {
    // Stabile, diabetica: glicemia al mattino.
    patientId: 'SEED-PAZ-002',
    series: (d, evening) => ({
      pa: `${118 + (d % 3)}/${74 + (d % 2)}`,
      fc: String(70 + (d % 4)),
      spo2: '98',
      temperatura: '36.3',
      fr: '14',
      o2: 'no',
      coscienza: 'A',
      ...(evening ? {} : { dtx: String(130 + (d % 3) * 8) }),
    }),
  },
];

async function seedWeekOfReadings(): Promise<number> {
  let written = 0;
  for (const { patientId, series } of WEEK) {
    for (let d = 0; d < 7; d += 1) {
      const day = isoDay(d - 7);
      for (const evening of [false, true]) {
        const author = evening ? OSS : NURSE;
        const hour = evening ? '17' : '07';
        try {
          await createParameterReading(
            patientId,
            {
              requestId: stableUuid(`milo-week:${patientId}:${day}:${hour}`),
              measuredAt: `${day}T${hour}:30:00.000Z`,
              values: series(d, evening),
            },
            { id: author.id, role: 'admin', name: author.name },
          );
          written += 1;
        } catch (error) {
          if (!(error instanceof ParameterReadingError)) throw error;
        }
      }
    }
  }
  return written;
}

// ── 3. Visita del medico (ieri) ───────────────────────────────────────────────────────────────

async function seedDoctorVisit(prisma: PrismaClient): Promise<void> {
  const yesterday = isoDay(-1);
  const at = new Date(`${yesterday}T09:30:00.000Z`);
  await prisma.appointment.upsert({
    where: { id: 'SEED-MILO-APP-001' },
    update: { scheduledAt: at, status: 'COMPLETED' },
    create: {
      id: 'SEED-MILO-APP-001',
      patientId: 'SEED-PAZ-003',
      operatorId: MILO_DOCTOR.operatorId,
      createdByUserId: MILO_DOCTOR.userId,
      scheduledAt: at,
      durationMinutes: 30,
      reason: 'Visita medica: febbre e saturazione in calo',
      status: 'COMPLETED',
    },
  });
  await prisma.patientDiaryEntry.upsert({
    where: { id: 'SEED-MILO-DIARY-001' },
    update: { entryDateTime: `${yesterday}T10:00` },
    create: {
      id: 'SEED-MILO-DIARY-001',
      patientId: 'SEED-PAZ-003',
      authorType: 'medico',
      authorName: MILO_DOCTOR.name,
      authorId: MILO_DOCTOR.operatorId,
      title: 'Visita medica',
      content:
        'Visitato per febbricola e saturazione in calo. Richiesto controllo dei parametri ogni 8 ore e rivalutazione domani.',
      priority: 'importante',
      entryDateTime: `${yesterday}T10:00`,
    },
  });
}

// ── 4. Camere singole e doppie con dimissioni previste ────────────────────────────────────────

const EXTRA_PATIENTS = [
  {
    id: 'SEED-PAZ-101',
    mrn: 'MRN-DEMO-101',
    cf: 'CLMTRS39E52F205H',
    firstName: 'Teresa',
    lastName: 'Colombo',
    dob: '1939-05-12',
    sex: 'F',
    room: 'SEED-ROOM-103',
    bed: 'A',
    dischargeIn: 3,
  },
  {
    id: 'SEED-PAZ-102',
    mrn: 'MRN-DEMO-102',
    cf: 'SPSLGU44S03F205K',
    firstName: 'Luigi',
    lastName: 'Esposito',
    dob: '1944-11-03',
    sex: 'M',
    room: 'SEED-ROOM-104',
    bed: 'A',
    dischargeIn: 6,
  },
  {
    id: 'SEED-PAZ-103',
    mrn: 'MRN-DEMO-103',
    cf: 'RCCFNC50B60F205H',
    firstName: 'Franca',
    lastName: 'Ricci',
    dob: '1950-02-20',
    sex: 'F',
    room: 'SEED-ROOM-202',
    bed: 'A',
    dischargeIn: 2,
  },
  {
    id: 'SEED-PAZ-104',
    mrn: 'MRN-DEMO-104',
    cf: 'GRCPLA47P08F205N',
    firstName: 'Paolo',
    lastName: 'Greco',
    dob: '1947-09-08',
    sex: 'M',
    room: 'SEED-ROOM-202',
    bed: 'B',
    dischargeIn: 5,
  },
];
const EXTRA_ROOMS = [
  { id: 'SEED-ROOM-103', numero: '103', tipo: 'singola' as const, beds: ['A'] },
  { id: 'SEED-ROOM-104', numero: '104', tipo: 'singola' as const, beds: ['A'] },
  { id: 'SEED-ROOM-202', numero: '202', tipo: 'doppia' as const, beds: ['A', 'B'] },
];

async function seedRoomsAndDischarges(prisma: PrismaClient): Promise<number> {
  for (const room of EXTRA_ROOMS) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: { numero: room.numero, tipo: room.tipo, stato: 'attiva' },
      create: {
        id: room.id,
        numero: room.numero,
        tipo: room.tipo,
        piano: room.numero.startsWith('1') ? '1°' : '2°',
        reparto: 'Reparto A — Medicina Interna',
        stato: 'attiva',
      },
    });
    for (const label of room.beds) {
      const id = `SEED-BED-${room.numero}-${label}`;
      await prisma.bed.upsert({
        where: { id },
        update: { roomId: room.id, label },
        create: { id, roomId: room.id, label, stato: 'libero' },
      });
    }
  }
  for (const p of EXTRA_PATIENTS) {
    await prisma.patient.upsert({
      where: { medicalRecordNumber: p.mrn },
      update: { firstName: p.firstName, lastName: p.lastName, codiceFiscale: p.cf },
      create: {
        id: p.id,
        medicalRecordNumber: p.mrn,
        codiceFiscale: p.cf,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(`${p.dob}T00:00:00.000Z`),
        sex: p.sex,
        phone: '+39 333 000 0000',
        registeredById: NURSE.id,
      },
    });
    const room = EXTRA_ROOMS.find((r) => r.id === p.room)!;
    const placementId = `SEED-MILO-PLACEMENT-${p.id.slice(-3)}`;
    // Dimissione prevista = fine dell'assegnazione nel futuro: il letto risulta occupato fino ad
    // allora e Milo può dire quando si libera.
    await prisma.patientRoomAssignment.upsert({
      where: { id: placementId },
      update: { endDate: isoDay(p.dischargeIn) },
      create: {
        id: placementId,
        patientId: p.id,
        roomId: p.room,
        bedId: `SEED-BED-${room.numero}-${p.bed}`,
        startDate: isoDay(-10),
        endDate: isoDay(p.dischargeIn),
        createdById: NURSE.id,
        note: 'Assegnazione di prova con dimissione prevista',
      },
    });
  }
  return EXTRA_PATIENTS.length;
}

// ── 5. Terapia appena conclusa, prescritta dal medico ─────────────────────────────────────────

const DEMO_DOCTOR_NAME = 'Medico 1';

async function seedCompletedTherapy(prisma: PrismaClient): Promise<void> {
  await prisma.patientTherapy.upsert({
    where: { id: 'SEED-MILO-THER-001' },
    update: {
      dataInizio: isoDay(-5),
      dataFine: isoDay(-1),
      stato: 'attiva',
      prescrittore: DEMO_DOCTOR_NAME,
      operatoreInseritore: DEMO_DOCTOR_NAME,
    },
    create: {
      id: 'SEED-MILO-THER-001',
      patientId: 'SEED-PAZ-001',
      farmacoNome: 'Furosemide',
      dosaggio: '25 mg',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: isoDay(-5),
      dataFine: isoDay(-1),
      orarioSpecifico: '06:00,14:00,22:00',
      // Inserita dal profilo «Medico 1» della demo: è lui che riceve l'avviso «prescritta da te».
      prescrittore: DEMO_DOCTOR_NAME,
      operatoreInseritore: DEMO_DOCTOR_NAME,
      note: 'Diuretico ogni 8 ore per 5 giorni (dati sintetici).',
    },
  });
}

export interface MiloScenarios {
  readings: number;
  extraPatients: number;
}

export async function seedMiloScenarios(prisma: PrismaClient): Promise<MiloScenarios> {
  await seedDoctor(prisma);
  const extraPatients = await seedRoomsAndDischarges(prisma);
  await seedDoctorVisit(prisma);
  await seedCompletedTherapy(prisma);
  const readings = await seedWeekOfReadings();
  return { readings, extraPatients };
}
