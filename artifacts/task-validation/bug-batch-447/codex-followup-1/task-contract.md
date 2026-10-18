# Task Contract

## Task
- Title: Coordinated clinical UX batch447 + explicit route486 continuation
- Slug: bug-batch-447
- Type: bug
- Date: 2026-10-18
- Source issues: #447, #451, #452, #453, #454, #456, #457, #486.
- Owner: same UX447 owner, with route486 added to its therapy-form scope.
- Original UX447 history: preserve all four implementation attempts and complete reports/hashes; do not reset or rewrite prior records. Root atomically archives/transfers the full prior #486 record and reserves continuation #5 before code.
- Clean UX447 candidate: `/workspace/ClinicOS/agent-team/.worktrees/bug-batch-447`, HEAD `e14ee2f22c18f1026c63e53b5ce0f5744fb0cfe1`.
- Parent #481: known SHA `6d2cc7919a86e3896426a7281f28f3406d8418e4`. Parent #483 publication SHA is unknown; QA is still running and must verify a final reviewed/published SHA before integration.
- Fresh continuation packet: `artifacts/task-validation/bug-batch-447/codex-followup-1/`; old proof is immutable.

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes, #486 create-route validation and the approved #457 flow |
| Database/Persistence | yes, synthetic verification; no schema migration |
| Auth/Permissions | yes, existing role/write boundaries remain |
| Privacy/Security | yes, synthetic-only proof and sanitized evidence |
| AIFA/Import | yes, explicit route fields only; never infer from form/text/PDF |
| GitHub/provider/state | root-owned transfer/review only |

## Current Behaviour

The original UX447 candidate has four recorded attempts (three failed, fourth passed its then-current local QA); the full reports, proofs, and hashes remain part of the record. Reviewed-parent integration remained a dependency. The fresh manual therapy form currently defaults route to `orale`; the shared backend create helper also defaults a missing route to `orale`. Current AIFA package data exposes pharmaceutical form/description and structured ingredients but no dedicated route field. Parent #483 QA has identified a remaining AppAgenda wiring finding, so its final publication SHA is not yet known.

## Expected Behaviour

Keep the same UX447 owner and seven issue scopes while adding approved route486. A fresh manual therapy has no route until an operator selects one. Saved or explicitly imported route data and operator selection remain unchanged through package/form changes; missing/unknown source remains reviewable. The shared create boundary rejects a route-less new prescription without changing legacy edit/status semantics. Preserve the already approved #453 confirmable allergy warning with no automatic block and #457 explicit authorized therapy-round decision at PS exit. Perform the new all-eight QA only after route implementation, verified parent integration, and author stop.

## Acceptance Criteria

### Issue #447
1. One compact chart header retains the actual assigned bed, patient name, age when known, complete allergy names and active high-risk names and their existing authorized edit/scale destinations on every chart section at desktop, tablet and phone widths.
2. At a literal viewport of 1180 by 820 and scrollY zero, with incomplete identity, severe allergies, high risks and therapy anomalies, the first meaningful active-section content begins at absolute page y <= 160; measure each chart section rather than the container or a scrolled view.
3. Missing demographics appear as a discreet actionable link rather than repeated information panels; therapy anomalies appear beside their correction target in Therapy and never as an identical banner before every section; intake review blockers remain visible and actionable without duplication.
4. The first chart section is Oggi and shows today actual patient doses with in-place administration through the existing exact-dose, role and confirmation flow, urgent diary acknowledgement through the existing Ho capito model, and a compact accurate today-vitals summary/record action.
5. Day calendar opens at the first occupied dose or current facility time without midnight blank rows; late data, date/patient change, empty day, failures, PRN and unprivileged role do not cross-contaminate or fabricate dose state.
6. Today dose confirmation and diary acknowledgement persist after reload; no duplicate writes, missing prescriptions or hidden safety status are introduced by presentation simplification.

### Issue #451
1. No per-field repeated Nessuna rilevazione precedente prose; each actual previous value appears as an empty-input placeholder with facility-time age such as ieri or 3 h fa; placeholders never become newly submitted observations.
2. NEWS2 is one compact line with actual partial/complete score and named missing inputs, without presenting an incomplete score as a validated NEWS2; roster omits repeated uncomputable paragraphs.
3. Successful verified save advances to the next roster patient not yet recorded today, preserving drafts of all patients and recording progress/current/completed time; failed or uncertain writes never advance and retry keeps the original idempotent write.
4. Next-patient selection handles pagination, final patient, already-recorded patients, filtered selected-outside-results patient, stale refresh and facility-midnight change without skipped or wrongly identified patients.
5. Oxygen uses accessible Aria ambiente / Con O2 buttons, entered out-of-range values receive existing clinical threshold indication and on-screen keypad appears only when touch capability warrants it; physical keyboard input remains intact.
6. Reload proves each new reading belongs to the correct patient and actual value; exactly one explanation of timestamp behavior remains.

### Issue #452
1. Patient table and cards show available identity/location and actionable signals without missing-data prose per row; bed is the first column when assigned, including room plus bed disambiguation; retained accessible identifiers distinguish same-name patients.
2. Incomplete identity is reported once in a linked aggregate footer and optional regime/NEWS2 columns are hidden when globally empty among loaded patients; unknown/error statuses are distinguished once from negative clinical findings rather than falsely displaying no signal.
3. Pazienti, Giro and Consegne have no explanatory paragraphs before their main lists; navigation/filter/loading/error and partial-page safety states remain available with compact actionable status.
4. Each empty structured clinical topic uses one compact row with its permitted Add action; source/provenance are rendered only when actually present and existing positive/negative clinical data remain visible.
5. An empty agenda renders one empty-state and permitted Nuovo appuntamento action without empty half-hour grid or zero-only filters; nonempty agenda retains existing appointment action and exact-patient destinations.
6. Tablet/phone layouts, mixed and empty locations, same-name identities, positive allergy/risk signals, incomplete list/draft lifecycle and regimen filters are verified after serial integration of batch450.

### Issue #453
1. After selecting a reliable synthetic AIFA package, a periodic twice-daily 1-compressa seven-day prescription is completed in at most five actual user interactions, preserving required confirmation and explicit unresolved product-strength review.
2. Mattina08, Mattina/sera08/20, Tre volte08/14/20, Al bisogno and custom-editor options generate the same times, fractions and units as explicit manual editing; a preset never silently invents a patient-specific dose or overwrites an existing custom dose without visible operator choice.
3. New manual prescriptions default to active and omit the creation-state selector; edit/import consumers retain explicit unresolved/imported state and existing suspend/conclude controls.
4. Reliable package form/strength/route data are prefilled only from actual structured package information; missing/ambiguous fields remain reviewable and selecting a new package never carries forward unrelated commercial strength.
5. A visible sentence summary derives from the exact payload and facility civil start/end date, selected schedule/dose/unit and next eligible occurrence; seven-day duration is calendar arithmetic including DST rather than elapsed-hour assumptions.
6. Recorded decision: show a confirmable allergy warning with no automatic block. Use only reliable existing structured associations; when absent, request compatibility verification without claiming a proven conflict. Bind acknowledgement to current patient, selected product and current allergy context; never fabricate mapping, use substring matching, or treat unknown allergy data as negative.
7. User decision recorded: explicit confirmable warning, no automatic prohibition. Bind acknowledgement to current patient, selected product and current allergy context; never fabricate drug/allergen mapping or claim unknown data are negative.

### Issue #454
1. A fresh nurse Therapy navigation opens Giro at current facility band or first pending relevant dose; explicit deep links, restored intentional calendar view and day selection remain authoritative.
2. Giro presents one primary control row of times and actionable state filters, with date, calendar consultation and roster ordering in an accessible compact menu rather than three stacked toolbars.
3. Allergy facts appear once per patient block; preserve full allergen, severity and reaction and permit disclosure of documentation-only metadata without repeating facts or declaring undocumented allergy absence.
4. Patient day calendar initially scrolls past empty hours before the first dose; delayed load and patient/date changes reset correctly while an explicit selected dose retains focus.
5. Actual administration/not-administered and retry remain exact-dose identity safe after serial integration of batch432, including one-off band changes, nurse/supervisor/admin role checks, empty days and Rome midnight.

### Issue #456
1. Supervisor urgent attention derives from the same diary plus handover Ho capito acknowledgement queue and permissions as the Consegne badge and operator Turno; urgent-only diary, urgent-only handover, acknowledgement, pagination and unavailable source are handled without false Nessuna urgenza.
2. The first screen is an actionable Reparto adesso / Richiede attenzione list ordered by severity then age; no passive numeric KPI tile or alarm/attention counters remain in that first screen.
3. Today pending/overdue doses appear before future work and tomorrow doses do not appear on shift home; each clinical/urgency/dose action opens the exact patient, source item and scheduled time through existing target contracts.
4. In turno ora excludes irrelevant technical-administrator zero-work rows and uses actual configured shifts; missing shift configuration is stated once with configuration link rather than claiming staff are currently on shift.
5. Occupancy is one actionable row or missing-room configuration link; loading/error/partial data remain explicit and actionable, including Rome-midnight transitions.

### Issue #457
1. Printable InvioPS contains editable reason, latest vitals with actual observation timestamps, recent actual given doses with administration times, active prescription context, full documented allergies/status, active risks and recorded emergency contact; prescriptions, refused doses and unconfirmed data never become actual given doses.
2. When a recent urgent diary note or critical vital from the last24hours exists, reason is prefilled from that observed source and remains editable; stale, future and cross-patient data never prefill reason; missing clinical data require completion rather than invented negative findings.
3. Print action has no transfer/write side effect, waits for complete authorized clinical source loading and remains blocked or clearly partial when essential data cannot be read; print CSS and PDF are tested using synthetic data.
4. Registra uscita creates exactly one entry in existing liberatoria.usciteLog and survives reload with actor and facility time, using verified non-optimistic existing chart update rather than unrelated mobility assessment forms.
5. Recorded decision: require the authorized operator to explicitly choose the therapy-round decision when recording a temporary PS exit. Do not pause automatically when the sheet opens or prints. Persist through the existing authorized path; preserve history and verify after reload/return. Never silently re-open an administered dose or discharge the patient.
6. Role-negative, failed/uncertain/double submission, patient switch and return scenarios preserve authorization/current-patient isolation and do not weaken the server clinical-record write boundary.
7. User decision recorded: require an authorized operator explicit pause/continue administration-round choice at exit; atomically persist real uscitelog and operational state, enforce new scheduled/PRN writes on server while preserving valid replay/history, and explicit return restores availability without reopening already-given doses.

### Issue #486
1. New manual therapy starts with viaSomministrazione empty; save remains blocked until operator selects a route.
2. Only explicit route in saved prescription/discharge data or operator choice populates route. AIFA package data has no structured route; pharmaceutical form, product name, description, and PDF never infer it.
3. Form/package changes preserve operator route; package-first selection leaves route blank. Edit hydration and explicit discharge route mappings preserve the supplied value; absent/unknown imports remain reviewable and never silently become orale.
4. Every new prescription through shared create service requires nonblank route. Route-less HTTP, diary, intake-confirm, and therapy.create calls fail before create; explicit routes pass unchanged. Existing status/edit behavior and replay of already persisted legacy requests remain compatible.
5. Fresh synthetic regression/reload proof covers blank-on-new, blocked save, explicit route persistence, form/package changes, package-before-route, import mapping, absent/unknown route, and retains approved #453 warning/no-block and #457 authorized explicit transfer decisions.

## Test Plan

Retain the complete original UX447 verification suite: frontend tests/typecheck/build, backend build and tests, canonical group harness, per-issue synthetic E2E/browser interactions, role and patient-isolation checks, persistence after reload, responsive geometry, and print/PDF. Add focused route regressions for the new form, form/package selection, create helper, HTTP/diary/intake/tool callers, explicit route preservation, and blank/missing/unknown route. Run final independent 6.1-Sol QA against exact integrated source SHA after all authors stop. Then obtain actual Claude review and final Codex reconciliation; preserve every report and distinguish unrun/skipped checks.

## Evidence Plan

All new harnesses, logs, reports, source/hash receipts, and new proof media are stored under `artifacts/task-validation/bug-batch-447/codex-followup-1/`. The plan-schema evidence pointers use the validator's required `artifacts/task-validation/bug-batch-447/evidence/codex-followup-1/` namespace. Retain all original four attempts and proof byte-for-byte. Use synthetic patient data only; include per-issue screenshots, traces, WebM, print artifact for #457, focused route persistence receipts, full Claude report, and independent QA report.

## Gate Status

READY FOR IMPLEMENTATION after root completes the authorized atomic archive/transfer and continuation-5 reservation. Sequence: bounded Luna route486 changes on clean UX447 candidate; then 6.1-Sol integrates exact reviewed parent commits only after #483's verified published SHA; stop for detailed handoff; then fresh independent 6.1-Sol QA for all eight issues after final integration and all authors stop; actual Claude review and final Codex reconciliation. No additional user approval is needed for the already approved route policy.
