import * as React from 'react';
import type { Segment } from './segments';
import { sectionMarkdownBlocks, type TextRange } from './sectionMarkdown';
import './FormattedSectionText.css';

interface IndexedSegment extends Segment, TextRange {}

/** Match validated semantic segments to source ranges after hiding only supported
 * Markdown delimiters. Binary lookup avoids scanning all tags for every paragraph. */
export function FormattedSectionText({ rawText, segments }: { rawText: string; segments: Segment[] }) {
  let offset = 0;
  const indexed: IndexedSegment[] = segments.map((segment) => {
    const start = offset;
    offset += segment.text.length;
    return { ...segment, start, end: offset };
  });

  function range(start: number, end: number): React.ReactNode[] {
    let low = 0;
    let high = indexed.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (indexed[mid].end <= start) low = mid + 1;
      else high = mid;
    }
    const nodes: React.ReactNode[] = [];
    for (let i = low; i < indexed.length && indexed[i].start < end; i++) {
      const segment = indexed[i];
      const text = rawText.slice(Math.max(start, segment.start), Math.min(end, segment.end));
      nodes.push(segment.bold
        ? <strong key={i} className={segment.className}>{text}</strong>
        : segment.illegible
          ? <mark key={i} className="stt-illegible">{text}</mark>
          : <span key={i}>{text}</span>);
    }
    return nodes;
  }

  function inline({ start, end }: TextRange): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let cursor = start;
    for (const match of rawText.slice(start, end).matchAll(/\*\*([^*\r\n]+)\*\*/g)) {
      const at = start + match.index;
      if (at > cursor) nodes.push(<React.Fragment key={cursor}>{range(cursor, at)}</React.Fragment>);
      nodes.push(<strong key={at}>{range(at + 2, at + match[0].length - 2)}</strong>);
      cursor = at + match[0].length;
    }
    if (cursor < end) nodes.push(<React.Fragment key={cursor}>{range(cursor, end)}</React.Fragment>);
    return nodes;
  }

  return (
    <div className="section-markdown">
      {sectionMarkdownBlocks(rawText).map((block, index) => {
        if (block.kind === 'heading') {
          const Heading = block.level === 1 ? 'h4' : block.level === 2 ? 'h5' : 'h6';
          return <Heading key={index}>{inline(block)}</Heading>;
        }
        if (block.kind === 'paragraph') return <p key={index}>{inline(block)}</p>;
        if (block.kind === 'literal') return <p key={index}>{range(block.start, block.end)}</p>;
        const List = block.ordered ? 'ol' : 'ul';
        return (
          <List key={index} className={block.ordered ? 'section-markdown__numbered' : undefined}>
            {block.items.map((item) => (
              <li key={item.start}>
                {block.ordered && <span className="section-markdown__number">{item.marker}</span>}
                <div>{inline(item)}</div>
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
