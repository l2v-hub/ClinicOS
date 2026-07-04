// REQ-039: deterministic, backend-side filters. ALL numeric comparisons, ranges and text matching
// happen here — never in the model. Pure functions over plain data → fully unit-testable.

/** Accent-insensitive, case-insensitive substring test. */
export function textIncludes(haystack: unknown, needle: string): boolean {
  if (typeof haystack !== 'string' || !needle) return false;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return norm(haystack).includes(norm(needle));
}

/** 016 F0: ogni token della query deve comparire in nome o cognome (ordine indifferente).
 *  Permette la risoluzione «Elena Moretti» / «Moretti Elena» / «Rossi» contro i campi separati. */
export function nameMatchesAllTokens(firstName: unknown, lastName: unknown, query: string): boolean {
  const tokens = (query || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => textIncludes(firstName, t) || textIncludes(lastName, t));
}

/** Numeric value of a vital. "PA 130/85" → systolic 130; plain "78" → 78; "36.5" → 36.5. */
export function vitalNumericValue(etichetta: string, valore: string): { systolic?: number; diastolic?: number; value?: number } {
  const v = (valore ?? '').trim();
  const pa = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(v);
  if (pa) return { systolic: parseInt(pa[1], 10), diastolic: parseInt(pa[2], 10), value: parseInt(pa[1], 10) };
  const num = parseFloat(v.replace(',', '.'));
  return Number.isFinite(num) ? { value: num } : {};
}

export interface VitalItem { id?: string; etichetta?: string; valore?: string; unita?: string; stato?: string; rilevato?: string }

/** Filter a patient's vital readings by label / systolic-range / value-range / date-range. */
export function filterVitals(
  vitals: VitalItem[],
  q: { label?: string; systolicMin?: number; systolicMax?: number; valueMin?: number; valueMax?: number; from?: string; to?: string },
): VitalItem[] {
  return (vitals ?? []).filter((it) => {
    if (!it || typeof it !== 'object') return false;
    if (q.label && (it.etichetta ?? '').toUpperCase() !== q.label.toUpperCase()) return false;
    const n = vitalNumericValue(it.etichetta ?? '', it.valore ?? '');
    if (q.systolicMin != null && !(typeof n.systolic === 'number' && n.systolic >= q.systolicMin)) return false;
    if (q.systolicMax != null && !(typeof n.systolic === 'number' && n.systolic <= q.systolicMax)) return false;
    if (q.valueMin != null && !(typeof n.value === 'number' && n.value >= q.valueMin)) return false;
    if (q.valueMax != null && !(typeof n.value === 'number' && n.value <= q.valueMax)) return false;
    const d = it.rilevato ?? '';
    if (q.from && d && d < q.from) return false;
    if (q.to && d && d > q.to) return false;
    return true;
  });
}

export interface AllergyItem { id?: string; allergene?: string; reazione?: string; gravita?: string; documentato?: string }
export interface TherapyItem { id?: string; descrizione?: string; tipo?: string; stato?: string; dataInizio?: string }

/** The cartella JSON shape we read (everything optional/defensive). */
export interface CartellaData {
  allergie?: AllergyItem[];
  terapie?: TherapyItem[];
  parametriVitali?: VitalItem[];
  diagnosi?: Array<{ id?: string; descrizione?: string }>;
  [k: string]: unknown;
}

/** First allergy whose allergene matches; null if none. */
export function matchAllergy(cartella: CartellaData, allergen: string): AllergyItem | null {
  for (const a of cartella.allergie ?? []) if (textIncludes(a?.allergene, allergen)) return a;
  return null;
}

/** First therapy whose description matches; null if none. */
export function matchTherapy(cartella: CartellaData, therapy: string): TherapyItem | null {
  for (const t of cartella.terapie ?? []) if (textIncludes(t?.descrizione, therapy)) return t;
  return null;
}

/** Coerce unknown JSON into a defensive CartellaData. */
export function asCartella(data: unknown): CartellaData {
  return (data && typeof data === 'object' ? (data as CartellaData) : {});
}
