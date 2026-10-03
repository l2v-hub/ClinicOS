// Layout helpers shared by the on-screen paper sheet (same grouping as the PDF renderer).
import type { PaperItem, PaperScale } from './definitions';
import { paperItems, type PaperAnswers } from './engine';

export function groupsOf(items: readonly PaperItem[]): PaperItem[][] {
  const groups: PaperItem[][] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && item.number && last[0].number === item.number) last.push(item);
    else groups.push([item]);
  }
  return groups;
}
/** Running total while compiling (the final result comes from the engine once complete). */
export function partialTotal(scale: PaperScale, answers: PaperAnswers): number {
  const points = (item: PaperItem) =>
    item.options.find((option) => option.value === answers[item.key])?.points ?? 0;
  const items = paperItems(scale);
  if (scale.scoring === 'npi') {
    const frequency = typeof answers.frequency === 'number' ? answers.frequency : 0;
    const severity = typeof answers.severity === 'number' ? answers.severity : 0;
    return frequency * severity;
  }
  return items
    .filter((item) => !item.excludedFromTotal)
    .reduce((sum, item) => sum + points(item), 0);
}

