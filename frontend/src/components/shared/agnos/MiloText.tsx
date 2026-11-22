import type { ReactNode } from 'react';

// Testo discorsivo di Milo (team o compositore). Il modello a volte usa markdown: qui se ne rende un
// sottoinsieme minimo e SICURO, solo come elementi React (mai HTML grezzo):
//   **grassetto** → <strong>; righe «- » / «• » / «1. » → elenco; righe di tabella «| a | b |» →
//   «a · b» (la riga di separazione «|---|» sparisce); titoli «# …» → testo in grassetto.

function inline(text: string, key: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      /^\*\*[^*]+\*\*$/.test(part) ? (
        <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
      ) : (
        part.replace(/\*\*/g, '')
      ),
    );
}

const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+/;
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function tableRow(line: string): string {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean)
    .join(' · ');
}

export function MiloText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ai-asst__answer-list">
        {items.map((item, i) => (
          <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (TABLE_RULE.test(line)) continue;
    if (BULLET.test(line)) {
      list.push(line.replace(BULLET, ''));
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      list.push(tableRow(line));
      continue;
    }
    flush();
    const heading = /^\s*#{1,6}\s+/.test(line);
    const body = line.replace(/^\s*#{1,6}\s+/, '');
    blocks.push(
      <p key={`p-${blocks.length}`}>
        {heading ? (
          <strong>{inline(body, `h-${blocks.length}`)}</strong>
        ) : (
          inline(body, `p-${blocks.length}`)
        )}
      </p>,
    );
  }
  flush();
  return <>{blocks}</>;
}
