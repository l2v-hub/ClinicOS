# Feature Specification: Parametri Pazienti Compact Quick-Entry Layout

**Feature Branch**: `011-parametri-quick-entry`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Layout rapido Parametri Pazienti. Card oggi troppo alta. Compilazione molti pazienti deve occupare meno spazio verticale. Parametri principali su riga compatta. Ora rilevazione = ora salvataggio (auto). Operatore = utente loggato (auto). Note rapide solo via espansione / bottone Note. Tablet-friendly. Backend invariato salvo stretta necessita, Prisma e VITE_API_URL invariati."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator records vitals for a full ward with minimal scrolling (Priority: P1) - MVP

An RSA operator opens Parametri Pazienti at the start of a measurement round. They see one compact row per patient with the six clinical fields (PA, SpO2, FC, TC, DTX/GLI, Evacuazione) inline. They tab through the fields for one patient, save, and immediately see the next patient row without having to scroll past extra metadata or buttons. On a 1024 x 768 tablet at least eight patient rows are visible without scrolling.

**Why this priority**: Density of the patient list is the single most-cited complaint about this page. Solving it alone delivers an immediately usable, tablet-friendly form. This is the minimum viable improvement and the heart of the feature.

**Independent Test**: Open Parametri Pazienti on a 1024 x 768 tablet. Count how many patient rows fit above the fold; target ≥ 8. Measure the height of one patient row; target ≤ 56 px tall in resting (not editing) state. Confirm the six clinical fields (PA, SpO2, FC, TC, DTX/GLI, Evacuazione) are visible inline on every row without expansion. Confirm Ora rilevazione, Operatore, and Note rapide are not visible by default.

**Acceptance Scenarios**:

1. **Given** Parametri Pazienti is open with at least 10 patients in the ward, **When** the operator looks at the page on a 1024 x 768 tablet, **Then** at least 8 patient rows are visible without scrolling.
2. **Given** a patient row is at rest (not in edit mode), **When** the operator inspects the row, **Then** it shows exactly the six fields PA, SpO2, FC, TC, DTX/GLI, Evacuazione (no Ora rilevazione visible, no Operatore visible, no Note rapide field visible).
3. **Given** a patient row is in edit mode, **When** the operator tabs through the fields, **Then** focus moves between the six clinical fields in left-to-right reading order before reaching Save.

---

### User Story 2 - Operator never types the current time or their own name (Priority: P1)

When the operator saves a row, the system records the time of the save and the identity of the currently logged-in operator without asking them to enter either value. The operator's hand stays on the keyboard or on the screen — no manual time picker, no operator dropdown.

**Why this priority**: The two auto-fields (Ora and Operatore) were the user's explicit primary complaint and represent a constant input burden during a busy round. Removing them is the second pillar of the feature.

**Independent Test**: Enter values into the six clinical fields for any patient and click Save. The saved record must contain a timestamp equal to the moment of save (within ±2 seconds) and an operatorId equal to the currently logged-in user. The operator must never have been prompted to enter either value.

**Acceptance Scenarios**:

1. **Given** the operator fills the six clinical fields, **When** they click Save, **Then** the persisted record carries `ora` equal to the save moment and `operatore` equal to the logged-in user — without the operator entering either value.
2. **Given** the operator is mid-entry, **When** they look at the row, **Then** no input field for time or operator is visible.
3. **Given** the operator has been logged in throughout the round, **When** they save five rows in sequence, **Then** every saved row carries five distinct save timestamps and the same operator id — and the operator typed neither.

---

### User Story 3 - Operator can still attach a brief note when needed, without it cluttering the row (Priority: P2)

When the operator needs to attach Note rapide to a specific measurement, they click a "Note" affordance on that row (small button or expand control). A note input opens for that row, the operator types, and the row collapses back when saved. Other rows are unaffected. By default, no note field is visible on any row.

**Why this priority**: Notes are needed in a minority of measurements; making them always visible inflates every row. Restoring them as an opt-in keeps US1's density gain while preserving the ability to capture clinical detail when it matters.

**Independent Test**: With Parametri Pazienti open, confirm no Note field is visible on any row. Click the Note affordance on one row → a note input appears on just that row. Type a note, save → the row collapses back and the note is persisted with the measurement. The other rows remain unchanged.

**Acceptance Scenarios**:

1. **Given** Parametri Pazienti is open at rest, **When** the operator scans the page, **Then** no Note rapide field is visible on any patient row.
2. **Given** the operator clicks the Note affordance on one row, **When** the affordance is clicked, **Then** a note input opens on that row alone; no other row's height changes.
3. **Given** the operator types a note and saves the row, **When** the save succeeds, **Then** the note is persisted alongside the six clinical values and the row collapses back to the compact resting height.

---

### Edge Cases

- A user is not yet logged in or session expired when the operator clicks Save. The system must surface a clear error and prevent silent loss of the entered values.
- The operator's clock is wrong by minutes (offline tablet sync drift). Whatever auto-`ora` policy the system uses, it must consistently use one source — never mix client clock with server clock without surfacing the source.
- A row is half-edited when the operator switches tabs / loses focus / accidentally taps another row. Half-entered values must not be silently saved with auto-`ora`; either preserve the draft visibly on the row or discard cleanly with a single-step confirmation.
- A row's compact width at 1024 px cannot fit all six clinical fields without overflowing. Fields must compress (reduced label widths, abbreviated units) or wrap inside the row container without producing a global horizontal scroll.
- A note is very long (more than 200 characters). The note input must accept multi-line text and the saved row must show a note-present indicator (small icon or non-empty Note button) even when the note input is closed.
- Operator role changes mid-session (the logged-in user is updated). The auto-`operatore` value used on subsequent saves must reflect the *current* logged-in user at save time, not a value cached when the page was first opened.
- Save fails with a network error. The entered values must remain on the row (not be wiped) and the operator must be able to retry from the same row without re-typing.
- The operator was the one who recorded the values offline on paper at an earlier time and wants the `ora` to reflect that earlier time. This case is **out of scope** for v1 — if the user needs a retroactive time, they must use the existing detail / edit screen, not this quick-entry layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Parametri Pazienti list MUST render exactly one compact row per patient at rest, with the six clinical fields PA, SpO2, FC, TC, DTX/GLI, Evacuazione visible inline on the row.
- **FR-002**: At rest, the patient row MUST NOT display an input field for Ora rilevazione, Operatore, or Note rapide.
- **FR-003**: The patient row at rest MUST be no taller than 56 px on a 1024 x 768 tablet viewport.
- **FR-004**: On a 1024 x 768 tablet at least 8 patient rows MUST be visible above the fold when the page is first opened on a ward with at least 10 patients.
- **FR-005**: When a row is saved, the persisted record MUST carry an `ora` timestamp set automatically by the system at the moment of save — the operator MUST NOT enter this value manually.
- **FR-006**: When a row is saved, the persisted record MUST carry an `operatore` reference equal to the currently logged-in user — the operator MUST NOT enter this value manually.
- **FR-007**: The page MUST expose a "Note" affordance on each patient row that opens a per-row note input on click.
- **FR-008**: Opening the note input on one row MUST NOT change the height of any other row.
- **FR-009**: When a row's note input is open and a note is saved, the note MUST be persisted alongside the six clinical values and the row MUST collapse back to its compact resting height.
- **FR-010**: A row with a non-empty saved note MUST display a visible note-present indicator (icon, count, or non-empty Note button) even when the note input is closed.
- **FR-011**: The six clinical fields MUST be reachable by Tab key in left-to-right reading order before focus moves to the Save control.
- **FR-012**: The page MUST NOT produce a global horizontal scroll at any of the four supported viewports (1024 x 768, 1180 x 820, 1366 x 768, 1920 x 1080).
- **FR-013**: If the row width at 1024 px cannot fit all six fields, the fields MUST compress (reduced label widths, abbreviated units) or wrap inside the row container; the row MUST NOT expand the page's horizontal scroll.
- **FR-014**: If the user session is expired or no user is logged in at the moment of Save, the system MUST surface a clear error and MUST NOT silently discard the entered values.
- **FR-015**: If a Save call fails with a network error, the row MUST retain the entered values (the values MUST NOT be wiped) and the operator MUST be able to retry from the same row.
- **FR-016**: The auto-`operatore` value used on each save MUST be the user logged in *at the moment of that save*, not a value cached from page load.
- **FR-017**: The redesign MUST preserve all existing Italian UI labels for the six clinical fields and the page title.
- **FR-018**: The redesign MUST NOT modify the Prisma schema.
- **FR-019**: The redesign MUST NOT modify the `VITE_API_URL` configuration value.
- **FR-020**: The redesign MAY modify the backend API only if strictly necessary to honour FR-005 / FR-006 / FR-016 (e.g. accepting a request that omits `ora` and `operatore` so the server can set them). Any backend change MUST be the smallest viable adjustment and MUST be documented in the implementation plan.
- **FR-021**: The frontend production build MUST succeed with zero new TypeScript or build errors.

### Key Entities

- **Misurazione Parametri Vitali**: an existing entity; this feature does not change its fields. It carries `pa`, `spO2`, `fc`, `tc`, `dtxGli`, `evacuazione`, `noteRapide`, `ora`, `operatoreId`. After this feature, `ora` and `operatoreId` MUST be populated by the system at save time rather than supplied by the client form.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 1024 x 768 tablet viewport with a ward of 10+ patients loaded, at least 8 patient rows are visible above the fold — measured by DevTools after `Ctrl+Home`.
- **SC-002**: The computed height of a patient row at rest is ≤ 56 px on the same viewport — measured by DevTools inspector.
- **SC-003**: On the same viewport, the patient row at rest renders exactly the six clinical fields (PA, SpO2, FC, TC, DTX/GLI, Evacuazione). No input field for Ora rilevazione, Operatore, or Note rapide is in the DOM as a visible form control on the resting row.
- **SC-004**: After clicking Save on a populated row, the persisted record carries `ora` equal to the save moment within ±2 seconds and `operatoreId` equal to the currently logged-in user. Verified by inspecting the saved record after the next list refresh.
- **SC-005**: Opening the Note input on one row does not alter the computed height of any other row in the list — measured by DevTools before and after the click.
- **SC-006**: When a saved note is non-empty, the row's note-present indicator is visible — confirmed by a static page audit on rows whose `noteRapide` is non-null.
- **SC-007**: On all four reference viewports (1024 x 768, 1180 x 820, 1366 x 768, 1920 x 1080) no element exceeds the document body width — the standard overflow audit script returns zero hits.
- **SC-008**: An operator records vitals for five consecutive patients with no manual time or operator entry — measured by counting input events on `<input>` elements related to Ora or Operatore: zero such events fire.
- **SC-009**: Median time from row click to Save for an experienced operator on a populated row is ≤ 6 seconds — measured on a stopwatch over five rows by an observer.
- **SC-010**: `npm run build` in `frontend/` completes with zero TypeScript errors and zero new build warnings introduced by this feature.
- **SC-011**: An operator new to ClinicOS, given the task "record PA 130/80, FC 76, SpO2 97, TC 36.8, DTX 110, evacuazione SI for patient X", completes the task on the first attempt without hints and without typing in any time or operator field.

## Assumptions

- The Parametri Pazienti page is `MultiPatientParametri.tsx` (or equivalent) inside `frontend/src/components/operator/` — verified during planning.
- The currently logged-in user is already exposed to the frontend (session / context / auth provider). The frontend reads it at save time; no new auth mechanism is required.
- The "ora del salvataggio" is taken from the server clock when the backend accepts the save, falling back to the client clock only if the backend cannot inject the value. The implementation plan will decide between the two approaches; both must produce a single, consistent source per save.
- The Note affordance reuses the existing button styling already shipped in the design system. No new button variant is introduced.
- Italian UI labels for the six clinical fields ("PA", "SpO2", "FC", "TC", "DTX/GLI", "Evacuazione") and the Note affordance ("Note") remain unchanged.
- Existing keyboard navigation conventions (Tab forward, Shift+Tab backward) are preserved; no custom keymap is introduced.
- Mobile viewports below 1024 px are out of scope (Constitution: tablet-first, desktop-responsive).
- Visual / density validation is performed in Chrome / Edge DevTools at the four reference viewports listed in SC-007.
- Backend changes are permitted only under FR-020 and only if strictly necessary; the Prisma schema and `VITE_API_URL` remain unchanged.
- The retroactive-`ora` case (operator wants to record values for an earlier time) is explicitly out of scope for v1 and is handled by an existing detail / edit flow elsewhere in the app.
