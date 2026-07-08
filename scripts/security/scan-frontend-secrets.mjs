#!/usr/bin/env node
// Issue #224 — Frontend secret scanner.
//
// Detects hardcoded secrets / provider credentials and references to server-only (secret) env vars in the
// frontend source AND in the built bundle (Vite inlines `import.meta.env.VITE_*` in cleartext, so a secret
// placed in a VITE_ var would leak into dist/). Zero external dependencies — plain Node, portable to CI.
//
// Usage:   node scripts/security/scan-frontend-secrets.mjs [dir ...]      (default: frontend/src)
//          node scripts/security/scan-frontend-secrets.mjs --self-test    (verify detection works)
// Exit:    0 = clean, 1 = findings, 2 = usage/self-test failure.
//
// Allowlist: append the marker  secret-scan-ignore  in a comment on the same line to suppress a match
// (use only for documented false positives, e.g. an example placeholder).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const IGNORE_MARKER = 'secret-scan-ignore';
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html', '.css', '.json', '.env']);
const SKIP_DIR = new Set(['node_modules', '.git', 'coverage', '.vite']);

// Targeted, low-false-positive patterns for common secret formats + secret-like env references.
const RULES = [
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/, desc: 'AWS access key id' },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_\-]{35}\b/, desc: 'Google API key' },
  { id: 'openai-key', re: /\bsk-[A-Za-z0-9]{20,}\b/, desc: 'OpenAI-style secret key' },
  { id: 'slack-token', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/, desc: 'Slack token' },
  { id: 'github-token', re: /\bgh[pousr]_[0-9A-Za-z]{20,}\b/, desc: 'GitHub token' },
  { id: 'private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, desc: 'private key block' },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, desc: 'JWT' },
  // Server-only secret env var names must never be referenced from frontend code / inlined in the bundle.
  { id: 'server-secret-env', re: /\b(AZURE_OPENAI_API_KEY|OPENAI_API_KEY|MISTRAL_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY|DATABASE_URL|RAILWAY_TOKEN|VERCEL_TOKEN|JWT_SECRET|SESSION_SECRET)\b/, desc: 'server-only secret env var referenced' },
  // A VITE_ env var whose NAME implies a secret is a design smell (it would be inlined in cleartext).
  { id: 'secret-like-vite-env', re: /\bVITE_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*\b/, desc: 'secret-like VITE_ env var' },
  // Hardcoded credential assignment with a non-trivial literal.
  { id: 'hardcoded-credential', re: /\b(?:api[_-]?key|secret|password|passwd|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i, desc: 'hardcoded credential literal' },
];

// Reduce false positives: skip an assignment whose literal is obviously a placeholder/empty/env-read.
const PLACEHOLDER = /(your[_-]?|example|placeholder|xxxx|changeme|\$\{|import\.meta\.env|process\.env|<[^>]+>)/i;

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(name)) || name.startsWith('.env')) out.push(full);
  }
  return out;
}

function scanFile(file) {
  const findings = [];
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return findings; }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(IGNORE_MARKER)) continue;
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (!m) continue;
      if (rule.id === 'hardcoded-credential' && PLACEHOLDER.test(line)) continue;
      findings.push({ file, line: i + 1, rule: rule.id, desc: rule.desc, match: m[0].slice(0, 60) });
    }
  }
  return findings;
}

function scanTargets(targets) {
  const files = [];
  for (const t of targets) {
    if (!existsSync(t)) continue;
    statSync(t).isDirectory() ? walk(t, files) : files.push(t);
  }
  return files.flatMap(scanFile);
}

function selfTest() {
  // Positive fixtures — each MUST be detected.
  const positives = [
    'const k = "sk-ABCDEFGHIJKLMNOPQRSTUVWX";',
    'const azure = import.meta.env.AZURE_OPENAI_API_KEY;',
    'const t = import.meta.env.VITE_OPENAI_TOKEN;',
    'const password = "hunter2secret";',
  ];
  // Negative fixtures — each MUST be clean.
  const negatives = [
    'const base = import.meta.env.VITE_API_URL;',
    'const apiKey = process.env.OPENAI_KEY; // secret-scan-ignore',
    'const example = "your-api-key-here";',
    'const password = import.meta.env.SOMETHING;',
  ];
  let ok = true;
  for (const src of positives) {
    const hit = RULES.some((r) => r.re.test(src) && !(r.id === 'hardcoded-credential' && PLACEHOLDER.test(src)));
    if (!hit) { console.error(`self-test FAIL (missed): ${src}`); ok = false; }
  }
  for (const src of negatives) {
    if (src.includes(IGNORE_MARKER)) continue;
    const hit = RULES.some((r) => r.re.test(src) && !(r.id === 'hardcoded-credential' && PLACEHOLDER.test(src)));
    if (hit) { console.error(`self-test FAIL (false positive): ${src}`); ok = false; }
  }
  console.log(ok ? 'self-test OK: detection + allowlist + placeholder handling verified' : 'self-test FAILED');
  return ok ? 0 : 2;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) process.exit(selfTest());
  const targets = args.length ? args : ['frontend/src'];
  const findings = scanTargets(targets);
  if (findings.length === 0) {
    console.log(`frontend secret scan OK — 0 findings in: ${targets.join(', ')}`);
    process.exit(0);
  }
  console.error(`frontend secret scan FAILED — ${findings.length} finding(s):`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line} [${f.rule}] ${f.desc} -> ${f.match}`);
  }
  console.error('\nIf a finding is a documented false positive, append the comment marker "secret-scan-ignore" on that line.');
  process.exit(1);
}

main();
