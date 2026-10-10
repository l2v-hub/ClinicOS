import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = 'artifacts/task-validation/423-document-empty-state/root-initial';
mkdirSync(dir, { recursive: true });
const run = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--test', 'frontend/src/components/operator/cartella/__tests__/documentEmptyState.test.ts'], { encoding: 'utf8', maxBuffer: 8e6 });
writeFileSync(`${dir}/tdd-red.log`, run.stdout + run.stderr);
if (run.status !== 1 || !(run.stdout + run.stderr).includes('ArchiveEmptyState')) throw Error('Expected missing empty state red test');
console.log('TDD red expected: component missing; log retained');
