export interface TextRange { start: number; end: number }
export interface ListItemRange extends TextRange { marker: string }
export type MarkdownBlock =
  | ({ kind: 'paragraph' } & TextRange)
  | ({ kind: 'literal' } & TextRange)
  | ({ kind: 'heading'; level: number } & TextRange)
  | { kind: 'list'; ordered: boolean; items: ListItemRange[] };

/** Structural ranges into the unmodified source: never normalize line endings or
 * rewrite clinical content before applying semantic annotation offsets. */
export function sectionMarkdownBlocks(raw: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: (TextRange & { kind: 'paragraph' | 'literal' }) | undefined;
  let list: Extract<MarkdownBlock, { kind: 'list' }> | undefined;
  let fence: { marker: string; size: number; block: TextRange } | undefined;

  for (const match of raw.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)) {
    if (!match[0]) break;
    const line = match[1];
    const start = match.index;
    const end = start + line.length;
    if (fence) {
      fence.block.end = end;
      const closing = line.trim();
      if (closing.length >= fence.size && [...closing].every((char) => char === fence!.marker)) {
        fence = undefined;
      }
      continue;
    }
    const openingFence = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
    if (openingFence) {
      const block = { kind: 'literal' as const, start, end };
      blocks.push(block);
      fence = { marker: openingFence[1][0], size: openingFence[1].length, block };
      paragraph = undefined;
      list = undefined;
      continue;
    }
    if (!line.trim()) {
      paragraph = undefined;
      list = undefined;
      continue;
    }
    const heading = line.match(/^[ \t]{0,3}(#{1,6})[ \t]+/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, start: start + heading[0].length, end });
      paragraph = undefined;
      list = undefined;
      continue;
    }

    // A spaced minus before a numeric value is clinical text, not a bullet.
    // A date after a bullet (e.g. - 12/03/2026) is still a list item.
    const datedBullet = /^[ \t]*-[ \t]+\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b/.test(line);
    const negativeValue = /^[ \t]*-[ \t]+(?:\d|[.,]\d)/.test(line) && !datedBullet;
    const numbered = line.match(/^[ \t]{0,3}(\d+[.)])[ \t]+/);
    const bullet = !negativeValue && (
      line.match(/^[ \t]{0,3}([-*•])[ \t]+/) ??
      line.match(/^[ \t]{0,3}([-•])(?=\p{L})/u)
    );
    const item = numbered || bullet;
    if (item) {
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) {
        list = { kind: 'list', ordered, items: [] };
        blocks.push(list);
      }
      list.items.push({ marker: item[1], start: start + item[0].length, end });
      paragraph = undefined;
      continue;
    }
    if (negativeValue || /^[ \t]*---/.test(line)) list = undefined;
    if (list) {
      list.items[list.items.length - 1].end = end;
    } else if (paragraph) {
      paragraph.end = end;
    } else {
      paragraph = { kind: 'paragraph', start, end };
      blocks.push(paragraph);
    }
  }
  return blocks;
}
