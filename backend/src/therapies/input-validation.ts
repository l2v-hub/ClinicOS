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
} as const;

const THERAPY_TYPES = new Set(['periodica', 'una_tantum', 'al_bisogno']);
const THERAPY_STATUSES = new Set(['attiva', 'sospesa', 'conclusa']);

export function assertTherapyScalarInput(input: Record<string, unknown>): void {
  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') throw new TherapyInputError(`${field} deve essere testuale`);
    if (value.length > max) {
      throw new TherapyInputError(`${field} non può superare ${max} caratteri`);
    }
  }

  if ('farmacoNome' in input && !String(input.farmacoNome ?? '').trim()) {
    throw new TherapyInputError('farmacoNome è obbligatorio');
  }
  if (typeof input.tipo === 'string' && !THERAPY_TYPES.has(input.tipo)) {
    throw new TherapyInputError('tipo non valido');
  }
  if (typeof input.stato === 'string' && !THERAPY_STATUSES.has(input.stato)) {
    throw new TherapyInputError('stato non valido');
  }
}
