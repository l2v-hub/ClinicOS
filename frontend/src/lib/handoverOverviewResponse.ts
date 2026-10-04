import type { ConsegnaOverview } from '../types';
import { responseRecord as record, responseCount as count, isConsegnaRow as handover,
  isConsegnaSummary } from './consegnaResponse';

/** Accept only the acknowledgement-aware aggregate. Legacy urgentOpen counts stored
 * status, so converting it to urgentActive would fabricate a shared reading state. */
export function parseHandoverOverview(value: unknown): ConsegnaOverview {
  if (!record(value) || !['facility', 'operator'].includes(String(value.scope)) ||
      !isConsegnaSummary(value.summary) ||
      !Array.isArray(value.recentPreview) || !value.recentPreview.every(handover) ||
      !Array.isArray(value.urgentPreview) || !value.urgentPreview.every(handover) ||
      !record(value.byOperator) || !Object.values(value.byOperator).every(count)) {
    throw new Error('handover_overview_incompatible');
  }
  return value as unknown as ConsegnaOverview;
}
