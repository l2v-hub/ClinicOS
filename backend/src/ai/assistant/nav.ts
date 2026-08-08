// Navigazione delle risposte dell'assistente: da una fonte verificabile alla schermata che la
// mostra. Modulo puro (nessun accesso al database) così che il contratto sia verificabile a unità.

import type { SourceReference } from '../gateway/types.js';

export interface NavAction {
  type: string;
  label: string;
  patientId?: string;
  sectionKey?: string;
  documentId?: string;
  recordId?: string;
  pageNumber?: number;
}

// Alcune letture di struttura sono aggregate: nessun paziente le possiede. La navigazione punta
// allora alla schermata di reparto pertinente invece che a una scheda paziente inesistente.
function facilityNav(s: SourceReference): NavAction | null {
  if (s.patientId) return null;
  switch (s.sourceType) {
    case 'THERAPY':
      return { type: 'open_therapies_today', label: 'Apri le terapie di oggi' };
    case 'APPOINTMENT':
      return { type: 'open_agenda', label: 'Apri agenda' };
    case 'CONSEGNA':
      return { type: 'open_consegne', label: 'Apri consegne', recordId: s.recordId };
    case 'OCCUPANCY':
      return { type: 'open_beds', label: 'Apri posti letto' };
    default:
      return null;
  }
}

export function navFromSource(s: SourceReference): NavAction {
  const facility = facilityNav(s);
  if (facility) return facility;
  switch (s.sourceType) {
    case 'CONSEGNA':
      return {
        type: 'open_consegne',
        label: 'Apri consegne',
        patientId: s.patientId,
        recordId: s.recordId,
      };
    case 'NARRATIVE_SECTION':
      return {
        type: 'open_section',
        label: `Apri sezione ${s.sectionKey}`,
        patientId: s.patientId,
        sectionKey: s.sectionKey,
        recordId: s.recordId,
      };
    case 'DOCUMENT':
      return {
        type: 'open_document',
        label: 'Apri documento',
        patientId: s.patientId,
        documentId: s.documentId,
        pageNumber: s.pageNumber,
      };
    case 'APPOINTMENT':
      return {
        type: 'open_appointment',
        label: 'Apri appuntamento',
        patientId: s.patientId,
        recordId: s.recordId,
      };
    case 'VITAL_SIGN':
      return {
        type: 'open_parameter',
        label: `Apri parametro ${s.label}`,
        patientId: s.patientId,
        recordId: s.recordId,
      };
    case 'THERAPY':
      return {
        type: 'open_therapy',
        label: 'Apri terapia',
        patientId: s.patientId,
        recordId: s.recordId,
      };
    default:
      return {
        type: 'open_patient',
        label: 'Apri paziente',
        patientId: s.patientId,
        recordId: s.recordId,
      };
  }
}

export function dedupeNav(nav: NavAction[]): NavAction[] {
  const seen = new Set<string>();
  const out: NavAction[] = [];
  for (const n of nav) {
    const k = `${n.type}:${n.patientId}:${n.recordId ?? n.documentId ?? n.sectionKey ?? ''}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(n);
    }
  }
  return out;
}
