import type { TherapyFieldIssue } from '../../operator/cartella/therapyFieldFeedback';

/** Source indices are never selected-payload ordinals or visible row numbers. */
export interface TherapyCorrectionTarget {
  type: 'import' | 'manual';
  index: number;
  field: TherapyFieldIssue['field'];
  scheduleIndex?: number;
}

export type IntakeTherapyDiagnostic = TherapyFieldIssue & TherapyCorrectionTarget;

export function focusTherapyCorrection(root: ParentNode, target: TherapyCorrectionTarget) {
  const row = root.querySelector<HTMLElement>(
    `[data-therapy-source="${target.type}"][data-therapy-index="${target.index}"]`,
  );
  const schedule =
    target.scheduleIndex === undefined ? '' : `[data-therapy-schedule="${target.scheduleIndex}"]`;
  const control = row?.querySelector<HTMLElement>(
    `[data-therapy-field="${target.field}"]${schedule}`,
  );
  if (!control) return false;
  control.focus({ preventScroll: true });
  control.scrollIntoView({ block: 'center' });
  return true;
}
