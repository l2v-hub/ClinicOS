// Dati sintetici che completano il dataset demo, così ogni schermata ha qualcosa da provare:
// consegne (priorità e stati diversi), diario, rilevazioni parametri, note fra operatori, orari
// di servizio e una bozza d'ingresso. Idempotente: chiavi fisse `SEED-…`, mai dati reali.

import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { createParameterReading } from '../patients/parameter-readings.js';
import { ParameterReadingError } from '../patients/parameter-reading-input.js';
import { OPERATOR_SCHEDULE_DAYS } from '../operators/schedule-contract.js';

const NURSE = { id: 'SEED-OP-001', name: 'Laura Bianchi' };
const OSS = { id: 'SEED-OP-002', name: 'Marco Rinaldi' };
const PHYSIO = { id: 'SEED-OP-003', name: 'Giulia Ferri' };

const PATIENTS = {
  ferrioli: { id: 'SEED-PAZ-001', name: 'Mario Ferrioli' },
  martini: { id: 'SEED-PAZ-002', name: 'Anna Martini' },
  mancini: { id: 'SEED-PAZ-007', name: 'Roberto Mancini' },
  bassi: { id: 'SEED-PAZ-003', name: 'Giorgio Bassi' },
};

function isoDay(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/** UUID deterministico (stessa chiave → stesso id): rende idempotenti le rilevazioni. */
function stableUuid(key: string): string {
  const hex = createHash('sha256').update(`clinicos-synthetic:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function seedConsegne(prisma: PrismaClient): Promise<number> {
  const today = isoDay();
  const rows = [
    {
      id: 'SEED-CONS-001',
      patient: PATIENTS.ferrioli,
      priorita: 'urgente',
      stato: 'aperta',
      tipo: 'Monitoraggio',
      note: 'Dispnea nel pomeriggio: ricontrollare SpO₂ ogni 2 ore e avvisare il medico se < 92%.',
      scadenza: today,
      oraScadenza: '20:00',
      assegnato: NURSE,
      autore: OSS,
    },
    {
      id: 'SEED-CONS-002',
      patient: PATIENTS.martini,
      priorita: 'alta',
      stato: 'aperta',
      tipo: 'Terapia',
      note: 'Paziente a digiuno da mezzanotte per esami ematici di domani mattina.',
      scadenza: isoDay(1),
      oraScadenza: '07:00',
      assegnato: NURSE,
      autore: NURSE,
    },
    {
      id: 'SEED-CONS-003',
      patient: PATIENTS.mancini,
      priorita: 'normale',
      stato: 'in_corso',
      tipo: 'Mobilizzazione',
      note: 'Proseguire la deambulazione assistita in corridoio, due volte al giorno.',
      scadenza: today,
      oraScadenza: null,
      assegnato: PHYSIO,
      autore: PHYSIO,
    },
    {
      id: 'SEED-CONS-004',
      patient: PATIENTS.bassi,
      priorita: 'normale',
      stato: 'aperta',
      tipo: 'Medicazione',
      note: 'Rinnovare la medicazione al tallone destro dopo l’igiene del mattino.',
      scadenza: isoDay(1),
      oraScadenza: '09:00',
      assegnato: NURSE,
      autore: OSS,
    },
    {
      id: 'SEED-CONS-005',
      patient: PATIENTS.ferrioli,
      priorita: 'normale',
      stato: 'completata',
      tipo: 'Monitoraggio',
      note: 'Bilancio idrico delle 24 ore completato e registrato in cartella.',
      scadenza: isoDay(-1),
      oraScadenza: null,
      assegnato: OSS,
      autore: NURSE,
    },
  ];
  for (const row of rows) {
    const data = {
      pazienteId: row.patient.id,
      pazienteNome: row.patient.name,
      priorita: row.priorita,
      stato: row.stato,
      tipo: row.tipo,
      note: row.note,
      scadenza: row.scadenza,
      oraScadenza: row.oraScadenza,
      operatoreAssegnato: row.assegnato.name,
      operatoreAssegnatoId: row.assegnato.id,
      creatoDA: row.autore.name,
      creatoDaId: row.autore.id,
    };
    // update vuoto: una consegna già lavorata durante le prove non viene riportata allo stato iniziale.
    await prisma.consegna.upsert({
      where: { id: row.id },
      update: {},
      create: { id: row.id, ...data },
    });
  }
  return rows.length;
}

async function seedDiary(prisma: PrismaClient): Promise<number> {
  const today = isoDay();
  const yesterday = isoDay(-1);
  const rows = [
    {
      id: 'SEED-DIARY-001',
      patient: PATIENTS.ferrioli,
      author: NURSE,
      authorType: 'infermiere',
      title: 'Controllo del mattino',
      content: 'Notte tranquilla. Parametri stabili, terapia delle 8 assunta senza difficoltà.',
      priority: 'normale',
      entryDateTime: `${today}T08:30`,
    },
    {
      id: 'SEED-DIARY-002',
      patient: PATIENTS.ferrioli,
      author: OSS,
      authorType: 'oss',
      title: 'Alimentazione',
      content: 'Ha consumato metà del pranzo. Idratazione da incoraggiare nel pomeriggio.',
      priority: 'importante',
      entryDateTime: `${today}T13:10`,
    },
    {
      id: 'SEED-DIARY-003',
      patient: PATIENTS.martini,
      author: NURSE,
      authorType: 'infermiere',
      title: 'Dolore',
      content: 'Riferisce dolore lombare 4/10 alla mobilizzazione. Rivalutare dopo la terapia.',
      priority: 'normale',
      entryDateTime: `${yesterday}T17:45`,
    },
    {
      id: 'SEED-DIARY-004',
      patient: PATIENTS.mancini,
      author: PHYSIO,
      authorType: 'fisioterapista',
      title: 'Seduta di fisioterapia',
      content: 'Deambulazione con deambulatore per 30 metri, buona tolleranza allo sforzo.',
      priority: 'normale',
      entryDateTime: `${yesterday}T10:15`,
    },
    {
      id: 'SEED-DIARY-005',
      patient: PATIENTS.bassi,
      author: NURSE,
      authorType: 'infermiere',
      title: 'Cute',
      content: 'Arrossamento al tallone destro: posizionato presidio antidecubito, da rivalutare.',
      priority: 'urgente',
      entryDateTime: `${today}T07:50`,
    },
  ];
  for (const row of rows) {
    await prisma.patientDiaryEntry.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        patientId: row.patient.id,
        authorType: row.authorType,
        authorName: row.author.name,
        authorId: row.author.id,
        title: row.title,
        content: row.content,
        priority: row.priority,
        status: 'aperta',
        entryDateTime: row.entryDateTime,
      },
    });
  }
  return rows.length;
}

async function seedNotes(prisma: PrismaClient): Promise<number> {
  const rows = [
    {
      id: 'SEED-NOTA-001',
      author: NURSE,
      destinatarioId: 'tutti',
      destinatarioNome: 'Tutti',
      patient: null as { id: string; name: string } | null,
      priorita: 'normale',
      messaggio: 'Da lunedì il carrello delle medicazioni è nel deposito del primo piano.',
    },
    {
      id: 'SEED-NOTA-002',
      author: OSS,
      destinatarioId: NURSE.id,
      destinatarioNome: NURSE.name,
      patient: PATIENTS.martini,
      priorita: 'alta',
      messaggio: 'La figlia della signora Martini chiede di essere richiamata entro oggi.',
    },
  ];
  for (const row of rows) {
    await prisma.nota.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        autoreId: row.author.id,
        autoreNome: row.author.name,
        destinatarioId: row.destinatarioId,
        destinatarioNome: row.destinatarioNome,
        pazienteId: row.patient?.id ?? null,
        pazienteNome: row.patient?.name ?? null,
        priorita: row.priorita,
        messaggio: row.messaggio,
      },
    });
  }
  return rows.length;
}

async function seedSchedules(prisma: PrismaClient): Promise<number> {
  const shifts: Array<[string, string, string]> = [
    [NURSE.id, '07:00', '14:00'],
    [OSS.id, '14:00', '21:00'],
    [PHYSIO.id, '09:00', '16:00'],
  ];
  for (const [operatorId, oraInizio, oraFine] of shifts) {
    const data = {
      turni: OPERATOR_SCHEDULE_DAYS.map((giorno) => ({
        giorno,
        oraInizio,
        oraFine,
        disponibile: giorno !== 'sabato' && giorno !== 'domenica',
      })),
      note: 'Orario di prova (dati sintetici).',
    };
    await prisma.operatorSchedule.upsert({
      where: { operatorId },
      update: {},
      create: { operatorId, data },
    });
  }
  return shifts.length;
}

/** Rilevazioni di ieri (mattina e pomeriggio): lo storico è pieno, «oggi» resta da registrare. */
async function seedReadings(): Promise<number> {
  const day = isoDay(-1);
  const actor = { id: NURSE.id, role: 'admin', name: NURSE.name };
  const rows = [
    {
      patient: PATIENTS.ferrioli,
      slot: '07',
      values: {
        pa: '135/85',
        fc: '78',
        spo2: '96',
        temperatura: '36.4',
        fr: '16',
        o2: 'no',
        coscienza: 'A',
      },
    },
    {
      patient: PATIENTS.ferrioli,
      slot: '15',
      values: {
        pa: '150/95',
        fc: '92',
        spo2: '93',
        temperatura: '37.6',
        fr: '22',
        o2: 'no',
        coscienza: 'A',
      },
    },
    {
      patient: PATIENTS.martini,
      slot: '07',
      values: {
        pa: '120/75',
        fc: '70',
        spo2: '98',
        temperatura: '36.2',
        fr: '14',
        o2: 'no',
        coscienza: 'A',
        dtx: '142',
      },
    },
    {
      patient: PATIENTS.mancini,
      slot: '07',
      values: {
        pa: '128/80',
        fc: '66',
        spo2: '97',
        temperatura: '36.6',
        fr: '15',
        o2: 'no',
        coscienza: 'A',
        dtx: '188',
      },
    },
    {
      patient: PATIENTS.bassi,
      slot: '15',
      values: {
        pa: '110/65',
        fc: '104',
        spo2: '91',
        temperatura: '38.2',
        fr: '24',
        o2: 'si',
        coscienza: 'A',
      },
    },
  ];
  let written = 0;
  for (const row of rows) {
    try {
      await createParameterReading(
        row.patient.id,
        {
          requestId: stableUuid(`reading:${row.patient.id}:${day}:${row.slot}`),
          measuredAt: `${day}T${row.slot}:00:00.000Z`,
          values: row.values,
        },
        actor,
      );
      written += 1;
    } catch (error) {
      // Paziente non più presente (eliminato durante le prove): la rilevazione si salta.
      if (!(error instanceof ParameterReadingError)) throw error;
    }
  }
  return written;
}

/** Una bozza d'ingresso a mano già avviata, per provare «Riprendi bozza» ed «Elimina bozza». */
async function seedIntakeDraft(prisma: PrismaClient): Promise<number> {
  const id = 'SEED-DRAFT-001';
  // Mai ricreata se è stata confermata o eliminata durante le prove.
  if (await prisma.patientIntakeDraft.findUnique({ where: { id }, select: { id: true } })) return 0;
  await prisma.patientIntakeDraft.create({
    data: {
      id,
      source: 'manual',
      createdById: NURSE.id,
      data: {
        anagrafica: {
          firstName: 'Teresa',
          lastName: 'Esempio',
          dateOfBirth: '1944-09-12',
          sex: 'F',
          phone: '+39 333 000 0101',
        },
      },
    },
  });
  return 1;
}

export interface SyntheticExtras {
  consegne: number;
  diaryEntries: number;
  notes: number;
  operatorSchedules: number;
  parameterReadings: number;
  intakeDrafts: number;
}

export async function seedSyntheticExtras(prisma: PrismaClient): Promise<SyntheticExtras> {
  return {
    consegne: await seedConsegne(prisma),
    diaryEntries: await seedDiary(prisma),
    notes: await seedNotes(prisma),
    operatorSchedules: await seedSchedules(prisma),
    parameterReadings: await seedReadings(),
    intakeDrafts: await seedIntakeDraft(prisma),
  };
}
