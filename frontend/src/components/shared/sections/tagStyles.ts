// Configurable visual mapping for semantic tags (REQ-027 "La mappatura grafica deve
// essere configurabile"). The model never sends styling — it sends tags; the frontend
// decides how each tag looks. Override by passing a partial map to SemanticTaggedText.

import type { SemanticTag } from './types';

export interface TagStyle {
  /** Render the tagged span in bold. */
  bold: boolean;
  /** Extra CSS class (e.g. critical emphasis for allergies). */
  className?: string;
}

export const DEFAULT_TAG_STYLES: Record<SemanticTag, TagStyle> = {
  SECTION_TITLE: { bold: true, className: 'stt-title' },
  SUBSECTION_TITLE: { bold: true, className: 'stt-subtitle' },
  DATE: { bold: true, className: 'stt-date' },
  DATE_PREFIX: { bold: true, className: 'stt-date-prefix' }, // REQ-038: bold the line/paragraph-initial date
  TIME: { bold: true, className: 'stt-time' },
  TEMPORAL_MARKER: { bold: true, className: 'stt-temporal' },
  MEDICATION_NAME: { bold: true, className: 'stt-med' },
  DOSE: { bold: true, className: 'stt-dose' },
  SCHEDULE: { bold: true, className: 'stt-schedule' },
  FREQUENCY: { bold: true, className: 'stt-frequency' },
  ALLERGY_CRITICAL: { bold: true, className: 'stt-allergy-critical' },
  WARNING_TEXT: { bold: true, className: 'stt-warning' },
};

export type TagStyleMap = Partial<Record<SemanticTag, TagStyle>>;

export function resolveStyles(overrides?: TagStyleMap): Record<SemanticTag, TagStyle> {
  if (!overrides) return DEFAULT_TAG_STYLES;
  return { ...DEFAULT_TAG_STYLES, ...overrides };
}
