import { facilityLocalMinute } from '../facilityTime';
import type {
  AssessmentFields,
  AssessmentEditable,
  AssessmentDto,
  AssessmentType,
} from './assessmentTypes';
import { mnaAssessmentInstants, mnaAssessmentDate, mnaLocalMinute } from './mnaTime';
export function assessmentInstants(local: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return [];
  const base = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(base) || new Date(base).toISOString().slice(0, 16) !== local) return [];
  const offsets = new Set(
    [-36, 0, 36].map((hours) => {
      const sample = base + hours * 3600000;
      return Date.parse(`${facilityLocalMinute(new Date(sample))}:00Z`) - sample;
    }),
  );
  return [...offsets]
    .map((offset) => new Date(base - offset).toISOString())
    .filter((instant) => facilityLocalMinute(new Date(instant)) === local)
    .sort();
}
export function assessmentEditable(
  fields: AssessmentFields,
  correction: boolean,
  type: AssessmentType = 'painad',
): AssessmentEditable {
  const candidates =
    type === 'mna'
      ? mnaAssessmentInstants(fields.assessedAtLocal)
      : assessmentInstants(fields.assessedAtLocal);
  const localMinute = (value: string) => {
    try {
      return type === 'mna' ? mnaLocalMinute(value) : facilityLocalMinute(new Date(value));
    } catch {
      return '';
    }
  };
  const retained =
    Number.isFinite(Date.parse(fields.instantChoice)) &&
    localMinute(fields.instantChoice) === fields.assessedAtLocal
      ? fields.instantChoice
      : undefined;
  const assessedAt =
    retained ??
    (candidates.length === 1
      ? candidates[0]
      : candidates.find((value) => value === fields.instantChoice));
  if (!assessedAt)
    throw new Error(
      candidates.length
        ? 'Scegli quale ora usare al cambio tra ora legale e solare.'
        : 'Verifica data e ora della valutazione (Europe/Rome).',
    );
  const correctionReason = fields.correctionReason.trim();
  if (type === 'mna') mnaAssessmentDate(assessedAt);
  if (correction && (!correctionReason || correctionReason.length > 1000))
    throw new Error('Indica il motivo della rettifica, massimo 1000 caratteri.');
  return {
    assessedAt,
    answers: structuredClone(fields.answers),
    ...(correction ? { correctionReason } : {}),
  };
}
export function assessmentFields(record: AssessmentDto): AssessmentFields {
  return {
    assessedAtLocal:
      record.type === 'mna'
        ? mnaLocalMinute(record.assessedAt)
        : facilityLocalMinute(new Date(record.assessedAt)),
    instantChoice: record.assessedAt,
    answers: structuredClone(record.answers),
    correctionReason: record.correctionReason ?? '',
  };
}
