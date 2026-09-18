import { legacyAnamnesisRows } from './legacyAnamnesis';
import type { Anamnesi } from '../types';

/** Hidden legacy fields remain readable without recreating the removed editing cards. */
export function previousClinicalText(anamnesi: Record<string, unknown>) {
  const previous = Object.fromEntries(
    Object.entries(anamnesi).filter(([key]) => key !== 'patologicaRemota' && key !== 'note'),
  );
  return legacyAnamnesisRows(previous as Partial<Anamnesi>);
}

/** Old imports stored a combined anamnesis block. Offer only an explicitly labelled
 * remote-history passage for operator review; never auto-save it or replace entered text.
 * This intentionally narrow recovery path does not classify unlabelled clinical prose. */
export function legacyPastHistoryProposal(anamnesi: Record<string, unknown>): string {
  if (typeof anamnesi.patologicaRemota === 'string' && anamnesi.patologicaRemota.trim()) return '';
  if (typeof anamnesi.patologicaProssima !== 'string') return '';
  const lines = anamnesi.patologicaProssima.split('\n');
  const selected: string[] = [];
  let collecting = false;
  for (const line of lines) {
    const label = line
      .trim()
      .replace(/^#{1,6}\s+/, '')
      .replace(/\*\*/g, '')
      .split(':')[0]
      .trim();
    if (/^(?:anamnesi\s+(?:patologica\s+)?remota|a\.?\s*p\.?\s*r\.?)$/i.test(label)) {
      collecting = true;
    } else if (
      /^\s{0,3}#{1,6}\s/.test(line) ||
      /^(?:anamnesi(?:\s+patologica)?(?:\s+(?:recente|prossima|familiare|fisiologica|generale))?|diagnosi(?:\s+(?:di dimissione|alla dimissione|attuali|principale))?|terapia(?:\s+(?:domiciliare|farmacologica|alla dimissione|in atto))?|allergie|decorso(?:\s+(?:ospedaliero|clinico))?|interventi(?:\s+eseguiti)?|procedure(?:\s+e interventi)?|consulenze(?:\s+specialistiche)?|esami(?:\s+(?:ematici|radiologici|strumentali))?)$/i.test(
        label,
      )
    )
      collecting = false;
    if (collecting) selected.push(line);
  }
  return selected.join('\n').trim();
}

/** Formatting-only comparison: no stemming, substrings or medical equivalence, so
 * negative findings and distinct manually edited descriptions cannot suppress one another. */
export function clinicalTextKey(text: string): string {
  return text
    .replace(
      /^\s*#{1,6}\s*(?:diagnosi(?:\s+(?:di|alla)\s+dimissione)?|anamnesi\s+(?:patologica\s+)?remota)\s*:?\s*$/gim,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('it');
}

export function uniqueClinicalTexts(texts: string[], alreadyPresent: string[] = []): string[] {
  const seen = new Set(alreadyPresent.map(clinicalTextKey).filter(Boolean));
  return texts.filter((text) => {
    const key = clinicalTextKey(text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
