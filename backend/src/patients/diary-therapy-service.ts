// Diario terapia (PR 1): voce di diario + terapia create insieme, in UNA transazione.
//
// - La terapia passa dallo stesso `createTherapyInTx` di POST /patients/:id/therapies, con la
//   stessa validazione (`validateTherapyCreateInput`) e `operatoreInseritore` deciso dal server.
// - In piu' rispetto alla creazione terapia di oggi (regola "mai inventare"): orari e unita'
//   espliciti, nessun conflitto di fascia (si blocca, non si accorpa), nessuna sospensione.
// - Idempotenza: (patientId, therapyRequestId) e' unico. Una ripetizione restituisce la coppia
//   gia' creata; una corsa fra due richieste identiche si risolve sulla violazione di unicita'
//   (P2002): la transazione perdente viene annullata (terapia compresa) e si rilegge la vincente.
//   Lo stesso requestId con un contenuto diverso e' un 409 (request_id_reused).
//
// PRIVACY: nessun log con testo clinico; l'audit registra solo nomi di campi.

import { Prisma, type PatientDiaryEntry } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { normalizeSchedules, normalizeTherapyDateRange } from '../lib/therapy-dose.js';
import {
  createTherapyInTx,
  normalizeGiorniSettimana,
  validateTherapyCreateInput,
  type PatientTherapyWithSchedules,
  type TherapyCreateInput,
} from '../therapies/therapy-create.js';
import {
  NON_PRESCRIPTION_INTENTS,
  detectDiaryTherapyIntent,
  scheduleFasciaConflicts,
  type DiaryTherapyIntent,
} from '../therapies/diary-therapy-parse.js';
import type { DiaryCreateInput } from './diary-write-validation.js';

export const DIARY_THERAPY_CATEGORY = 'terapia';
const REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

export class DiaryTherapyInputError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly fasciaConflicts: string[] = [],
    readonly intent?: string,
  ) {
    super(message);
    this.name = 'DiaryTherapyInputError';
  }
}

/** Stesso requestId riusato con un contenuto diverso: 409, nessuna scrittura. */
export class DiaryTherapyReplayConflictError extends Error {
  readonly code = 'request_id_reused';
  constructor() {
    super("requestId gia' usato per una voce con contenuto diverso");
    this.name = 'DiaryTherapyReplayConflictError';
  }
}

export interface DiaryTherapyResult {
  entry: PatientDiaryEntry;
  therapy: PatientTherapyWithSchedules | null;
  /** true quando il requestId era gia' stato usato: nessuna nuova scrittura. */
  replay: boolean;
}

export function parseTherapyRequestId(value: unknown): string {
  if (typeof value !== 'string' || !REQUEST_ID.test(value)) {
    throw new DiaryTherapyInputError(
      'requestId obbligatorio (8-128 caratteri: lettere, cifre, . _ : -)',
      'request_id_invalid',
    );
  }
  return value;
}

const FASCE_FLAGS = [
  'fasceMattina',
  'fascePranzo',
  'fascePomeriggio',
  'fasceSera',
  'fasceNotte',
] as const;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const H_MM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * Stessa validazione di POST /patients/:id/therapies, piu' le regole del diario (mai inventare):
 * - `periodica` (o tipo assente): orari espliciti obbligatori, cioe' `schedules` non vuoto oppure
 *   almeno una fascia esplicita (le fasce non indicate diventano false: senza questo
 *   `createTherapyInTx` accenderebbe la mattina di default, cioe' un orario inventato);
 * - `una_tantum`: `schedules` puo' essere vuoto se data e ora della somministrazione ci sono;
 * - `al_bisogno`: `schedules` puo' essere vuoto (non ha orari fissi);
 *   per questi due tipi l'assenza di `schedules` equivale a [] (nessuna fascia inventata);
 * - ogni orario dichiara la sua unita' (altrimenti il default sarebbe "compressa");
 * - due somministrazioni nella stessa fascia, anche allo stesso orario, sono un conflitto.
 * Non tocca il database: una terapia non valida non produce nessuna scrittura.
 */
export function prepareDiaryTherapyInput(
  raw: unknown,
  operatoreInseritore: string,
): TherapyCreateInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new DiaryTherapyInputError('therapy obbligatoria', 'therapy_invalid');
  }
  const input: TherapyCreateInput = {
    ...(raw as TherapyCreateInput),
    operatoreInseritore,
  };
  validateTherapyCreateInput(input);

  const tipo = input.tipo || 'periodica';
  if (tipo === 'una_tantum') {
    const day = typeof input.dataSomministrazione === 'string' ? input.dataSomministrazione : '';
    const time =
      typeof input.orarioSomministrazione === 'string' ? input.orarioSomministrazione : '';
    const clock = H_MM.exec(time);
    if (!ISO_DAY.test(day) || !clock) {
      throw new DiaryTherapyInputError(
        'Indicare data e ora della somministrazione una tantum',
        'schedule_required',
      );
    }
    // "8:30" e "08:30" sono la stessa ora: si salva sempre HH:MM.
    input.orarioSomministrazione = `${clock[1].padStart(2, '0')}:${clock[2]}`;
  }
  if (tipo !== 'periodica' && input.schedules === undefined) input.schedules = [];

  if (input.schedules !== undefined) {
    const schedules = input.schedules as Array<Record<string, unknown>>;
    if (schedules.length === 0 && tipo === 'periodica') {
      throw new DiaryTherapyInputError(
        'Indicare almeno un orario di somministrazione',
        'schedule_required',
      );
    }
    if (
      schedules.some(
        (s) => typeof s.administrationUnit !== 'string' || !s.administrationUnit.trim(),
      )
    ) {
      throw new DiaryTherapyInputError(
        "Indicare l'unita' di somministrazione per ogni orario",
        'unit_required',
      );
    }
    // Orari grezzi (non deduplicati): lo stesso orario ripetuto e' un conflitto, non si accorpa.
    const times = schedules.map((s) => normalizeSchedules([s])[0]?.time ?? '');
    const conflicts = scheduleFasciaConflicts(times);
    if (conflicts.length) {
      throw new DiaryTherapyInputError(
        `Piu' somministrazioni nella stessa fascia: ${conflicts.join('; ')}`,
        'fascia_conflict',
        conflicts,
      );
    }
    return input;
  }

  if (!FASCE_FLAGS.some((flag) => input[flag] === true)) {
    throw new DiaryTherapyInputError(
      'Indicare almeno un orario di somministrazione',
      'schedule_required',
    );
  }
  for (const flag of FASCE_FLAGS) input[flag] = input[flag] === true;
  return input;
}

const INTENT_MESSAGES: Partial<Record<DiaryTherapyIntent, string>> = {
  sospensione: 'Sembra una sospensione: usa la sezione Terapia',
  somministrazione: 'Sembra una somministrazione già fatta: registrala dal giro terapia',
  modifica: 'Sembra una modifica di una terapia esistente: usa la sezione Terapia',
};

/** Sospensione, somministrazione gia' fatta o modifica: non si crea una terapia nuova. */
export function assertPrescriptionEntry(entry: DiaryCreateInput): void {
  // Stessa funzione dell'anteprima: nessuna regola separata.
  const { intent } = detectDiaryTherapyIntent(entry.content);
  if (NON_PRESCRIPTION_INTENTS.has(intent)) {
    throw new DiaryTherapyInputError(
      INTENT_MESSAGES[intent] ?? 'La voce non è una prescrizione',
      'intent_not_prescription',
      [],
      intent,
    );
  }
}

function isRequestIdConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function findExisting(
  client: Pick<typeof prisma, 'patientDiaryEntry'>,
  patientId: string,
  therapyRequestId: string,
): Promise<DiaryTherapyResult | null> {
  const entry = await client.patientDiaryEntry.findUnique({
    where: { patientId_therapyRequestId: { patientId, therapyRequestId } },
    include: {
      therapy: { include: { schedules: { orderBy: { time: 'asc' } } } },
    },
  });
  if (!entry) return null;
  const { therapy, ...plain } = entry;
  return { entry: plain, therapy, replay: true };
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function scheduleKey(s: {
  time: string;
  quantityNumerator: number;
  quantityDenominator: number;
  administrationUnit: string;
}): string {
  return `${s.time}|${s.quantityNumerator}/${s.quantityDenominator}|${s.administrationUnit}`;
}

/** Stesso requestId, stesso contenuto? Confronta la voce (testo e data/ora) e i campi della
 *  terapia (farmaco, dose, quantita', unita', via, orari, date, giorni, tipo, stato, note,
 *  prescrittore, confezione, frazioni ammesse), normalizzati come li salva `createTherapyInTx`.
 *  Della voce: testo, data/ora, titolo e priorita'. */
export function replayMatches(
  existing: Pick<DiaryTherapyResult, 'entry' | 'therapy'>,
  entry: DiaryCreateInput,
  therapy: TherapyCreateInput,
): boolean {
  if (existing.entry.content !== entry.content) return false;
  if (existing.entry.entryDateTime !== entry.entryDateTime) return false;
  if (existing.entry.title !== entry.title) return false;
  if (existing.entry.priority !== entry.priority) return false;
  const saved = existing.therapy;
  // Terapia cancellata dopo la creazione (SetNull): resta confrontabile solo la voce.
  if (!saved) return true;
  const dates = normalizeTherapyDateRange(therapy.dataInizio, therapy.dataFine);
  const strength =
    therapy.commercialStrengthValue != null && therapy.commercialStrengthValue !== ''
      ? Number(therapy.commercialStrengthValue)
      : null;
  const dosaggio = optionalText(therapy.dosaggio);
  const scalarsMatch =
    saved.farmacoNome === therapy.farmacoNome.trim() &&
    saved.dataInizio === dates.dataInizio &&
    saved.dataFine === dates.dataFine &&
    saved.viaSomministrazione === (therapy.viaSomministrazione || 'orale') &&
    (dosaggio === null || saved.dosaggio === dosaggio) &&
    saved.commercialStrengthValue === strength &&
    saved.commercialStrengthUnit === optionalText(therapy.commercialStrengthUnit) &&
    saved.pharmaceuticalForm === optionalText(therapy.pharmaceuticalForm) &&
    saved.tipo === (therapy.tipo || 'periodica') &&
    saved.stato === (therapy.stato || 'attiva') &&
    saved.note === (therapy.note || null) &&
    saved.prescrittore === (therapy.prescrittore || null) &&
    saved.giorniSettimana === normalizeGiorniSettimana(therapy.giorniSettimana) &&
    saved.dataSomministrazione === (therapy.dataSomministrazione || null) &&
    saved.orarioSomministrazione === (therapy.orarioSomministrazione || null) &&
    saved.drugPackageRef === optionalText(therapy.drugPackageRef) &&
    saved.allowedFractions === optionalText(therapy.allowedFractions);
  if (!scalarsMatch) return false;
  if (therapy.schedules === undefined) {
    return saved.schedules.length === 0 && FASCE_FLAGS.every((f) => saved[f] === therapy[f]);
  }
  const wanted = normalizeSchedules(therapy.schedules).map(scheduleKey).sort();
  const stored = saved.schedules.map(scheduleKey).sort();
  return wanted.length === stored.length && wanted.every((key, i) => key === stored[i]);
}

function checkedReplay(
  existing: DiaryTherapyResult,
  entry: DiaryCreateInput,
  therapy: TherapyCreateInput,
): DiaryTherapyResult {
  if (!replayMatches(existing, entry, therapy)) throw new DiaryTherapyReplayConflictError();
  return existing;
}

export async function createDiaryEntryWithTherapy(args: {
  patientId: string;
  requestId: string;
  author: { authorType: string; authorName: string };
  entry: DiaryCreateInput;
  therapy: TherapyCreateInput;
}): Promise<DiaryTherapyResult> {
  const { patientId, requestId, author, entry, therapy } = args;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await findExisting(tx, patientId, requestId);
      if (existing) return checkedReplay(existing, entry, therapy);
      const created = await createTherapyInTx(tx, patientId, therapy);
      const diary = await tx.patientDiaryEntry.create({
        data: {
          patientId,
          ...author,
          ...entry,
          category: DIARY_THERAPY_CATEGORY,
          therapyId: created.id,
          therapyRequestId: requestId,
        },
      });
      return { entry: diary, therapy: created, replay: false };
    });
  } catch (error) {
    if (!isRequestIdConflict(error)) throw error;
    // Corsa persa: l'altra richiesta con lo stesso requestId ha gia' creato la coppia.
    const winner = await findExisting(prisma, patientId, requestId);
    if (winner) return checkedReplay(winner, entry, therapy);
    throw error;
  }
}

// Nomi di campo ammessi nell'audit: elenco chiuso, cosi' nemmeno una chiave arbitraria del corpo
// della richiesta puo' finire nel registro.
const AUDITABLE_THERAPY_FIELDS = [
  'farmacoNome',
  'dataInizio',
  'dataFine',
  'dosaggio',
  'viaSomministrazione',
  'tipo',
  'stato',
  'schedules',
  'giorniSettimana',
  'prescrittore',
  'note',
  'commercialStrengthValue',
  'commercialStrengthUnit',
  'pharmaceuticalForm',
] as const;

/** Solo NOMI dei campi valorizzati (mai valori): per l'audit PHI-safe. */
export function diaryTherapyAuditFields(
  entry: DiaryCreateInput,
  therapy: TherapyCreateInput,
): string[] {
  const entryFields = (Object.keys(entry) as Array<keyof DiaryCreateInput>)
    .filter((k) => entry[k] !== null && entry[k] !== undefined)
    .map((k) => `entry.${k}`);
  const therapyFields = AUDITABLE_THERAPY_FIELDS.filter(
    (k) => therapy[k] !== undefined && therapy[k] !== null && therapy[k] !== '',
  ).map((k) => `therapy.${k}`);
  return [...entryFields, ...therapyFields].slice(0, 20);
}
