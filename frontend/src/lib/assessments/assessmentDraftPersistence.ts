import type { AssessmentDraft } from './assessmentDraftStore';
import { ASSESSMENT_VERSIONS, type AssessmentType } from './assessmentTypes';
import { assertAssessmentAnswers } from './assessmentDefinition';
import { assertAssessment } from './assessmentValidation';

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const prefix = 'clinicos:assessment-drafts:v1:';
const maxBytes = 2_000_000;
export function assessmentDraftPersistence(storage: DraftStorage, scope: string) {
  const key = prefix + encodeURIComponent(scope);
  let readError = false;
  return {
    failed: () => readError,
    read(): AssessmentDraft[] {
      try {
        const raw = storage.getItem(key);
        if (!raw) return [];
        if (raw.length > maxBytes) throw new Error('Draft storage limit');
        const data: unknown = JSON.parse(raw);
        if (!Array.isArray(data) || data.length > 100) throw new Error('Invalid draft storage');
        return data.flatMap((value): AssessmentDraft[] => {
          try {
            if (!value || typeof value !== 'object') return [];
            const d = value as AssessmentDraft;
            if (
              typeof d.key !== 'string' ||
              !d.key ||
              typeof d.patientId !== 'string' ||
              !d.patientId ||
              !Object.hasOwn(ASSESSMENT_VERSIONS, d.type) ||
              !d.fields ||
              typeof d.fields.assessedAtLocal !== 'string' ||
              typeof d.fields.correctionReason !== 'string' ||
              !Number.isSafeInteger(d.revision) ||
              d.revision < 0 ||
              d.record?.status === 'final'
            )
              return [];
            assertAssessmentAnswers(
              d.type as AssessmentType,
              d.fields.answers,
              d.record?.formVersion ?? ASSESSMENT_VERSIONS[d.type],
            );
            if (d.record) {
              assertAssessment(d.record, d.patientId, undefined, d.type);
              if (d.record.author.operatorId !== scope.slice(0, scope.lastIndexOf(':'))) return [];
            }
            if (d.pending && !['create', 'patch', 'finalize'].includes(d.pending.kind)) return [];
            if (
              d.pending?.kind === 'create' &&
              (d.pending.body.type !== d.type || typeof d.pending.body.requestId !== 'string')
            )
              return [];
            if (
              d.pending &&
              d.pending.kind !== 'create' &&
              (!d.record ||
                d.pending.id !== d.record.id ||
                !Number.isSafeInteger(d.pending.body.expectedVersion))
            )
              return [];
            return [
              {
                ...d,
                busy: false,
                preview: null,
                remote: null,
                failure: d.pending
                  ? {
                      code: 'unverified',
                      uncertain: true,
                      message: 'Invio interrotto: verifica o riprova prima di modificare.',
                    }
                  : null,
              },
            ];
          } catch {
            return [];
          }
        });
      } catch {
        readError = true;
        return [];
      }
    },
    write(drafts: AssessmentDraft[]): boolean {
      if (readError) return false;
      try {
        const rows = drafts.filter(
          (d) =>
            d.record?.status !== 'final' && (d.dirty || d.pending || d.record?.status === 'draft'),
        );
        const json = JSON.stringify(rows);
        if (rows.length > 100 || json.length > maxBytes) return false;
        if (rows.length) storage.setItem(key, json);
        else storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        storage.removeItem(key);
        readError = false;
      } catch {
        readError = true;
      }
    },
  };
}
