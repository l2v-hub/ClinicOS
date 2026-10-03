import type { ReactNode } from 'react';
import type { PaperFieldId, PaperScale } from '../../../lib/assessments/paper/definitions';
import type { PatientIdentityData } from '../../../lib/patientIdentity';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import type { PaperField } from './PaperSheet';

export interface PaperFieldContext {
  patient: PatientIdentityData;
  assessedAt: string;
  authorName: string;
  total: string;
  measures?: Partial<Record<'weight' | 'height', ReactNode>>;
}
const number = (value: unknown, digits: number) =>
  typeof value === 'number'
    ? value.toLocaleString('it-IT', { maximumFractionDigits: digits })
    : '—';
export const measureText = number;

/** Header block of the paper module filled with the app's traceability data (patient, date, operator). */
export function paperFields(scale: PaperScale, context: PaperFieldContext): PaperField[] {
  const p = context.patient;
  const name = `${p.lastName} ${p.firstName}`.trim();
  const value = (id: PaperFieldId): ReactNode => {
    switch (id) {
      case 'patient':
        return name;
      case 'patientCode':
        return p.codiceFiscale ? `${name} · ${p.codiceFiscale}` : name;
      case 'date':
        return context.assessedAt ? formatFacilityLocalMinute(context.assessedAt) : '—';
      case 'birthDate':
        return p.dateOfBirth
          ? p.dateOfBirth.slice(0, 10).split('-').reverse().join('/')
          : 'Non disponibile';
      case 'operator':
      case 'examiner':
        return context.authorName;
      case 'ward':
        return p.location?.room
          ? `Stanza ${p.location.room}${p.location.bed ? ` · Letto ${p.location.bed}` : ''}`
          : 'Non assegnata';
      case 'score':
        return context.total;
      case 'weight':
        return context.measures?.weight ?? '—';
      case 'height':
        return context.measures?.height ?? '—';
    }
  };
  return scale.fields.map((field) => ({ label: field.label, value: value(field.id) }));
}
