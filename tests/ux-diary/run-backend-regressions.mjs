import { spawn } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPo05Postgres } from '../fixtures/po05-postgres.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evidence = resolve(root, 'artifacts/task-validation/backend-regressions/test-results');
await mkdir(evidence, { recursive: true });
const suites = [
  'assessments/__tests__/service-db.test.ts',
  'assessments/__tests__/transfers-db.test.ts',
  'ai/__tests__/patient-import-ownership-contract.test.ts',
  'ai/__tests__/intake-confirm.test.ts',
  'ai/__tests__/intake-draft.test.ts',
  'intake/__tests__/confirm-draft-therapy.test.ts',
  'ai/__tests__/intake-nrs-db.test.ts',
  'ai/__tests__/intake-tinetti-db.test.ts',
  'routes/__tests__/patient-clinical-scope-contract.test.ts',
  'routes/__tests__/patient-clinical-scope.test.ts',
  'routes/__tests__/patient-route-scope-contract.test.ts',
  'routes/__tests__/consegne-atomic-auth.test.ts',
  'routes/__tests__/therapy-authoritative-write.test.ts',
  'consegne/__tests__/creation-db.test.ts',
  'patients/__tests__/facility-scope-389.test.ts',
];
async function run(
  files,
  { zone = 'UTC', cwd = 'backend', label = 'focused', concurrency = 1 } = {},
) {
  const database = await startPo05Postgres({
    artifactRoot: resolve(evidence, 'scratch'),
    repositoryRoot: root,
  });
  try {
    const url = new URL(database.url);
    url.searchParams.set('options', `-c timezone=${zone}`);
    let output = '';
    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        '--import',
        new URL('../../scripts/stub-css-loader.mjs', import.meta.url).href,
        '--test',
        `--test-concurrency=${concurrency}`,
        ...files.map((file) => resolve(root, 'backend/src', file)),
      ],
      {
        cwd: resolve(root, cwd),
        windowsHide: true,
        env: {
          ...process.env,
          DATABASE_URL: url.href,
          NODE_ENV: 'test',
          AUTH_MODE: 'demo',
          ROLE_SIMULATOR_ENABLED: 'false',
          SKILLS_INTERPRETER: undefined,
          AI_PROVIDER: 'mock',
          AI_RUNTIME_URL: 'http://127.0.0.1:1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    child.stdout.on('data', (data) => {
      output += data;
    });
    child.stderr.on('data', (data) => {
      output += data;
    });
    const status = await new Promise((ok, fail) => {
      child.on('error', fail);
      child.on('close', ok);
    });
    await writeFile(resolve(evidence, `${label}.txt`), output);
    console.log(
      `${label}: exit ${status}\n${output
        .split('\n')
        .filter((line) => /^(?:# |ℹ )(tests|pass|fail|cancelled|duration)|^not ok|^✖/.test(line))
        .join('\n')}`,
    );
    if (status !== 0) throw new Error(`${label} failed; see test-results/${label}.txt`);
  } finally {
    await database.close();
  }
}
if (process.argv.includes('--full')) {
  const files = (await readdir(resolve(root, 'backend/src'), { recursive: true }))
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => file.endsWith('.test.ts'))
    .sort();
  // Epoch assertions need an isolated pass, matching the standard repository runner.
  const isolated = [
    'roster/__tests__/order-key-db.test.ts',
    'roster/__tests__/roster-pagination-db.test.ts',
    'roster/__tests__/preferences-db.test.ts',
    'patients/__tests__/alphabetical-pages-db.test.ts',
    'patients/__tests__/room-filter-db.test.ts',
  ];
  await run(
    files.filter((file) => !isolated.includes(file)),
    { label: 'full', concurrency: 2 },
  );
  await run(isolated, { label: 'isolated' });
} else {
  await run(suites, { label: 'focused-utc' });
  await run(suites.slice(0, 2), { zone: 'Europe/Rome', cwd: '', label: 'assessments-rome-root' });
}
