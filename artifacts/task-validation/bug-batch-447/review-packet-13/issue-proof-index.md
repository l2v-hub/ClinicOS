# QA13 evidence resumption candidate3

Status: READY_FOR_INDEPENDENT_PUBLICATION_QA. Root independent publication QA is required. No Claude2 approval, deployment or closure is claimed.

This session independently verified existing actual QA receipts and copied media. It did not execute the earlier browser runs. Tested product source is bb12eb738817bf1c64ed08844f162ea4ccf7e473; publication SHA is unassigned. Old remote 17a127c432f39e094f2746dc33c38bcb234ce719 is distinct.

Actual attempt6 covers seven canonical scenarios, all PASS. Actual attempt8 covers route486, ten steps PASS. Actual attempt9 proves roster actual503 → real200 for the same synthetic patient, with unknown → verified DOM state. Attempt9 also proves PS source503/manual warning, full 12000-character print/PDF, authorized 2000 actionable and 2001/12000 blocked, explicit decision/confirmation, and unchanged SQL with zero mutation requests.

See evidence/sidecases-attempt9, provenance/resumption-verification-report.json and summary.json for current state. Older candidate2 pending statements are preserved historical context and superseded by this candidate3 receipt. All previous FAIL/UNRUN histories remain retained; no old QA4 PASS is substituted. External OCR/provider extraction remains unexercised. New publication-head native checks and actual Claude2 review remain pending.

All 1942 frozen snapshot product files and 1906 original source filesystem entries were verified. Copied traces pass ZIP CRC and signed-JWT scans; all videos pass fresh ffprobe. Issue447 uses the completed original 1,455,486-byte video, excluding the truncated file. Every copied artifact is below 25 MiB. Resources were handed back by attempt9; the resumption started none.

## Preserved candidate2 context

# Actual Claude1 finding-to-fix/test/proof index

Review subject: `17a127c432f39e094f2746dc33c38bcb234ce719`. Integrated tested source: `bb12eb738817bf1c64ed08844f162ea4ccf7e473`. Cohort runtime/source hashes remain explicitly attributed in their original seals.

| Finding | Issue | Source fix | Targeted test evidence | Fresh/independent proof and limits |
|---:|---|---|---|---|
| 1 | #454 | Visible secondary identity when CF and bed are absent; DOB or stable ID fallback. | UI cohort tests include two same-name patients and visible identity fallbacks. | Attempt6 fresh issue447/454 scenario receipts include the no-CF/no-bed distinct-DOB and missing-DOB visible-ID regressions; current integrated media and source fingerprint are bound to bb12eb7. |
| 2 | #457 | Bounded emergency-transfer reads; partial/unverifiable sections remain printable with a reason. | PS cohort targeted suite 47/47 and typecheck passed. | Attempt6 receipts include full 12,000-character reason retained, print enabled/invoked, and no registration write; fresh issue457 scenario PASS. |
| 3 | #451 | Search later pages before wrapping to earlier unfinished patients. | UI targeted pagination regression. | Attempt6 direct regression receipt verifies next-page patient chosen before skipped earlier patient; fresh issue451 PASS. |
| 4 | #447 | Keep dose panels mounted during focus refresh; preserve draft/note/glucose state and scope refresh. | React 46 pure/SSR tests and types PASS; real browser behavior has fresh integrated receipt. | Attempt6 actual focus refresh verifies same input node and draft retained; fresh issue447 PASS. |
| 5 | #452 | Retain a roster-level unknown status and show compact row-level verification marker. | React SSR/pure tests preserve existing list status and unknown marker semantics. | Attempt6 fresh issue452 scenario and status regression PASS. |
| 6 | #452 | Bound NEWS2 read concurrency/pages and share session-safe cached results. | React counting-fetch regression: 60 patients, peak concurrency4, total183, capped pages. | Attempt6 fresh issue452/regression receipts verify request bounds and roster/chip sharing; scenario PASS. |
| 7 | #457 | Give a paused administration action an accurate accessible label. | UI rendered/behavioral accessibility regression. | Attempt6 issue457 plus stale-callback regression captures; current seven scenario suite PASS. |
| 8 | #457 | Retain full clinical reason text and keep over-limit registration visibly blocked. | PS print/input regression retains 12,000 chars and no registration. | Attempt6 receipt confirms full input and print with no write; issue457 PASS. |
| 9 | #453/#454/#457/#486 | Bind media and validation claims to the exact source and scenario; separate stale recordings from fresh evidence. | Packet metadata corrected to the exact attempt6/8 evidence paths and integrated source receipt. | Seven current-source scenarios PASS and Issue486 10/10 PASS on bb12eb7; #447 genuine finalized-original video is used. Publication SHA still pending. |
| 10 | #457 | Retry read-only RepeatableRead snapshots on narrow serialization conflict and map assistant 40001 to conflict. | Backend targeted tests/typecheck; assistant conflict mapping test. | Independent backend runtime QA: 50 SQL strict-reader parity cases, actual 40001/P2010 mapped to HTTP409, concurrent history/attestation HTTP200. Exact runtime proof source SHA is separately recorded. |
| 11 | #457 | Serialize Cartella writers in Patient-before-Cartella order and preserve managed PS state. | Backend concurrency and writer guard tests. | Independent PostgreSQL/HTTP runtime checks covered parameters/depart, voice/return and import forgery interleavings; source SHA separately attributed. |
| 12 | #457 | Isolate malformed PS state per patient, expose typed PRN409, and fail closed for only that patient. | Backend slot/PRN tests and UI per-patient state/callback tests; original UI QA1 failure preserved. | Backend runtime proof covers malformed and valid peer behavior. UI QA1 stale callback actual FAIL is followed by bounded F12 fix and UI QA2 73+6 checks PASS; fresh mixed-patient regression PASS. |
| 13 | #454 | Use allergen name for each documentation row heading without duplicate summary. | UI component regression. | Fresh attempt6 issue453 allergy policy/revalidation receipt and issue454 scenario PASS; cohort regression test proves row label behavior. |
| 14 | #452 | Use existing design tokens for styles. | UI token regression checks no invalid token usage. | Fresh issue452 scenario PASS; token styling itself is covered by UI source test rather than a claimed isolated browser assertion. |
| 15 | #453 | Explain when allergy context changes during pre-save re-read and do not POST stale context. | UI async stale-read test verifies notice and no write. | Fresh issue453 receipt covers external allergy preflight, failed reads, revalidation/acknowledgement and no POST under unknown state; scenario PASS. |
| 16 | #454 | Replace brittle App.tsx regex assertions with rendered/helper behavior. | UI tests exercise the TherapyRoundsPage facility-date default. | Fresh issue454 actual scenario and persisted administration receipt PASS; targeted behavior tests recorded in UI cohort. |
| 17 | #457 | Audit depart/return without PHI and reject departure for discharged/archived patient before writes. | Backend audit/status guard tests. | Independent runtime QA verifies depart/return actor/role audit and 409 discharge refusal with patient version unchanged; source SHA separately recorded. |
| 18 | #454/#457/#486 | Keep the source-binding validation report honest and distinguish scenario coverage from release/closure gates. | This packet separates exact source SHA, current media, historical cohort checks, and pending recovery probe. | Fresh attempt6 7/7 plus attempt8 10/10 PASS. Actual 503 unknown-state probe is partially observed but recovery HTTP200 pending; no overall QA or publication readiness claim. |

## Preserved failure and pending probe

- UI QA1’s stale callback finding is an actual independent FAIL; no clinical mutation was proven. The author follow-up and independent UI QA2 resolve the callback behavior; QA1 artifacts are included unchanged.
- The separate negative probe observed actual 503 plus the unknown-state warning/target marker. Its recovery HTTP200 assertion remains pending because of a multi-element selector/wait defect. Classification and original failure are copied unchanged; no overall QA handback is claimed.
- Attempt5 partial browser failures and the two curation filename failures are retained in provenance.
