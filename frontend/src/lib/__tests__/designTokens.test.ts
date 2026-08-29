import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../../App.css', import.meta.url), 'utf8');
const importedStyles = [
  css,
  readFileSync(new URL('../../app-additions.css', import.meta.url), 'utf8'),
  readFileSync(new URL('../../clinicos-restyle.css', import.meta.url), 'utf8'),
  readFileSync(new URL('../../index.css', import.meta.url), 'utf8'),
];

function topLevelRootBlocks(source: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;
  for (let index = 0; index < source.length; index += 1) {
    if (depth === 0 && source.startsWith(':root', index)) {
      const brace = source.indexOf('{', index);
      if (brace !== -1) {
        start = brace + 1;
        index = brace;
      }
    }
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        blocks.push(source.slice(start, index));
        start = -1;
      }
    }
  }
  return blocks;
}

function hexLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/../g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [light, dark] = [hexLuminance(a), hexLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('App.css has one canonical top-level root without duplicate tokens', () => {
  const roots = topLevelRootBlocks(css);
  assert.equal(roots.length, 1);
  const names = [...roots[0].matchAll(/--([a-z0-9-]+)\s*:/gi)].map((match) => match[1]);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  assert.deepEqual(duplicates, []);
  assert.match(roots[0], /--sidebar-w:\s*96px/);
});

test('extra-muted text meets WCAG AA contrast on the canonical surface', () => {
  const root = topLevelRootBlocks(css)[0];
  const foreground = root.match(/--text-xmuted:\s*(#[0-9a-f]{6})/i)?.[1];
  const background = root.match(/--surface:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(foreground && background);
  assert.ok(contrast(foreground, background) >= 4.5);
});

test('intentional responsive sidebar overrides remain media-scoped', () => {
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?:root\s*{\s*--sidebar-w:\s*220px/);
  assert.match(
    css,
    /@media \(min-width: 1024px\) and \(max-width: 1180px\)[\s\S]*?:root\s*{\s*--sidebar-w:\s*88px/,
  );
});

test('the imported style graph has one token owner and one font request', () => {
  const roots = importedStyles.flatMap(topLevelRootBlocks);
  assert.equal(roots.length, 1);
  assert.equal(importedStyles.join('\n').match(/fonts\.googleapis\.com/g)?.length, 1);
});

test('legacy theme aliases and automatic dark overrides cannot retarget the clinical theme', () => {
  const graph = importedStyles.join('\n');
  assert.doesNotMatch(graph, /var\(--(?:heading|mono|text-h|code-bg)\b/);
  assert.doesNotMatch(graph, /prefers-color-scheme:\s*dark/);
});
