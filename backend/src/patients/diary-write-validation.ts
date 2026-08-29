export type DiaryPriority = 'normale' | 'importante' | 'urgente';
export type DiaryStatus = 'aperta' | 'completata' | 'da_rivedere';

export interface DiaryCreateInput {
  title: string | null;
  content: string;
  priority: DiaryPriority;
  status: DiaryStatus;
  entryDateTime: string;
  category: string | null;
}

export type DiaryPatchInput = Partial<DiaryCreateInput>;

export const MAX_DIARY_CONTENT_BYTES = 16 * 1024;
export const MAX_DIARY_TITLE_LENGTH = 200;
export const MAX_DIARY_CATEGORY_LENGTH = 80;
export const DIARY_TIME_ZONE = 'Europe/Rome';

const CREATE_KEYS = new Set([
  'title',
  'content',
  'priority',
  'status',
  'entryDateTime',
  'category',
  // Authorship is accepted only for backward compatibility and then discarded. The route and
  // assistant always derive it from the authenticated actor.
  'authorType',
  'authorName',
]);
const PATCH_KEYS = new Set(CREATE_KEYS);
const PRIORITIES = new Set<DiaryPriority>(['normale', 'importante', 'urgente']);
const STATUSES = new Set<DiaryStatus>(['aperta', 'completata', 'da_rivedere']);
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const ZONED_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/;
const FACILITY_DATE_TIME = new Intl.DateTimeFormat('en-CA', {
  timeZone: DIARY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export class DiaryWriteInputError extends Error {}

function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DiaryWriteInputError('Corpo richiesta non valido');
  }
  return value as Record<string, unknown>;
}

function rejectUnknown(body: Record<string, unknown>, allowed: Set<string>): void {
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) throw new DiaryWriteInputError(`Campo non consentito: ${unknown}`);
}

function content(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new DiaryWriteInputError('content obbligatorio');
  }
  const normalized = value.trim();
  if (Buffer.byteLength(normalized, 'utf8') > MAX_DIARY_CONTENT_BYTES) {
    throw new DiaryWriteInputError(`content supera ${MAX_DIARY_CONTENT_BYTES} byte`);
  }
  return normalized;
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new DiaryWriteInputError(`${field} non valido`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new DiaryWriteInputError(`${field} supera ${maxLength} caratteri`);
  }
  return normalized;
}

function priority(value: unknown): DiaryPriority {
  if (value === undefined) return 'normale';
  if (typeof value !== 'string' || !PRIORITIES.has(value as DiaryPriority)) {
    throw new DiaryWriteInputError('priority non valida');
  }
  return value as DiaryPriority;
}

function status(value: unknown): DiaryStatus {
  if (value === undefined) return 'aperta';
  if (typeof value !== 'string' || !STATUSES.has(value as DiaryStatus)) {
    throw new DiaryWriteInputError('status non valido');
  }
  return value as DiaryStatus;
}

function facilityLocalMinute(value: Date): string {
  const parts = Object.fromEntries(
    FACILITY_DATE_TIME.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function entryDateTime(value: unknown): string {
  if (typeof value !== 'string') throw new DiaryWriteInputError('entryDateTime obbligatorio');
  const normalized = value.trim();
  const match = ISO_DATE_TIME.exec(normalized);
  if (!match) throw new DiaryWriteInputError('entryDateTime non valida');
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw = '0'] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const validCalendar =
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day &&
    calendar.getUTCHours() === hour &&
    calendar.getUTCMinutes() === minute &&
    calendar.getUTCSeconds() === second;
  const parsed = Date.parse(normalized);
  if (!validCalendar || !Number.isFinite(parsed)) {
    throw new DiaryWriteInputError('entryDateTime non valida');
  }
  // The column and its keyset cursor are ordered lexicographically. Persist exactly one facility
  // wall-clock representation so browser datetime-local and assistant UTC writes remain sortable.
  return ZONED_SUFFIX.test(normalized)
    ? facilityLocalMinute(new Date(parsed))
    : `${yearRaw}-${monthRaw}-${dayRaw}T${hourRaw}:${minuteRaw}`;
}

export function parseDiaryCreateBody(value: unknown): DiaryCreateInput {
  const body = bodyObject(value);
  rejectUnknown(body, CREATE_KEYS);
  return {
    title: optionalText(body.title, 'title', MAX_DIARY_TITLE_LENGTH),
    content: content(body.content),
    priority: priority(body.priority),
    status: status(body.status),
    entryDateTime: entryDateTime(body.entryDateTime),
    category: optionalText(body.category, 'category', MAX_DIARY_CATEGORY_LENGTH),
  };
}

export function parseDiaryPatchBody(value: unknown): DiaryPatchInput {
  const body = bodyObject(value);
  rejectUnknown(body, PATCH_KEYS);
  const patch: DiaryPatchInput = {};
  if (body.title !== undefined) {
    patch.title = optionalText(body.title, 'title', MAX_DIARY_TITLE_LENGTH);
  }
  if (body.content !== undefined) patch.content = content(body.content);
  if (body.priority !== undefined) patch.priority = priority(body.priority);
  if (body.status !== undefined) patch.status = status(body.status);
  if (body.entryDateTime !== undefined) patch.entryDateTime = entryDateTime(body.entryDateTime);
  if (body.category !== undefined) {
    patch.category = optionalText(body.category, 'category', MAX_DIARY_CATEGORY_LENGTH);
  }
  if (Object.keys(patch).length === 0) {
    throw new DiaryWriteInputError('Nessuna modifica valida');
  }
  return patch;
}
