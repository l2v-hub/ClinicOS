// Shared safe renderer for faithful section text + semantic tags (REQ-027).
//
// Shows the EXACT text, bolds the configured tags, preserves newlines, allows
// selection/copy, highlights illegible parts, and NEVER uses dangerouslySetInnerHTML
// or any model-produced HTML. Bold spans come from offset annotations only.

import { buildSegments } from './segments';
import { resolveStyles, type TagStyleMap } from './tagStyles';
import type { SemanticAnnotation } from './types';

export interface SemanticTaggedTextProps {
  rawText: string;
  annotations?: SemanticAnnotation[];
  /** Optional per-tag style overrides (graphic mapping is configurable). */
  styleOverrides?: TagStyleMap;
  /** Provenance shown as a tooltip on the whole block, when provided. */
  sourceTitle?: string;
  className?: string;
}

export function SemanticTaggedText({ rawText, annotations, styleOverrides, sourceTitle, className }: SemanticTaggedTextProps) {
  const styles = resolveStyles(styleOverrides);
  const segments = buildSegments(rawText, annotations, styles);
  return (
    <div
      className={`semantic-tagged-text${className ? ` ${className}` : ''}`}
      title={sourceTitle}
      // pre-wrap (set in CSS) keeps newlines; text is selectable/copyable by default.
    >
      {segments.map((s, i) =>
        s.bold ? (
          <strong key={i} className={s.className}>{s.text}</strong>
        ) : s.illegible ? (
          <mark key={i} className="stt-illegible">{s.text}</mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </div>
  );
}
