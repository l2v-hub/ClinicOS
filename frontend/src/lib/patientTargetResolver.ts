// Direct access (UX cycle 2026-10-03): from a domain signal shown somewhere in the app (a late
// dose, a drug anomaly, a handover, an allergy chip…) to the exact place inside the patient's
// chart where that information lives. Pure: no React, no fetch — the caller passes the role's
// capability check so a link never lands on a section the role cannot read.
import { chartSectionAllowed, chartSectionOf, type TabId } from '../components/operator/tabGroups';
import type { IndicatoreRischio, TipoIntervento } from '../types';
import type { PatientTarget, TherapySubView } from './patientTarget';

/** Where to land, without the patient: a bare section or a full target. */
export type PatientLanding = TabId | Omit<PatientTarget, 'patientId'>;

export type PatientSignal =
  | {
      kind: 'therapy-late' | 'therapy-due' | 'therapy-unscheduled';
      patientId: string;
      therapyId?: string;
      date?: string;
      fascia?: string;
    }
  | { kind: 'drug-anomaly'; patientId: string; therapyId?: string }
  | { kind: 'handover'; patientId: string; consegnaId?: string }
  | { kind: 'allergy'; patientId: string }
  | { kind: 'critical-vitals'; patientId: string }
  | { kind: 'risk'; patientId: string; riskType?: IndicatoreRischio['tipo'] }
  | { kind: 'appointment'; patientId: string; tipoIntervento?: TipoIntervento | string }
  | { kind: 'note'; patientId: string }
  | { kind: 'overview'; patientId: string };

/** The assessment scale behind a risk type; no scale → the Moduli catalog. */
export const RISK_SCALE_TAB: Partial<Record<IndicatoreRischio['tipo'], TabId>> = {
  caduta: 'tinetti',
  lesioni_pressione: 'braden',
  nutrizione: 'mna',
  dolore: 'painad',
};

/** Chart part that documents an appointment of that kind. */
export const APPOINTMENT_TAB: Record<string, TabId> = {
  visita: 'note',
  controllo: 'note',
  'follow-up': 'note',
  altro: 'note',
  consulto: 'esami-consulenze',
  procedura: 'esami-consulenze',
  urgenza: 'parametri',
};

function therapyTarget(
  patientId: string,
  subView: TherapySubView,
  extra: { therapyId?: string; date?: string; fascia?: string },
): PatientTarget {
  const therapy = { subView, ...definedOnly(extra) };
  return { patientId, tab: 'terapia-farmacologica', therapy };
}

function definedOnly<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;
}

/** Signal → landing target (before the capability check). */
export function signalTarget(signal: PatientSignal): PatientTarget {
  const { patientId } = signal;
  switch (signal.kind) {
    case 'therapy-late':
    case 'therapy-due':
    case 'therapy-unscheduled':
      // The dose lives in the Calendario (W5): day + band, with its actions open.
      return therapyTarget(patientId, 'calendario', {
        therapyId: signal.therapyId,
        date: signal.date,
        fascia: signal.fascia,
      });
    case 'drug-anomaly':
      // The drug to fix: its prescription detail opened above the Calendario.
      return therapyTarget(patientId, 'calendario', { therapyId: signal.therapyId });
    case 'handover':
      return signal.consegnaId
        ? { patientId, tab: 'consegne', consegnaId: signal.consegnaId }
        : { patientId, tab: 'consegne' };
    case 'allergy':
      return { patientId, tab: 'diagnosi', anchor: 'allergie' };
    case 'critical-vitals':
      return { patientId, tab: 'parametri' };
    case 'risk':
      return { patientId, tab: (signal.riskType && RISK_SCALE_TAB[signal.riskType]) || 'moduli' };
    case 'appointment':
      return {
        patientId,
        tab: (signal.tipoIntervento && APPOINTMENT_TAB[signal.tipoIntervento]) || 'note',
      };
    case 'note':
      return { patientId, tab: 'note' };
    case 'overview':
      return { patientId };
  }
}

/** Keeps the target only where the role can read it; otherwise the closest permitted place
 *  (the chart overview). The server still authorizes every read: this only avoids dead ends. */
export function permittedTarget(
  target: PatientTarget,
  can: (capability: string) => boolean,
): PatientTarget {
  if (!target.tab) return target;
  if (chartSectionAllowed(chartSectionOf(target.tab), can)) return target;
  return { patientId: target.patientId };
}

/** Signal → target the role may open. */
export function resolvePatientTarget(
  signal: PatientSignal,
  can: (capability: string) => boolean = () => true,
): PatientTarget {
  return permittedTarget(signalTarget(signal), can);
}

/** Bare tab or partial target → full target for `patientId`. */
export function landingTarget(patientId: string, landing?: PatientLanding): PatientTarget {
  if (!landing) return { patientId };
  if (typeof landing === 'string') return { patientId, tab: landing };
  return { ...landing, patientId };
}

/** The part of the target without the patient (what components hand to `onSelectPaziente`). */
export function landingOf(signal: PatientSignal): Omit<PatientTarget, 'patientId'> {
  const { patientId: _omit, ...rest } = signalTarget(signal);
  void _omit;
  return rest;
}

/** A scheduled dose (dashboard deadline, Turno card, Adesso row) → its signal. */
export function doseSignal(row: {
  patientId: string;
  therapyId?: string;
  data?: string;
  fascia?: string;
  minuti?: number | null;
}): PatientSignal {
  const kind =
    row.minuti === null || row.minuti === undefined
      ? 'therapy-unscheduled'
      : row.minuti < 0
        ? 'therapy-late'
        : 'therapy-due';
  return {
    kind,
    patientId: row.patientId,
    therapyId: row.therapyId,
    date: row.data,
    fascia: row.fascia,
  };
}

/** Direct access: an appointment's patient name opens the chart part that documents that kind of
 *  appointment (visit → Note e visite, consult → Esami e consulenze). */
export function appointmentLanding(appointment: {
  pazienteId?: string | null;
  tipoIntervento?: string;
}): PatientLanding | undefined {
  if (!appointment.pazienteId) return undefined;
  return landingOf({
    kind: 'appointment',
    patientId: appointment.pazienteId,
    tipoIntervento: appointment.tipoIntervento,
  });
}
