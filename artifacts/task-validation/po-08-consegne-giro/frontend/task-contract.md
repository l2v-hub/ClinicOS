# PO-08 frontend implementation contract

Status: IMPLEMENTED; candidate handed to root for integration and browser QA. The final receipt and claims file record the exact source snapshot and release time.

Owner `/root/po01_frontend_audit`; integration owner `/root`. Assigned worktree `C:/Workspace/ClinicOSHouse-worktrees/po08-handover-ui`, branch `codex/po08-handover-ui`, baseline `c52af6237c9cbbda9a39a770c1278573567eb958`.

Root GO authorized implementation after verified PO-07 Railway `de579c06-cd7d-4164-af15-ea11357adbed` SUCCESS/health200 and Vercel `dpl_HriFD1fuaDkr1FNWCxFkVDuydrAw` READY/sourceCommit/alias. The worker implemented and validated the claimed frontend paths. Dependency/manifests/lockfiles, server/port, commit/push/deploy and worktree deletion remained outside this worker's authorization. Both inherited launcher files retain their exact bytes. The existing root-led hierarchy supplied coordination.

Authoritative product contract: `C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-08-consegne-giro/task-contract.md`, plus the root/backend wire clarifications reproduced below. Root performs integration, browser QA, benchmarks and publication.

## Result and navigation

General/sidebar Consegne opens Giro Pazienti: immediate compact paginated roster, PO-06 identity, PO-07 order, optional name search and server camera filter. Desktop presents roster and composer together; mobile is sequential while selected identity remains visible. No full charts, scope expansion or new generic workflow engine.

The existing chronological Feed remains explicitly reachable. Root approved `openConsegneFeed({patientId?,status?,focusId?})` for dashboard and Agnos entries, distinct from general navigation. The PatientDetail Consegne tab remains. A visible handover outside patientScope does not provide patient access or populate the editable roster. Every patient chart navigation keeps its existing authorized ID lookup.

## Confirmed wire contract

- Existing GET `/patients/page` and POST `/patients/page/search` gain optional `room`. It matches contains on the authoritative room only (not bed), normalized for case/accent and escaped server-side before LIMIT. Trimmed input maximum 80 characters; empty means absent. `room`, `asOf`, order/context and server epoch bind the cursor. Name search stays POST.
- POST `/consegne/patient-summary` body `{patientIds:string[]}`, maximum 50, returns `{items:[{patientId,total,open,urgentOpen,statoRicovero:string|null}]}`. Both patientScope and handover visibility apply. Authorized patients with no visible handovers have zero; omitted IDs are unavailable, never inferred zero. Loading, failure, zero and historical-only totals remain distinct.
- POST `/consegne` accepts additive `requestId`, optional for legacy callers and required for new UI. Allowed pattern `^[A-Za-z0-9_-]{1,128}$`; `crypto.randomUUID()` is suitable. Existing input fields remain patient ID, priority, type, note, due date/time and assignee ID. Identity/actor/status come from the server; new records are always `aperta`.
- Success returns the record at top level plus `requestId` and `replayed`. Client verifies requestId and pazienteId before accepting a receipt. `(actorId,requestId)` identifies an immutable initial-payload receipt. Same key/body replays the same record ID; changed body returns 409 `consegna_request_conflict`.
- Replay after edit returns the CURRENT record and `replayed:true`; the hash comparison uses the original immutable request, not current record fields. Client must not require original note/type/status on replay or overwrite edits. No duplicate clinical snapshot is stored in the receipt.
- Retry after deletion returns 410 `consegna_creation_deleted` with only requestId/consegnaId/pazienteId; no recreation. Replay still checks access. 410, 404 and 409 preserve the draft and do not advance.
- Existing POST creation and voice service remain one backend creation path. Frontend creation outcome is shared by App, Giro, Feed create form and both PatientDetail quick-add paths.

## Draft, receipt and advance invariants

Workspace-owned memory stores every field, local revision, immutable pending request, save lock, outcome/uncertainty and receipt per patientId. No localStorage/sessionStorage/global PHI singleton. Changing selection or switching Giro/Feed preserves drafts. Session cleanup invalidates late results. Unsaved-exit protection must cover the actual lifetime boundaries, including reload/logout and app navigation that discards the workspace, without promising recovery after reload.

Save and Save-and-next are separate actions. A synchronous guard captures patientId, immutable request, local draft revision, session generation, selection generation, roster generation and successor ID. Selection generation detects changing away and back, not only current ID equality. Known successor comes from the visible server order at action start; never compute it from a later reordered array.

At page end, capture the continuation cursor and query/order/context identity. Resolve the next page under that same generation and freeze its first valid successor ID before arming advancement. Do not guess an index or substitute a successor from a reset sequence. Receipt success and continuation success are independent: failed continuation does not undo a valid save, and 409 reloads while retaining selection/drafts and disabling that action's auto-advance.

Advance only after a validated successful receipt and unchanged selection/filter/context/roster/session token. Uncertain outcomes retain the exact requestId and body for retry; no automatic advance. A matching receipt clears only its own matching draft revision. A new draft or another patient's fields cannot be cleared by late responses.

The advance guard also requires the same receipt and draft revision after the continuation resolves; typing, discarding or saving another draft cancels the old advance. PatientDetail refresh reads the current view scope and immutable saved patient ID; patient-feed commits, errors and finalizers reject a disposed scope, including A→B→A.

Receipt feedback says `Consegna salvata per …`; the just-saved badge derives from that receipt. Refresh errors are displayed separately. Do not optimistically double-increment totals on replay. Preserve current operator assignment capabilities. Discharged status is informative and does not introduce a new creation denial.

## Acceptance evidence

Focused DTO/store/advance/navigation tests, existing PO-06/07 reader and identity regressions, quick-add/feed/dashboard/Agnos/voice regressions, build and scoped baseline-relative lint. Root browser covers five-patient rounds without typing, >50 rows, homonyms, room matches after the first page, both sort directions, drafts, boundary continuation, late responses, duplicate clicks and failure outcomes. Backend owns concurrency/response-loss/replay/delete transaction tests. No live patient changes.

Final handoff includes `source-manifest.json`, `final-receipt.json`, `build-manifest.json` and released `claims.json`. Build passed; scoped lint introduced no diagnostics. Candidate tests passed 116 cases; six unchanged MultiPatientParametri static guards failed identically against the exact baseline source inputs and are disclosed. Independent read-only review confirmed the two delayed-callback fixes. Root owns the remaining integration/browser and release decision. Preparation receipt remains a historical record.
