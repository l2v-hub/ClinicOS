import { AiExtractionError } from '../ai/types.js';
import {
  InvalidTherapySchedulesError,
  TherapyDateRangeError,
  normalizeTherapyDateRange,
} from '../lib/therapy-dose.js';
import { TherapyInputError } from '../therapies/input-validation.js';
import {
  validateTherapyCreateInput,
  type TherapyCreateInput,
} from '../therapies/therapy-create.js';

export function isTherapyValidationError(error: unknown): error is Error {
  return (
    error instanceof TherapyInputError ||
    error instanceof TherapyDateRangeError ||
    error instanceof InvalidTherapySchedulesError
  );
}

/** Validate all rows before opening a patient-creation transaction. No clinical values in errors. */
export function validateConfirmTherapies(raw: unknown): void {
  if (raw === undefined) return;
  if (!Array.isArray(raw) || raw.length > 200)
    throw new AiExtractionError(
      'config',
      'Elenco terapie non valido (massimo 200). Correggi le terapie nello step Clinica.',
    );
  raw.forEach((value, index) => {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new TherapyInputError('Dati terapia non validi');
      const input = value as TherapyCreateInput;
      validateTherapyCreateInput(input);
      if (!input.viaSomministrazione?.trim())
        throw new TherapyInputError('Indica la via di somministrazione');
      const strength = input.commercialStrengthValue;
      if (
        strength != null &&
        strength !== '' &&
        (!Number.isFinite(Number(strength)) ||
          Number(strength) <= 0 ||
          !input.commercialStrengthUnit?.trim())
      )
        throw new TherapyInputError('Dosaggio commerciale o unità non validi');
      if (input.giorniSettimana && !/^[1-7](,[1-7])*$/.test(input.giorniSettimana))
        throw new TherapyInputError('Giorni della settimana non validi');
      if ((input.tipo ?? 'periodica') === 'periodica') {
        if (!Array.isArray(input.schedules) || !input.schedules.length)
          throw new TherapyInputError('Inserisci almeno un orario con quantità e unità');
        const seen = new Set<string>();
        for (const schedule of input.schedules) {
          if (
            ![schedule.quantityNumerator, schedule.quantityDenominator].every(
              (v) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= 1000,
            )
          )
            throw new TherapyInputError('Quantità di somministrazione mancante o non valida');
          if (!schedule.administrationUnit?.trim())
            throw new TherapyInputError('Unità di somministrazione mancante');
          const key = `${schedule.time.trim().padStart(5, '0')}|${schedule.administrationUnit.trim()}`;
          if (seen.has(key)) throw new TherapyInputError('Orario duplicato: verifica le quantità');
          seen.add(key);
        }
      }
      if (input.tipo === 'una_tantum') {
        normalizeTherapyDateRange(input.dataSomministrazione, undefined);
        if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(input.orarioSomministrazione ?? ''))
          throw new TherapyInputError('Orario di somministrazione non valido');
      }
    } catch (error) {
      if (!isTherapyValidationError(error)) throw error;
      throw new AiExtractionError(
        'config',
        `Terapia ${index + 1}: ${error.message}. Correggi la riga nello step Clinica e riprova.`,
      );
    }
  });
}
