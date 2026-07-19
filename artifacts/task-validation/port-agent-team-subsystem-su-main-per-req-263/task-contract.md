# Task Contract

## Task

- Title: Port agent-team subsystem su main per REQ 263
- Slug: port-agent-team-subsystem-su-main-per-req-263
- Type: feature
- Date: 2026-07-19

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |      yes |

## Current Behaviour

Il sottosistema di orchestrazione `agent-team/` (deliverable di #263) NON è in `main`: assenti la
directory root `agent-team/` (66 file), i 5 alias npm `agent-team:*`, il gitignore `.runtime/`/`.worktrees/`.
L'unico codice esiste sul branch stale `codex/agent-team-architecture` (PR #264 chiusa, 64 commit indietro,
in conflitto sui file NON-agent-team). Nota: `.claude/team/` in main è il vecchio team tmux, non correlato.

## Expected Behaviour

- La directory self-contained `agent-team/` (che NON tocca frontend/backend/prisma) è portata su un branch
  nuovo da `main` corrente, con i 5 alias npm e i gitignore delle root effimere.
- `agent-team:doctor` verde (ok:true, developmentReady + qaReady).
- La suite di orchestrazione (`agent-team/tests`) verde. Nessun impatto su build/app.

## Acceptance Criteria

- AC1: `agent-team/` (66 file) presente + 5 alias `agent-team:*` in root `package.json` + `.runtime`/`.worktrees` gitignored.
- AC2: `npm run agent-team:doctor` → `ok:true`, `developmentReady:true`, `qaReady:true`, 0 check falliti.
- AC3: `agent-team/tests` — i test di ORCHESTRAZIONE passano; eventuali test di prodotto stale documentati.
- AC4: nessuna modifica a frontend/backend/prisma; build app invariata.

## Test Plan

| Test type                 | Required | Reason                                                                                       |
| ------------------------- | -------: | -------------------------------------------------------------------------------------------- |
| Unit                      |      yes | Suite orchestrazione agent-team (claim, protocol, worker, state-machine, recovery, sanitize) |
| Integration               |      yes | agent-team/tests/integration (supervisor lifecycle, remediation loop, prohibited actions)    |
| API                       |       no | Nessun endpoint                                                                              |
| Playwright                |       no | Sottosistema CLI-only (N/A per #263)                                                         |
| Persistence after refresh |       no | N/A                                                                                          |
| Agnos action registry     |       no | Non impattato                                                                                |
| Voice simulation          |       no | Non impattato                                                                                |
| OCR/import test           |       no | Non impattato                                                                                |
| Security/privacy scan     |       no | Coperto dai test sanitize/prohibited-actions del sottosistema                                |

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

- Il port è di codice esistente testato; rischio principale = drift col frontend nei test di prodotto bundled (fuori scope orchestrazione). Mitigazione — documentare e non risolverli in questo port.
- #263 completo richiede evidenze artifact + Codex QA gate (fuori scope di questo port sub-task): questo branch consegna solo il sottosistema portato e verificato localmente.

## Gate Status

READY FOR IMPLEMENTATION
