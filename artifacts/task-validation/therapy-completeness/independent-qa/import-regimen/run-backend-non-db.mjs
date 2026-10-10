import { readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const all = readdirSync('backend/src', { recursive: true }).map(path => path.replaceAll('\\', '/')).filter(path => path.endsWith('.test.ts')).sort();
const excluded = all.filter(path => path.endsWith('-db.test.ts'));
const selected = all.filter(path => !excluded.includes(path)).map(path => `src/${path}`);
writeFileSync(resolve('artifacts/task-validation/therapy-completeness-qa/import-regimen/backend-selection.json'), JSON.stringify({
 policy: 'All discovered non-*-db.test.ts suites only. No real database/provider credentials. Not entire backend suite.', allCount: all.length,
 selected, excluded }, null, 2));
const outcome = spawnSync(process.execPath, ['artifacts/task-validation/therapy-completeness-qa/import-regimen/run-command.mjs', 'backend-non-db-rerun', 'backend',
 '--import', 'tsx', '--import', pathToFileURL(resolve('scripts/stub-css-loader.mjs')).href, '--test', '--test-concurrency=8', ...selected], { stdio: 'inherit' });
process.exit(outcome.status ?? 1);
