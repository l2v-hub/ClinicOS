# Phase 0: Research — Patient Card Navigation Uniformity & Clinical Section Layout Parity

**Feature**: 010-patient-section-coherence | **Date**: 2026-06-02

The spec produced zero `NEEDS CLARIFICATION` markers. This document records the technical decisions made to satisfy the spec's functional requirements and success criteria, with the rejected alternatives noted for traceability.

---

## R-1: Reuse the 009 L2 / L3 Token Surface — Do Not Redefine

**Decision**: All L2 / L3 visual rules introduced by feature `009-nav-l2-l3-hierarchy` (the `.page-tabs*` / `.section-tabs*` selectors, the `--l2-h` / `--l3-h` / `--l2-underline-*` / `--l3-underline-*` / `--tab-transition-*` tokens, the `.tab-panel-transition` keyframes, and the `@media (prefers-reduced-motion: reduce)` block) are the canonical contract. Feature 010 **enforces** them across every Scheda Paziente sub-page and **does not** redefine them.

**Rationale**:

- 009 is already in production. Redefining tokens or rewriting the L2 / L3 base would regress the very uniformity this feature exists to ensure.
- The defect this feature targets is _inconsistent application_ of the canonical rules, not the rules themselves.

**Alternatives considered**:

- _Introduce a per-page L2 token override system_ — multiplies the defect surface; explicitly rejected.
- _Rewrite L2 / L3 from scratch_ — burns the work shipped in 009 with no upside.

---

## R-2: Single Shared `ClinicalCard` Wrapper for Anamnesi + Presa in Carico

**Decision**: Introduce one small shared component at `frontend/src/components/shared/ClinicalCard.tsx`. It renders: a header strip with the card title and a Modifica action (passed as a child or callback), a collapse toggle, and a content slot. State (`expanded` / `collapsed`, `editing` / `view`) is held internally with optional controlled props for parents that need to drive it.

Inverse principle: this is a wrapper, not a framework. It carries no clinical logic, no form layouts, and no Modifica handler implementation. Each call site supplies its own edit content and save handler.

**Rationale**:

- Anamnesi already has the model the spec asks Presa in Carico to adopt. Today the markup is inline in `renderAnamnesi()` inside `PatientDetail.tsx`. Without consolidation, the parity required by FR-009 would mean copying that markup into `PresaInCaricoTab.tsx`, which would immediately drift.
- The duplication threshold (≥ 2 distinct call sites that need identical collapse + Modifica behaviour) is met by Anamnesi + Presa in Carico. The Profilo page also collapses card-like blocks and is a likely future call site, taking the count to three — comfortably above Principle I's bar.
- Keeping the component small (no slots beyond title + Modifica + content) avoids the "card framework" smell.

**Alternatives considered**:

- _Pure CSS, no shared component_ — leaves the open/collapse state in each call site's React state and the Modifica button shape inlined per page. Drift returns within one feature cycle.
- _Use a library (e.g. Radix, Headless UI)_ — adds a dependency, violates Principle I, and gives features (focus-trap, async API, slotting) we do not need.

---

## R-3: Card Header Treatment — Reuse the Flat Blue Section Header, Then Card-Level Strip

**Decision**: The section-level flat blue header (already shipped, used at the top of Anamnesi, Presa in Carico, Terapia Farmacologica, etc.) is preserved untouched. The card-level header (inside each card) is a lighter inline strip with title + collapse toggle + Modifica button, using the existing `--card-*` tokens if present, otherwise plain text + the existing `.btn-sm` / `.btn-link` styles already in use across the codebase.

**Rationale**:

- FR-012 explicitly requires the section blue header to remain.
- Adding a second heavy header at card level would compete with the section header and break the visual rhythm. A lighter strip is conventional (think Notion / Linear collapsible sections).
- Reusing existing button classes avoids introducing new button variants.

**Alternatives considered**:

- _Match the section header treatment at card level_ — visually noisy and clashes with the existing Anamnesi shape.
- _No card header at all, only a content block with a side toggle_ — loses the collapse affordance and weakens the Modifica entry point.

---

## R-4: Card Expand / Collapse Motion

**Decision**: Card content uses CSS `height: 0 → auto` via the established pattern of measuring `scrollHeight` on the content node and toggling a `--card-content-h` custom property. Animation duration = `var(--tab-transition-duration, 180ms)`, easing = `var(--tab-transition-easing, ease-out)` — the same tokens 009 introduced. The `@media (prefers-reduced-motion: reduce)` block from 009 is extended with the card selector so animation is suppressed under user preference (FR-018 / SC-012).

**Rationale**:

- Reuses the token language 009 established; no new motion tokens.
- Measuring `scrollHeight` keeps the animation real (not a fake `max-height` clip) and respects dynamic content sizes.
- `prefers-reduced-motion` rule is centralised in `App.css` — one block governs both tab and card motion, matching the spec's expectation that 010 builds on 009.

**Alternatives considered**:

- _CSS-only `transition: max-height: 9999px`_ — clips long content awkwardly and the timing function feels wrong on long expansions.
- _Framer Motion / react-spring_ — extra dependency, Principle I violation.

---

## R-5: Breadcrumb Deduplication Strategy

**Decision**: Identify every place in the Scheda Paziente content area that renders a `Pazienti > <Patient>` path or a Back / Indietro link, and remove the in-content occurrence. The upper page-chrome breadcrumb (rendered by the page shell, not by sub-page components) is the single survivor.

**Rationale**:

- FR-007 forces exactly one breadcrumb visible per Scheda Paziente sub-page.
- The upper page-chrome breadcrumb is shared across the app — removing it would break navigation everywhere. The in-content duplicates exist because earlier features added their own quick-back affordance per page; consolidating to the page-chrome one returns the app to a single source of truth.

**Alternatives considered**:

- _Remove the upper breadcrumb and keep the in-content ones_ — would force each sub-page to render its own path, multiplying the inconsistency this feature aims to fix.
- _Keep both but visually hide one via CSS_ — bloats the DOM and breaks the page-tree audit (SC-006).

---

## R-6: Terapia Farmacologica Sub-Menu Spacing — Match Parametri Vitali

**Decision**: Measure the computed vertical gap between the section title and the L3 sub-menu on `ParametriTab` (the reference baseline), then apply the same `margin-top` (or equivalent token) on the L3 sub-menu wrapper inside `TerapiaFarmacologicaTab`. Token candidates: an existing `--section-title-gap` or `--space-3` if defined; otherwise introduce a single named token in `App.css` (`--clinical-submenu-gap`) and use it on both pages.

**Rationale**:

- FR-013 sets a ± 2 px tolerance. Matching by a shared token rather than by hand-tuned `margin-top: 16px` ensures both pages drift together.
- Parametri Vitali is the reference baseline because it is already correct per the spec.

**Alternatives considered**:

- _Hand-pick a number per page_ — recreates the drift; rejected.
- _Reuse `--content-px-lg`_ — that token is for content-area padding, not vertical title gap; semantic mismatch.

---

## R-7: Badge Counter Audit Strategy

**Decision**:

1. Build an inventory of every place in `PatientDetail.tsx` and the cartella tabs where a badge is rendered on an L2 or L3 tab (`page-tabs__badge` / `section-tabs__badge`).
2. For each badge, identify the source value and trace it to a visible count inside the corresponding tab.
3. For badges whose source is undefined, stale, or does not match a user-visible count, **delete** the badge wiring at the call site (the component contract from 009 already auto-hides a badge of 0; this just removes the misleading non-zero values).
4. For badges that survive, add a one-line comment at the call site naming the count (e.g. `// badge = number of unread diario entries in last 24h`).

**Rationale**:

- FR-015 mandates removal of undefined badges.
- An exhaustive audit (not a sample) satisfies SC-009.
- One-line comments at the surviving call sites help the next implementer avoid reintroducing the drift.

**Alternatives considered**:

- _Add a runtime warning for "phantom" badges_ — adds dev noise; explicit removal is cleaner.
- _Keep all current badges with a TODO_ — leaves the defect in production, violates the spec's "remove if undefined" rule.

---

## R-8: File Edit Order (Risk-Minimising)

**Decision**:

1. `frontend/src/components/shared/ClinicalCard.tsx` — new component first; nothing depends on it until step 4.
2. `frontend/src/App.css` — add `--card-*` tokens, `.clinical-card*` rules, extend reduced-motion block; ensure no L2 / L3 rules from 009 are weakened.
3. `frontend/src/app-additions.css` — prune duplicate-breadcrumb selectors and any stray L2 override that drifted on a specific sub-page; annotate every retained override with the FR it preserves.
4. `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx` — refactor to render four `ClinicalCard` instances in order.
5. `frontend/src/components/operator/PatientDetail.tsx` — route `renderAnamnesi()` through `ClinicalCard`; remove every in-content breadcrumb / Back link; ensure the L2 row is always `<PageTabs>` from `NavComponents.tsx` (canonical surface from 009).
6. `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx` — apply the title-to-sub-menu gap token from R-6.
7. Badge audit pass — surgical edits across the cartella tabs to remove undefined badges.
8. `npm run build` from `frontend/` — full TS + Vite build must pass with zero new errors / warnings.

**Rationale**: New component first so the consumers compile; CSS second so the cascade exists; component refactors last so test surface is minimised at each step.

**Alternatives considered**:

- _Refactor `PatientDetail.tsx` first_ — would break the build until step 1 lands.
- _Single bulk commit per file rather than per step_ — collapses verification points; rejected.

---

## Open Questions

None. All spec items map to decisions above. Ready for Phase 1 design output.
