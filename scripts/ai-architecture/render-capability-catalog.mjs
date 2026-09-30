#!/usr/bin/env node
// Renders .ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.md from CAPABILITY_CATALOG.json
// (the JSON is the catalog of record) and prints the totals used by CURRENT_STATE.json.
// Usage (repo root): node scripts/ai-architecture/render-capability-catalog.mjs [--totals]
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = '.ai-architecture/phase-1-capabilities';
const catalog = JSON.parse(readFileSync(`${DIR}/CAPABILITY_CATALOG.json`, 'utf8'));
const caps = catalog.capabilities;

function count(key) {
  const out = {};
  for (const c of caps) out[c[key]] = (out[c[key]] ?? 0) + 1;
  return out;
}

export function totals() {
  const failed = caps.filter((c) => c.test && c.test.result === 'fail').map((c) => c.capability_id);
  return {
    total: caps.length,
    technical_state: count('technical_state'),
    invocability: count('invocability'),
    exposure: count('exposure'),
    tools: caps.filter((c) => c.exposure === 'TOOL').length,
    failed_tests: failed,
  };
}

if (process.argv.includes('--totals')) {
  console.log(JSON.stringify(totals(), null, 2));
  process.exit(0);
}

const esc = (v) =>
  String(v ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
const t = totals();
const lines = [
  '# Capability Catalog — Phase 1',
  '',
  `> Generated from \`CAPABILITY_CATALOG.json\` (${catalog.schema}) by`,
  '> `scripts/ai-architecture/render-capability-catalog.mjs`. Do not edit by hand.',
  '',
  '## Totals',
  '',
  `- Capabilities: **${t.total}** · exposed as tools: **${t.tools}**`,
  `- Technical state: ${Object.entries(t.technical_state)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ')}`,
  `- Invocability: ${Object.entries(t.invocability)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ')}`,
  `- Exposure: ${Object.entries(t.exposure)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ')}`,
  `- Failed tool tests: ${t.failed_tests.length ? t.failed_tests.join(', ') : 'none'}`,
  '',
  'Legend — technical: READY (entry point/service reusable as is) · WRAP (valid logic, thin adapter) ·',
  'GAP (no reusable application boundary). Invocability: DISCOVERED → EXPOSED → INVOCABLE → TESTED.',
  '',
];

const domains = [...new Set(caps.map((c) => c.domain))].sort();
for (const domain of domains) {
  lines.push(`## ${domain}`, '');
  lines.push(
    '| capability_id | type | state | exposure | invocability | entry point | service(s) | test |',
  );
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const c of caps.filter((x) => x.domain === domain)) {
    const test = c.test ? `${c.test.result}${c.test.gui_parity ? ' · GUI parity' : ''}` : '—';
    lines.push(
      `| \`${c.capability_id}\` | ${c.type} | ${c.technical_state} | ${c.exposure} | ${c.invocability} | ${esc(c.entry_point)} | ${esc((c.services ?? []).join('<br>'))} | ${esc(test)} |`,
    );
  }
  const notes = caps.filter((x) => x.domain === domain && (x.gap || x.wrap_adapter));
  if (notes.length) {
    lines.push('', '<details><summary>WRAP adapters / GAP analysis</summary>', '');
    for (const c of notes) {
      if (c.wrap_adapter) lines.push(`- **${c.capability_id}** (WRAP): ${esc(c.wrap_adapter)}`);
      if (c.gap) {
        lines.push(
          `- **${c.capability_id}** (GAP): cause — ${esc(c.gap.cause)}; minimal change — ${esc(c.gap.minimal_change)}; files — ${esc((c.gap.files ?? []).join(', '))}; regression risk — ${esc(c.gap.regression_risk)}`,
        );
      }
    }
    lines.push('', '</details>');
  }
  lines.push('');
}
writeFileSync(`${DIR}/CAPABILITY_CATALOG.md`, lines.join('\n'));
console.log(`CAPABILITY_CATALOG.md written (${t.total} capabilities)`);
