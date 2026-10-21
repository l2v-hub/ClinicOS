# Task Contract

## Task
- Title: Coordinated clinical UX batch447
- Slug: bug-batch-447
- Type: bug
- Date: 2026-10-17
- Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
- Source issues: #447 #451 #452 #453 #454 #456 #457, all bodies and all current comments read.
- Worktree: agent-team/.worktrees/bug-batch-447; branch codex/bug-batch-447.

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | existing authenticated APIs consumed only; no backend implementation scope |
| Database/Persistence | clinical writes via existing APIs; synthetic DB for QA only |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no domain change; preserve integrated batch450 lifecycle |
| Auth / Permissions | yes, existing role/capability/confirmation boundaries preserved |
| Privacy / Security | yes, clinical read/write isolation and evidence sanitation |
| Config / Env | isolated QA harness only; no production changes |

## Current Behaviour

Read-only source inspection confirms repeated global cartella banners and no Today therapy surface;
parameter forms repeat previous-absence prose and keypad, save has no roster advance;
therapy fresh entry defaults to calendar, allergies repeat in details;
supervisor urgency uses a different legacy summary from unread diary plus handover;
InvioPS currently reads only active prescriptions and omits actual clinical transfer context.
No application changes or runtime acceptance evidence exist yet.

## Expected Behaviour

One coordinated compact clinical workspace, accurate current-day actionable rounds and supervisor
queue, safe quick prescription creation, complete truthful emergency print context and a verified
explicit exit flow only after required clinical policy decision. Each issue retains separate acceptance,
regression and immutable evidence. Full resolution cannot be declared while clinical decisions remain open.

## Acceptance Criteria

- AC447.1: One compact chart header retains the actual assigned bed, patient name, age when known, complete allergy names and active high-risk names and their existing authorized edit/scale destinations on every chart section at desktop, tablet and phone widths.
- AC447.2: At a literal viewport of 1180 by 820 and scrollY zero, with incomplete identity, severe allergies, high risks and therapy anomalies, the first meaningful active-section content begins at absolute page y <= 160; measure each chart section rather than the container or a scrolled view.
- AC447.3: Missing demographics appear as a discreet actionable link rather than repeated information panels; therapy anomalies appear beside their correction target in Therapy and never as an identical banner before every section; intake review blockers remain visible and actionable without duplication.
- AC447.4: The first chart section is Oggi and shows today actual patient doses with in-place administration through the existing exact-dose, role and confirmation flow, urgent diary acknowledgement through the existing Ho capito model, and a compact accurate today-vitals summary/record action.
- AC447.5: Day calendar opens at the first occupied dose or current facility time without midnight blank rows; late data, date/patient change, empty day, failures, PRN and unprivileged role do not cross-contaminate or fabricate dose state.
- AC447.6: Today dose confirmation and diary acknowledgement persist after reload; no duplicate writes, missing prescriptions or hidden safety status are introduced by presentation simplification.
- AC451.1: No per-field repeated Nessuna rilevazione precedente prose; each actual previous value appears as an empty-input placeholder with facility-time age such as ieri or 3 h fa; placeholders never become newly submitted observations.
- AC451.2: NEWS2 is one compact line with actual partial/complete score and named missing inputs, without presenting an incomplete score as a validated NEWS2; roster omits repeated uncomputable paragraphs.
- AC451.3: Successful verified save advances to the next roster patient not yet recorded today, preserving drafts of all patients and recording progress/current/completed time; failed or uncertain writes never advance and retry keeps the original idempotent write.
- AC451.4: Next-patient selection handles pagination, final patient, already-recorded patients, filtered selected-outside-results patient, stale refresh and facility-midnight change without skipped or wrongly identified patients.
- AC451.5: Oxygen uses accessible Aria ambiente / Con O2 buttons, entered out-of-range values receive existing clinical threshold indication and on-screen keypad appears only when touch capability warrants it; physical keyboard input remains intact.
- AC451.6: Reload proves each new reading belongs to the correct patient and actual value; exactly one explanation of timestamp behavior remains.
- AC452.1: Patient table and cards show available identity/location and actionable signals without missing-data prose per row; bed is the first column when assigned, including room plus bed disambiguation; retained accessible identifiers distinguish same-name patients.
- AC452.2: Incomplete identity is reported once in a linked aggregate footer and optional regime/NEWS2 columns are hidden when globally empty among loaded patients; unknown/error statuses are distinguished once from negative clinical findings rather than falsely displaying no signal.
- AC452.3: Pazienti, Giro and Consegne have no explanatory paragraphs before their main lists; navigation/filter/loading/error and partial-page safety states remain available with compact actionable status.
- AC452.4: Each empty structured clinical topic uses one compact row with its permitted Add action; source/provenance are rendered only when actually present and existing positive/negative clinical data remain visible.
- AC452.5: An empty agenda renders one empty-state and permitted Nuovo appuntamento action without empty half-hour grid or zero-only filters; nonempty agenda retains existing appointment action and exact-patient destinations.
- AC452.6: Tablet/phone layouts, mixed and empty locations, same-name identities, positive allergy/risk signals, incomplete list/draft lifecycle and regimen filters are verified after serial integration of batch450.
- AC453.1: After selecting a reliable synthetic AIFA package, a periodic twice-daily 1-compressa seven-day prescription is completed in at most five actual user interactions, preserving required confirmation and explicit unresolved product-strength review.
- AC453.2: Mattina08, Mattina/sera08/20, Tre volte08/14/20, Al bisogno and custom-editor options generate the same times, fractions and units as explicit manual editing; a preset never silently invents a patient-specific dose or overwrites an existing custom dose without visible operator choice.
- AC453.3: New manual prescriptions default to active and omit the creation-state selector; edit/import consumers retain explicit unresolved/imported state and existing suspend/conclude controls.
- AC453.4: Reliable package form/strength/route data are prefilled only from actual structured package information; missing/ambiguous fields remain reviewable and selecting a new package never carries forward unrelated commercial strength.
- AC453.5: A visible sentence summary derives from the exact payload and facility civil start/end date, selected schedule/dose/unit and next eligible occurrence; seven-day duration is calendar arithmetic including DST rather than elapsed-hour assumptions.
- AC453.6: Clinical decision on allergy-drug checking must be recorded before any matching, warning/block/override behavior is implemented; while unanswered, display recorded allergies only and keep this issue unresolved. No substring or invented allergen-class mapping is permitted.
- AC454.1: A fresh nurse Therapy navigation opens Giro at current facility band or first pending relevant dose; explicit deep links, restored intentional calendar view and day selection remain authoritative.
- AC454.2: Giro presents one primary control row of times and actionable state filters, with date, calendar consultation and roster ordering in an accessible compact menu rather than three stacked toolbars.
- AC454.3: Allergy facts appear once per patient block; preserve full allergen, severity and reaction and permit disclosure of documentation-only metadata without repeating facts or declaring undocumented allergy absence.
- AC454.4: Patient day calendar initially scrolls past empty hours before the first dose; delayed load and patient/date changes reset correctly while an explicit selected dose retains focus.
- AC454.5: Actual administration/not-administered and retry remain exact-dose identity safe after serial integration of batch432, including one-off band changes, nurse/supervisor/admin role checks, empty days and Rome midnight.
- AC456.1: Supervisor urgent attention derives from the same diary plus handover Ho capito acknowledgement queue and permissions as the Consegne badge and operator Turno; urgent-only diary, urgent-only handover, acknowledgement, pagination and unavailable source are handled without false Nessuna urgenza.
- AC456.2: The first screen is an actionable Reparto adesso / Richiede attenzione list ordered by severity then age; no passive numeric KPI tile or alarm/attention counters remain in that first screen.
- AC456.3: Today pending/overdue doses appear before future work and tomorrow doses do not appear on shift home; each clinical/urgency/dose action opens the exact patient, source item and scheduled time through existing target contracts.
- AC456.4: In turno ora excludes irrelevant technical-administrator zero-work rows and uses actual configured shifts; missing shift configuration is stated once with configuration link rather than claiming staff are currently on shift.
- AC456.5: Occupancy is one actionable row or missing-room configuration link; loading/error/partial data remain explicit and actionable, including Rome-midnight transitions.
- AC457.1: Printable InvioPS contains editable reason, latest vitals with actual observation timestamps, recent actual given doses with administration times, active prescription context, full documented allergies/status, active risks and recorded emergency contact; prescriptions, refused doses and unconfirmed data never become actual given doses.
- AC457.2: When a recent urgent diary note or critical vital from the last24hours exists, reason is prefilled from that observed source and remains editable; stale, future and cross-patient data never prefill reason; missing clinical data require completion rather than invented negative findings.
- AC457.3: Print action has no transfer/write side effect, waits for complete authorized clinical source loading and remains blocked or clearly partial when essential data cannot be read; print CSS and PDF are tested using synthetic data.
- AC457.4: Registra uscita creates exactly one entry in existing liberatoria.usciteLog and survives reload with actor and facility time, using verified non-optimistic existing chart update rather than unrelated mobility assessment forms.
- AC457.5: Clinical decision on therapy pause/continuation at temporary PS exit must be recorded before implementing exit policy or automatic scheduling changes; unanswered decision prevents full issue closure. Return must never silently re-open an already administered dose or discharge the patient.
- AC457.6: Role-negative, failed/uncertain/double submission, patient switch and return scenarios preserve authorization/current-patient isolation and do not weaken the server clinical-record write boundary.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | schedule equivalence, civil duration, attention ordering, next-patient state machine and truthful print model |
| Integration | yes | real existing component/API contracts, authorization and shared dependencies |
| API | yes | actual reads/writes and source isolation through authenticated local HTTP |
| Playwright | yes | all seven UI capabilities, literal geometry, real interactions and print |
| Persistence after refresh | yes | administration, urgency acknowledgement, parameters, prescription and explicit authorized exit |
| Agnos action registry | no | unchanged |
| Voice simulation | no | unchanged |
| OCR/import test | integration regression | preserve batch450 draft lifecycle and unresolved imported prescription gates |
| Security/privacy scan | yes | synthetic-only evidence, capability boundaries, no PHI/secret/config weakening |

Scenarios must include role-negative behavior, empty/loading/error/partial data, patient changes,
Rome civil-midnight and DST, stale refresh, uncertainty/idempotent retry, pagination and same-name identity.
Actual expected values are asserted; merely visible button or screenshot is insufficient.

## Evidence Plan

Perissue evidence paths are frozen in plan-proposal.json: issue-N.png, issue-N-trace.zip, issue-N.webm.
Also retain actual console/page/network assertions, sanitized API persistence receipts, test outputs,
printPDF for457 and source SHA/hash receipt. Backend uses only unique synthetic local data and a
nonprivileged owned PostgreSQL16 lifecycle; browser runs serialized via shared QA lock.
Dedicated independent QA (not implementer) reruns diff, build/tests, Playwright and security before handoff.
Root owns publication, Max review ledger and trusted release/closure; no fabricated PASS or approval.

## Risks

- Essential decisions #453 allergy-drug policy and #457 therapy pause on PS exit are pending.
  No guessed policy, allergen mapping or automatic therapy scheduling change is authorized by UX text.
- assessments/transfers implements mobility assessment, not temporary exit: excluded.
- Existing Liberatoria exit log writes use chart patches; explicit new write must verify server outcome
  non-optimistically and preserve current-patient/actor identity and uncertain retry.
- Batch432 therapy domain and batch450 intake/import are dependencies. Integrate their reviewed changes
  before final integrated QA; preserve frozen manual attempt count and coordinate shared PatientList.
- Root authorized partial implementation only. Do not implement allergy matching or temporary-exit/pause action until actual user decisions; full closure remains blocked.

## Gate Status

READY FOR IMPLEMENTATION — independent UX/print/preset only, explicitly authorized by root.
Clinical policy gates #453 allergy-drug matching and #457 pause/exit action remain BLOCKED pending
actual user decisions. Full source acceptance remains unchanged and both issues stay UNRESOLVED.
Root owns durable round1 reservation before application edits. No acceptance has passed.


## Publication 12 evidence amendment (2026-10-21)

This amendment preserves the original task scope and its historical `READY FOR IMPLEMENTATION` gate. That gate authorized the original implementation sequence; it is not present-day release approval. The current publication source is `43b51530214c1e09035091b7fe36dd0b0577bf1a`; the independent combined backend validation ran on tested source `f394e3a77925e96a2b54e63485fb45ad44678f54` and reported 51 backend checks. The original eight UI captures remain attributed to QA4 source `8a27ef372807a68f464c3ebcfa85ca85b2da5344` (seven scenarios) and QA5 source `b76eb6baf5e87dcdb9b89a580ef48baf26e1bb7a` (#486 actual Milo route flow). There is no fresh whole-eight UI run on `43b5153` or `f394e3a7`.

The #486 PNG, WebM, and raw trace were captured in `continuation-20261021-2/output/milo-ui`; continuation-5 is a later scoped report that references that capture. Only the trace is represented by a new sanitized derivative; the screenshot and WebM are exact byte copies.

The complete eight-item manifest is bound to the current main plan paths, but current main's verifier enforces 25 MiB per file. Issue #453's sanitized trace is 27,606,230 bytes and therefore exceeds that unchanged limit by 1,391,830 bytes. A separate unmerged author follow-up raises the collector limit to 32 MiB and reports an author-side/mock remote pass; that proposal awaits independent QA and is not included in this packet. The current main publication gate remains pending.

The packet does not claim native/reviewer approval, release readiness, merge, deployment, or issue closure. Parent P11 contains the immutable combined backend51 and retained QA10 import proof; this packet links those records and does not recopy them.
