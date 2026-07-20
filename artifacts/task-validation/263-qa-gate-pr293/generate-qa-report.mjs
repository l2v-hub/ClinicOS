// QA-only evidence surface generator for PR #293 (QA-263-016 gate).
// Lives in the evidence folder — NOT repo source. Re-runs the doctor unit tests,
// parses TAP, reads the live doctor JSON, and emits a static qa-report.html.
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const execFile = promisify(execFileCb);

const WORKTREE = 'E:/Workspace/DG_SE_DEV/ClinicOS/.claude/worktrees/agent-a3bf3eb1f0b21e88a';
const EVIDENCE = 'E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/263-qa-gate-pr293';
const HEAD_SHA = '14d50e3c171a323de74536589f5ae24f564d5168';
const REGRESSION_TESTS = [
  'doctor passes ignore validation on a real fresh checkout where the roots do not exist (QA-263-016)',
  'doctor fails closed on a real repository whose gitignore lacks the root rules (QA-263-016)',
];

// (a) re-run the doctor unit tests, capture TAP
let tap = '';
let exitCode = 0;
try {
  const { stdout } = await execFile('node', ['--test', 'agent-team/tests/unit/doctor.test.mjs'], {
    cwd: WORKTREE,
    maxBuffer: 10 * 1024 * 1024,
  });
  tap = stdout;
} catch (err) {
  tap = (err.stdout ?? '') + (err.stderr ?? '');
  exitCode = typeof err.code === 'number' ? err.code : 1;
}
await writeFile(path.join(EVIDENCE, 'logs', 'qa-surface-tap-rerun.log'), tap);

// (b) parse totals + the two QA-263-016 test names
const totals = {};
for (const key of ['tests', 'pass', 'fail']) {
  const m = tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
  totals[key] = m ? Number(m[1]) : NaN;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regressionStatus = REGRESSION_TESTS.map((name) => {
  const ok = new RegExp(`^ok \\d+ - ${esc(name)}$`, 'm').test(tap);
  const notOk = new RegExp(`^not ok \\d+ - ${esc(name)}$`, 'm').test(tap);
  return { name, status: ok && !notOk ? 'pass' : 'fail' };
});

// (c) live doctor JSON roots-ignored result (from the captured Phase-2 run)
const doctorLog = await readFile(path.join(EVIDENCE, 'logs', 'doctor-run-live.log'), 'utf8');
const jsonLine = doctorLog.split(/\r?\n/).find((l) => l.trim().startsWith('{'));
const doctor = JSON.parse(jsonLine);
const rootsIgnored = doctor.checks.find((c) => c.id === 'roots-ignored');

const badge = (ok) =>
  `<span class="badge ${ok ? 'pass' : 'fail'}" data-status="${ok ? 'pass' : 'fail'}">${ok ? 'pass' : 'fail'}</span>`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>QA Gate PR #293 — QA-263-016 Evidence</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#EEF1F6;color:#16202E;margin:0;padding:32px}
.card{background:#fff;border:1px solid #E6EBF2;border-radius:14px;padding:24px;max-width:900px;margin:0 auto 16px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:0 0 12px;color:#5A6B80}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #E6EBF2;padding:8px 10px;text-align:left;font-size:14px}
.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-weight:600;font-size:12px}
.badge.pass{background:#E4F5EA;color:#1E7A44}.badge.fail{background:#FBE4E7;color:#D93A4A}
code{background:#F3F6FA;padding:1px 5px;border-radius:4px;font-size:12.5px}
.meta{font-size:13px;color:#5A6B80}
</style></head><body>
<div class="card">
  <h1>Independent QA Gate — PR #293 (QA-263-016 remediation)</h1>
  <h2>agent-team doctor: ignore probe existence-independent on fresh checkouts</h2>
  <p class="meta">PR head SHA: <code id="head-sha">${HEAD_SHA}</code> · branch <code>fix/263-qa-016-doctor-fresh-checkout</code> · generated ${new Date().toISOString()}</p>
</div>
<div class="card">
  <h2>QA-263-016 regression tests (real temporary git repository, no mocks on git check-ignore)</h2>
  <table id="regression-tests">
    <tr><th>Test</th><th>Status</th></tr>
    ${regressionStatus.map((t, i) => `<tr id="regression-${i + 1}"><td>${t.name}</td><td>${badge(t.status === 'pass')}</td></tr>`).join('\n    ')}
  </table>
</div>
<div class="card">
  <h2>doctor unit suite totals (node --test agent-team/tests/unit/doctor.test.mjs, exit ${exitCode})</h2>
  <table id="totals">
    <tr><th>Total</th><th>Pass</th><th>Fail</th></tr>
    <tr><td id="total-tests">${totals.tests}</td><td id="total-pass">${totals.pass}</td><td id="total-fail">${totals.fail}</td></tr>
  </table>
</div>
<div class="card">
  <h2>Live <code>npm run agent-team:doctor</code> — roots-ignored check</h2>
  <table id="doctor-live">
    <tr><th>Check</th><th>ok</th><th>detail</th></tr>
    <tr id="roots-ignored-row"><td><code>${rootsIgnored.id}</code></td><td>${badge(rootsIgnored.ok)}</td><td>${rootsIgnored.detail}</td></tr>
    <tr><td>doctor overall <code>ok</code></td><td>${badge(doctor.ok)}</td><td>developmentReady=${doctor.developmentReady} · qaReady=${doctor.qaReady} · ${doctor.checks.length} checks</td></tr>
  </table>
  <p class="meta">Run performed in a worktree where <code>agent-team/.worktrees</code> did not exist — the exact Codex clean-worktree repro condition.</p>
</div>
</body></html>`;

await writeFile(path.join(EVIDENCE, 'qa-report.html'), html);
console.log('qa-report.html written. totals=', JSON.stringify(totals), 'regressions=', JSON.stringify(regressionStatus.map((r) => r.status)));
