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

| AC                                                                   | Result | Evidence                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — 66 file `agent-team/` + 5 alias npm + gitignore roots          |   PASS | `git ls-files agent-team` = 66; `scripts.agent-team:*` presenti; `.gitignore` aggiornato                                                                                                                                                                                              |
| AC2 — `agent-team:doctor` verde                                      |   PASS | `logs/doctor-green.json` → `ok:true`, `developmentReady:true`, `qaReady:true`, 0 check falliti (codex/claude/gh autenticati, labels, git, worktree, roots-ignored)                                                                                                                    |
| AC3 — test di orchestrazione verdi; test di prodotto stale sistemati |   PASS | 27 file / **106 test / 106 pass / 0 fail** (exit 0). Il test di prodotto stale `e2e-import-journey.test.mjs` (QA-263-014) è stato aggiornato al mapper estratto `confirmCartella.ts` (invariante `allergieStatus` preservata, non indebolita). Tutti i test di orchestrazione passano |
| AC4 — nessuna modifica frontend/backend/prisma                       |   PASS | il branch della PR non tocca l'app; port confinato a `agent-team/` + root config                                                                                                                                                                                                      |

## Test Results

| Test                             |       Result | Evidence                                                                                                                              |
| -------------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| `agent-team:doctor`              | PASS (verde) | `logs/doctor-green.json`                                                                                                              |
| Orchestration unit + integration |         PASS | claim lifecycle/race, doctor, workers, protocol, state-machine, recovery, lease/heartbeat, prohibited-actions, sanitize → tutti verdi |
| Test di prodotto bundled         |         PASS | `e2e-import-journey.test.mjs` aggiornato al mapper `confirmCartella.ts` — vedi sotto                                                  |

## Test di prodotto stale — SISTEMATO

`agent-team/tests/unit/e2e-import-journey.test.mjs` (QA-263-014) legge sorgenti FRONTEND e asserisce
stringhe letterali. Falliva su: _"IntakeWorkspace confirm payload must carry data.allergieStatus into
cartella.allergieStatus"_. **Non era una regressione reale**: in `main` la mappatura è stata estratta nel
mapper puro **`confirmCartella.ts`** (`buildConfirmCartella`, riga 18: `cartella.allergieStatus = data.allergieStatus`),
usato da `IntakeWorkspace.tsx` (`buildConfirmCartella(data)`). **Fix applicato**: il test ora asserisce
l'invariante alla sua sede attuale (IntakeWorkspace delega al mapper + il mapper porta `allergieStatus` nella
cartella) — invariante preservata, non indebolita. Suite ora **106/106, exit 0**.
`ci-browser-e2e-config.test.mjs` (altra fixture di prodotto simile) era già verde.

## Runtime Evidence

- `logs/doctor-green.json` — output `doctor` verde.
- `logs/test-summary.txt` — riepilogo suite (post-fix: 106 test / 106 pass / 0 fail).

## Logs

Solo output CLI/test locali; nessun PHI, nessun secret (doctor sanitizza identità account).

## Residual Risks / Follow-up

1. **Test di prodotto nella suite orchestrazione** (`e2e-import-journey`, `ci-browser-e2e-config`): ora verdi,
   ma restano architetturalmente accoppiati a stringhe frontend. Opzionale: spostarli fuori da
   `agent-team/tests/unit/` (sono QA fixtures di prodotto, non orchestrazione).
2. **#263 completo**: restano da produrre gli artifact di evidenza richiesti dalla issue
   (`development-handoff.json`, `artifact-manifest.json`, `qa-result.json`, doctor smoke sanitizzato,
   claim-race, remediation-loop, SHA/digest mismatch, prohibited-action scan) sotto
   `artifacts/task-validation/263-agent-team-llm-first/`, poi **Codex QA gate** (Codex è il gatekeeper).
3. La issue #263 resta APERTA — nessuna chiusura (Codex gatekeeper).

## Final Decision

PARTIAL

(Port del sottosistema `agent-team/` su `feat/263-agent-team-port` completato e verificato localmente:
`doctor` verde e **suite 106/106 verde** (test di prodotto stale sistemato al mapper `confirmCartella.ts`).
Restano, per il #263 COMPLETO: gli artifact di evidenza + il Codex QA gate. Non "done": #263 richiede la
verifica indipendente di Codex — stato PARTIAL verso il REQ, port sub-task verificato.)
