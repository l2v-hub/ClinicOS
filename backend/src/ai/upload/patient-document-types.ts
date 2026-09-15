/** Persistent taxonomy; retain existing exam/import codes for their other chart consumers. */
export const PATIENT_DOCUMENT_TYPES = new Set([
  'documento_identita',
  'tessera_sanitaria',
  'consenso_privacy',
  'consenso_trattamento',
  'invio_centro_medico',
  'lettera_dimissione',
  'referto',
  'prescrizione',
  'delega',
  'liberatoria_uscita',
  'consenso_contenzioni',
  'documentazione_medicazioni',
  'consenso_informato',
  'privacy',
  'regolamento',
  'carta_servizi',
  'modulo_allergie',
  'piano_terapeutico',
  'altro',
  'esame',
  'rx',
  'consulenza',
  'allegato',
  'discharge_import',
]);

export function parsePatientDocumentType(value: unknown, allowDefault = false): string | null {
  if (allowDefault && (value === undefined || value === '')) return 'allegato';
  if (typeof value !== 'string' || value.length > 64) return null;
  const type = value.trim();
  return PATIENT_DOCUMENT_TYPES.has(type) ? type : null;
}

export function documentContentDisposition(name: string): string {
  const clean =
    Array.from(name.replace(/[\x00-\x1f\x7f]/g, ''))
      .slice(0, 200)
      .map((char) => (char.length === 1 && /[\ud800-\udfff]/.test(char) ? '_' : char))
      .join('') || 'documento';
  const fallback = clean.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(clean).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16)}`,
  );
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
