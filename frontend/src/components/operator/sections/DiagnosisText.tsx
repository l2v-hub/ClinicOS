import * as React from 'react';

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: { marker: string; text: string }[] };

function blocksFromText(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };
  for (const line of text.split(/\r\n|\n|\r/)) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+)$/);
    const item = line.match(/^\s*([-*•]|\d+[.)])\s+(.+)$/);
    if (!line.trim()) {
      flush();
      // Separate lists across an empty line without modifying their original markers.
      if (blocks.at(-1)?.kind === 'list') blocks.push({ kind: 'paragraph', text: '' });
    } else if (heading) {
      flush();
      blocks.push({ kind: 'heading', text: heading[1] });
    } else if (item) {
      flush();
      const previous = blocks.at(-1);
      const entry = { marker: item[1], text: item[2] };
      if (previous?.kind === 'list') previous.items.push(entry);
      else blocks.push({ kind: 'list', items: [entry] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks.filter((block) => block.kind === 'list' || block.text !== '');

}

function emphasis(text: string): React.ReactNode {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part,
  );
}

/** Presentation only: stored OCR/manual text is never rewritten. Unsupported markup
 * remains literal React text; HTML, links and images are never executed or fetched. */
export function DiagnosisText({ text }: { text: string }) {
  return (
    <div className="diagnosis-text">
      {blocksFromText(text).map((block, index) => {
        if (block.kind === 'heading') return <h4 key={index}>{emphasis(block.text)}</h4>;
        if (block.kind === 'paragraph') return <p key={index}>{emphasis(block.text)}</p>;
        return (
          <ul key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <span className="diagnosis-text__marker">{item.marker}</span>
                <span>{emphasis(item.text)}</span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
