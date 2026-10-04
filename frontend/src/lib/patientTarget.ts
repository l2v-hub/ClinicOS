// Direct access (UX cycle 2026-10-03): the single description of «where inside a patient's chart»
// a navigation must land. Every entry point (Turno, dashboards, lists, notifications, Assistant,
// signals, diary links) builds one of these instead of opening the chart's first page.
// Owner rule: land on the exact useful information — section, sub-view and item — never on a page
// that needs further clicks.

import type { TabId } from '../components/operator/tabGroups';

/** Views of the patient's Terapia section (UX cycle 2, W5): Calendario is the default; Storico
 *  shows how it went; Nuova terapia registers a prescription (therapy.create only). */
export type TherapyView = 'calendario' | 'attivi' | 'storico' | 'nuova';
/** Sub-views of the cycle-1 Terapia layout. Still accepted (links already in URLs, history.state,
 *  Assistant and signal builders) and mapped to the new views by `lib/therapyView.ts`:
 *  attivi/programmazione → Calendario with the drug opened, giornaliere → Calendario on the dose,
 *  sospese → Storico filtered on suspended/concluded prescriptions. */
export type LegacyTherapySubView = 'attivi' | 'programmazione' | 'giornaliere' | 'sospese';
/** Sub-view carried by a therapy target (new views + backward-compatible legacy values). */
export type TherapySubView = TherapyView | LegacyTherapySubView;

/** Focus inside the Terapia section: sub-view, drug, day and administration band. */
export interface TherapyTarget {
  subView?: TherapySubView;
  /** PatientTherapy id to highlight / expand (administration panel opens on it). */
  therapyId?: string;
  /** Facility-local day YYYY-MM-DD (calendar / daily administrations). */
  date?: string;
  /** Administration band or scheduled time as the slots API reports it (e.g. "mattina" / "08:00"). */
  fascia?: string;
}

/** Full landing target inside a patient's chart. */
export interface PatientTarget {
  patientId: string;
  tab?: TabId;
  therapy?: TherapyTarget;
  /** Handover (Consegna) id to bring into view and highlight inside the chart. */
  consegnaId?: string;
  /** Diary entry id to bring into view and highlight. */
  diaryEntryId?: string;
  /** Document / archive item and page. */
  documentId?: string;
  pageNumber?: number;
  /** Assessment record id (scales). */
  assessmentId?: string;
  /** Named block inside the section (`[data-chart-anchor]`), e.g. the allergy table in Clinica. */
  anchor?: 'allergie';
}

/** Request object handed to the chart; `requestId` changes on every navigation (same target twice). */
export interface PatientTargetRequest extends PatientTarget {
  requestId: number;
}
