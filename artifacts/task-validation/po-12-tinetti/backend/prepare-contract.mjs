import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const folder = resolve('artifacts/task-validation/po-12-tinetti/backend');
const path = 'frontend/src/components/operator/cartella/ScalaTinettiTab.tsx';
const source = await readFile(resolve(path));
const sha256 = createHash('sha256').update(source).digest('hex');
if (sha256 !== '7785059cceedc3ff85f051a60ff1cbdaa48145f03fb7f93ab7d53696ca6c8b09')
  throw new Error('The approved Tinetti definition source changed');
const text = source.toString('utf8');
const unquote = value => value.startsWith('"') ? JSON.parse(value) : value.slice(1, -1).replace(/\\'/g, "'");
const groups = [
  ['balance', 'Equilibrio', 'const EQUILIBRIO_ITEMS:', 'const ANDATURA_ITEMS:', 16],
  ['gait', 'Andatura', 'const ANDATURA_ITEMS:', 'const ALL_BALANCE_KEYS', 12],
].map(([id, label, start, end, maximum]) => {
  const section = text.slice(text.indexOf(start), text.indexOf(end));
  const matches = [...section.matchAll(/key: '([^']+)',\s+label: ('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"),\s+options: \[([\s\S]*?)\],/g)];
  const items = matches.map(match => ({
    id: match[1], label: unquote(match[2]), group: id,
    options: [...match[3].matchAll(/\{ v: (\d+), label: ('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*") \}/g)].map(option => ({
      score: Number(option[1]), label: unquote(option[2]),
      description: unquote(option[2]).replace(/^\d+ — /, ''),
    })),
  }));
  if (items.length !== 10 || items.reduce((sum, item) => sum + Math.max(...item.options.map(option => option.score)), 0) !== maximum)
    throw new Error(`Unexpected source structure: ${id}`);
  return { id, label, maximum, items };
});
if (groups.flatMap(group => group.items).reduce((sum, item) => sum + item.options.length, 0) !== 48)
  throw new Error('Unexpected source option count');
const provenance = 'Modello a 20 voci già in uso in ClinicOS: equilibrio 16 punti, andatura 12 punti, totale 28. Conservate quattro risposte distinte per lunghezza e altezza del passo destro e sinistro. Allegato del 22/09/2026 come riferimento; non costituisce trascrizione letterale o convalida clinica indipendente.';
await writeFile(resolve(folder, 'definition-snapshot.json'), JSON.stringify({
  source: { path, sha256 }, referenceSha256: 'feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6',
  provenance, groups,
  thresholds: [
    { minimum: 0, maximum: 18, riskBand: 'high', label: 'Alto rischio cadute' },
    { minimum: 19, maximum: 23, riskBand: 'moderate', label: 'Rischio moderato' },
    { minimum: 24, maximum: 28, riskBand: 'low', label: 'Basso rischio' },
  ],
  evidence: 'Read-only extraction of the approved current source definitions; no application function, test or database executed.',
}, null, 2) + '\n');
console.log(JSON.stringify({ preparedDefinition: true, sourceSha256: sha256, groups: 2, items: 20, options: 48 }));
