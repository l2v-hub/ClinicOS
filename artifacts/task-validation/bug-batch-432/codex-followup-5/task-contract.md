# Task Contract

## Impact Classification
Clinical integrity at the existing authoritative one-off write guard. Surgical backend-only correction; no schema, UI, API format, authorization, dose, route, schedule, timezone or deployment-policy changes.

## Current Behaviour
Fresh independent final Codex after authentic Claude4 approval of c02e34c0041752eb4f4772255580807201f2c863 found P1 F1 at administration-record.ts49: read recordedOneTimeOutcomeSql/TS recognizes same-patient/civil-day modern therapyId OR legacy nulltherapyId+exactdrug across bands; existingSlotRecord writer only queries modern therapyId. Real unchanged confirmTherapyAdministration with a transaction double, network forbidden, reproduced legacy-given and legacy-refused pending-only requests creating1newrow each while modern controls reject. Repair missing oneoffclock to valid11:30 after historical00:15 record makes the source path reachable. Existing DB legacy fixtures with null prescription clocks reject before this guard and do not cover repaired valid-clock transition. This is actual-source diagnostic, NOT fresh realDB/API proof. Final Codex verdict FAILED VALIDATION1P1,48 focused PASS; actualClaude4 approval and all older attempts remain immutable.

## Expected Behaviour
The authoritative writer recognizes the same existing civil-day outcome as the reader inside its SERIALIZABLE transaction. A dose already given cannot be given again or downgraded. A historical refusal cannot be bypassed by a stale pending-only request; explicit observed-refusal correction remains possible and changes only the selected existing record.

## Acceptance Criteria
- Single-day one-off lookup uses exact patientId/date plus moderntherapyId or legacy nulltherapyId/exactfarmacoNome, across allbands, only recognized erogata/non_erogata. Priority matches current readers: given wins even over modern refusal, modern before legacy ties, stableid. Use existing pure helper when sensible; no duplicate SQL/TS priority drift, no unbounded broad scan or patient data load before access validation.
- Given (legacy or modern) rejects confirm/not-administered regardless pending/observed-refused/noexpected state; zero new records, receipts or row updates. Legacy refusal rejects expectedStato da_erogare; explicit expectedStato non_erogata confirmation uses the actual observed existing row with existing authorization and actor attribution, corrects at most once, then repeated non-keyed attempt blocks. Preserve requestId atomic replay/idempotence, existing actor/currentscope checks, existing explicit correction behavior, and legacy identifiers/history provenance. Never batch-rewrite or manufacture a second row to fold legacy history.
- Preserve daily multi-dose singleband/exacthour behavior, read-only invalid/untimed clocks and measured-dose guards. No other patient/date/drug/nonnull-othertherapy record can be treated as the target. If identity cannot be established, refuse instead of guessing. Cross-band legacy with target validclock, repairedclock, contradictory given/refused/modernduplicates, both endpoints, scope denial and explicit correction must be tested.
- Add meaningful pure actualwriter transaction-double regressions in new legacy-administration-record.test.ts and extend existing real HTTP/PG therapy-authoritative-write.test.ts fixture to cover valid/repaired clocks. Pure assertions use actual call flow/outcomes, not source-text mirrors. DB acceptance: before/after complete relevant rows/receipt counts and audit attribution, invalidpending409/zero mutation; explicit correction exactly1row/expectedactor/persist/reload; keyed replay still exactly1receipt. Include nonmatching identity and multi-dose controls.
- Author can run fresh targeted pure regressions, slot-scheduling and backend types with credential-stripped trusted runner; NO DB/API/browser runtime yet. Independent dedicated QA later executes relevant actual HTTP/PG plus representative read-only rendered outcome/SQL after root resource grant, before new Claude on new verified SHA. Full unchanged frontend/backend suites are retained with provenance; no repeated broad local suites without new reason.
- Only three scoped source/test paths plus NEW safe packet. Root sole Git/index/ref/GH/canonical/provider writer. Snapshot/private copies preserve all old source/proofs hash/bytes/inodes; never rewrite original QA8/Claude4/final-failed report. Actual failures and test output durable/private, no forced ignored logs, no credentials/PHI. No issue closure/merge/deploy during author phase.

## Scope
- backend/src/therapies/administration-record.ts
- backend/src/therapies/__tests__/legacy-administration-record.test.ts
- backend/src/routes/__tests__/therapy-authoritative-write.test.ts

## Test Plan
First reproduce prior failure with focused regression on old source privately, then actualwriter pure cases finalsource and backend typecheck. Author realDB tests prepared but UNRUN. Fresh independent relevant HTTP/PG transaction/receipt behavior and selected UI/outcome consistency once current QA497 runtime explicitly handed back; no queued services. All6 native current-publication checks then actual Claude5 and fresh finalCodex. Preserve previous four actual review rounds; continue per user authorization without reset.

## Evidence Plan
Private /workspace/.clinicos-cloud/483-legacy-writer-author9-20261021. Public artifacts/task-validation/bug-batch-432/codex-followup-5: contract, analysis, execution plan, author results/hashmetadata and safe copy of actual independent finalFAILED report/summary. Diagnostic harness and raw logs private; existing packet8 media/QA7QA8 provenance unchanged. New runtime screenshot/SQL receipts only from actual independent execution.

## Gate Status
READY FOR IMPLEMENTATION only after authenticated implementation8→9 extension/reservation/readback. Existing CodexfinalFAILED supersedes release readiness of approved c02e, not historical review record. QA497 owns clinicalruntime; author cannot launch or queue services. User explicitly authorized continued iterations retaining history.
