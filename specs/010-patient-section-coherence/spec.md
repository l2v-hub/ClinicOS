# Feature Specification: Patient Card Navigation Uniformity & Clinical Section Layout Parity

**Feature Branch**: `010-patient-section-coherence`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Uniformare navigazione L2/L3 e layout sezioni cliniche Scheda Paziente. Problemi: L2 non uniforme, alcuni tab con bordo/pill altri con underline, breadcrumb duplicato, L3 disorganizzato in sezioni specifiche, Presa in Carico non ha la stessa qualita di Anamnesi, card non collassabili/modificabili, sotto-menu Terapia Farmacologica attaccato alla voce principale, badge counter incoerenti. Obiettivo: navigazione Scheda Paziente coerente e professionale. L1 invariata. Backend/Prisma/API/VITE_API_URL invariati."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Operator sees one consistent L2 tab style across every Scheda Paziente sub-page (Priority: P1) - MVP

An operator navigates through Panoramica, Clinica, Diario, Moduli, and Documenti for a patient. At every one of those pages the L2 tab row uses the exact same visual treatment: same height, same font, same underline-only active state, same spacing. No page surprises the operator with a heavy border, a filled pill, or a different active marker.

**Why this priority**: Inconsistent L2 nav is the most visible defect in the current Scheda Paziente. It signals "this product is unfinished" and forces the operator to rebuild their mental map at every tab change. Solving it alone delivers an immediately more professional product even before any deeper layout work.

**Independent Test**: Open every L2 sub-page in turn (Panoramica, Clinica, Diario, Moduli, Documenti) on a 1366 x 768 desktop. The L2 row at the top of each sub-page is visually identical — same height, same font, same underline, same active token. No pill, no surrounding border, no shadow appears on any single tab on any page.

**Acceptance Scenarios**:

1. **Given** the operator is on Scheda Paziente, **When** they click each L2 tab in sequence, **Then** the L2 row treatment does not visibly change between any pair of sub-pages.
2. **Given** any L2 sub-page is open, **When** the operator inspects the active tab, **Then** it is marked by an underline / active bar consistent with the canonical token (no border box, no filled pill, no shadow).
3. **Given** the page renders on a 1024 x 768 tablet, **When** the operator scans the L2 row, **Then** every tab measures the same height and every active state uses the same indicator on every page.

---

### User Story 2 - Operator works through Presa in Carico the same way they work through Anamnesi (Priority: P1)

The operator opens Presa in Carico and sees a layout that mirrors Anamnesi: a clear section header (the existing flat blue band), then a stack of self-contained cards — Dati di ingresso, Condizioni iniziali, Valutazione funzionale, Documenti e firma. Each card can be collapsed to a compact summary or expanded to show its full content, and each card exposes a Modifica action that takes the operator into edit mode for just that card.

**Why this priority**: Presa in Carico is one of the most-used clinical workflows. Today it lacks the card model that Anamnesi already has, so operators do the same kind of work in two very different shapes. Fixing this is high-value clinical-workflow polish and the second pillar of the feature.

**Independent Test**: Open Presa in Carico for any patient. The page shows the four expected cards in order. Each card collapses and re-expands with a single tap, each card exposes a Modifica button, and the section header retains the flat blue treatment used elsewhere in the Scheda Paziente. Side-by-side with Anamnesi, the two pages look like siblings — same card shape, same controls, same rhythm.

**Acceptance Scenarios**:

1. **Given** Presa in Carico is open, **When** the operator counts the cards, **Then** the page renders exactly the four cards: Dati di ingresso, Condizioni iniziali, Valutazione funzionale, Documenti e firma.
2. **Given** any card in Presa in Carico is expanded, **When** the operator clicks the card header, **Then** the card collapses to a compact summary; clicking again re-expands it.
3. **Given** any card in Presa in Carico is visible, **When** the operator clicks Modifica, **Then** the card enters edit mode without leaving the section header or navigating away from the page.
4. **Given** Anamnesi is open, **When** the operator compares it visually to Presa in Carico, **Then** the card model, collapse control, and Modifica button match in shape, spacing, and behaviour.

---

### User Story 3 - Operator never sees a duplicated breadcrumb (Priority: P2)

The operator navigates into a deep sub-page (e.g. Pazienti -> Mario Rossi -> Clinica -> Anamnesi). At the top of the page there is exactly one breadcrumb path: the upper page-chrome breadcrumb. Inside the page content area there is no second "Pazienti > Mario Rossi" repetition or stray Back link that duplicates what the upper breadcrumb already shows.

**Why this priority**: A duplicated breadcrumb is a clarity defect; it makes the operator hesitate (which one do I click?) but does not block work. Lower priority than L2 uniformity or card parity, but obvious to fix once those land.

**Independent Test**: Open Scheda Paziente -> any sub-page. Count breadcrumb instances on the page. Exactly one exists, and it is the upper page-chrome breadcrumb. No second path appears inside the content area.

**Acceptance Scenarios**:

1. **Given** the operator is on any Scheda Paziente sub-page, **When** they count breadcrumb elements visible on the page, **Then** exactly one breadcrumb is shown and it is the upper page-chrome one.
2. **Given** the operator is on Scheda Paziente -> Anamnesi, **When** they scan the content area below the L2 row, **Then** no "Pazienti > Mario Rossi" repetition or stray Back link is present inside that area.

---

### User Story 4 - Operator sees a coherent, clearly subordinate L3 row in every section (Priority: P2)

When a sub-page exposes a third level of navigation (sub-sections, contextual sub-tabs, or a tree view), the L3 surface reads as subordinate to the L2 row and is presented consistently from one section to another. For Panoramica / Profilo the L3 categories are Anagrafica, Contatti, Contatto emergenza, and Assegnazione clinica. The L3 surface never reads as a second main menu.

**Why this priority**: Builds on the foundation that 009 already shipped for L3 styling. This feature ensures the _information architecture_ of L3 is consistent across the Scheda Paziente, not just the visual treatment.

**Independent Test**: Open Panoramica / Profilo and confirm the four L3 categories appear in the listed order. Open another sub-page that exposes L3 (e.g. Clinica) and confirm the L3 treatment is visibly the same family as Panoramica's L3 surface — same scale, same spacing, same active indicator intensity — never larger or louder than L2.

**Acceptance Scenarios**:

1. **Given** Panoramica / Profilo is open, **When** the operator scans the L3 surface, **Then** they see exactly: Anagrafica, Contatti, Contatto emergenza, Assegnazione clinica — in that order.
2. **Given** any sub-page with an L3 surface is open, **When** the operator compares it to the L3 surface on another sub-page, **Then** the two L3 surfaces use the same visual family (size, spacing, active indicator intensity).
3. **Given** an L3 surface is rendered alongside an L2 row, **When** the operator scans the page, **Then** L3 is unmistakably subordinate to L2 in size and weight.

---

### User Story 5 - Operator opens Terapia Farmacologica without the sub-menu touching its title (Priority: P3)

The operator opens Clinica -> Terapia -> Terapia Farmacologica. The sub-menu (L3 row or section sub-tabs) appears with the same vertical breathing room as the sub-menu under Parametri Vitali — never visually fused to the title above it.

**Why this priority**: Pure spacing polish on a single sub-page. Lower-priority than the structural fixes above but a frequently noticed defect by daily users.

**Independent Test**: Open Terapia Farmacologica and Parametri Vitali side by side. The vertical distance between the section title and the sub-menu is identical on both pages. The sub-menu never visually touches the title on Terapia Farmacologica.

**Acceptance Scenarios**:

1. **Given** Terapia Farmacologica is open, **When** the operator inspects the gap between the section title and the sub-menu, **Then** the gap matches the gap measured on Parametri Vitali to within 2 px.
2. **Given** the page renders on a 1024 x 768 tablet, **When** the operator scans the sub-menu region, **Then** the sub-menu is clearly separated from the section title and does not appear glued to it.

---

### User Story 6 - Operator can trust every badge counter on L2 / L3 tabs (Priority: P3)

Every counter badge shown on an L2 or L3 tab corresponds to a clearly defined, user-understandable count. If a badge cannot be tied to a clear, meaningful number that matches the data the operator sees once they open the tab, the badge is removed.

**Why this priority**: Bad badges produce silent confusion ("Why does Parametri Vitali say 4?"). Removing or repairing them is finish-work polish.

**Independent Test**: For every L2 and L3 tab that currently displays a badge, document what the number means and verify it equals the count of items the operator sees once they open the tab. Any badge whose meaning cannot be defined is removed in this feature.

**Acceptance Scenarios**:

1. **Given** an L2 or L3 tab displays a badge, **When** the operator opens that tab, **Then** the badge value equals the count of relevant items visible inside (e.g. "Diario 4" means four diary entries are visible inside Diario).
2. **Given** a badge has no clear, definable meaning that matches visible content, **When** this feature ships, **Then** that badge is removed.
3. **Given** Parametri Vitali currently shows a "4" badge that does not correspond to a visible count of four items inside the tab, **When** this feature ships, **Then** the badge is either repaired to match a defined count or removed.

---

### Edge Cases

- A Scheda Paziente sub-page renders zero L3 sub-tabs (only L2). The L2 row must still respect the canonical treatment; no placeholder L3 row should appear.
- A card in Presa in Carico or Anamnesi has no content yet. The collapsed-empty state must remain readable and the Modifica button must still be operable to add content.
- A card title is too long for the card header on a 1024 px viewport. The title must truncate inside the card header without disturbing the collapse / Modifica controls or the page layout.
- The operator collapses every card on Presa in Carico. The page must still show the section header and respect the page padding; no layout collapse beyond the cards themselves.
- An L2 tab has a badge of zero. The badge must not render at all in that case.
- A badge count exceeds 99. The badge must show a capped indicator (e.g. "99+") rather than overflow the tab width.
- The operator switches from Anamnesi to Presa in Carico mid-edit on one of Anamnesi's cards. Edit state for the abandoned card must be discarded cleanly; no orphan edit indicator should persist on the new page.
- L1 sidebar is untouched. Confirming that L1 is not visually altered by any of the layout changes in this feature.
- `prefers-reduced-motion: reduce` is set. Card expand / collapse must use the same reduced-motion behaviour as the canonical tab transition from 009 (no animation).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Level 1 sidebar MUST remain visually and behaviourally unchanged by this feature.
- **FR-002**: Every L2 tab row inside the Scheda Paziente (Panoramica, Clinica, Diario, Moduli, Documenti and any equivalent sub-page) MUST use the exact same visual treatment — same height, same font, same underline-only active state, same spacing — with no exceptions.
- **FR-003**: No L2 tab MUST display a surrounding border box, filled pill background, or box-shadow as its active state. The only permitted active marker is the canonical underline / active bar already shipped in feature 009.
- **FR-004**: The L3 surface on any sub-page that exposes one MUST use the canonical L3 treatment (smaller, lighter, subordinate to L2) and MUST be visually consistent across all sub-pages that expose an L3 row.
- **FR-005**: For the Panoramica / Profilo sub-page, the L3 categories MUST be exposed in this exact order: Anagrafica, Contatti, Contatto emergenza, Assegnazione clinica.
- **FR-006**: The L3 surface MUST never read as a second primary menu — it MUST remain unmistakably subordinate to L2 in size, weight, and active-state intensity.
- **FR-007**: Inside any Scheda Paziente sub-page, exactly one breadcrumb path MUST be visible — the upper page-chrome breadcrumb. Any second breadcrumb, "back to list" link, or "Pazienti > Patient" repetition inside the content area MUST be removed.
- **FR-008**: The Presa in Carico section MUST present its content as a vertical stack of exactly four cards in this order: Dati di ingresso, Condizioni iniziali, Valutazione funzionale, Documenti e firma.
- **FR-009**: The Anamnesi section MUST present its content using the same card model as Presa in Carico (same card shape, same header treatment, same collapse control, same Modifica button placement).
- **FR-010**: Every card in Presa in Carico and Anamnesi MUST be individually collapsible (the operator can collapse one card without affecting any other).
- **FR-011**: Every card in Presa in Carico and Anamnesi MUST expose a clearly labelled Modifica action that takes the operator into edit mode for that card alone.
- **FR-012**: The section header on Presa in Carico and Anamnesi MUST preserve the existing flat blue treatment used elsewhere in the Scheda Paziente — no new header style is introduced.
- **FR-013**: The sub-menu under Terapia Farmacologica MUST use the same vertical spacing between section title and sub-menu as the sub-menu under Parametri Vitali, to within 2 px.
- **FR-014**: Every counter badge displayed on an L2 or L3 tab inside the Scheda Paziente MUST correspond to a defined, user-understandable count that matches visible content inside the tab once opened.
- **FR-015**: Any badge whose meaning cannot be defined and tied to visible content MUST be removed by this feature.
- **FR-016**: A badge with a count of zero MUST NOT render. A badge with a count greater than 99 MUST display a capped indicator (e.g. "99+") rather than overflowing the tab.
- **FR-017**: The Scheda Paziente layout MUST NOT produce any global horizontal scroll at any of the four supported viewports (1024 x 768, 1180 x 820, 1366 x 768, 1920 x 1080).
- **FR-018**: All transitions introduced by this feature (card expand / collapse) MUST honour `prefers-reduced-motion: reduce` by collapsing to an instant change, consistent with the rule already shipped in feature 009.
- **FR-019**: The redesign MUST NOT introduce a new accent color; it MUST reuse the existing primary / accent design tokens already in the codebase.
- **FR-020**: The redesign MUST NOT modify backend code, Prisma schema, API contracts, or the `VITE_API_URL` configuration value.
- **FR-021**: The frontend production build MUST succeed with zero new TypeScript or build errors.
- **FR-022**: The redesign MUST preserve existing Italian UI labels verbatim.

### Key Entities

Not applicable - this feature has no new data entities. It refines presentation of existing Scheda Paziente sub-pages and consolidates the card / collapse / edit pattern that Anamnesi already exposes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Across all five Scheda Paziente sub-pages (Panoramica, Clinica, Diario, Moduli, Documenti) the L2 tab row computes identical height, identical font-size, and the same single active-marker class — verified by DevTools inspection on the live UI.
- **SC-002**: Zero L2 tab anywhere in the Scheda Paziente renders with `border`, `border-radius > 0`, filled `background-color` on active state, or non-zero `box-shadow`. Verified by a CSS computed-style audit on every L2 tab.
- **SC-003**: At least 9 out of 10 unfamiliar viewers, shown screenshots of Presa in Carico and Anamnesi side by side, identify them as "the same kind of page" (i.e. same card model, same controls).
- **SC-004**: Presa in Carico renders exactly the four expected cards (Dati di ingresso, Condizioni iniziali, Valutazione funzionale, Documenti e firma) in the specified order, each individually collapsible and each exposing a working Modifica control.
- **SC-005**: Anamnesi renders its content using the same card model as Presa in Carico — same card shape, same collapse control, same Modifica button placement.
- **SC-006**: On every Scheda Paziente sub-page only one breadcrumb instance is rendered. A page-tree audit returns exactly one breadcrumb element per page.
- **SC-007**: For Panoramica / Profilo, the L3 surface exposes exactly the four categories (Anagrafica, Contatti, Contatto emergenza, Assegnazione clinica) in the specified order.
- **SC-008**: The measured vertical gap between section title and sub-menu on Terapia Farmacologica matches the same gap on Parametri Vitali to within 2 px.
- **SC-009**: Every L2 and L3 badge on the Scheda Paziente either: (a) matches the count of visible items inside the tab once opened, or (b) does not render. No "phantom" badge survives this feature.
- **SC-010**: At the four reference viewports (1024 x 768, 1180 x 820, 1366 x 768, 1920 x 1080) no element exceeds the document body width — the standard overflow audit script returns zero hits.
- **SC-011**: `npm run build` in `frontend/` completes with zero TypeScript errors and zero new build warnings introduced by this feature.
- **SC-012**: Card expand / collapse animation is fully suppressed when `prefers-reduced-motion: reduce` is set.
- **SC-013**: An operator new to ClinicOS, given the task "open Presa in Carico for a patient and edit Dati di ingresso", completes the task on the first attempt without hints.

## Assumptions

- The L2 / L3 base CSS already shipped in feature `009-nav-l2-l3-hierarchy` (`.page-tabs*`, `.section-tabs*`, `.tab-panel-transition`, the `prefers-reduced-motion` block) is the canonical surface; this feature enforces its uniform application and does not redefine the visual rules.
- The L1 Teams-style sidebar component (`TeamsLikeSidebar`) is explicitly untouched.
- Frontend stack is React + Vite + plain CSS (no UI framework). The edit surface is `frontend/src/App.css`, `frontend/src/app-additions.css`, `frontend/src/components/operator/PatientDetail.tsx`, `frontend/src/components/shared/NavComponents.tsx`, and the sub-page components rendered inside `PatientDetail.tsx` (Anamnesi, Presa in Carico, Terapia Farmacologica, Parametri Vitali, Profilo / Panoramica).
- An existing collapsible-card component or pattern is reused for Anamnesi / Presa in Carico — no new heavy card framework is introduced. If a shared `ClinicalCard` component already exists, it MUST be reused; otherwise a small shared wrapper is introduced and scoped to clinical-record sub-pages.
- The Modifica action on each card hooks into existing edit flows already implemented for Anamnesi; no new backend endpoint or API contract is created.
- Italian UI labels remain unchanged.
- Mobile viewports below 1024 px are out of scope (Constitution: tablet-first, desktop-responsive).
- Visual validation is performed in Chrome / Edge DevTools at the four reference viewports listed in SC-010.
- Backend, Prisma schema, API contracts, and `VITE_API_URL` are unchanged.
- The badge counter audit (SC-009) is exhaustive across the Scheda Paziente; no exception list is maintained.
