import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { ESLint } from 'eslint';

const baseline = '0418463a94801bf2d22bdb3155eb6d4a05e9a2dd';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const source = (path) => execFileSync('git', ['show', `${baseline}:${path}`]);
const report = { baseline, lint: {}, guard: {}, therapyPayload: {} };
const path = 'frontend/src/components/operator/MultiPatientParametri.tsx';
const eslint = new ESLint();
const base = source(path);
const current = readFileSync(path);
const diagnostics = (results) => results.flatMap((result) => result.messages.map(({ ruleId, severity, line, message }) => ({ ruleId, severity, line, message })));
const baselineDiagnostics = diagnostics(await eslint.lintText(base.toString(), { filePath: resolve(path) }));
const currentDiagnostics = diagnostics(await eslint.lintText(current.toString(), { filePath: resolve(path) }));
report.lint = { path, baselineSha256: sha(base), currentSha256: sha(current), baselineDiagnostics, currentDiagnostics,
  equal: JSON.stringify(baselineDiagnostics) === JSON.stringify(currentDiagnostics) };
const guardFiles = ['frontend/src/components/operator/OperatorAgenda.tsx', 'frontend/src/components/admin/AdminAgenda.tsx', 'frontend/src/lib/__tests__/therapyAgendaDateGuard.test.ts'];
report.guard = {
  assertion: '/Le terapie sono disponibili nella vista Giorno/',
  baselineOperatorContainsText: source(guardFiles[0]).toString().includes('Le terapie sono disponibili nella vista Giorno'),
  files: guardFiles.map((path) => ({ path, baselineBlobSha256: sha(source(path)), currentSha256: sha(readFileSync(path)),
    contentEqualIgnoringCRLF: source(path).toString().replaceAll('\r\n', '\n') === readFileSync(path, 'utf8').replaceAll('\r\n', '\n') })),
};
const modalPath = 'frontend/src/components/operator/TherapySlotModal.tsx';
const payload = (value) => value.match(/function buildInfo\([\s\S]*?\n  \}/)?.[0].replaceAll('\r\n', '\n');
report.therapyPayload = { path: modalPath, equal: payload(source(modalPath).toString()) === payload(readFileSync(modalPath, 'utf8')) };
writeFileSync('artifacts/task-validation/po06-identity-ui/baseline-comparison.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ lintEqual: report.lint.equal, baselineGuardTextAbsent: !report.guard.baselineOperatorContainsText,
  guardFilesUnchanged: report.guard.files.every((file) => file.contentEqualIgnoringCRLF), clinicalPayloadUnchanged: report.therapyPayload.equal }));
if (!report.lint.equal || !report.therapyPayload.equal || report.guard.files.some((file) => !file.contentEqualIgnoringCRLF)) process.exitCode = 1;
