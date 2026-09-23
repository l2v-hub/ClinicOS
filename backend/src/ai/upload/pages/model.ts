import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { loadAiConfig } from '../../config.js';
export type Tx = Prisma.TransactionClient;
export type Json = Record<string, unknown>;
export type Page = {
  id: string;
  documentId: string;
  sourcePageNumber: number;
  groupId: string;
  sortOrder: number;
};
export type Group = { id: string; label: string; sortOrder: number };
export type Manifest = { version: 1; groups: Group[]; pages: Page[] };
export const LIMITS = {
  maxPages: 30,
  maxSourceFiles: 30,
  maxGroups: 30,
  maxTotalBytes: 25 * 1024 * 1024,
  maxFileBytes: 25 * 1024 * 1024,
  maxFilesPerRequest: 10,
  maxRequestBytes: 25 * 1024 * 1024 + 256 * 1024,
  acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
};
export class ImportSessionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Json = {},
  ) {
    super(message);
  }
}
export const object = (v: unknown): Json =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
export function canonical(value: unknown): string {
  if (value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export function id(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value))
    throw new ImportSessionError(400, 'invalid_input', `${field} non valido`);
  return value;
}
export function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new ImportSessionError(400, 'invalid_revision', 'Revisione obbligatoria e non valida');
  return Number(value);
}
export function manifest(value: unknown): Manifest {
  const m = object(value);
  if (m.version !== 1 || !Array.isArray(m.groups) || !Array.isArray(m.pages))
    throw new ImportSessionError(409, 'session_version', 'Sessione multipagina non disponibile');
  return m as unknown as Manifest;
}
export const orderPages = (m: Manifest, groupId?: string) =>
  m.pages
    .filter((p) => !groupId || p.groupId === groupId)
    .sort((a, b) => {
      const ga = m.groups.find((g) => g.id === a.groupId)!.sortOrder;
      const gb = m.groups.find((g) => g.id === b.groupId)!.sortOrder;
      return ga - gb || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
    });
export function renumber(m: Manifest) {
  m.groups
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .forEach((g, i) => {
      g.sortOrder = i;
      orderPages(m, g.id).forEach((p, j) => {
        p.sortOrder = j;
      });
    });
  return m;
}
export function assertEditable(status: string) {
  if (['confirmed', 'expired', 'cancelled'].includes(status))
    throw new ImportSessionError(409, 'session_closed', 'Sessione non modificabile');
}
export function assertRevision(actual: number, expected: unknown) {
  if (actual !== revision(expected))
    throw new ImportSessionError(
      409,
      'revision_conflict',
      'La sessione è cambiata. Ricarica prima di riprovare.',
      { currentRevision: actual },
    );
}
export const sourcePair = (data: unknown) => object(object(data)._source);
export const jsonInput = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const renewedExpiry = () => new Date(Date.now() + loadAiConfig().jobRetentionMin * 60000);
