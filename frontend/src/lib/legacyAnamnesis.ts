import type { Anamnesi } from '../types';

// Issue #245 remediation — the structured Anamnesi editor (chart tab) was removed as a
// duplicate surface (dedup vs "Sezioni Cliniche (testo)"), but existing patients may still
// carry populated `Cartella.data.anamnesi` from intake. This module is the pure logic behind
// a read-only legacy view so that data never becomes silently inaccessible (Codex #245 finding).

export type LegacyAnamnesisRow = { label: string; value: string };

// Field order mirrors the former AnamnesisEditor SECTIONS ordering. `familiare` and `lavorativa`
// are legacy-only (removed from intake per BUG-054/#92) but must still surface if a pre-existing
// record has them populated.
const FIELD_LABELS: { key: keyof Anamnesi; label: string }[] = [
  { key: 'patologicaProssima', label: 'Anamnesi generale' },
  { key: 'patologicaRemota', label: 'Patologie note e interventi pregressi' },
  { key: 'fisiologica', label: 'Stato funzionale' },
  { key: 'familiare', label: 'Anamnesi familiare' },
  { key: 'lavorativa', label: 'Contesto lavorativo e sociale' },
  { key: 'abitudini', label: 'Abitudini e stile di vita' },
  { key: 'note', label: 'Note aggiuntive' },
];

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** True when the legacy anamnesi object has at least one populated field worth showing. */
export function hasLegacyAnamnesis(anamnesi: Partial<Anamnesi> | null | undefined): boolean {
  if (!anamnesi) return false;
  return FIELD_LABELS.some(({ key }) => isNonEmpty(anamnesi[key]));
}

/** Maps a legacy anamnesi object to ordered, non-empty label/value rows for read-only display. */
export function legacyAnamnesisRows(anamnesi: Partial<Anamnesi> | null | undefined): LegacyAnamnesisRow[] {
  if (!anamnesi) return [];
  return FIELD_LABELS
    .filter(({ key }) => isNonEmpty(anamnesi[key]))
    .map(({ key, label }) => ({ label, value: String(anamnesi[key]) }));
}
