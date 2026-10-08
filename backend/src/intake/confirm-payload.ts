import type { ConfirmPayload } from '../ai/upload/confirm-service.js';
import type { Operator } from '../ai/auth.js';
import type { TherapyCreateInput } from '../therapies/therapy-create.js';
import { normalizeGlucoseScaleProtocol } from '../therapies/glucose-scale.js';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionalText(target: JsonRecord, key: string, value: unknown): void {
  if (typeof value === 'string') target[key] = value;
}

function fraction(value: unknown): { numerator: number; denominator: number } {
  const match = text(value)
    .trim()
    .match(/^(\d+)(?:\/(\d+))?/);
  const numerator = Number(match?.[1] ?? 1);
  const denominator = Number(match?.[2] ?? 1);
  return {
    numerator: Number.isFinite(numerator) ? numerator : 1,
    denominator: Number.isFinite(denominator) && denominator > 0 ? denominator : 1,
  };
}

function scaleProtocol(rows: unknown): ReturnType<typeof normalizeGlucoseScaleProtocol> {
  const rules = Array.isArray(rows)
    ? rows.map((item) => {
        const row = record(item);
        return {
          minMgDl: Number(row.minMgDl),
          maxMgDl: row.maxMgDl === '' || row.maxMgDl == null ? null : Number(row.maxMgDl),
          units: Number(row.units),
        };
      })
    : [];
  return normalizeGlucoseScaleProtocol({
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit: 'unità',
    rules,
  });
}

function manualTherapy(value: unknown, actor: Operator): TherapyCreateInput {
  const row = record(value);
  const tipo = text(row.tipo) || 'periodica';
  const doseMode = row.doseMode === 'glucose_scale' ? 'glucose_scale' : 'fixed';
  const schedules =
    tipo === 'periodica' && Array.isArray(row.schedules)
      ? row.schedules.map((item) => {
          const schedule = record(item);
          return {
            time: text(schedule.time),
            quantityNumerator: Number(schedule.quantityNumerator),
            quantityDenominator: Number(schedule.quantityDenominator),
            administrationUnit: text(schedule.administrationUnit),
          };
        })
      : [];
  const days = Array.isArray(row.giorniSettimana)
    ? row.giorniSettimana.map(Number).filter(Number.isInteger).join(',')
    : undefined;
  const allowedFractions = Array.isArray(row.allowedFractions)
    ? row.allowedFractions.map(String).join(',')
    : text(row.allowedFractions) || '1';
  return {
    farmacoNome: text(row.farmacoNome),
    dataInizio: text(row.dataInizio) || todayIso(),
    ...(text(row.dataFine) ? { dataFine: text(row.dataFine) } : {}),
    viaSomministrazione: text(row.viaSomministrazione) || 'orale',
    tipo,
    stato: text(row.stato) || 'attiva',
    ...(row.commercialStrengthValue !== '' && row.commercialStrengthValue != null
      ? { commercialStrengthValue: Number(row.commercialStrengthValue) }
      : {}),
    ...(text(row.commercialStrengthUnit)
      ? { commercialStrengthUnit: text(row.commercialStrengthUnit) }
      : {}),
    ...(text(row.pharmaceuticalForm) ? { pharmaceuticalForm: text(row.pharmaceuticalForm) } : {}),
    allowedFractions,
    schedules,
    ...(days ? { giorniSettimana: days } : {}),
    doseMode,
    ...(doseMode === 'glucose_scale' ? { doseProtocol: scaleProtocol(row.glucoseScale) } : {}),
    ...(text(row.prescrittore) ? { prescrittore: text(row.prescrittore) } : {}),
    operatoreInseritore: actor.name || actor.id,
    ...(text(row.note) ? { note: text(row.note) } : {}),
    ...(tipo === 'una_tantum' && text(row.dataSomministrazione)
      ? { dataSomministrazione: text(row.dataSomministrazione) }
      : {}),
    ...(tipo === 'una_tantum' && text(row.orarioSomministrazione)
      ? { orarioSomministrazione: text(row.orarioSomministrazione) }
      : {}),
  };
}

const ROUTES: Record<string, string> = {
  OS: 'orale',
  IM: 'intramuscolo',
  EV: 'endovena',
  SC: 'sottocute',
  SL: 'sublinguale',
  TD: 'transdermica',
  INAL: 'inalatoria',
  TOP: 'topica',
  RETT: 'rettale',
  OFT: 'oftalmica',
  OTO: 'otologica',
  NAS: 'nasale',
  VAG: 'vaginale',
};
const DAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

function importedTherapy(value: unknown, actor: Operator): TherapyCreateInput {
  const row = record(value);
  const doseMode = row.doseMode === 'glucose_scale' ? 'glucose_scale' : 'fixed';
  const qty = fraction(row.quantita);
  const schedules = Array.isArray(row.orari)
    ? row.orari.map((time) => ({
        time: text(time),
        quantityNumerator: qty.numerator,
        quantityDenominator: qty.denominator,
        administrationUnit: doseMode === 'glucose_scale' ? 'unità' : text(row.forma) || 'compressa',
      }))
    : [];
  const weekdays = Array.isArray(row.giorni)
    ? row.giorni
        .map((day) => DAYS.indexOf(text(day).trim().toLowerCase()) + 1)
        .filter((day) => day > 0)
        .join(',')
    : '';
  const note = [
    text(row.note).trim(),
    text(row.classe) ? `Classe ${text(row.classe)}` : '',
    Array.isArray(row.giorni) && row.giorni.length
      ? `Giorni: ${row.giorni.map(String).join(' ')}`
      : '',
    text(row.quantita) ? `Quantità: ${text(row.quantita)}` : '',
    text(row.originalText) ? `Origine: ${text(row.originalText)}` : '',
  ]
    .filter(Boolean)
    .join(' — ');
  return {
    farmacoNome: text(row.farmacoNome).trim(),
    dataInizio: text(row.dataInizio) || todayIso(),
    viaSomministrazione: ROUTES[text(row.viaSomministrazione).toUpperCase()] ?? 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    ...(text(row.forma) ? { pharmaceuticalForm: text(row.forma) } : {}),
    allowedFractions: '1',
    schedules,
    ...(weekdays ? { giorniSettimana: weekdays } : {}),
    doseMode,
    ...(doseMode === 'glucose_scale' ? { doseProtocol: scaleProtocol(row.glucoseScale) } : {}),
    operatoreInseritore: actor.name || actor.id,
    ...(note ? { note } : {}),
  };
}

function patientFromDraft(data: JsonRecord): ConfirmPayload['patient'] {
  const source = record(data.anagrafica);
  const patient: JsonRecord = {
    firstName: text(source.firstName),
    lastName: text(source.lastName),
    dateOfBirth: text(source.dateOfBirth),
  };
  for (const key of [
    'sex',
    'codiceFiscale',
    'phone',
    'email',
    'address',
    'emergencyContactName',
    'emergencyContactPhone',
  ]) {
    optionalText(patient, key, source[key]);
  }
  return patient as unknown as ConfirmPayload['patient'];
}

function cartellaFromDraft(data: JsonRecord): Record<string, unknown> {
  const cartella: Record<string, unknown> = {
    statoRicovero: 'ricoverato',
    ...record(data.ingresso),
  };
  for (const key of ['allergie', 'allergieStatus', 'diagnosi', 'anamnesi']) {
    if (data[key] !== undefined) cartella[key] = data[key];
  }
  const parametri = record(data.parametri);
  if (data.parametri != null) {
    cartella.parametriMensili = parametri.parametriMensili ?? [];
    cartella.parametriVitali = parametri.parametriVitali ?? [];
  }
  if (Array.isArray(data.dolore) && data.dolore.length) cartella.valutazioniNRS = data.dolore;
  if (text(data._terapiaText).trim()) cartella.terapiaImportText = text(data._terapiaText);
  return cartella;
}

/** Build the clinical confirmation exclusively from the persisted, reviewed draft. */
export function confirmPayloadFromDraft(
  rawData: unknown,
  controls: unknown,
  actor: Operator,
): ConfirmPayload {
  const data = record(rawData);
  const request = record(controls);
  const manual = Array.isArray(data.terapia)
    ? data.terapia.map((row) => manualTherapy(row, actor))
    : [];
  const imported = Array.isArray(data.terapiaImport)
    ? data.terapiaImport
        .filter((row) => text(record(row).farmacoNome).trim())
        .map((row) => importedTherapy(row, actor))
    : [];
  const therapies = [...manual, ...imported];
  return {
    patient: patientFromDraft(data),
    cartella: cartellaFromDraft(data),
    ...(request.confirmDuplicate === true ? { confirmDuplicate: true } : {}),
    ...(request.confirmAllergyConflict === true ? { confirmAllergyConflict: true } : {}),
    ...(request.mode === 'existing' ? { mode: 'existing' as const } : {}),
    ...(request.mode === 'existing' && typeof request.patientId === 'string'
      ? { patientId: request.patientId }
      : {}),
    ...(therapies.length ? { therapies } : {}),
  };
}
