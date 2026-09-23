# PO-08 implemented frontend composition

Implemented under root GO in the assigned frontend worktree. The table records the original integration seams; the modules and failure behavior below are now present in the candidate. Exact paths/hashes and evidence are in the final manifest and receipt.

## Existing seams

| Source | Current behavior | Planned narrow integration |
|---|---|---|
| App.tsx | `addConsegna` returns boolean and discards the record; Feed loading keyed only by route | Shared typed creation outcome; session workspace; explicit Giro/Feed entry; refresh receipts separately from feed/summary reloads |
| ConsegnePage.tsx | Existing feed, initial filters and focus; inline create form | Retain feed behavior and controls; explicit initial query/focus entries without resetting the round workspace |
| ConsegnaCreateForm.tsx | Local fields, async boolean save; assignee only for isAdmin | Reuse composition/fields and stable creation request behavior; retain allowed assignee functionality for operators |
| PatientDetail.tsx | Two quick-add functions call void callback then immediately close/reset | Await shared typed outcome; keep values and surface uncertainty; close/reset only the matching successful request |
| patientPage.ts | Bounded identity reader, POST names, opaque cursor and PO-07 metadata | Add room to both normal and POST search request without touching scope or server ordering |
| PatientIdentity / RosterOrderControl | PO-06 identity and PO-07 persisted order already shared | Reuse directly in compact dedicated roster; no local alphabetical override |
| usePatientListPage.ts | Also loads legacy clinical summaries/counts | Do not reuse this hook for handover badges; reuse its identity reader and safe request-generation pattern only |
| OperatorDashboard / AdminDashboard | KPI callback plus generic navigate('consegne') links | Explicit feed callback for dashboard destinations; generic sidebar navigation opens Giro |
| agnosActionNavigation.ts | Patient-scoped open_consegne routes to PatientDetail | Route handover entries explicitly to filtered/focused Feed; retain PatientDetail's own Consegne tab and other patient navigation |

## Implemented modules

1. `consegnaCreation`: request normalization/validation, stable requestId, HTTP create, response identity validation and shared outcome/error types. Normalize once before freezing; retry serializes the same body. Recognized definitive errors are separate from network/server/malformed uncertain results.
2. `consegnaDrafts` and a patient-specific subscription hook: workspace store patterned after PO-07 parameter drafts, with handover fields, local revisions and receipts. Do not couple handover state to parameter field types or add a global singleton.
3. `consegnaAdvance`: pure token/successor guards for tests, independent from React and clinical transport. Roster reset differs from append; continuation under the original cursor may append without invalidating its own token.
4. `consegnePatientSummary`: bounded POST reader and per-patient availability states. No reuse of loadPatientConsegnaCounts, no clinical chart loads or anomaly reader.
5. `useConsegneRoster`: identity-first pagination/search/room with PO-07 requestKey and metadata acceptance; summary enrichment does not block identities. Cancel/discard old responses. Bounded 409 recovery clears old cursors while preserving selected identity/drafts; no automatic patient jump.
6. `ConsegneWorkspace`, `ConsegneRounds`, `ConsegnePatientRoster`, `ConsegnaComposer` and scoped CSS: split layout, roster and form responsibilities. New files remain below 500 lines. Existing Feed is composed, not rewritten into the roster.
7. Scoped navigation model/exit guard only where needed: named Giro/Feed entry with request generation, plus protection at boundaries that would discard unsaved memory. Use existing ConfirmDialog and browser beforeunload pattern; no new generic workflow framework.

## Sequence and failure model

- General route opens Giro and starts the first identity page immediately; preference GET remains parallel as in PO-07. Name/room input, order, context and date define the sequence. Summary POST batches only newly loaded IDs (maximum50).
- Selecting a patient reads that patient's stable draft. Composer identity comes from the scoped roster, not a feed name or mockData. Changing patient never moves field values between IDs.
- Save acquires the synchronous per-patient pending lock and immutable request. Save-and-next additionally freezes selection/roster/query generation and successor intent. Repeated clicks/remounts cannot create a second in-flight request.
- Valid receipt is stored first. Only the matching draft revision can be cleared. Badge/overview/feed refresh happens afterward with independent failure feedback; no boolean conversion can erase a confirmed success.
- At continuation failure, preserve the receipt and current selection; offer loading retry without resending the POST. At uncertain write failure, preserve pending body/key and retry only that exact write. At deleted/conflict/access-denied outcome, preserve the draft and never silently allocate a replacement requestId or auto-advance.
- New creation remains open. A replay record may have any currently valid state because another user could have edited it. UI must not restore old content or auto-complete it.
- Logout/session epoch invalidates pending results and destroys memory. Switching Giro/Feed preserves the workspace; navigation protection is scoped to actual data-loss boundaries.

## Focused validation matrix

| Area | Essential cases |
|---|---|
| Wire | room trim/max80/name POST; summary max50/omitted versus zero; requestId/body whitelist; success/record mismatch; 404/409/410; replay after edit |
| Drafts | two patients/homonyms; all fields and notes; selection and view changes; immutable request; local revision; uncertain retry; double click; disposed session |
| Advance | visible successor ID; page boundary; success then failed refresh; changed selection and away/back; changed filter/order/context/epoch; 409; no automatic completion |
| Navigation | sidebar Giro; dashboard feed status/focus; Agnos patient filter/focus; PatientDetail tab retained; visible out-of-scope feed record grants no patient access |
| UI | identities before summaries, empty/zero/historical/loading/error; operator assignment; discharged information; receipt feedback; quick-add close only on confirmed match |
| Regression | PO-06 shared identity; PO-07 stable initial requestKey and version changes; existing bounded feed, exact overview, quick-add, dashboard, Agnos and voice |

Root owns browser desktop/mobile/keyboard and synthetic API setup. Worker validation completed: 116 passing candidate cases, six pre-existing static guard failures reproduced against baseline input, successful production build and zero introduced lint diagnostics. The two reviewer findings (late A response updating B, and a delayed next page advancing after new typing) are fixed with deferred tests. No browser, server, commit or publication was performed by this worker.
