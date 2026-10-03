import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const result = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--import',
    '../scripts/stub-css-loader.mjs',
    '--test',
    'src/components/operator/__tests__/assessmentCatalogUi.test.ts',
    'src/lib/__tests__/patientListIdentityGuard.test.ts',
    'src/lib/__tests__/patientRosterGuard.test.ts',
    'src/lib/__tests__/therapyAgendaDateGuard.test.ts',
  ],
  { cwd: 'C:/Workspace/ClinicOSHouse/frontend', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
);
const output = result.stdout + result.stderr;
writeFileSync(
  path.resolve('artifacts/task-validation/ux-turno-commenti/test-results/baseline.txt'),
  output,
);
console.log(
  output
    .split(/\r?\n/)
    .filter((line) => /^ℹ (tests|pass|fail|duration)|^✖ [a-zA-Z]/.test(line))
    .join('\n'),
);
process.exitCode = result.status ?? 1;
