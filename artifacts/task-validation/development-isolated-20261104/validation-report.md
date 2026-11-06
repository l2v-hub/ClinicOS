# Validation Report — ambiente development unico

## Result and scope

Il nuovo ambiente development persistente è disponibile su https://clinicos-development-isolated.vercel.app. Cinque profili sintetici passwordless: amministratore, supervisore, medico, infermiere e OSS. Railway è nuovamente accessibile. Database, volume, runtime AI, credenziali e progetto frontend sono dedicati; la demo precedente rimane indipendente. La futura produzione ClinicOS non è stata creata.

Questo report riguarda il rilascio applicativo manuale autorizzato dall'utente, non l'attivazione del controller protetto delle PR 528/529. La sorgente di lavoro unica è la branch `codex/development-workspace-20261105`; la guida per le modifiche successive è `docs/operations/development-release.md`.

## Exact release inputs

| Component | Source / deployment | Observed image |
|---|---|---|
| Backend | M `b5e79ae7bec869af894f12ed6676547f21172db4`; `82304c48-7b14-474d-be4b-890519c7a215` | `sha256:92c75ecd4a28167802a4af7d560018dcbe48ff401f338fbd7e28b080c099d56e` |
| Private AI runtime | S1 `79346c2aa4d753c8f15d6e03c14378cc252d8c89`; `82e468ff-ff9f-4a57-b785-81c7fa491289` | `sha256:4993f249f6d3be35509a492a48b345acf967f5780e57627c48908fe0ead0c0d7` |
| Frontend | F1 `e99ee55adf4036089b1616151f6bad37ec2e0828`; `dpl_3wm5mWVhp7GsNuuAv3SVZoj6qKGM` | JS bundle SHA256 `632b47c0b632765a64040ae2c7b8f4e5396b24d4a2170f14a3e223dc51712f6a` |
| PostgreSQL | `b11e63a5-5611-4a12-8fa7-71f18d02ce42` | `ghcr.io/railwayapp-templates/postgres-ssl@sha256:4fc833b43d2aaf6ecc9b18615f5533602b723a32d0e2efe2dae8ca0f7217c863` |

Project `30bfd0c6-2b4d-4fcd-b219-f1fbfe1d9820` has one environment, `development` (`e54fd397-76c8-4a14-ac03-4d8a4d580173`), three services and no deployment triggers. Dedicated PostgreSQL volume: `64536a4c-e0c1-4cff-ad76-7f8f33f18926`. The Vercel hosting target named `production` belongs exclusively to this development project and its stable URL.

The canonical source baseline commit is `f4da5737d31b3be9d3da328d4cbf380fb907581a`. Its backend subtree equals M, frontend equals F1 and runtime equals S1. Subsequent report-only commits do not constitute a new application deployment. The component manifest records this distinction.

Runtime versions actually observed: backend Node 20.20.2; AI Python 3.11.18, Agno 3.1.12 and OpenAI SDK 3.46.0; Vercel Node 24. Backend automatic migration completed with no pending migrations. No manual SQL, seed, copied historical database or production fallback was used.

## Acceptance and functional parity

Evidence names below resolve from the retained local evidence root `C:/w-rv/tmp/development-isolated-20261104/`. The curated evidence index binds exact bytes and selected sanitized receipts; raw provider output, credentials, audio, originals and the user's PDF are excluded.

| Criterion / family | Result | Actual proof and scope |
|---|---|---|
| AC1: isolated source/build/deploy/storage | PASS | Provider-verified component IDs/digests, private bindings and migration observation; `development-backend-stt-deploy-preparation/backend-deploy-verified.json`, `development-ai-release-preparation/runtime-deploy-verified.json`. |
| AC2: effective policy matrix | PASS | `development-final-role-browser-verification/roles/live-result.json`: five roles ×145 normal and ×145 tampered decisions, zero mismatch/unknown/skip, cleanup certain. This tests decisions, not 145 endpoint executions. Raw registry has203 entries; effective policy has145. |
| AC2: actual API allow/deny | PASS | `development-enforcement-verification/live-stdout.json`:20 normal/spoofed requests on patient/document routes matched expected allow/deny. No claim of exhaustive HTTP enforcement coverage for all actions. |
| AC2: desktop/mobile role UI | PASS | `development-final-role-browser-verification/browser/run-4pg6wg/receipt.json`:10 cases across five profiles, no overflow, redirect, popup, websocket or blocked request; logout204 followed by auth/me401 for the observed sessions.20 avatar/navigation crops independently inspected. |
| AC2/4: real reload/reselection | PASS,10 cases across two successful evidence sets | Separate original refresh receipt records8 passed. `development-refresh-browser-proof-preparation/run-JxVmdj/receipt.json` completes only mobile nurse/OSS with actual browser module SHA/CSP proof, reload/reselection, capabilities/dataset checks and individual revocation of both sessions; cleanup certain, unknown0. Both earlier failed attempts remain preserved and linked. |
| AC3: patient, admission/chart, diary, original document | PASS | R2 `development-functional-verification/r2/receipt-8bccea8c06c13890-013.json`, extended tag `f9441adc0123b9e3`; generated PNG upload/download byte hash and created records read back. |
| AC3: parameters, therapy, protocol, PRN/administration | PASS | Extended tag `f9441adc0123b9e3`, beds/protocol tag `a7a6f89fa43c6811`; suspended synthetic therapies/protocol, synthetic PRN and one fake administration, with explicit doctor confirmation where required. |
| AC3: agenda, handover, operators, note, beds/assignment | PASS | Additional families tag `badb560158d99a81`, beds tag `a7a6f89fa43c6811`; future synthetic appointment, own synthetic handover/self-note, room/bed/finite assignment and directories. Assignment note is not returned by GET and remains unverified. |
| AC3: compose, OCR and STT in private runtime | PASS | `development-ai-live-verification/receipt-2176d5c750071f86-013.json`: real semantic compose, generated image-only PDF OCR review_ready, generated Italian WAV transcription with anchors; source S1 and exact runtime image. |
| AC3: backend voice and assistant | PASS | `development-ai-backend-verification/receipt-c70d572d4f444528-013.json`: real voice and LLM planner/composer against known synthetic records, no fallback. Admin403 and malformed voice400 tested before provider use. |
| AC3: full import/OCR/archive original | PASS | `development-import-verification/receipt-4746165f31dc651b-013.json`: OCR identity anchors verified, explicit operator phone, confirmed new patient201, patient readback and archived PDF byte identity. No manual bypass of OCR. |
| AC3: Agno skills/converse | PASS | `development-agno-preview-verification/receipt-6a27b2930cb43402-006.json`: real private skill routing/Responses API, Agno interpreter, NEEDS_CONFIRMATION preview and unchanged measurement ID set. No execute/confirm issued. |
| AC4: actual database/backend restarts and data persistence | PASS | Native accepted + physical frame receipts, then `development-native-persistence-readback/receipt-022.json`:14 groups; `development-import-persistence-verification/receipt-007.json`:4 import groups including original bytes. IDs/hashes match pre-restart records. |
| AC4: real invalid OCR failure | PASS | `development-runtime-negative-verification/receipt-750420260ab671ff-006.json`: deliberately malformed synthetic PDF, job terminal failed, attempt1, errorKind invalid_request, no result. Does not claim a real provider outage. |
| AC4: runtime failure handling | PASS, offline |21 source-S1 tests for timeout/cancel/fencing/truncation/repair/limits/replay. `development-runtime-failure-verification/offline-unittest.log` SHA256 `bdd70226c1c75c81a6feb46bb9e35ef06a0f01eec7de7245449a4adbf7014881`. Python3.14 test host differs from live3.11. No live outage induced. |
| AC4: validation, conflict, denied access | PASS | Voice400/403; `development-conflict-verification/receipt-ed918f956d48cbcb-008.json`:duplicate appointment409 slot_conflict, original ID set unchanged, no new appointment ID. |
| AC5: reviews/CI/QA and safe release path | PASS with declared limits | Independent `qa/final-qa-receipt.json` decision PASS_WITH_DECLARED_LIMITS:33 curated entries,40 actual inspected crops,10 combined unique refresh cases, exact source/component binding. Application CI and focused peer checks remain scoped as below. No protected controller promotion or main merge. |

## Lifecycle and persistence evidence

The initial clinical-family fixtures were created on predecessor development backend `069efbfa-270d-4c7a-b23e-78804edf6aa0`, also source M. The final backend `82304c48-7b14-474d-be4b-890519c7a215` adds only the qualified STT model configuration; its post-restart readbacks verify the retained records and original bytes. Historical creation receipts are not mislabeled as execution on the final deployment.

The old PowerShell restart harness was blocked by Windows antivirus before parsing and produced no provider operation. It was not executed, renamed or decoded, and antivirus settings were not changed. A separately reviewed, ordinary native Railway CLI invocation supplied each actual restart. Each was invoked once; internal provider retry behavior is unqualified.

Database operation `ffd3df42-fa83-4167-b68f-4f80424904e7` was physically verified before backend operation `6571bcd6-cc8b-4df2-b092-11e56190c2cf` began. Before/after start ticks and PID namespaces changed on the same deployment and image. Host kernel boot ID remaining unchanged is consistent with container restart. PostgreSQL ready and backend ready/database/policy passed after the observations. Accepted requests alone were not used as restart proof.

The native readback adapter checks genuine new accepted/physical/frame hashes and order, not fabricated old-format restart receipts. No native unknown markers exist. Four old restart observed/scope receipts remain absent. Source M's in-memory session revocation is verified only in each observed process; neither this restart proof nor fresh logout tests prove durable invalidation of historical tokens.

Reload intentionally clears the in-memory browser bearer and returns to the five-profile selector in source M. Persistent instance/data is distinct from continuous browser authentication; reselection of the same profile is the expected reload behavior. No bearer was injected into storage to change that behavior.

The original eight refresh cases passed; the ninth failed at the chooser with a blanket cleanup-unknown field. Independent source review places it before intentional login but does not prove server-side absence of every POST. A new two-case continuation stopped before auth while verifying the frontend through an extra Node fetch: observed sessionAttempted:false, sessionPosts:0 and contextClosed:true, cleanup certain. A final independently reviewed test instead hashes the module response actually loaded by the browser, armed before navigation and reload; it makes no extra frontend Node fetch and changes no request guard, user-agent, app source or provider security setting. Both missing mobile cases then passed. It binds both earlier stdout hashes and preserves their original results; it does not erase the historical unknown. The final helper checks declared body size when present and actual bytes after Playwright buffers them; no hard preallocation limit is claimed when Content-Length is absent. Sixteen focused offline guard tests passed before this final live continuation.

## Review, CI and policy binding

- Actual GitHub run [41826195990](https://github.com/l2v-hub/ClinicOS/actions/runs/41826195990): completed/SUCCESS, exact M head.
- Actual application QA run [42105091330](https://github.com/l2v-hub/ClinicOS/actions/runs/42105091330): completed/SUCCESS at `95745bfd6bbe14a0397ac9a6df014c1115d85850`; secret-scan, frontend-tests, archive-tests, gate, browser-e2e and real-provider all successful. Its backend/frontend/runtime/prisma/package source equals M; this equivalence was independently checked locally.
- F1 changes only dedicated frontend hosting configuration. Focused checks, deploy/input manifest and live bundle/CSP checks qualify this change separately. S1 changes the OpenAI STT multipart compatibility leaf plus contract tests;48 offline tests, independent technical review and real STT tests qualify it separately. M-equivalent CI does not prove F1/S1 patches were tested in that run.
- Historic approved M/PR525 R7 review is retained. All four native Claude Max advisory allowances were consumed; fourth context-incomplete result remains disclosed. No fifth advisory, counter reset, invented approval or new Claude Max review of S1 occurred.
- Controller PR529 remains nonmerged/nondeployed. Its bug-pipeline run42105091442 was cancelled, with provider/config verification skipped. This is not an all-CI-green claim. PR528 E4 remains frozen. Protected policy/controller/workflow trust roots were not promoted.
- Independent final evidence/privacy QA completed with decision PASS_WITH_DECLARED_LIMITS and no concrete blocker. `qa/final-qa-receipt.json` SHA256 `6fe700517b4a85c81e97d1ce4d910128efaf2e5f8041b993ca14902ac48c5aa2` binds the frozen pre-closure draft,33 curated entries,40 actually inspected final crops and10 unique combined refresh cases. Its permitted closure edits change decision/status and add QA metadata; the original evidence index and component inputs remain unchanged. Source peers separately checked guards and source equivalence. A JSON intent, hash, lease, QA receipt or OAuth credential is evidence/coordination, not release authority.

## Security, data and preserved limitations

All data and identities used in the qualified tests were generated synthetic fixtures and the five simulator profiles. Provenance and complete API roster checks support this scope; they are not a continuous database dump or exclusion of every external actor. No user document, microphone recording, historical demo data or production credential was used. The OpenAI project credential belongs only to the new private runtime; frontend/backend do not receive it. The app remains synthetic-only with instance expiresAt:null, distinct from session TTL. No billing top-up or credit purchase was performed.

The AI daily token budget is a soft in-memory per-process accounting limit; STT is excluded. Job concurrency1 is not a global request cap. Numeric AI_MAX_RETRIES=0 falls back to2 in the legacy parser; SDK retries0 does not establish global zero retries. Import worker restarts may repeat provider work. Fallback is disabled and legacy fallback variables absent, but nominal model-call counts are not hard spend bounds. No unsupported global guarantee is asserted.

Historical mobile R1 cleanup remains unknown. New passing sessions do not erase it. The first separate refresh attempt's chooser failure remains in the evidence; its blanket cleanup flag is not silently rewritten. Cropped avatar/navigation screenshots do not establish exhaustive full-page visual or workflow coverage. Assignment-note readback is unavailable. HTTP runtime health has no status field; functional capability and real runtime tests are the evidence, not an invented health status.

Automatic approval review rejected deletion of two generated private credential transport files, `app-api.env.local` and `recipient-private-key.jwk.json`, with the sole reason `blocked by policy`. They remain in private owner/SYSTEM storage and were excluded from source/evidence publication. No alternative deletion was attempted. This cleanup limitation is separate from the resolved Windows AV restart-harness issue and does not become a claim of completed credential-file cleanup.

## Old demo, rollback and handoff

Previous frontend https://clinicos-eosin.vercel.app and API https://clinicos-backend-demo.up.railway.app remain their original targets. At `2026-11-06T00:20:35.816Z`, `development-final-release-preparation/public-final-browser-observation.json` records both frontends HTTP200 with five-profile choosers, both APIs ready/database/policy ok, and the old backend still `6a6b5d5a-edad-434a-a074-db19b2051dbe`; the new browser-loaded bundle matches the exact F1 SHA. No demo alias was moved. Separate default-Node/no-store frontend GETs had returned403 with Retry-After30 while normal browser/PowerShell samples returned200. The cause is unknown, not retroactively proven to explain the chooser failure; no provider security setting or user-agent was changed. The final browser observation is a client-specific result, not a claim that every request profile was unblocked. Rollback uses attested component inputs inside the dedicated development project; no environment deletion or copy of old data/secrets is required. Future production cloning waits for a separate user decision.

## Final Decision

CLOSED — VERIFIED

All required development acceptance checks and independent final QA are complete within the declared scope. The dedicated source branch and this metadata provide the handoff for future work; publication does not redeploy any component, activate a controller or create production. Historical unknowns and the separately blocked private-file cleanup remain explicitly disclosed above.
