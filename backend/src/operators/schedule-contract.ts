export const OPERATOR_SCHEDULE_DAYS = [
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
  'domenica',
] as const;
export const MAX_OPERATOR_SCHEDULE_NOTE_LENGTH = 2000;
export const MAX_OPERATOR_SCHEDULES = 500;

type ScheduleDay = (typeof OPERATOR_SCHEDULE_DAYS)[number];

export interface OperatorShift {
  giorno: ScheduleDay;
  oraInizio: string;
  oraFine: string;
  disponibile: boolean;
}

export interface OperatorScheduleData {
  turni: OperatorShift[];
  note: string;
}

export interface StoredOperatorScheduleRow {
  id: string;
  operatorId: string;
  data: unknown;
}

export class OperatorScheduleInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperatorScheduleInputError';
  }
}

const OPERATOR_ID = /^[A-Za-z0-9_-]{1,128}$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const BODY_KEYS = new Set(['turni', 'note']);
const SHIFT_KEYS = new Set(['giorno', 'oraInizio', 'oraFine', 'disponibile']);
const DAY_SET = new Set<string>(OPERATOR_SCHEDULE_DAYS);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseOperatorScheduleInput(
  operatorId: string,
  body: unknown,
): OperatorScheduleData {
  if (!OPERATOR_ID.test(operatorId)) throw new OperatorScheduleInputError('Operatore non valido');
  const input = record(body);
  if (!input || Object.keys(input).some((key) => !BODY_KEYS.has(key))) {
    throw new OperatorScheduleInputError('Payload orario non valido');
  }
  if (!Array.isArray(input.turni) || input.turni.length !== OPERATOR_SCHEDULE_DAYS.length) {
    throw new OperatorScheduleInputError('Sono richiesti esattamente sette turni settimanali');
  }

  const shiftsByDay = new Map<ScheduleDay, OperatorShift>();
  for (const value of input.turni) {
    const shift = record(value);
    if (!shift || Object.keys(shift).some((key) => !SHIFT_KEYS.has(key))) {
      throw new OperatorScheduleInputError('Turno non valido');
    }
    if (typeof shift.giorno !== 'string' || !DAY_SET.has(shift.giorno)) {
      throw new OperatorScheduleInputError('Giorno non valido');
    }
    const giorno = shift.giorno as ScheduleDay;
    if (shiftsByDay.has(giorno)) throw new OperatorScheduleInputError('Giorno duplicato');
    if (typeof shift.oraInizio !== 'string' || !TIME.test(shift.oraInizio)) {
      throw new OperatorScheduleInputError('Ora di inizio non valida');
    }
    if (typeof shift.oraFine !== 'string' || !TIME.test(shift.oraFine)) {
      throw new OperatorScheduleInputError('Ora di fine non valida');
    }
    // A finish before the start represents a legitimate overnight healthcare shift.
    if (typeof shift.disponibile !== 'boolean') {
      throw new OperatorScheduleInputError('Disponibilità non valida');
    }
    shiftsByDay.set(giorno, {
      giorno,
      oraInizio: shift.oraInizio,
      oraFine: shift.oraFine,
      disponibile: shift.disponibile,
    });
  }

  if (typeof input.note !== 'undefined' && typeof input.note !== 'string') {
    throw new OperatorScheduleInputError('Note non valide');
  }
  const rawNote = typeof input.note === 'string' ? input.note : '';
  if (rawNote.length > MAX_OPERATOR_SCHEDULE_NOTE_LENGTH) {
    throw new OperatorScheduleInputError('Note troppo lunghe');
  }

  return {
    turni: OPERATOR_SCHEDULE_DAYS.map((day) => shiftsByDay.get(day)!),
    note: rawNote.trim(),
  };
}

export function operatorScheduleListQuery() {
  return {
    select: { id: true, operatorId: true, data: true },
    orderBy: [{ operatorId: 'asc' as const }, { id: 'asc' as const }],
    take: MAX_OPERATOR_SCHEDULES + 1,
  };
}

export function boundStoredOperatorSchedules(
  rows: readonly StoredOperatorScheduleRow[],
  includeNotes: boolean,
) {
  const boundedRows = rows.slice(0, MAX_OPERATOR_SCHEDULES);
  const items = boundedRows.flatMap((row) => {
    try {
      const data = parseOperatorScheduleInput(row.operatorId, row.data);
      return [
        {
          id: row.id,
          operatoreId: row.operatorId,
          turni: data.turni,
          note: includeNotes ? data.note : '',
        },
      ];
    } catch (error) {
      if (error instanceof OperatorScheduleInputError) return [];
      throw error;
    }
  });
  return {
    items,
    overflow: rows.length > MAX_OPERATOR_SCHEDULES,
    invalidRows: boundedRows.length - items.length,
  };
}
