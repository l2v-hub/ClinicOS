import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const tests = [
  'src/lib/__tests__/handoverOverviewResponse.test.ts',
  'src/lib/__tests__/handoverPreview.test.ts',
  'src/components/operator/__tests__/turno-review-ui.test.ts',
  'src/lib/__tests__/adessoQueue.test.ts',
  'src/lib/__tests__/urgencyModel.test.ts',
  'src/lib/__tests__/turnoPatients.test.ts',
  'src/lib/__tests__/patientVitalsOverview.test.ts',
  'src/components/operator/__tests__/operator-dashboard-first-view.test.ts',
  'src/components/operator/__tests__/operator-dashboard-anomaly-layout.test.ts',
  'src/components/operator/cartella/__tests__/diaryCoreUx.test.ts',
  'src/components/operator/cartella/__tests__/diaryThreadReceipt.test.ts',
  'src/components/operator/cartella/__tests__/uxW4Misc.test.ts',
  'src/lib/__tests__/notesAppIntegration.test.ts',
];
const result = spawnSync(process.execPath, ['--import', 'tsx', '--import', '../scripts/stub-css-loader.mjs', '--test', ...tests], {
  cwd: path.resolve('frontend'), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
});
const output = result.stdout + result.stderr;
writeFileSync(path.resolve(process.env.UX_EVIDENCE_DIR || 'artifacts/task-validation/ux-turno-commenti', 'test-results/focused.txt'), output);
console.log(output.split(/\r?\n/).filter(line => /^ℹ (tests|pass|fail|duration)|^✖ /.test(line)).join('\n'));
process.exitCode = result.status ?? 1;
