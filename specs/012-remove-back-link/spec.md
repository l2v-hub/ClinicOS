# Feature Specification: Remove Duplicate Back Link in Scheda Paziente Header

**Feature Branch**: `012-remove-back-link`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Nella Scheda Paziente ci sono due elementi di navigazione duplicati: 1) breadcrumb superiore 'Pazienti > Nome', 2) sotto, '‹ Pazienti'. Il secondo e inutile e ruba spazio verticale. Tenere solo breadcrumb superiore. Card paziente sotto invariata."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Operator sees one and only one back-to-list affordance on the Scheda Paziente (Priority: P1) — MVP

An operator opens any patient's Scheda Paziente. At the top of the page they see one breadcrumb: `Pazienti > <Nome Paziente>`. Below the breadcrumb, the patient identity card renders directly (initials, name, status, MRN, age, sex, room, allergies) — no extra "‹ Pazienti" back link sits between the breadcrumb and the card.

**Why this priority**: Single, contained defect with zero side effects on other flows. Reclaims a fixed amount of vertical space on every Scheda Paziente sub-page. Visible to every operator on every patient visit. There are no follow-on stories — this is the whole feature.

**Independent Test**: Open the Scheda Paziente for any patient at 1366×768. Count back-to-list affordances visible inside the page chrome and content area combined. The count is exactly 1 (the upper breadcrumb). No `‹ Pazienti` button, `Indietro` link, or equivalent back-link appears between the breadcrumb and the patient identity card.

**Acceptance Scenarios**:

1. **Given** the operator is on `Pazienti -> SILVANA MINGOLINI`, **When** they look at the page chrome above the patient identity card, **Then** they see exactly one navigation element — the breadcrumb `Pazienti > MINGOLINI, SILVANA` — and no `‹ Pazienti` link below it.
2. **Given** the operator clicks the `Pazienti` segment of the upper breadcrumb, **When** the click is registered, **Then** they navigate back to the patient list — the original back-to-list affordance still works.
3. **Given** the operator opens any other Scheda Paziente, **When** they compare the header to the SILVANA MINGOLINI page, **Then** every patient's Scheda Paziente shows the same single-breadcrumb pattern with no `‹ Pazienti` link.

### Edge Cases

- The operator navigates to the Scheda Paziente from a context that is not the patient list (e.g. agenda → patient). The breadcrumb still reads `Pazienti > <Nome>` and the only back affordance remains the breadcrumb. No "Indietro" link is reintroduced as a fallback.
- The operator is on a narrow tablet viewport (1024px). The single breadcrumb must not wrap awkwardly or be hidden because the removed back link reclaimed its space.
- The patient identity card itself (initials, name, status, MRN, age, sex, room, allergies) is **out of scope** — it MUST render identically to today.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Scheda Paziente MUST render exactly one back-to-list affordance — the upper breadcrumb. Any additional back link (`‹ Pazienti`, `Indietro`, or equivalent) currently rendered between the breadcrumb and the patient identity card MUST be removed.
- **FR-002**: The upper breadcrumb MUST continue to read `Pazienti > <Nome Paziente>` in Italian, with the `Pazienti` segment remaining a working link back to the patient list.
- **FR-003**: The patient identity card (initials, name, status [ricoverato/ambulatoriale], MRN, age, sex, room/bed, allergies when present) MUST render identically to its current state — this feature does not change the card's fields, order, styling, or behaviour.
- **FR-004**: The vertical space previously occupied by the duplicate back link MUST be reclaimed (the layout MUST shift up, not leave an empty gap).
- **FR-005**: No global horizontal scroll MUST appear at any of the four supported viewports (1024×768, 1180×820, 1366×768, 1920×1080) as a result of this change.
- **FR-006**: The frontend production build MUST succeed with zero new TypeScript or build errors.
- **FR-007**: The redesign MUST NOT modify backend code, Prisma schema, or any API contract.
- **FR-008**: All Italian UI labels touched by this change MUST be preserved verbatim where they remain visible.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On any Scheda Paziente sub-page, a DOM audit returns exactly one element matching back-link selectors (`.cr-breadcrumb`, `.cr-back`, `.indietro`, or any visible `‹ Pazienti` text node) — and that element is the upper breadcrumb.
- **SC-002**: The vertical distance from the top of the page content area to the top of the patient identity card decreases by at least the computed height of the previously-rendered `‹ Pazienti` back link (measured via DevTools before and after the change at 1366×768).
- **SC-003**: The patient identity card retains the same fields in the same order with the same styling at all four reference viewports — verified by visual comparison against a pre-change screenshot.
- **SC-004**: At all four reference viewports the overflow audit script returns zero hits.
- **SC-005**: `npm run build` in `frontend/` completes with zero TypeScript errors and zero new build warnings introduced by this feature.

## Assumptions

- The duplicate back link is rendered by a sub-page component inside the operator dashboard (likely `PatientCompactHeader` or its parent). Implementation will locate the emission site during planning.
- The upper breadcrumb is rendered by the page chrome (not by the sub-page component) and is already the single source of truth for `Pazienti > <Nome>` navigation per feature 010 / FR-007.
- Italian UI labels remain unchanged.
- Mobile viewports below 1024px are out of scope (Constitution: tablet-first, desktop-responsive).
- Visual validation is performed in Chrome / Edge DevTools at the four reference viewports listed in SC-004.
- Backend, Prisma, and API contracts remain unchanged.
