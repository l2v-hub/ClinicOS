import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ESLint } from 'eslint';

const baseline = 'c52af6237c9cbbda9a39a770c1278573567eb958';
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8' }).trim();
const files = [...new Set([
  ...git('diff', '--name-only', '--', 'frontend/src').split('\n'),
  ...git('ls-files', '--others', '--exclude-standard', 'frontend/src').split('\n'),
])].filter((file) => /\.tsx?$/.test(file));
const eslint = new ESLint({ overrideConfigFile: 'frontend/eslint.config.js' });
const hash = (source) => createHash('sha256').update(source).digest('hex');
const diagnostic = (result) => result.messages.map(({ ruleId, severity, line, column, message }) => ({
  ruleId, severity, line, column, title: message.split('\n')[0],
}));
const comparison = [];
for (const file of files) {
  const candidate = readFileSync(file, 'utf8');
  const [current] = await eslint.lintText(candidate, { filePath: file });
  let previous;
  try { previous = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { /* New source has no baseline. */ }
  const [before] = previous === undefined ? [] : await eslint.lintText(previous, { filePath: file });
  comparison.push({ file, baselineHash: previous === undefined ? null : hash(previous), candidateHash: hash(candidate),
    baseline: before ? diagnostic(before) : [], candidate: diagnostic(current) });
}
const signature = (messages) => messages.map(({ ruleId, severity, title }) => `${ruleId}:${severity}:${title}`).sort();
const introduced = comparison.filter(({ baseline: before, candidate }) => {
  const available = signature(before);
  return signature(candidate).some((item) => { const index = available.indexOf(item); if (index < 0) return true; available.splice(index, 1); return false; });
});
const report = { baseline, generatedAtUtc: new Date().toISOString(), files: comparison, introduced: introduced.map(({ file }) => file) };
writeFileSync(new URL('lint-comparison.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, baselineDiagnostics: comparison.reduce((n, row) => n + row.baseline.length, 0),
  candidateDiagnostics: comparison.reduce((n, row) => n + row.candidate.length, 0), introduced: report.introduced }));
process.exitCode = introduced.length ? 1 : 0;
