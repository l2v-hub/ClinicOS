import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const tests = [
  'src/lib/__tests__/uxDiscovery.test.ts',
  'src/lib/__tests__/therapyView.test.ts',
  'src/lib/__tests__/therapyW2InPlace.test.ts',
  'src/lib/__tests__/therapyPages.test.ts',
  'src/lib/__tests__/patientTherapyCalendar.test.ts',
  'src/lib/__tests__/consegneFeed.test.ts',
  'src/lib/__tests__/navHistory.test.ts',
  'src/lib/__tests__/navigationStaleWhileRevalidate.test.ts',
  'src/lib/__tests__/facilityTime.test.ts',
  'src/components/operator/cartella/__tests__/therapyFormPresentation.test.ts',
];
const result = spawnSync(process.execPath, ['--import', 'tsx', '--import', '../scripts/stub-css-loader.mjs', '--test', ...tests], {
  cwd: path.resolve('frontend'), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
});
const output = result.stdout + result.stderr;
writeFileSync(path.resolve(process.env.UX_EVIDENCE_DIR || 'artifacts/task-validation/ux-discovery-loop', 'test-results/discovery-focused.txt'), output);
console.log(output.split(/\r?\n/).filter(line => /^ℹ (tests|pass|fail|duration)|^✖ /.test(line)).join('\n'));
process.exitCode = result.status ?? 1;
