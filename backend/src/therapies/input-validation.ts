export class TherapyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TherapyInputError';
  }
}

const TEXT_LIMITS = {
  farmacoNome: 200,
  dosaggio: 160,
  viaSomministrazione: 64,
  tipo: 32,
  stato: 32,
  orarioSpecifico: 512,
  prescrittore: 200,
  operatoreInseritore: 200,
  note: 4000,
  dataSomministrazione: 10,
  orarioSomministrazione: 5,
  commercialStrengthUnit: 32,
  pharmaceuticalForm: 64,
  allowedFractions: 256,
  drugPackageRef: 256,
  giorniSettimana: 64,
  doseMode: 32,
} as const;

/** Nomi dei campi come li vede l'operatore: i messaggi non espongono le chiavi dell'API. */
const FIELD_LABELS: Record<keyof typeof TEXT_LIMITS, string> = {
  farmacoNome: 'Farmaco',
  dosaggio: 'Dosaggio',
  viaSomministrazione: 'Via di somministrazione',
  tipo: 'Tipo di terapia',
  stato: 'Stato terapia',
  orarioSpecifico: 'Orari',
  prescrittore: 'Prescrittore',
  operatoreInseritore: 'Operatore',
  note: 'Note',
  dataSomministrazione: 'Data di somministrazione',
  orarioSomministrazione: 'Orario di somministrazione',
  commercialStrengthUnit: 'Unità del dosaggio commerciale',
  pharmaceuticalForm: 'Forma farmaceutica',
  allowedFractions: 'Frazioni consentite',
  drugPackageRef: 'Confezione AIFA',
  giorniSettimana: 'Giorni della settimana',
  doseMode: 'Modalità dose',
};

const THERAPY_TYPES = new Set(['periodica', 'una_tantum', 'al_bisogno']);
const THERAPY_STATUSES = new Set(['attiva', 'sospesa', 'conclusa']);
const DOSE_MODES = new Set(['fixed', 'glucose_scale']);

/** Classification only; preserve genuine route aliases and never migrate clinical data. */
function isRegimenRoute(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    ['albisogno', 'prn', 'periodica', 'periodico', 'unatantum'].includes(
      value
        .trim()
        .toLowerCase()
        .replace(/[\s_.-]/g, ''),
    )
  );
}

/** Returns true only for a legacy status-only safety action; do not rewrite any other field. */
export function assertTherapyRouteUpdate(
  input: Record<string, unknown>,
  existing: { viaSomministrazione: unknown; tipo: unknown },
): boolean {
  if (isRegimenRoute(existing.viaSomministrazione)) {
    if (
      Object.keys(input).length === 1 &&
      (input.stato === 'sospesa' || input.stato === 'conclusa')
    )
      return true;
    if (
      !Object.hasOwn(input, 'viaSomministrazione') ||
      typeof input.viaSomministrazione !== 'string' ||
      !input.viaSomministrazione.trim() ||
      !Object.hasOwn(input, 'tipo') ||
      typeof input.tipo !== 'string' ||
      !THERAPY_TYPES.has(input.tipo)
    ) {
      throw new TherapyInputError(
        'Via registrata da verificare: scegli esplicitamente la via di somministrazione e verifica il tipo di terapia. Puoi comunque sospendere o concludere la terapia senza modificarla.',
      );
    }
  }
  assertTherapyScalarInput({
    viaSomministrazione: Object.hasOwn(input, 'viaSomministrazione')
      ? input.viaSomministrazione
      : existing.viaSomministrazione,
    tipo: Object.hasOwn(input, 'tipo') ? input.tipo : existing.tipo,
  });
  return false;
}

export function assertTherapyScalarInput(input: Record<string, unknown>): void {
  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    const label = FIELD_LABELS[field as keyof typeof TEXT_LIMITS];
    if (typeof value !== 'string') throw new TherapyInputError(`${label}: deve essere un testo`);
    if (value.length > max) {
      throw new TherapyInputError(`${label}: non può superare ${max} caratteri`);
    }
  }

  if ('farmacoNome' in input && !String(input.farmacoNome ?? '').trim()) {
    throw new TherapyInputError('Campi obbligatori mancanti: farmaco');
  }
  if (isRegimenRoute(input.viaSomministrazione)) {
    throw new TherapyInputError(
      'Via di somministrazione non valida: il regime va indicato nel tipo di terapia, non nella via. Verifica la prescrizione; nessun dato viene convertito automaticamente.',
    );
  }
  if (typeof input.tipo === 'string' && !THERAPY_TYPES.has(input.tipo)) {
    throw new TherapyInputError('Tipo di terapia non valido: periodica, una tantum o al bisogno');
  }
  if (typeof input.stato === 'string' && !THERAPY_STATUSES.has(input.stato)) {
    throw new TherapyInputError('Stato terapia non valido: attiva, sospesa o conclusa');
  }
  if (input.doseMode !== undefined && !DOSE_MODES.has(input.doseMode as string)) {
    throw new TherapyInputError('Modalità dose non valida');
  }
}
