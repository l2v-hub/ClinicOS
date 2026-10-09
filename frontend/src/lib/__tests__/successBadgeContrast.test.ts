import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../../App.css', import.meta.url), 'utf8');
const ds = readFileSync(new URL('../../design-system.css', import.meta.url), 'utf8');
const tokens = new Map([...`${app}\n${ds}`.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)].map(m => [m[1], m[2].trim()]));
function resolved(value: string): string {
  if (value.startsWith('var(')) {
    const name = value.match(/^var\((--[\w-]+)/)?.[1];
    assert.ok(name && tokens.has(name), `Missing actual CSS token: ${value}`);
    return resolved(tokens.get(name)!);
  }
  return value;
}
function luminance(hex: string): number {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = rgb.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(foreground: string, background: string): number {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function declaration(css: string, selector: string, property: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1];
  assert.ok(body, `Missing ${selector}`);
  const value = body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+);`))?.[1];
  assert.ok(value, `Missing ${selector} ${property}`);
  return value.trim();
}

test('success badge text token reaches normal-text contrast without rounding', () => {
  const text = resolved('var(--badge-success-text)');
  const background = resolved('var(--emerald-bg)');
  assert.ok(contrast(text, background) >= 4.5, `${text}/${background}`);
  assert.ok(contrast(text, '#ffffff') >= 4.5);
});

test('all shared green status badges consume the readable text token and actual light surface', () => {
  const consumers: [string, string][] = [
    [app, '.stato-pill--ricovero-ricoverato'],
    [app, '.stato-pill--attivo'],
    [app, '.stato-pill--consegna-completata'],
    [app, '.status-badge--success'],
    [ds, '.ds-badge--ok:not(#ds)'],
  ];
  for (const [css, selector] of consumers) {
    const color = declaration(css, selector, 'color');
    assert.match(color, /^var\(--badge-success-text(?:,|\))/);
    const background = declaration(css, selector, 'background');
    assert.ok(contrast(resolved(color), resolved(background)) >= 4.5, selector);
  }
});

test('the original point measurement remains reproducible, not silently waived as large text', () => {
  const original = contrast('#0d9488', '#e7f7f0');
  assert.ok(original > 3.38 && original < 3.381);
  assert.ok(original < 4.5);
  assert.equal(contrast('#ffffff', '#000000'), 21);
});

test('badge text fix preserves global accent colors and explicit admission text', () => {
  assert.equal(resolved('var(--teal)'), '#0d9488');
  assert.equal(resolved('var(--emerald)'), '#16a37b');
  assert.equal(resolved('var(--emerald-bg)'), '#e7f7f0');
  const roster = readFileSync(new URL('../../components/operator/PatientRoster.tsx', import.meta.url), 'utf8');
  assert.match(roster, /STATO_RICOVERO_LABEL\[state\] \?\? state/);
  const labels = readFileSync(new URL('../patientRosterSort.ts', import.meta.url), 'utf8');
  assert.match(labels, /ricoverato:\s*'Ricoverato'/);
});
