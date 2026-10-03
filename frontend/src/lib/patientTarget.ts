// Direct access (UX cycle 2026-10-03): the single description of «where inside a patient's chart»
// a navigation must land. Every entry point (Turno, dashboards, lists, notifications, Assistant,
// signals, diary links) builds one of these instead of opening the chart's first page.
// Owner rule: land on the exact useful information — section, sub-view and item — never on a page
// that needs further clicks.

import type { TabId } from '../components/operator/tabGroups';

/** Sub-views of the patient's Terapia section (TerapiaFarmacologicaTab). */
export type TherapySubView =
  'attivi' | 'programmazione' | 'calendario' | 'giornaliere' | 'storico' | 'sospese';

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
}

/** Request object handed to the chart; `requestId` changes on every navigation (same target twice). */
export interface PatientTargetRequest extends PatientTarget {
  requestId: number;
}
