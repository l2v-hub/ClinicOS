# Corrective candidate 2 — QA450-1

Group: #450, #472, #473, #475, #476. Baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`; reserved implementation round **2/4**. Candidate 1, its 134-file seal and independent QA1 remain unchanged. This candidate is not an independent validation verdict.

## Correction

Every draft-opening caller now checks that conflict decisions are saved and the review can proceed **before** creating a handoff intent. Footer dismissal, header close and Escape therefore preserve the original, edits and conflict choices without submitting an unresolved review. `createDraftFromImport` retains the server's existing status/code in `DraftApiError`; only the definitive `409 unresolved_conflicts` refusal discards that rejected intent. Network failures and uncertain 503 outcomes retain the existing frozen request/review and recovery behavior. The handoff class and its recovery tests are unchanged.

The correction changes two production files, one real caller/lifecycle regression file and the existing canonical browser runner, all within the 47-file scope. No schema, dependency, auth, production deployment or other scope changed. The guard and selective rejection handling are centralized at the existing `openDraft` entry point; no extra component or state machine was introduced.

## Local verification

| Check | Result | Evidence |
|---|---|---|
| Real caller/lifecycle and unchanged handoff regressions | 14 passed, 0 failed/skipped | `logs/caller-regression.log` |
| Baseline countercheck | Original caller fails both new unresolved/rejected-intent cases; correction restored before other verification | `logs/caller-baseline-red.log` |
| Full frontend suite | 1390 passed, 0 failed/skipped | `logs/frontend-all-tests.log` |
| Frontend TypeScript + production build | PASS | `logs/frontend-build.log` |
| Frontend secret scanner | 0 findings | `logs/frontend-secret-scan.log` |
| Final amended runner syntax, format and isolated source guard | PASS; actual capture block hashes47, does not query dirty Git state, rejects invalid scope | `logs/harness-syntax-final.log`, `logs/format-harness-check-final.log`, `test-results/runtime-guard-check.json` |
| Full-stack browser on the final amended harness | **UNRUN — assigned to independent QA2** | Independent reviewer will generate fresh19check evidence in its own OUT |
| Source scope/history integrity | Only four files differ from candidate1; seven frozen hashes and original 134-file manifest remain valid | `test-results/cycle-2-source-delta.json`, `test-results/source-freeze-47.json`, `test-results/final-integrity-scan.json` |

The registered saver regression uses the actual Workspace, handoff class, API client and mounted review registration/effect lifecycle. It exercises repeated unresolved saves, an unsaved selection, saved corrected choice, preserved manual address, definitive server rejection followed by a corrected same-extraction review, and uncertain network/503 recovery. Existing immutable-source, select/defer, explicit-source and lost-response recovery assertions remain active.

Two local development browser attempts each passed all17 historical checks and the new real footer/header/Escape/dirty-choice rejection case. Attempt1 then timed out because its oracle awaited POST for the actual PUT review endpoint. Attempt2 used PUT, reached the corrected identity, closed the review successfully, then timed out looking for a draft card while still on the Nuovo ingresso chooser. Root inspected its actual screenshot and confirmed that missing test navigation. Its real trace contains POST201 seeded with Corretto Conflitto and PATCH200 returning the corrected name and address. The final SQL/card assertions were **not reached**, so neither attempt establishes19/19 acceptance. Both original logs, screenshots, traces and source receipts are preserved in `development-attempt-1/` and `development-attempt-2/`.

Following the controller's frozen `cycle-2-runtime-verification-amendment.md`, the final runner now clicks the actual Pazienti sidebar before locating the draft card and executing the unchanged SQL/name/address/one-creation assertions. It also uses the standard Playwright browser/cache by default, with explicit local overrides only, and reads the canonical frozen47-file scope instead of relying on dirty Git files. An isolated execution of that exact capture block hashes all47 actual files while permitting only `git rev-parse HEAD`; empty, duplicate, traversal and absolute scopes fail closed. This is a harness guard check, **not an actual clean-clone or browser run**. All47 hashes remain stable after these checks. Root explicitly assigned the fresh final19 browser run to independent QA2 to avoid an extra duplicate lifecycle; the author does not claim a final runtime PASS.

## Runtime and pending controller gates

The canonical command requires a single **outer** `flock /tmp/clinicos-browser-qa.lock` around its entire PostgreSQL/service/browser/teardown lifecycle; the runner itself does not acquire flock. Local Docker runs use only the owned, loopback-55450 synthetic PostgreSQL16 container. Local invocation must explicitly set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` and `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/clinicos-batch450-playwright`; configured hosted/CI Playwright installations use their standard defaults. The existing host database on 5432 is not accessed. Real application HTTP/upload/jobs/parser/review/draft/storage/PDF pixels and SQL persistence execute. Only external OCR/extraction uses deterministic synthetic provider responses; actual paid inference remains unverified. Font routes serve the bundled, licensed and hash-verified real pinned WOFF2 assets, with actual normal/bold load and geometry assertions.

Round2 changes frontend/caller behavior only; backend units were not rerun by this implementer. QA1's frontend1386/build and focused69 backend results are historical. Its proactive23 and independent browser phases were **UNRUN**, and its verdict was FAILED VALIDATION. The controller records preliminary QA2 frontend1390/typecheck/build, backend69 and proactive23 PASS in its frozen runtime amendment, all bound to unchanged application source. That does not complete independent QA2: it must review the exact final runner delta and generate fresh19 browser/SQL/security proof before a final verdict. External Claude review, required CI, publication and verified release remain controller gates. No GitHub state mutation, commit, push, PR, Claude invocation, deploy or issue closure was performed by this implementer.

Status: **IMPLEMENTER CORRECTIVE PACKET SEALED — FINAL INDEPENDENT BROWSER/SQL QA2 PENDING**.
