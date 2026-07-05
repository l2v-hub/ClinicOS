#!/usr/bin/env node
'use strict';
// Crea artifacts/task-validation/<slug>/task-contract.md + sottocartelle evidenze.
// Uso: node scripts/quality-gate/create-task-contract.js "<titolo>" [--type <tipo>] [--force]
const fs = require('fs');
const path = require('path');
const { slugify, taskDir, contractPath, reportPath } = require('./lib');

function parseArgs(argv) {
  const out = { title: '', type: 'change', force: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '-f') out.force = true;
    else if (a === '--type' || a === '-t') out.type = argv[++i] || out.type;
    else rest.push(a);
  }
  out.title = rest.join(' ').trim();
  return out;
}

function template(title, slug, type, date) {
  return `# Task Contract

## Task
- Title: ${title}
- Slug: ${slug}
- Type: ${type}
- Date: ${date}

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

<!-- Descrivi il comportamento attuale osservato. -->

## Expected Behaviour

<!-- Descrivi il comportamento atteso dopo il task. -->

## Acceptance Criteria

- AC1:
- AC2:
- AC3:

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
`;
}

function reportTemplate(title, slug, date) {
  return `# Task Validation Report

## Task
- Title: ${title}
- Slug: ${slug}
- Commit:
- Date: ${date}

## Implementation Summary

## Files Changed

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | FAIL | |
| AC2 | FAIL | |
| AC3 | FAIL | |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA | |
| Integration | NA | |
| API | NA | |
| Playwright | NA | |
| Persistence | NA | |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | NA | |

## Runtime Evidence

## Logs

Only sanitized logs are allowed.

## Residual Risks

## Final Decision

IMPLEMENTED — NOT VERIFIED
`;
}

function main() {
  const { title, type, force } = parseArgs(process.argv.slice(2));
  if (!title) {
    console.error('ERRORE: titolo mancante. Uso: create-task-contract.js "<titolo>" [--type <tipo>] [--force]');
    process.exit(1);
  }
  const slug = slugify(title);
  const dir = taskDir(slug);
  const cpath = contractPath(dir);

  if (fs.existsSync(cpath) && !force) {
    console.error(`ATTENZIONE: esiste già un contract per '${slug}':\n  ${cpath}\nUsa --force per sovrascrivere.`);
    process.exit(2);
  }

  for (const sub of ['', 'screenshots', 'video', 'trace', 'logs', 'test-results']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  const date = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(cpath, template(title, slug, type, date), 'utf8');

  // Genera anche lo scheletro del validation-report (decisione iniziale non-verificata).
  const rpath = reportPath(dir);
  if (!fs.existsSync(rpath) || force) {
    fs.writeFileSync(rpath, reportTemplate(title, slug, date), 'utf8');
  }

  console.log('Task Contract creato:');
  console.log('  ' + cpath);
  console.log('  ' + rpath + ' (scheletro report, decisione iniziale: IMPLEMENTED — NOT VERIFIED)');
  console.log('Sottocartelle evidenze: screenshots/ video/ trace/ logs/ test-results/');
  console.log('\nProssimo passo: compila Impact Classification, Acceptance Criteria e Test Plan,');
  console.log('poi valida con: node scripts/quality-gate/validate-task-contract.js ' + slug);
}

main();
