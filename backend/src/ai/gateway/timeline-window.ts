import type { SourceReference } from './types.js';

export const MAX_TIMELINE_EVENTS = 100;
export const TIMELINE_LOOKAHEAD = MAX_TIMELINE_EVENTS + 1;
export const MAX_TIMELINE_SOURCE_TEXT = 240;
export const MAX_TIMELINE_FIELD_TEXT = 160;
export const MAX_TIMELINE_TIMESTAMP_LENGTH = 64;
const TIMELINE_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export interface TimelineEvent {
  at: string;
  kind: string;
  label: string;
}

export interface TimelineCandidate {
  event: TimelineEvent;
  source: SourceReference;
}

export interface TimelineVitalRow {
  recordId: unknown;
  id: unknown;
  recordedAt: unknown;
  label: unknown;
  value: unknown;
}

function boundedText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TIMELINE_FIELD_TEXT) : fallback;
}

function validTimelineTimestamp(value: string): boolean {
  const match = TIMELINE_TIMESTAMP.exec(value);
  if (!match) return false;
  const [, yearRaw, monthRaw, dayRaw, hourRaw = '0', minuteRaw = '0', secondRaw = '0'] = match;
  const [year, month, day, hour, minute, second] = [
    yearRaw,
    monthRaw,
    dayRaw,
    hourRaw,
    minuteRaw,
    secondRaw,
  ].map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day &&
    calendar.getUTCHours() === hour &&
    calendar.getUTCMinutes() === minute &&
    calendar.getUTCSeconds() === second &&
    Number.isFinite(Date.parse(value))
  );
}

export function normalizeTimelineVital(
  row: TimelineVitalRow,
): { recordId: string; at: string; sourceLabel: string; label: string } | null {
  if (
    typeof row.recordedAt !== 'string' ||
    row.recordedAt.length === 0 ||
    row.recordedAt.length > MAX_TIMELINE_TIMESTAMP_LENGTH ||
    !validTimelineTimestamp(row.recordedAt)
  ) {
    return null;
  }
  const recordId = boundedText(row.id) || boundedText(row.recordId);
  if (!recordId) return null;
  const sourceLabel = boundedText(row.label, 'vital') || 'vital';
  const value = boundedText(row.value);
  return {
    recordId,
    at: row.recordedAt,
    sourceLabel,
    label: value ? `${sourceLabel} ${value}` : sourceLabel,
  };
}

export function boundTimeline(
  candidates: readonly TimelineCandidate[],
  sourceTruncated = false,
): { data: TimelineEvent[]; sourceRefs: SourceReference[]; truncated: boolean } {
  const sorted = [...candidates].sort((left, right) => {
    const byTime = right.event.at.localeCompare(left.event.at);
    if (byTime !== 0) return byTime;
    const byKind = left.event.kind.localeCompare(right.event.kind);
    if (byKind !== 0) return byKind;
    return right.source.recordId.localeCompare(left.source.recordId);
  });
  const visible = sorted.slice(0, MAX_TIMELINE_EVENTS);
  return {
    data: visible.map((candidate) => candidate.event),
    sourceRefs: visible.map((candidate) => candidate.source),
    truncated: sourceTruncated || sorted.length > MAX_TIMELINE_EVENTS,
  };
}
