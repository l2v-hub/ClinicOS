import {
  emptyTinettiAnswers,
  TINETTI_ITEMS,
  validTinettiScore,
  tinettiResult,
} from './tinettiDefinition';
export function legacyTinetti(record: unknown) {
  const source =
    record && typeof record === 'object' && !Array.isArray(record)
      ? (record as Record<string, unknown>)
      : {};
  const answers = emptyTinettiAnswers();
  const items = TINETTI_ITEMS.map((item) => {
    const raw = source[item.id];
    const valid = validTinettiScore(item.id, raw);
    if (valid) (answers as Record<string, unknown>)[item.id] = raw;
    return {
      ...item,
      raw,
      valid,
      description: valid
        ? item.options[raw]
        : raw === undefined || raw === null || raw === -1
          ? 'Non valutato'
          : 'Dato non valido',
    };
  });
  return {
    source,
    items,
    answers,
    result: tinettiResult(answers),
    complete: items.every((item) => item.valid),
  };
}
export function legacyTinettiText(value: unknown) {
  if (value === undefined || value === null || value === '') return 'Non disponibile';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
