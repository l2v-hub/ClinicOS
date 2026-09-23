import { readFile, writeFile } from 'node:fs/promises';
const definition = JSON.parse(await readFile('artifacts/task-validation/po-12-tinetti/backend/definition-snapshot.json', 'utf8'));
const rows = definition.groups.flatMap(group => group.items).map(item =>
  `  ${JSON.stringify({ id: item.id, group: item.group, label: item.label, options: item.options.map(option => option.description) })},`);
await writeFile('backend/src/assessments/tinetti-definition.ts',
  "import type { TinettiItemId } from './tinetti-types.js';\n\n" +
  '// Preserved PO12 source definition; source/reference hashes are pinned in tinetti-types.ts.\n' +
  'export const TINETTI_PROVENANCE = ' + JSON.stringify(definition.provenance) + ';\n' +
  "export const TINETTI_ITEMS: ReadonlyArray<{ id: TinettiItemId; group: 'balance' | 'gait'; label: string; options: readonly string[] }> = [\n" +
  rows.join('\n') + '\n];\n');
