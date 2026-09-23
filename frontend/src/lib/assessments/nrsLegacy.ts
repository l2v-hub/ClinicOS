export interface NrsSeverity { label: string; cls: string; color: string }
export function nrsSeverity(value: unknown): NrsSeverity | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10) return null;
  if (value === 0) return { label: 'Assente', cls: 'badge--green', color: '#16A37B' };
  if (value <= 3) return { label: 'Lieve', cls: 'badge--blue', color: '#2F6BED' };
  if (value <= 6) return { label: 'Moderato', cls: 'badge--amber', color: '#C77700' };
  return { label: 'Severo', cls: 'badge--red', color: '#DC2626' };
}
export function nrsLegacyObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function nrsLegacyText(value: unknown): string {
  if (value === undefined) return 'Non riportato';
  if (typeof value === 'string') return value || 'Stringa vuota';
  return JSON.stringify(value, null, 2) ?? 'Non riportato';
}
export function legacyPainPresent(data: Record<string, unknown>): boolean {
  return Object.hasOwn(data, 'dolore');
}
