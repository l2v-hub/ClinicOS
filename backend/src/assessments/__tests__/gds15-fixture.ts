import { randomUUID } from 'node:crypto';
import { GDS15_KEYS, GDS15_VERSION, type Gds15Answers } from '../gds15-types.js';
export const gds15Answers = (value: boolean | null = true): Gds15Answers =>
  ({
    ...Object.fromEntries(GDS15_KEYS.map((key) => [key, value])),
    notes: '',
  }) as Gds15Answers;
export const gds15Input = (extra: Record<string, unknown> = {}) => ({
  requestId: randomUUID(),
  type: 'gds15',
  formVersion: GDS15_VERSION,
  assessedAt: '2026-03-28T23:30:00.000Z',
  answers: gds15Answers(),
  ...extra,
});
