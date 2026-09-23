import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const directory = 'artifacts/task-validation/po-16-giro/frontend';
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const sources = [...new Set([...git('diff', '--name-only', '--', 'frontend/src').split('\n'), ...git('ls-files', '--others', '--exclude-standard', 'frontend/src').split('\n')])].filter(Boolean);
const walk = path => readdirSync(path, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(`${path}/${item.name}`) : [`${path}/${item.name}`]);
const files = [...sources, ...walk('frontend/dist').filter(path => /\.(js|css|html|json|mjs)$/.test(path))].sort();
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['aws-access-key', /\bAKIA[A-Z0-9]{16}\b/],
  ['github-token', /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ['openai-project-key', /\bsk-proj-[A-Za-z0-9_-]{40,}\b/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{24,}\b/],
  ['hardcoded-bearer', /Bearer\s+eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/],
];
const findings = [];
const scanned = files.map(path => { const bytes = readFileSync(path); const source = bytes.toString('utf8');
  for (const [rule, regex] of rules) if (regex.test(source)) findings.push({ path, rule });
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
writeFileSync(`${directory}/secret-scan.json`, JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'Changed source and emitted text bundle; known credential signatures only', rules: rules.map(([name]) => name), scanned, findings }, null, 2) + '\n');
console.log(JSON.stringify({ sourceFiles: sources.length, bundleFiles: files.length - sources.length, findings: findings.length }));
process.exitCode = findings.length ? 1 : 0;

