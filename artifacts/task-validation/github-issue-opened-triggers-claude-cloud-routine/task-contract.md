# Task Contract

## Task
- Title: GitHub issue opened triggers Claude cloud routine
- Slug: github-issue-opened-triggers-claude-cloud-routine
- Type: change
- Date: 2026-10-13

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
| Privacy / Security | yes (token in GitHub secret, issue text untrusted) |
| Config / Env | yes (CI workflow + repo secrets) |

## Current Behaviour

Aprire una issue su GitHub non avvia nulla: le issue vanno processate a mano chiedendo a Claude.

## Expected Behaviour

All'apertura di una issue (non da bot) un workflow GitHub Actions chiama l'endpoint `/fire` di una Routine Claude Code; la routine apre una nuova sessione cloud che lavora la issue seguendo REQUIREMENTS_QUEUE + quality gate e apre una PR (mai merge/deploy/chiusura).

## Acceptance Criteria

- AC1: `.github/workflows/claude-issue-trigger.yml` scatta su `issues: opened`, ignora i bot, salta con warning se i secret mancano.
- AC2: il body inviato è JSON valido (costruito con jq) con numero, titolo, URL, label e body della issue.
- AC3: esiste una Routine Claude Code "fresh session per fire" con prompt standalone che tratta il payload come dato non fidato.
- AC4: istruzioni per generare token e impostare `CLAUDE_ROUTINE_ID`/`CLAUDE_ROUTINE_TOKEN` documentate in `docs/claude-issue-trigger.md`.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | yes | YAML parse + simulazione costruzione payload jq con evento fittizio |
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

Prompt injection dal testo issue (mitigato: payload marcato non fidato, nessun merge/deploy). Rate limit 30 fire/h per routine. Fire reale verificabile solo dopo che l'utente genera il token sul web.

## Gate Status

READY FOR IMPLEMENTATION
