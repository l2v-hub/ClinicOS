import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { PainadSnapshot } from './types.js';
import { validMnaDate, mnaBmi, parseMnaAnswers, mnaAssessmentDate } from './mna-input.js';
import { mnaCompletion, mnaResult, mnaSnapshotItems } from './mna.js';
import {
  MNA_COPYRIGHT,
  MNA_MEASUREMENT_LABELS,
  MNA_PROVENANCE,
  MNA_REFERENCES,
} from './mna-definition.js';
import {
  MNA_VERSION,
  MNA_SOURCE_SHA256,
  MNA_MEASUREMENT_KEYS,
  type MnaSnapshot,
} from './mna-types.js';

type Common = Pick<
  PainadSnapshot,
  | 'snapshotVersion'
  | 'patient'
  | 'author'
  | 'assessedAt'
  | 'createdAt'
  | 'finalizedAt'
  | 'predecessor'
  | 'predecessorId'
  | 'correctionReason'
>;
// JSONB may reorder object keys; the new MNA digest binds values and array order.
export function mnaSnapshotHash(snapshot: MnaSnapshot): string {
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
export function mnaAgeAtDate(dateOfBirth: string | null, ageOnDate: string): number | null {
  if (!validMnaDate(dateOfBirth) || !validMnaDate(ageOnDate) || dateOfBirth > ageOnDate)
    return null;
  const year = Number(ageOnDate.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  return year - (ageOnDate.slice(5) < dateOfBirth.slice(5) ? 1 : 0);
}
export async function mnaSnapshot(
  tx: Prisma.TransactionClient,
  common: Common,
  value: unknown,
): Promise<MnaSnapshot> {
  const answers = parseMnaAnswers(value);
  const patient = await tx.patient.findUniqueOrThrow({
    where: { id: common.patient.id },
    select: { sex: true },
  });
  const ageOnDate = mnaAssessmentDate(common.assessedAt);
  return {
    ...common,
    form: { type: 'mna', version: MNA_VERSION, sourceSha256: MNA_SOURCE_SHA256 },
    extent: answers.extent,
    title: answers.extent === 'screening' ? 'Screening MNA®' : 'Valutazione completa MNA®',
    demographics: {
      sex: patient.sex?.trim() ? patient.sex : null,
      ageAtAssessment: mnaAgeAtDate(common.patient.dateOfBirth, ageOnDate),
      ageOnDate,
      timeZone: 'Europe/Rome',
    },
    answers,
    completion: mnaCompletion(answers),
    items: mnaSnapshotItems(answers),
    measurements: MNA_MEASUREMENT_KEYS.map((id) => ({
      id,
      label: MNA_MEASUREMENT_LABELS[id],
      value: answers.measurements[id],
      unit: id === 'weightKg' ? 'kg' : 'cm',
      measuredOn: answers.measurementDates[id],
      source: 'manual_assessment',
    })),
    bmi: mnaBmi(answers.measurements),
    result: mnaResult(answers),
    notes: answers.notes,
    provenance: MNA_PROVENANCE,
    references: [...MNA_REFERENCES],
    copyright: MNA_COPYRIGHT,
  };
}
