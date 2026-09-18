/** Only explicit source labels establish prior history. No diagnosis is inferred from a
 * disease name, a drug, or a generic anamnesis paragraph. Returned passages are verbatim. */
const PAST_LABEL =
  /^(?:anamnesi\s+(?:patologica\s+)?remota|a\.?\s*p\.?\s*r\.?|patologie\s+(?:note(?:\s+e\s+interventi\s+pregressi)?|pregresse|preesistenti|di\s+base)|(?:interventi\s+(?:chirurgici\s+)?(?:pregressi|precedenti)|pregressi\s+interventi(?:\s+chirurgici)?)|storia\s+(?:clinica|patologica)\s+pregressa|comorbidit[aà])$/i;
const OTHER_LABEL =
  /^(?:anamnesi(?:\s+patologica)?(?:\s+(?:recente|prossima|familiare|fisiologica|generale|lavorativa))?|a\.?\s*p\.?\s*p\.?|diagnosi(?:\s+(?:di dimissione|alla dimissione|conclusiva|attuali|principale|secondarie))?|allergie(?:\s+e intolleranze)?|terapia(?:\s+(?:farmacologica|domiciliare|alla dimissione|consigliata|in atto|ospedaliera))?|decorso(?:\s+(?:ospedaliero|clinico|della degenza))?|(?:procedure|prestazioni)(?:\s+e interventi)?|interventi(?:\s+(?:eseguiti|del ricovero))?|consulenze(?:\s+specialistiche)?|esami(?:\s+(?:ematici|radiologici|strumentali))?|consigli(?:\s+e controlli)?|controlli|indicazioni(?:\s+alla dimissione)?|stato\s+funzionale|abitudini(?:\s+e stile di vita)?)$/i;

export function isPastHistoryHeading(value: string): boolean {
  return PAST_LABEL.test(
    value
      .trim()
      .replace(/^#{1,6}\s*/, '')
      .replace(/[:\s]+$/, ''),
  );
}

interface HistorySplit {
  past: string;
  remaining: string;
}

export function hasClinicalPassage(text: string): boolean {
  return text.split('\n').some((line) => {
    const clean = line
      .trim()
      .replace(/^#{1,6}\s*/, '')
      .replace(/\*\*/g, '');
    if (!clean) return false;
    const label = clean.replace(/:\s*$/, '');
    return !isPastHistoryHeading(label) && !OTHER_LABEL.test(label);
  });
}

/** Splits labelled source blocks, preserving negations, qualifiers and paragraph order.
 * Unknown markdown headings close a block so a later unclassified finding is never
 * silently treated as history. Plain labels also work without intervening blank lines. */
export function splitPastHistory(text: string): HistorySplit {
  const past: string[] = [];
  const remaining: string[] = [];
  let inPast = false;
  for (const line of text.split('\n')) {
    const normalized = line
      .trim()
      .replace(/^#{1,6}\s*/, '')
      .replace(/^\*\*(.*?)\*\*$/, '$1');
    const colon = normalized.indexOf(':');
    const label = (colon < 0 ? normalized : normalized.slice(0, colon)).trim();
    const pastHeading = isPastHistoryHeading(label);
    if (pastHeading) inPast = true;
    else if (/^\s{0,3}#{1,6}\s/.test(line) || OTHER_LABEL.test(label.replace(/:\s*$/, ''))) {
      inPast = false;
    }
    (inPast ? past : remaining).push(line);
  }
  return { past: past.join('\n').trim(), remaining: remaining.join('\n').trim() };
}

export function importedPastHistory(
  narrative: {
    anamnesisText?: string;
    diagnosisText?: string;
    proceduresAndInterventionsText?: string;
  },
  rawSections: unknown,
): string {
  const passages = [
    narrative.anamnesisText,
    narrative.diagnosisText,
    narrative.proceduresAndInterventionsText,
  ]
    .map((text) => splitPastHistory(text ?? '').past)
    .filter(Boolean);
  // Some extraction paths keep the heading separately from rawText. Use it only if
  // it explicitly establishes prior history, and still respect later section boundaries.
  if (rawSections && typeof rawSections === 'object' && 'sections' in rawSections) {
    const sections = (rawSections as { sections?: unknown }).sections;
    if (Array.isArray(sections)) {
      for (const section of sections) {
        if (!section || typeof section !== 'object') continue;
        const { detectedHeading, rawText } = section as Record<string, unknown>;
        if (typeof rawText !== 'string' || typeof detectedHeading !== 'string') continue;
        if (!isPastHistoryHeading(detectedHeading) || !rawText.trim()) continue;
        const extracted = splitPastHistory(
          isPastHistoryHeading(rawText.split('\n')[0]) ? rawText : `${detectedHeading}\n${rawText}`,
        ).past;
        if (extracted && !passages.some((p) => p.includes(rawText.trim())))
          passages.push(extracted);
      }
    }
  }
  return [...new Set(passages.filter(hasClinicalPassage))].join('\n\n');
}
