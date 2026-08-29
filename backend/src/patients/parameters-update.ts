import type { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { patientScopeWhere } from './patient-scope.js';

export class PatientParametersInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatientParametersInputError';
  }
}

export class PatientParametersNotFoundError extends Error {}

interface ParameterDay {
  giorno: number;
  [key: string]: string | number | undefined;
}

export interface ParameterMonth {
  id: string;
  mese: number;
  anno: number;
  giorni: ParameterDay[];
  createdAt: string;
}

const PATIENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DAY_KEYS = new Set([
  'giorno',
  'pa',
  'fc',
  'spo2',
  'temperatura',
  'dtx08',
  'dtx12',
  'dtx18',
  'evacuazione',
  'catetere',
  'note',
]);
const STORED_DAY_KEYS = new Set([...DAY_KEYS, 'firmaIpM', 'firmaIpP']);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sanitizeStoredDay(value: unknown): ParameterDay | null {
  const day = record(value);
  if (!day || !Number.isInteger(day.giorno)) return null;
  const sanitized: ParameterDay = { giorno: Number(day.giorno) };
  for (const key of STORED_DAY_KEYS) {
    if (key !== 'giorno' && typeof day[key] === 'string') sanitized[key] = day[key] as string;
  }
  return sanitized;
}

export function validateParameterMonth(patientId: string, body: unknown): ParameterMonth {
  if (!PATIENT_ID.test(patientId)) throw new PatientParametersInputError('patientId non valido');
  if ((JSON.stringify(body) ?? '').length > 64 * 1024) {
    throw new PatientParametersInputError('Payload parametri troppo grande');
  }
  const month = record(record(body)?.month);
  if (!month) throw new PatientParametersInputError('month obbligatorio');
  if (typeof month.id !== 'string' || !PATIENT_ID.test(month.id)) {
    throw new PatientParametersInputError('month.id non valido');
  }
  if (!Number.isInteger(month.mese) || Number(month.mese) < 1 || Number(month.mese) > 12) {
    throw new PatientParametersInputError('month.mese non valido');
  }
  if (!Number.isInteger(month.anno) || Number(month.anno) < 2000 || Number(month.anno) > 2099) {
    throw new PatientParametersInputError('month.anno non valido');
  }
  if (typeof month.createdAt !== 'string' || month.createdAt.length > 64) {
    throw new PatientParametersInputError('month.createdAt non valido');
  }
  if (!Array.isArray(month.giorni) || month.giorni.length > 31) {
    throw new PatientParametersInputError('month.giorni non valido');
  }

  const seenDays = new Set<number>();
  const giorni = month.giorni.map((value) => {
    const day = record(value);
    if (!day || Object.keys(day).some((key) => !DAY_KEYS.has(key))) {
      throw new PatientParametersInputError('Parametro giornaliero non valido');
    }
    if (!Number.isInteger(day.giorno) || Number(day.giorno) < 1 || Number(day.giorno) > 31) {
      throw new PatientParametersInputError('giorno non valido');
    }
    const dayNumber = Number(day.giorno);
    if (seenDays.has(dayNumber)) throw new PatientParametersInputError('giorno duplicato');
    seenDays.add(dayNumber);
    for (const [key, field] of Object.entries(day)) {
      if (key === 'giorno') continue;
      if (typeof field !== 'string' || field.length > (key === 'note' ? 2000 : 500)) {
        throw new PatientParametersInputError(`${key} non valido`);
      }
    }
    return day as unknown as ParameterDay;
  });

  return {
    id: month.id,
    mese: Number(month.mese),
    anno: Number(month.anno),
    giorni,
    createdAt: month.createdAt,
  };
}

/** Merge one month under a per-patient transaction lock; unrelated cartella fields stay intact. */
export async function savePatientParameterMonth(
  patientId: string,
  body: unknown,
  actor: Operator,
): Promise<ParameterMonth> {
  const actorId = actor.id;
  if (!PATIENT_ID.test(actorId)) throw new PatientParametersInputError('operatore non valido');
  const validatedMonth = validateParameterMonth(patientId, body);
  const month: ParameterMonth = {
    ...validatedMonth,
    giorni: validatedMonth.giorni.map((day) => ({ ...day, firmaIpM: actorId })),
  };
  let savedMonth: ParameterMonth = month;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`patient-parameters:${patientId}`}))`;
    const patient = await tx.patient.findFirst({
      where: { id: patientId, ...patientScopeWhere(actor) },
      select: { id: true },
    });
    if (!patient) throw new PatientParametersNotFoundError();
    const existing = await tx.cartella.findUnique({ where: { patientId }, select: { data: true } });
    const data = record(existing?.data) ?? {};
    const currentMonths = Array.isArray(data.parametriMensili) ? data.parametriMensili : [];
    const currentMonth = currentMonths.find((value) => {
      const candidate = record(value);
      return candidate?.mese === month.mese && candidate?.anno === month.anno;
    });
    const currentMonthRecord = record(currentMonth);
    const currentDays = Array.isArray(currentMonthRecord?.giorni) ? currentMonthRecord.giorni : [];
    const daysByNumber = new Map<number, ParameterDay>();
    currentDays.forEach((value) => {
      const day = sanitizeStoredDay(value);
      if (day) daysByNumber.set(day.giorno, day);
    });
    month.giorni.forEach((day) => daysByNumber.set(day.giorno, day));
    savedMonth = {
      ...month,
      giorni: [...daysByNumber.values()].sort((left, right) => left.giorno - right.giorno),
    };
    const otherMonths = currentMonths.filter((value) => {
      const candidate = record(value);
      return candidate?.mese !== month.mese || candidate?.anno !== month.anno;
    });
    const updated = {
      ...data,
      parametriMensili: [...otherMonths, savedMonth],
    } as Prisma.InputJsonObject;
    await tx.cartella.upsert({
      where: { patientId },
      create: { patientId, data: updated },
      update: { data: updated },
    });
  });
  return savedMonth;
}
