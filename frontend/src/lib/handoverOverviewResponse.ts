import type { Consegna, ConsegnaOverview } from '../types';
import { isUrgencyView } from './urgency';

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function handover(value: unknown): value is Consegna {
  if (!record(value)) return false;
  const strings = ['id', 'pazienteId', 'pazienteNome', 'tipo', 'note', 'scadenza',
    'operatoreAssegnato', 'creatoDA', 'createdAt'];
  if (!strings.every((key) => typeof value[key] === 'string')) return false;
  if (!value.id || !value.pazienteId) return false;
  if (!['normale', 'alta', 'urgente'].includes(String(value.priorita)) ||
      !['aperta', 'in_corso', 'completata'].includes(String(value.stato))) return false;
  if (value.urgency !== undefined && !isUrgencyView(value.urgency)) return false;
  return true;
}

/** Accept only the acknowledgement-aware aggregate. Legacy urgentOpen counts stored
 * status, so converting it to urgentActive would fabricate a shared reading state. */
export function parseHandoverOverview(value: unknown): ConsegnaOverview {
  if (!record(value) || !['facility', 'operator'].includes(String(value.scope)) ||
      !record(value.summary) || !count(value.summary.total) ||
      !count(value.summary.urgentActive) || !count(value.summary.urgentTaken) ||
      !Array.isArray(value.recentPreview) || !value.recentPreview.every(handover) ||
      !Array.isArray(value.urgentPreview) || !value.urgentPreview.every(handover) ||
      !record(value.byOperator) || !Object.values(value.byOperator).every(count)) {
    throw new Error('handover_overview_incompatible');
  }
  return value as unknown as ConsegnaOverview;
}
