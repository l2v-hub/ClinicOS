# Feature Specification: Navigation Level 2 & Level 3 Hierarchy Redesign

**Feature Branch**: `009-nav-l2-l3-hierarchy`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Redesign professionale navigazione livello 2 e livello 3 di ClinicOS. L1 sidebar va bene. L2 e L3 oggi non hanno gerarchia chiara, sembrano poco professionali. Stesso linguaggio grafico ma non identici. L2 grande, evidente, active con underline/barra. L3 piu piccolo, leggero, subordinato. No bordi pesanti, no pill grosse, no stili random. Adattivo tablet/desktop, no overflow orizzontale, transizione leggera. L1 invariata. Build passa. Backend/Prisma/API/VITE_API_URL invariati."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Operator immediately recognises the primary page menu (Priority: P1) - MVP

An operator opens a clinical record. Within the first glance, they identify a horizontal row of tabs as the primary navigation for that page (Diario, Terapia, Parametri, Agenda, etc.). The active tab is unambiguous, marked by a clean underline or active bar - no heavy borders, no filled pill. The bar visually dominates the page header area.

**Why this priority**: Without a clear L2 the operator cannot orient themselves; ambiguous hierarchy is the root cause flagged in the request. Solving L2 alone delivers an immediately usable, professional-feeling nav and is the minimum viable improvement.

**Independent Test**: Render a clinical record page on a 1366x768 desktop and a 1024x768 tablet. Confirm the L2 row is visually dominant, the active state uses an underline/active bar (not a heavy border or filled pill), and touch targets are >=44px tall.

**Acceptance Scenarios**:

1. **Given** a clinical record page is open, **When** the operator looks at the page chrome, **Then** the L2 nav reads as the primary horizontal menu of that page (higher visual weight than any sub-nav).
2. **Given** an L2 tab is active, **When** the page renders, **Then** the active state is conveyed via an underline or active bar - no surrounding border box, no large filled pill.
3. **Given** a 1024-px tablet viewport, **When** the L2 nav renders, **Then** every L2 touch target is >=44px high and reachable without horizontal page scroll.

---

### User Story 2 - Operator distinguishes the sub-menu from the primary menu (Priority: P2)

When an L2 section contains further subdivisions (e.g. Terapia -> Farmacologica, Riabilitativa, Psicologica), the operator sees an L3 row that clearly belongs to the same family as L2 but reads as subordinate: smaller text, lighter weight, more compact spacing, less prominent active state. The two rows are never confusable for sibling menus.

**Why this priority**: After L2 is solved, hierarchy still fails if L3 looks like a second L2. Resolving L3 unlocks the full Left-Top-Top model.

**Independent Test**: On a page with both L2 and L3 (Scheda Paziente -> Terapia -> Farmacologica), confirm that L2 and L3 share typography family / color tokens / motion timing but differ in size, weight, and active-state intensity. A user shown a screenshot must rank L2 as more important than L3 without prompting.

**Acceptance Scenarios**:

1. **Given** a page has both L2 and L3 visible, **When** the operator scans them, **Then** L3 is unmistakably subordinate (smaller / lighter / more compact) yet recognisably the same design family.
2. **Given** an L3 tab is active, **When** the page renders, **Then** the L3 active indicator is clear but visually lighter than the L2 active indicator (e.g. thinner bar, lower-contrast fill, smaller underline).
3. **Given** the L3 row has many items, **When** the row exceeds the available width, **Then** L3 scrolls horizontally within its own container without producing a global page overflow.

---

### User Story 3 - Operator changes tabs with a polished, non-disruptive transition (Priority: P3)

When the operator clicks a different L2 or L3 tab, the new content appears with a brief, lightweight transition (fade or short slide). The transition feels professional, never blocks interaction, and respects the reduced-motion preference of the operator.

**Why this priority**: Pure polish after hierarchy is established. Skippable for MVP but expected in an enterprise healthcare UI.

**Independent Test**: With motion enabled, switch between L2 tabs and observe a short transition (<=200ms). Enable `prefers-reduced-motion: reduce` in devtools and confirm the transition is suppressed.

**Acceptance Scenarios**:

1. **Given** motion is enabled, **When** the operator switches L2 or L3 tab, **Then** the new content appears with a brief transition (under ~200ms) that does not block interaction.
2. **Given** `prefers-reduced-motion: reduce` is set, **When** the operator switches tab, **Then** the new content appears instantly with no animation.

---

### Edge Cases

- L2 row with so many entries it cannot all fit at 1024px width -> L2 must wrap or scroll inside its container without leaking horizontal scroll to the whole page.
- L3 row with many entries on a narrow viewport -> L3 scrolls horizontally (scrollbar hidden) without producing a global page overflow.
- Active L2 + active L3 visible at the same time on the same page -> both indicators must be readable and the L3 indicator must remain clearly subordinate to L2.
- High-DPI tablet displays -> underline / bar thickness must remain visible (not sub-pixel).
- User taps very close to the edge of an L3 chip on tablet -> touch target must remain large enough (>=32px) to be reliably hittable.
- Theme already defines an accent color -> L2 active indicator must reuse the existing token, not introduce a new color.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Level 1 sidebar MUST remain visually and behaviourally unchanged by this feature.
- **FR-002**: The Level 2 navigation MUST present as the primary horizontal page-level menu, visually dominant relative to any sub-navigation on the same page.
- **FR-003**: The Level 2 active state MUST be conveyed via an underline or active bar - heavy borders, filled pills, and box-shadows around individual tabs are not permitted.
- **FR-004**: The Level 3 navigation MUST present as a clearly subordinate sub-menu (smaller, lighter, more compact) while remaining part of the same visual family as Level 2.
- **FR-005**: The Level 3 active state MUST be clear but visibly less prominent than the Level 2 active state.
- **FR-006**: Level 2 and Level 3 MUST share the same base design language (typography family, color tokens, motion timing) but MUST differ in size, weight, and active-state intensity so they are never mistaken for siblings.
- **FR-007**: The Level 2 navigation MUST use the full available horizontal width of the page content area at every supported viewport (tablet 1024px and above, desktop 1366px and above).
- **FR-008**: The Level 3 navigation MUST scroll horizontally inside its own container when its items exceed available width; no global horizontal page overflow is allowed at any supported viewport.
- **FR-009**: Switching between Level 2 or Level 3 tabs MUST trigger a brief, lightweight content transition that does not block interaction.
- **FR-010**: Level 2 touch targets MUST be at least 44px tall on tablet, suitable for finger input.
- **FR-011**: Level 3 touch targets MUST be at least 32px tall and remain reliably tappable.
- **FR-012**: All transitions introduced by this feature MUST honour `prefers-reduced-motion: reduce` by collapsing to an instant change.
- **FR-013**: The redesign MUST NOT introduce a new accent color; it MUST reuse the existing primary / accent design tokens already defined in the app.
- **FR-014**: The redesign MUST NOT modify backend code, Prisma schema, API contracts, or the `VITE_API_URL` configuration value.
- **FR-015**: The frontend production build MUST succeed with zero new TypeScript or build errors.
- **FR-016**: The redesign MUST preserve existing Italian UI labels.

### Key Entities

Not applicable - this feature has no new data entities. It refines presentation of existing navigation components only.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a 5-second screenshot test on the redesigned UI, at least 9 out of 10 unfamiliar viewers correctly identify the L2 row as "the main menu of this page" without prompting.
- **SC-002**: In the same test, at least 9 out of 10 viewers correctly rank L2 as more important than L3.
- **SC-003**: At viewports 1024x768, 1180x820, 1366x768, and 1920x1080, no element exceeds the document body width - verified by the standard overflow audit script (zero `console.log('overflow:')` hits).
- **SC-004**: Tab-change content transition completes in under 200ms when motion is enabled, and is fully suppressed when `prefers-reduced-motion: reduce` is set.
- **SC-005**: `npm run build` in `frontend/` completes with zero TypeScript errors and zero new build warnings introduced by this feature.
- **SC-006**: Every L2 tab measures >=44px in computed height; every L3 tab measures >=32px in computed height (DevTools inspector at 1024x768).
- **SC-007**: An operator new to ClinicOS, given the task "open Terapia Farmacologica for a patient", completes the task without verbal hints in their first attempt.

## Assumptions

- The existing `.page-tabs` (L2) and `.section-tabs` (L3) class structure is the implementation surface; this feature redesigns their styling and supporting CSS rather than introducing new components.
- The existing design-token palette (primary / accent / surface) is already defined in CSS custom properties on `:root` and will be reused - no new color tokens are introduced.
- Frontend stack is React + Vite + plain CSS (no heavy UI framework) and the edit surface is primarily `frontend/src/App.css`, `frontend/src/app-additions.css`, and `frontend/src/index.css`.
- Backend, Prisma schema, API contracts, and the `VITE_API_URL` value remain unchanged - explicitly out of scope.
- Italian UI labels remain unchanged.
- Mobile viewports below 1024px are out of scope in line with the ClinicOS Constitution (tablet-first, desktop-responsive).
- Visual validation is performed in Chrome/Edge DevTools at the four reference viewports listed in SC-003.
- Build verification is `npm run build` from `frontend/` and is required to pass before this feature is considered complete.
