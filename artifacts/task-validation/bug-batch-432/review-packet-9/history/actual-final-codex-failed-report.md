# Independent final Codex QA after actual Claude round 4

Final Decision: FAILED VALIDATION

Subject: `c02e34c0041752eb4f4772255580807201f2c863`. Tested source: `ae12862e8ff9ce03f117fc646ecd11a4a8a8bb56`. Reservation nonce: `93ef1e53-a027-4db4-85cb-b7c178595f83`. The saved actual Claude comment6322587090 approves this exact subject with0findings; its body SHA-256 matches the reservation. This review is independent and finds one P1.

## Blocking finding F1 — P1

**Legacy day outcomes do not participate in the authoritative write guard.** Location: `backend/src/therapies/administration-record.ts:49`; creation:129; pending-state guard:106. Reader identity: `backend/src/therapies/therapy-query.ts:118`.

A one-off has a same-patient/date/drug legacy MedicationAdministration with therapyId=null, recorded given or refused at00:15 in notte. Set or repair its prescription clock to11:30 in pranzo. The reader resolves the existing outcome across bands. An authorized stale/direct pending-only confirmation is nevertheless treated as unrecorded because existingSlotRecord queries only the modern therapyId. The writer creates a second given row for legacy given, or bypasses explicit observed-refusal correction for legacy refused. Both violate AC467.1 and follow-up3 write/read consistency.

The unchanged real confirmTherapyAdministration function and recordedOneTimeOutcome helper reproduce this using a pure transaction double. Network connections were forbidden and no database, HTTP server, browser or clinical runtime was used. Four cases:2legacy cases create1new row each; corresponding2modern-ID controls reject with0new rows. This is a source-level diagnostic, not a claimed real-DB/API test.

- Probe: `legacy-oneoff-probe-attempt3.mjs`, SHA-256 `28801dded0d69557ca8047f88202edd1b55b6427b8d65280b5eb7d83b8e7388a`.
- Actual stdout: `legacy-oneoff-diagnostic-attempt3/stdout.txt`, SHA-256 `a8af62c1947d082fe3345cf4f6bedcd3f7daf86da2c56d095cd57f2b6c0d04e9`.
- Actual runner receipt: `legacy-oneoff-diagnostic-attempt3/receipt.json`, SHA-256 `f6b76b0eeb28033393e72b273876126be8a10bdf5a48cee1ab6b9dc29359c6b0`.

Current DB legacy fixtures at `backend/src/routes/__tests__/therapy-authoritative-write.test.ts:1350` have null prescription clocks. Their18denied writes do not exercise the repaired valid-clock transition. Existing passes are authentic and retain their original scope.

**Minimal semantic remediation:** resolve the authoritative day outcome inside the write transaction with the same patient/day/modern-therapy-or-null-therapy-plus-drug identity used by readers. Preserve given-wins, modern-before-legacy and deterministic stable-id priority. Already-given must forbid a second dose; pending-only confirmation must reject legacy refused; explicit expectedStato=non_erogata correction of the actual observed refusal must remain possible. Preserve patient/day/drug scope, attribution/history, atomic actor-scoped receipts and invalid-clock denial. Fail closed when historical attribution remains ambiguous. No implementation was changed.

## Validation and provenance

| Check | Result | Provenance |
|---|---|---|
| Affected SQL contract |4PASS/0FAIL/0SKIP|Fresh trusted verification runner; fresh-sql-contract |
| Slot scheduling/outcome priority |4PASS/0FAIL/0SKIP|Fresh pure tests; fresh-slot-scheduling |
| Parser/verification/Agenda/calendar/dashboard |40PASS/0FAIL/0SKIP|Fresh7focused files; fresh-frontend-focused-attempt2 |
| Legacy-write diagnosis |P1 reproduced in2legacy cases,2modern controls reject|Pure actual-source transaction double; separate from test PASS counts |
| Source bytes ae128→c02 |PASS|Only artifacts differ; all5773manifest source hashes match; clean Git |
| Frozen source/proofs |PASS|13349files preserve SHA-256,bytes,inode,device,mode,nlink before/after |
| Historical proofs |PASS|All7442old proof hashes/bytes;7QA8 phase-report hashes |
| Selected receipts/media |PASS|14original receipt hashes;39original+published media hashes/bytes |
| Original QA8 report/STOP |PASS|Byte-identical originals and packet copies |
| Clinical safety |FAIL/BLOCKED|F1 above |

Full PR source diff from a516d42e and delta bc90→c02 are preserved under full-pr-diff/delta-diff with actual runner commands/stdout/stderr/exit. Review covered changed production behavior, query and write identities, read-only UI consumers, scope/authorization, migration, retry receipts and acceptance/runtime-data consistency. The4308210c production fix is present; ae128changes one positive SQL fixture assertion plus artifacts; c02changes artifacts only.

The initial frontend attempt failed before application assertions because my bootstrap assumed a frontend-local tsx path; retry uses the existing hoisted dependency and passes40tests. Both original logs remain. Diagnostic attempts1/2 failed due to an overstrict mock scope assertion before any writer query; attempt3 corrects that mock assumption and reproduces the defect. No failed attempt was overwritten or recast as an application-test pass. Original receipts are retained verbatim; summary counts are parsed from their actual stdout (Node's spec reporter usesℹ, TAP uses#).

Historical QA7:frontend1405PASS;backend1933PASS/1stale-SQL-FAIL/5SKIP;build/types historical PASS; aggregate FAILED VALIDATION unchanged. QA8 original invocation and continuations1/2/3 remain FAILED;4and6 failed preflight;5and7were not launched. Continuation8 records8UI PASS/0FAIL/1UNRUN,11contexts and0page/console/HTTP/write errors. Recorded SQL outcome counts9total/9verification/4given/4refused/1unrecorded and18denied409writes remain original phase evidence. No fresh full backend1939/frontend1405/browser/DB/build repetition was performed. Root's current-SHA native6PASS is retained as root-reported, not independently re-queried here.

All seven issues432/441/442/460/463/464/467 have attributable retained acceptance receipts. #432 inventory/import, #441 authoritative explicit clock, #442 barrier, #460 retry/correction, #463 catalog and #464Rome-clock evidence retain their phase provenance; #467 fails final safety acceptance because F1 concerns the same recognized legacy day identity. Existing recorded read-only Agenda/Giro/patient-calendar/dashboard/ward assertions remain valid for their exercised inputs.

The scheduled individual drug-dose detail has no actual App mount and stays UNRUN. A truly absent recordedAt database row is schema-invalid; legacy absent metadata is unit-only. This review does not manufacture coverage, turn the packet into one clean suite or certify deployment/issue closure.

## Security and resource disposition

No new package, configuration, auth-policy, provider or endpoint change was introduced by this QA. Reviewed product SQL uses Prisma tagged parameterized expressions; no new unsafe interpolation, user HTML sink, debug clinical logging or credential insertion was found in the source delta. Selected proof bytes match synthetic original evidence; no new real patient data or private raw clinical rows were published. The clinical integrity check is blocked by F1 even though read-side patient scope, typed outcome validation and read-only UI controls otherwise remain consistent.

Source/index/ref/GitHub/provider/settings and old artifact seals were not changed. Explicit QA outputs are private in the reserved directory. No clinical runtime, queued job, DB/API/browser service, provider call, merge, deployment or issue closure was started. Read-only /proc observation shows55432/3447/5447/8432closed and baseline5432still listening; no DB connection was initiated. Root owns all remediation/publication decisions.

STOP — return to root for reserved remediation; c02e34c0 is not approved for release by this final QA.
