import { randomUUID } from 'node:crypto';
import {
  TINETTI_KEYS,
  TINETTI_MAX_SCORE,
  TINETTI_VERSION,
  type TinettiAnswers,
} from '../tinetti-types.js';
export const tinettiAnswers = (mode: 'empty' | 'zero' | 'maximum' = 'maximum') =>
  ({
    ...Object.fromEntries(
      TINETTI_KEYS.map((key) => [
        key,
        mode === 'empty' ? null : mode === 'zero' ? 0 : TINETTI_MAX_SCORE[key],
      ]),
    ),
    notes: '',
  }) as TinettiAnswers;
export const tinettiInput = (extra: Record<string, unknown> = {}) => ({
  requestId: randomUUID(),
  type: 'tinetti',
  formVersion: TINETTI_VERSION,
  assessedAt: '2026-03-28T23:30:00.000Z',
  answers: tinettiAnswers(),
  ...extra,
});
