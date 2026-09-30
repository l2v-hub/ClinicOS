// Stato delle sezioni della scheda d'ingresso (pagina unica, HMI 1) e passaggi obbligatori mancanti.
// Stesse regole della checklist del Riepilogo e dei controlli di handleConfirm: nessuna regola nuova.
import { intakeDemographicErrors } from '../../../lib/intakeDemographics';
import { buildIntakeTherapyReview } from './intakeTherapies';
import type { TherapyCorrectionTarget } from './intakeTherapyNavigation';
import { pendingFieldProposals, proposalsLeftText } from './intakeDocuments';

export const INTAKE_SECTIONS = [
  { id: 'anagrafica', label: 'Anagrafica' },
  { id: 'ingresso', label: 'Ingresso' },
  { id: 'allergie', label: 'Allergie' },
  { id: 'terapia', label: 'Terapia' },
  { id: 'diagnosi', label: 'Diagnosi e anamnesi' },
  { id: 'parametri', label: 'Parametri iniziali' },
  { id: 'moduli', label: 'Moduli da pianificare' },
  { id: 'riepilogo', label: 'Riepilogo' },
] as const;
export type IntakeSectionId = (typeof INTAKE_SECTIONS)[number]['id'];

/** issues: problemi da risolvere · confirm: da confermare · done: completa · empty: vuota (facoltativa) */
export type IntakeSectionStatus =
  { kind: 'issues'; count: number } | { kind: 'confirm' } | { kind: 'done' } | { kind: 'empty' };

export interface IntakeMissingStep {
  label: string;
  section: IntakeSectionId;
  /** Terapia da correggere: porta al campo della riga. */
  target?: TherapyCorrectionTarget;
  /** Proposte dei documenti sui campi: porta al riepilogo delle proposte. */
  kind?: 'fieldProposals';
}

function filled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>).some((v) => filled(v));
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function intakeProgress(
  data: Record<string, unknown>,
  options: { moduleSelected?: boolean; proposalUncertain?: boolean } = {},
): { sections: Record<IntakeSectionId, IntakeSectionStatus>; missing: IntakeMissingStep[] } {
  const anagrafica = (data.anagrafica ?? {}) as Record<string, unknown>;
  const accepted = (data._accepted ?? {}) as { demographics?: boolean; therapy?: boolean };
  const demoErrors = Object.values(intakeDemographicErrors(anagrafica));
  const review = buildIntakeTherapyReview(data);
  const invalid = review.filter((row) => !row.excluded && row.issues.length > 0);
  const pendingProposals = Array.isArray(data._importProposals)
    ? (data._importProposals as Array<{ status?: string }>).filter((p) => p.status === 'pending')
        .length
    : 0;

  const missing: IntakeMissingStep[] = [];
  if (demoErrors.length)
    missing.push({
      label: `Dati anagrafici da correggere: ${demoErrors.join(', ')}`,
      section: 'anagrafica',
    });
  if (accepted.demographics !== true)
    missing.push({ label: 'Conferma i dati anagrafici', section: 'anagrafica' });
  for (const row of invalid)
    for (const issue of row.diagnostics)
      missing.push({
        label: `Terapia ${row.index}: ${issue.message}`,
        section: 'terapia',
        target: issue,
      });
  if (pendingProposals > 0)
    missing.push({
      label: `${pendingProposals === 1 ? 'Una proposta' : `${pendingProposals} proposte`} d'import da decidere`,
      section: 'terapia',
    });
  if (options.proposalUncertain)
    missing.push({ label: 'Decisione in attesa di risposta', section: 'terapia' });
  if (accepted.therapy !== true) missing.push({ label: 'Conferma la terapia', section: 'terapia' });
  // Proposte dei documenti sui campi: il backend rifiuta la conferma (409 field_proposals_pending).
  const fieldProposals = pendingFieldProposals(data).length;
  if (fieldProposals > 0)
    missing.push({
      label: proposalsLeftText(fieldProposals),
      section: 'riepilogo',
      kind: 'fieldProposals',
    });

  const count = (section: IntakeSectionId) => missing.filter((m) => m.section === section);
  const anagraficaIssues = count('anagrafica').filter((m) => !m.label.startsWith('Conferma'));
  const terapiaIssues = count('terapia').filter((m) => !m.label.startsWith('Conferma'));

  const sections: Record<IntakeSectionId, IntakeSectionStatus> = {
    anagrafica: anagraficaIssues.length
      ? { kind: 'issues', count: demoErrors.length }
      : accepted.demographics === true
        ? { kind: 'done' }
        : { kind: 'confirm' },
    ingresso: filled(data.ingresso) ? { kind: 'done' } : { kind: 'empty' },
    allergie:
      filled(data.allergie) || filled(data.allergieStatus) ? { kind: 'done' } : { kind: 'empty' },
    terapia: terapiaIssues.length
      ? { kind: 'issues', count: terapiaIssues.length }
      : accepted.therapy === true
        ? { kind: 'done' }
        : { kind: 'confirm' },
    diagnosi: filled(data.anamnesi) || filled(data.diagnosi) ? { kind: 'done' } : { kind: 'empty' },
    parametri: filled(data.parametri) ? { kind: 'done' } : { kind: 'empty' },
    moduli: options.moduleSelected ? { kind: 'done' } : { kind: 'empty' },
    riepilogo: missing.length ? { kind: 'issues', count: missing.length } : { kind: 'done' },
  };
  return { sections, missing };
}
