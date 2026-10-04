import type { Consegna, ConsegnaSummary } from '../types';
import { isUrgencyView } from './urgency';

export const responseRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const responseCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function isConsegnaSummary(value: unknown): value is ConsegnaSummary {
  return responseRecord(value) && responseCount(value.total) &&
    responseCount(value.urgentActive) && responseCount(value.urgentTaken) &&
    value.urgentActive + value.urgentTaken <= value.total;
}

/** Confine JSON comune a feed e anteprima: nessun cast di righe nulle/malformate. */
export function isConsegnaRow(value: unknown): value is Consegna {
  if (!responseRecord(value)) return false;
  const strings = ['id', 'pazienteId', 'pazienteNome', 'tipo', 'note', 'scadenza',
    'operatoreAssegnato', 'creatoDA', 'createdAt'];
  if (!strings.every((key) => typeof value[key] === 'string')) return false;
  if (!(value.id as string).trim() || !(value.pazienteId as string).trim()) return false;
  if (!['normale', 'alta', 'urgente'].includes(String(value.priorita)) ||
      !['aperta', 'in_corso', 'completata'].includes(String(value.stato))) return false;
  if (value.oraScadenza !== undefined && typeof value.oraScadenza !== 'string') return false;
  if (value.urgency !== undefined && !isUrgencyView(value.urgency)) return false;
  return true;
}
