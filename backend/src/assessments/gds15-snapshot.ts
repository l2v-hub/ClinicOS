import { createHash } from 'node:crypto';
import type { PainadSnapshot, Gds15Snapshot } from './types.js';
import { GDS15_VERSION, GDS15_SOURCE_SHA256 } from './gds15-types.js';
import {
  GDS15_INSTRUCTION,
  GDS15_SCREENING_NOTE,
  GDS15_PROVENANCE,
  GDS15_REFERENCE,
} from './gds15-definition.js';
import { parseGds15Answers, gds15Result, gds15SnapshotItems } from './gds15.js';

export function gds15Snapshot(
  common: Omit<PainadSnapshot, 'form' | 'items' | 'result' | 'interpretation'>,
  value: unknown,
): Gds15Snapshot {
  const answers = parseGds15Answers(value);
  return {
    ...common,
    form: { type: 'gds15', version: GDS15_VERSION, sourceSha256: GDS15_SOURCE_SHA256 },
    instruction: GDS15_INSTRUCTION,
    items: gds15SnapshotItems(answers),
    result: gds15Result(answers)!,
    notes: answers.notes,
    screeningNote: GDS15_SCREENING_NOTE,
    provenance: GDS15_PROVENANCE,
    reference: GDS15_REFERENCE,
  };
}
// Only new GDS15 snapshots use this digest; JSONB key order cannot alter it.
export function gds15SnapshotHash(snapshot: Gds15Snapshot): string {
  const ordered = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(ordered);
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, ordered(record[key])]),
      );
    }
    return value;
  };
  return createHash('sha256')
    .update(JSON.stringify(ordered(snapshot)))
    .digest('hex');
}
