// Shared safe renderer for faithful section text + semantic tags (REQ-027).
//
// By default shows the EXACT text, bolds the configured tags, preserves newlines, allows
// selection/copy, highlights illegible parts, and NEVER uses dangerouslySetInnerHTML
// or any model-produced HTML. Narrative views may opt into source-range Markdown
// formatting, retaining the same validated semantic annotations and stored raw text.

import * as React from 'react';
import { buildSegments } from './segments';
import { FormattedSectionText } from './FormattedSectionText';
import { resolveStyles, type TagStyleMap } from './tagStyles';
import { withDatePrefixes } from './datePrefix';
import type { SemanticAnnotation } from './types';

export interface SemanticTaggedTextProps {
  rawText: string;
  annotations?: SemanticAnnotation[];
  /** Optional per-tag style overrides (graphic mapping is configurable). */
  styleOverrides?: TagStyleMap;
  /** Provenance shown as a tooltip on the whole block, when provided. */
  sourceTitle?: string;
  className?: string;
  /** REQ-038: bold dates that open a line/paragraph. On by default for narrative blocks. */
  datePrefix?: boolean;
  /** Opt-in presentation for narrative sections; raw import/source views stay exact. */
  formatMarkdown?: boolean;
}

export function SemanticTaggedText({
  rawText,
  annotations,
  styleOverrides,
  sourceTitle,
  className,
  datePrefix = true,
  formatMarkdown = false,
}: SemanticTaggedTextProps): React.ReactElement {
  const styles = resolveStyles(styleOverrides);
  // REQ-038: date prefixes are detected at render time from the exact text (never persisted),
  // so a manual edit recalculates them and the stored value stays plain.
  const effective = datePrefix ? withDatePrefixes(rawText, annotations) : annotations;
  const segments = buildSegments(rawText, effective, styles);
  return (
    <div
      className={`semantic-tagged-text${className ? ` ${className}` : ''}`}
      title={sourceTitle}
      // pre-wrap (set in CSS) keeps newlines; text is selectable/copyable by default.
    >
      {formatMarkdown ? <FormattedSectionText rawText={rawText} segments={segments} /> : segments.map((s, i) =>
        s.bold ? (
          <strong key={i} className={s.className}>
            {s.text}
          </strong>
        ) : s.illegible ? (
          <mark key={i} className="stt-illegible">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </div>
  );
}
