# Independent QA2 contract — clinical UX group447

Reviewer is newly assigned independent QA, never author/coordinator. Target HEAD59e871853384d1536d3d9d197a5b9c8c1197c6a1, explicit combined verification base05fd62363d89573d6e2449235a7499cc855434cd. All seven live issue bodies and every comment read; only URL/comment IDs and content hashes retained in live-issue-read-receipts.json. Raw GitHub inputs remain private outside the repository.

The user approved a confirmable allergy warning with no automatic prohibition (#453), and an explicit authorized operator pause/continue decision for PS exit (#457). These recorded decisions supersede the original documents’ historical pending-policy statements; original frozen documents remain byte-identical.

## Issue447

- AC447.1: One compact chart header retains the actual assigned bed, patient name, age when known, complete allergy names and active high-risk names and their existing authorized edit/scale destinations on every chart section at desktop, tablet and phone widths.
- AC447.2: At a literal viewport of 1180 by 820 and scrollY zero, with incomplete identity, severe allergies, high risks and therapy anomalies, the first meaningful active-section content begins at absolute page y <= 160; measure each chart section rather than the container or a scrolled view.
- AC447.3: Missing demographics appear as a discreet actionable link rather than repeated information panels; therapy anomalies appear beside their correction target in Therapy and never as an identical banner before every section; intake review blockers remain visible and actionable without duplication.
- AC447.4: The first chart section is Oggi and shows today actual patient doses with in-place administration through the existing exact-dose, role and confirmation flow, urgent diary acknowledgement through the existing Ho capito model, and a compact accurate today-vitals summary/record action.
- AC447.5: Day calendar opens at the first occupied dose or current facility time without midnight blank rows; late data, date/patient change, empty day, failures, PRN and unprivileged role do not cross-contaminate or fabricate dose state.
- AC447.6: Today dose confirmation and diary acknowledgement persist after reload; no duplicate writes, missing prescriptions or hidden safety status are introduced by presentation simplification.

## Issue451

- AC451.1: No per-field repeated Nessuna rilevazione precedente prose; each actual previous value appears as an empty-input placeholder with facility-time age such as ieri or 3 h fa; placeholders never become newly submitted observations.
- AC451.2: NEWS2 is one compact line with actual partial/complete score and named missing inputs, without presenting an incomplete score as a validated NEWS2; roster omits repeated uncomputable paragraphs.
- AC451.3: Successful verified save advances to the next roster patient not yet recorded today, preserving drafts of all patients and recording progress/current/completed time; failed or uncertain writes never advance and retry keeps the original idempotent write.
- AC451.4: Next-patient selection handles pagination, final patient, already-recorded patients, filtered selected-outside-results patient, stale refresh and facility-midnight change without skipped or wrongly identified patients.
- AC451.5: Oxygen uses accessible Aria ambiente / Con O2 buttons, entered out-of-range values receive existing clinical threshold indication and on-screen keypad appears only when touch capability warrants it; physical keyboard input remains intact.
- AC451.6: Reload proves each new reading belongs to the correct patient and actual value; exactly one explanation of timestamp behavior remains.

## Issue452

- AC452.1: Patient table and cards show available identity/location and actionable signals without missing-data prose per row; bed is the first column when assigned, including room plus bed disambiguation; retained accessible identifiers distinguish same-name patients.
- AC452.2: Incomplete identity is reported once in a linked aggregate footer and optional regime/NEWS2 columns are hidden when globally empty among loaded patients; unknown/error statuses are distinguished once from negative clinical findings rather than falsely displaying no signal.
- AC452.3: Pazienti, Giro and Consegne have no explanatory paragraphs before their main lists; navigation/filter/loading/error and partial-page safety states remain available with compact actionable status.
- AC452.4: Each empty structured clinical topic uses one compact row with its permitted Add action; source/provenance are rendered only when actually present and existing positive/negative clinical data remain visible.
- AC452.5: An empty agenda renders one empty-state and permitted Nuovo appuntamento action without empty half-hour grid or zero-only filters; nonempty agenda retains existing appointment action and exact-patient destinations.
- AC452.6: Tablet/phone layouts, mixed and empty locations, same-name identities, positive allergy/risk signals, incomplete list/draft lifecycle and regimen filters are verified after serial integration of batch450.

## Issue453

- AC453.1: After selecting a reliable synthetic AIFA package, a periodic twice-daily 1-compressa seven-day prescription is completed in at most five actual user interactions, preserving required confirmation and explicit unresolved product-strength review.
- AC453.2: Mattina08, Mattina/sera08/20, Tre volte08/14/20, Al bisogno and custom-editor options generate the same times, fractions and units as explicit manual editing; a preset never silently invents a patient-specific dose or overwrites an existing custom dose without visible operator choice.
- AC453.3: New manual prescriptions default to active and omit the creation-state selector; edit/import consumers retain explicit unresolved/imported state and existing suspend/conclude controls.
- AC453.4: Reliable package form/strength/route data are prefilled only from actual structured package information; missing/ambiguous fields remain reviewable and selecting a new package never carries forward unrelated commercial strength.
- AC453.5: A visible sentence summary derives from the exact payload and facility civil start/end date, selected schedule/dose/unit and next eligible occurrence; seven-day duration is calendar arithmetic including DST rather than elapsed-hour assumptions.
- AC453.6: Clinical decision on allergy-drug checking must be recorded before any matching, warning/block/override behavior is implemented; while unanswered, display recorded allergies only and keep this issue unresolved. No substring or invented allergen-class mapping is permitted.
- AC453.7: User decision recorded: explicit confirmable warning, no automatic prohibition. Bind acknowledgement to current patient, selected product and current allergy context; never fabricate drug/allergen mapping or claim unknown data are negative.

## Issue454

- AC454.1: A fresh nurse Therapy navigation opens Giro at current facility band or first pending relevant dose; explicit deep links, restored intentional calendar view and day selection remain authoritative.
- AC454.2: Giro presents one primary control row of times and actionable state filters, with date, calendar consultation and roster ordering in an accessible compact menu rather than three stacked toolbars.
- AC454.3: Allergy facts appear once per patient block; preserve full allergen, severity and reaction and permit disclosure of documentation-only metadata without repeating facts or declaring undocumented allergy absence.
- AC454.4: Patient day calendar initially scrolls past empty hours before the first dose; delayed load and patient/date changes reset correctly while an explicit selected dose retains focus.
- AC454.5: Actual administration/not-administered and retry remain exact-dose identity safe after serial integration of batch432, including one-off band changes, nurse/supervisor/admin role checks, empty days and Rome midnight.

## Issue456

- AC456.1: Supervisor urgent attention derives from the same diary plus handover Ho capito acknowledgement queue and permissions as the Consegne badge and operator Turno; urgent-only diary, urgent-only handover, acknowledgement, pagination and unavailable source are handled without false Nessuna urgenza.
- AC456.2: The first screen is an actionable Reparto adesso / Richiede attenzione list ordered by severity then age; no passive numeric KPI tile or alarm/attention counters remain in that first screen.
- AC456.3: Today pending/overdue doses appear before future work and tomorrow doses do not appear on shift home; each clinical/urgency/dose action opens the exact patient, source item and scheduled time through existing target contracts.
- AC456.4: In turno ora excludes irrelevant technical-administrator zero-work rows and uses actual configured shifts; missing shift configuration is stated once with configuration link rather than claiming staff are currently on shift.
- AC456.5: Occupancy is one actionable row or missing-room configuration link; loading/error/partial data remain explicit and actionable, including Rome-midnight transitions.

## Issue457

- AC457.1: Printable InvioPS contains editable reason, latest vitals with actual observation timestamps, recent actual given doses with administration times, active prescription context, full documented allergies/status, active risks and recorded emergency contact; prescriptions, refused doses and unconfirmed data never become actual given doses.
- AC457.2: When a recent urgent diary note or critical vital from the last24hours exists, reason is prefilled from that observed source and remains editable; stale, future and cross-patient data never prefill reason; missing clinical data require completion rather than invented negative findings.
- AC457.3: Print action has no transfer/write side effect, waits for complete authorized clinical source loading and remains blocked or clearly partial when essential data cannot be read; print CSS and PDF are tested using synthetic data.
- AC457.4: Registra uscita creates exactly one entry in existing liberatoria.usciteLog and survives reload with actor and facility time, using verified non-optimistic existing chart update rather than unrelated mobility assessment forms.
- AC457.5: Clinical decision on therapy pause/continuation at temporary PS exit must be recorded before implementing exit policy or automatic scheduling changes; unanswered decision prevents full issue closure. Return must never silently re-open an already administered dose or discharge the patient.
- AC457.6: Role-negative, failed/uncertain/double submission, patient switch and return scenarios preserve authorization/current-patient isolation and do not weaken the server clinical-record write boundary.
- AC457.7: User decision recorded: require an authorized operator explicit pause/continue administration-round choice at exit; atomically persist real uscitelog and operational state, enforce new scheduled/PRN writes on server while preserving valid replay/history, and explicit return restores availability without reopening already-given doses.

## Verification and limits

Independently review the entire scoped production/test diff, run frontend tests/types/build and backend full tests/types, actual HTTP/PostgreSQL/Chromium seven-scenario acceptance, actual nineteen-scenario intake integration regression, and additional adversarial tests calling production modules. Browser assertions require concrete values, persistence/reload, no unexpected console/page/HTTP errors, per-issue result PNG/trace/video and actual printPDF. Only owned synthetic PostgreSQL16 on55447 or intake55450 under the global lifecycle lock; never access developer5432. Capture/restore only25 known own full-suite side effects with byte verification. Preserve every historical evidence byte before canonical output writes, maintaining explicit relocation provenance.

Final READY and UX PR review remain blocked until actual reviewed main432/450 reconciliation as frozen amendments7/13 require. All preliminary phases still run fully. No issue/PR/provider/deployment mutations or source changes are authorized for this reviewer.
