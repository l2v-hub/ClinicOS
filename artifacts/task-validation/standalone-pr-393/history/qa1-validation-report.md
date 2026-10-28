# Fresh independent QA — PR #393 reconciliation

**Final Decision: FAILED VALIDATION**

17 October2026, Europe/Rome. Dedicated QA session independent of author/coordinator. Candidate: `codex/reconcile-pr-393`, baseline main `299ba8ff8d048631cdb969f26656d02de981da83`. Source25/contracts3 were frozen before QA; source-manifest SHA256 `eeeebb5fa6ddc80940ec50baba8b3aad4383311845b3dda4a72034db577877c6`. Before/after checks match all28 hashes; existing file STT remains byte-identical to baseline. QA made no product edits, GitHub mutation, commit/push/merge/closure or real model/provider call.

One additional adversarial probe found a real lifecycle bug after the normal suites and37-case runs passed. **Do not publish this candidate as review-ready or merge-ready.** The isolated failing repro and successful prior runs are retained separately; no assertion was removed or made less strict.

| Mandatory phase | Result | Evidence |
| --- | --- | --- |
|0 Contract | PASS | `task-contract.md` here plus parent AC1–AC7/analysis/plan. Original live PR body/comments/reviews read; historical Azure default/current-deployment claim distinguished from the newer default-OFF provider-neutral reconciliation. |
|1 Full diff | FAIL/P2 | `diff-security-review.md` and `finding-early-buffer.md`. Full tracked/untracked candidate reviewed; early parsed buffer error can strand a microphone-open state after capture shutdown. |
|2 Independent build/tests | PASS | Frontend1386/1386; Python240/240; six new independent runtime/ASGI probes; production frontend build741 modules and backend tsc zero errors. Each integrated execution independently passes12 focused backend tests. No failures/skips in these selected suites. |
|3 Actual Playwright | FAIL | Three complete normal runs each37/37 actual assertions, then separate early-buffer probe with3 precedingPASS and1 mandatoryFAIL. Actual DOM remains TRANSCRIPT_PARTIAL while tracks stopped/peer closed/commits0. Source, fixture, video, screenshot, trace and machine observation preserved. |
|4 Security/privacy | PASS with correctness finding above | Auth/capability/feature/rate/MIME/byte/secret boundaries assessed; actual ASGI/owned-PG negatives; synthetic data only; privacy/media report validates full PNG/video/ZIP and synthetic-session sanitation. All four owned stacks cleaned. No credentials, real patient database, paid provider or activation used. |

## Acceptance

| AC | Outcome |
| --- | --- |
|1 Current/legacy batch selection/defaults/flags | PASS locally; existing `voice/stt.py` byte-identical to baseline. |
|2 Explicit registry realtime/model/no fallback | PASS locally; missing/off/unsupported never creates an adapter call. Status configuration is not provider readiness. |
|3 Auth/ACL/rate/MIME/bounds/server-only credentials | PASS locally through actual owned-PG route and real ASGI tests; no real provider. |
|4 Lifecycle/failure/recovery | **FAIL:** valid parsed empty-buffer code while partial/listening stops capture but retains mic-open UI state. Other cancel, permission denial/late permission, disconnect, resident change, hidden tab, unmount and stale AudioContext/new permission race pass. |
|5 Display-only partial/final/clinical confirmation | PASS for tested paths: final while listening and in250ms precommit window ignored; normal final exact; no request/write before operator send+separate confirmation; exactly one120/80 and visible readback after reload. Error-state flaw remains AC4. |
|6 Independent regression/build/browser/media | Executed; normal suites pass, extra actual adversarial probe fails. No whole-feature PASS claim. |
|7 No false provider/activation claim | Boundary respected. **Positive Azure transcription and real RTCPeerConnection/provider compatibility NOT RUN**, not PASS. Source remains explicitly OFF. |

## Actual independent commands

- `npm --prefix frontend test`:1386PASS,0FAIL/skip, `logs/frontend-tests.log`.
- `PYTHONPATH=clinicos-ai-runtime /workspace/.venvs/clinicos-ai/bin/python -m unittest discover -s clinicos-ai-runtime/tests`:240PASS, `logs/python-full.log`.
- `/workspace/.venvs/clinicos-ai/bin/python artifacts/task-validation/voice-pr-393/independent-qa/adversarial_runtime.py`:6PASS, `logs/independent-runtime.log`. Real ASGI authorization before90KB malformed body, Unicode/JSON/exact64000-byte boundaries, fixed provider error, off/unsupported/no-session status, current+legacy models.
- `npm --prefix frontend run build`:PASS741 modules, `logs/frontend-build.log`.
- `backend/node_modules/.bin/tsc -p backend/tsconfig.json --noEmit`:PASS, zero-output `logs/backend-types.log`.
- Global-lock `independent-runner.mjs --out .../runtime-1`, then fresh runtime-2/runtime-3: each37browser+12backendPASS; respective `logs/independent-integrated*.log`. Real UI/mic/VAD/backend/policy/owned PostgreSQL, scripted provider explicitly labelled.
- Global-lock `early-buffer-runner.mjs --out .../early-buffer-probe`:12backendPASS, browser3PASS before the newFAIL, exit1, safe cleanupPASS. `finding-early-buffer.md`, `logs/early-buffer-probe.log`, `early-buffer-probe/test-results/early-buffer-observed.json` and browser-failure.json.
- `node scripts/quality-gate/validate-task-contract.js voice-pr-393`, own runner syntax, `git diff --check`:PASS.

## Evidence and exact limits

Normal final proof: `runtime-3/screenshots/01-partial-display-only.png`,02b early-final rejection,03 zero-write preview,04 confirmed120/80,06 provider fallback,07 actual typed response,12 visible persisted120/80 after reload/relogin. Full video, trace and machine JSON in runtime-3. `playwright-report/index.html` presents the actual normal Playwright API run results, not a claimed native Test-runner report; normal PASS does not override the additional failing probe.

Final failing proof: `early-buffer-probe/screenshots/independent-early-empty-buffer-error.png`, machine observation, failure JSON, full video and trace. Source failure line: `useVoiceChannel.ts:270-274` special-case versus audioReducer's TRANSCRIBING-only transcribed event acceptance. See finding for exact reproduction and bounded correction criteria.

Run1's screenshot12 lacked the result in the internal scroll viewport despite correct DOM/value assertion. Run2 changes only own QA framing with scrollIntoViewIfNeeded at07/12; manual inspection verified actual displayed120/80. A verifier regeneration then lost the first two pre-sanitization digest lists; `retained-earlier-trace-provenance.json` explicitly discloses that limitation, with no invented pristine-byte claim. The own verifier was corrected to accumulate receipts, and identical run3 supplies fresh final trace with retained actual pre/post synthetic sanitation hashes. All prior outputs preserved. These are QA fixture/evidence corrections, not product changes or new implementation/review dispatches.

Verifier uses the installed runtime Python `/opt/codex/runtimes/codex-primary-runtime/dependencies/python/bin/python .../verify_artifacts.py`; first application-venv invocation lacked Pillow and was corrected by choosing this existing interpreter. No dependency install or product patch. Artifact transformation changes only transient synthetic sessions/QA DSNs, preserving actual events/assertions; ZIP member resource names are identifiers, not promises of original payload hashes.

## Handoff

Root should reserve a bounded next author cycle, fix the early-error terminal-state contract, preserve all evidence, then obtain a fresh independent QA session after source STOP. Rewrite the historical PR title/body on future publication; bind eventual current-source native checks, review and evidence SHA before handoff. No current native checks/Claude review/merge/deployment/issue closure was performed by this QA, and no actual Azure provider state is inferred.
