# Task Validation Report

## Task

- Title: Port agent-team subsystem su main (REQ #263)
- Slug: port-agent-team-subsystem-su-main-per-req-263
- Branch: `feat/263-agent-team-port`
- Date: 2026-07-19

## Implementation Summary

Port pulito del sottosistema di orchestrazione `agent-team/` dal branch stale
`codex/agent-team-architecture` (PR #264 chiusa) su un branch nuovo da `main` corrente.

- Portati **66 file** `agent-team/` (config, 7 schemi protocol, prompts, `src/` con cli+commands+adapters+
  15 moduli core+workers, tests) — directory self-contained che **non tocca** `frontend/`/`backend/`/`prisma/`.
- Aggiunti i **5 alias npm** in root `package.json`: `agent-team:doctor|once|start|status|stop`.
- Aggiunti al `.gitignore` i root effimeri `agent-team/.runtime` e `agent-team/.worktrees` (senza trailing
  slash, così matchano anche quando le dir non esistono — richiesto dal check `roots-ignored` del doctor).

Nessuna modifica al codice applicativo. NON è il delivery completo di #263 (mancano gli artifact di
evidenza + il Codex QA gate): questo branch consegna il sottosistema portato e verificato localmente.

## Files Changed

- `agent-team/**` (66 file, nuovi)
- `package.json` (5 alias `agent-team:*`)
- `.gitignore` (`agent-team/.runtime`, `agent-team/.worktrees`)

## Acceptance Criteria Result

| AC                                                                     |            Result | Evidence                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ----------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — 66 file `agent-team/` + 5 alias npm + gitignore roots            |              PASS | `git ls-files agent-team` = 66; `scripts.agent-team:*` presenti; `.gitignore` aggiornato                                                                                                                                                                  |
| AC2 — `agent-team:doctor` verde                                        |              PASS | `logs/doctor-green.json` → `ok:true`, `developmentReady:true`, `qaReady:true`, 0 check falliti (codex/claude/gh autenticati, labels, git, worktree, roots-ignored)                                                                                        |
| AC3 — test di orchestrazione verdi; test di prodotto stale documentati | PASS (con caveat) | 27 file / **106 test / 105 pass / 1 fail**; il fail è `e2e-import-journey.test.mjs` (QA-263-014) — test di PRODOTTO che pinna stringhe in `IntakeWorkspace.tsx`/`StepClinica.tsx`; **non testa l'orchestrazione**. Tutti i test di orchestrazione passano |
| AC4 — nessuna modifica frontend/backend/prisma                         |              PASS | il branch della PR non tocca l'app; port confinato a `agent-team/` + root config                                                                                                                                                                          |

## Test Results

| Test                             |         Result | Evidence                                                                                                                              |
| -------------------------------- | -------------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| `agent-team:doctor`              |   PASS (verde) | `logs/doctor-green.json`                                                                                                              |
| Orchestration unit + integration |           PASS | claim lifecycle/race, doctor, workers, protocol, state-machine, recovery, lease/heartbeat, prohibited-actions, sanitize → tutti verdi |
| Test di prodotto bundled         | 1 FAIL (stale) | `e2e-import-journey.test.mjs` — vedi sotto                                                                                            |

## Analisi del test fallito (fuori scope orchestrazione)

`agent-team/tests/unit/e2e-import-journey.test.mjs` (QA-263-014) legge sorgenti FRONTEND e asserisce
stringhe letterali. Fallisce su: _"IntakeWorkspace confirm payload must carry data.allergieStatus into
cartella.allergieStatus"_. **Non è una regressione reale**: in `main` `IntakeWorkspace.tsx` gestisce
`allergieStatus` ma tramite un **mapper estratto** (`buildConfirmCartella`/`confirmCartella.ts`, unit-tested),
quindi la stringa letterale non è più inline. È un test di prodotto accoppiato all'implementazione,
divergente dal refactor di `main`. `ci-browser-e2e-config.test.mjs` è un'altra fixture di prodotto simile.

## Runtime Evidence

- `logs/doctor-green.json` — output `doctor` verde.
- `logs/test-summary.txt` — riepilogo suite (106/105/1).

## Logs

Solo output CLI/test locali; nessun PHI, nessun secret (doctor sanitizza identità account).

## Residual Risks / Follow-up

1. **Test di prodotto stale nella suite** (`e2e-import-journey`, `ci-browser-e2e-config`): non testano
   l'orchestrazione e sono accoppiati a stringhe frontend refactorate. Da aggiornare al mapper estratto,
   oppure spostare fuori da `agent-team/tests/unit/` (sono QA fixtures di prodotto). **Decisione richiesta.**
2. **#263 completo**: restano da produrre gli artifact di evidenza richiesti dalla issue
   (`development-handoff.json`, `artifact-manifest.json`, `qa-result.json`, doctor smoke sanitizzato,
   claim-race, remediation-loop, SHA/digest mismatch, prohibited-action scan) sotto
   `artifacts/task-validation/263-agent-team-llm-first/`, poi **Codex QA gate** (Codex è il gatekeeper).
3. La issue #263 resta APERTA — nessuna chiusura (Codex gatekeeper).

## Final Decision

PARTIAL

(Port del sottosistema `agent-team/` su `feat/263-agent-team-port` completato e verificato localmente:
`doctor` verde e test di orchestrazione verdi (105/106; l'unico fail è un test di prodotto stale, non
orchestrazione). Restano: decisione sui test di prodotto stale + gli artifact di evidenza #263 + il Codex
QA gate. Non "done": #263 richiede la verifica indipendente di Codex.)
