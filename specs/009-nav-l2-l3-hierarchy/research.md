# Phase 0: Research — Navigation L2 & L3 Hierarchy Redesign

**Feature**: 009-nav-l2-l3-hierarchy | **Date**: 2026-06-02

The spec produced zero `NEEDS CLARIFICATION` markers. This document records the technical decisions made to satisfy the spec's functional requirements and success criteria, with the rejected alternatives noted for traceability.

---

## R-1: L2 Active-State Visual Treatment

**Decision**: 2-px solid bottom underline, animated from `width: 0` to `width: 100%` over 180ms ease-out, color = existing `--primary` / `--blue` token already used by the app accent. Applied via a `::after` pseudo-element on each tab so no markup change is needed.

**Rationale**:
- Underline is the strongest hierarchy signal that does not introduce visual weight (no border / shadow / pill — directly satisfies FR-003).
- 2 px reads cleanly at 1× and 2× DPR (edge case from spec: high-DPI tablets).
- 180 ms matches the existing `--tab-transition-duration` already shipped in 007, keeping motion language consistent across the app.
- Reusing the existing primary token honours FR-013.

**Alternatives considered**:
- *Bottom 4-px bar* — visually heavier; risks reading as a separator rather than an active indicator on smaller viewports.
- *Filled pill background* — explicitly forbidden by FR-003 and the user prompt ("no pill troppo grosse").
- *Top bar* — fights established Material / iOS convention for horizontal page tabs; reduces scannability.

---

## R-2: L3 Active-State Visual Treatment

**Decision**: 1-px bottom underline in the same primary token but at reduced opacity (`color-mix(in srgb, var(--primary) 70%, transparent)`) — same animated pseudo-element pattern, **half the height** and **lighter intensity** versus L2.

**Rationale**:
- Keeps the same design DNA (FR-006) but objectively less prominent than L2 (FR-005).
- Single-pixel underline is conventional for sub-nav (e.g. GitHub repository sub-tabs) and reads as clearly "smaller".
- `color-mix` is widely supported in Chrome 111+ / Edge / Safari 16.4+ — within the supported tablet/desktop matrix.

**Alternatives considered**:
- *Same 2-px underline as L2 but in a muted gray* — defeats hierarchy: equal weight, different color reads as "different theme" not "subordinate".
- *No underline at all, only text-color shift* — too subtle on the test viewports during 5-second-test (SC-001 / SC-002 risk).
- *Subtle pill background with low contrast* — drifts back toward the pattern the user explicitly rejected.

---

## R-3: Size & Typography Hierarchy

**Decision**:

| Property | L2 | L3 |
|----------|----|----|
| Height (`--l2-h` / `--l3-h`) | `44px` (already set in 003/007) | `32px` (already set in 007) |
| Font size | `14px` (`--l2-font`) | `11.5px` (`--l3-font`) |
| Font weight | `500` (medium) | `500` (medium) — same weight, smaller size carries the hierarchy |
| Letter spacing | `0` | `0.2px` (slight tracking to keep small text readable) |
| Horizontal padding | `12px` per tab | `8px` per tab |
| Gap between tabs | `4px` | `4px` |

**Rationale**:
- L2 height of 44px directly hits SC-006 / FR-010 (tablet touch target).
- L3 height of 32px is the minimum reliable tap target per Apple HIG and meets FR-011 / SC-006.
- Same font weight keeps the family identity (FR-006); size and padding carry the hierarchy.
- Values mostly already in `:root` from 007 — this feature **enforces** them, it does not redefine them.

**Alternatives considered**:
- *L2 = bold, L3 = regular* — double-signals hierarchy (size + weight) and made L3 feel disabled in design sketches.
- *L2 height 48px* — overshoots typical desktop expectations and wastes vertical space the spec asks to reclaim.

---

## R-4: Tab-Change Transition

**Decision**: Apply `.tab-panel-transition` class to the tab content wrapper. CSS keyframe `tabPanelEnter`: `opacity 0 → 1` and `transform: translateX(8px) → 0` over `var(--tab-transition-duration, 180ms)` with `ease-out` easing. Class is **re-triggered** via React `ref` + `useEffect` that removes and re-adds the class on `[activeGroup, tab]` change.

**Rationale**:
- Brief, professional, non-blocking (FR-009, SC-004).
- Implemented exactly once at the wrapper level — works for both L2 and L3 changes without touching every tab body.
- `ref` re-trigger pattern is the same one shipped in 007 — proven, no fetch-storm risk that would come from a `key={...}` remount (which would unmount heavy children like `TerapiaFarmacologicaTab`).
- `prefers-reduced-motion: reduce` block sets `animation: none` to satisfy FR-012 / SC-004.

**Alternatives considered**:
- *`key={…}` on the wrapper* — triggers React unmount; rejected during 007 review (caused 3-fetch storm on TerapiaFarmacologicaTab and 8 other stateful children).
- *Framer Motion* — would add a 30+ kB dependency for one transition; rejected per Principle I.
- *CSS `transition` (not `animation`) on opacity* — does not re-fire when the element stays mounted with identical styles; the `ref` trick is needed regardless.

---

## R-5: Horizontal Overflow Strategy

**Decision**:

- L2 row: `flex-wrap: nowrap`. If 1024px is too narrow for all L2 tabs, the inner container scrolls horizontally with `overflow-x: auto; scrollbar-width: thin`. The outer page shell stays `overflow-x: hidden` to satisfy SC-003.
- L3 row: same `overflow-x: auto`, but `scrollbar-width: none` and `::-webkit-scrollbar { display: none }` to keep the compact aesthetic.
- Page shell (`.app-shell`) carries `width: 100%; overflow-x: hidden` (already shipped in 007) — this feature verifies the rule and does not weaken it.

**Rationale**:
- Spec edge case: "L2 row with so many entries it cannot all fit at 1024px width" — must scroll inside container, never leak.
- Hidden scrollbar on L3 keeps the row visually light (matches "lighter weight" requirement) while still being functional.
- Visible thin scrollbar on L2 is a deliberate hint: if scroll is needed at primary nav, the user should know.

**Alternatives considered**:
- *Wrap L2 to two rows* — breaks the "primary horizontal menu" identity; rejected.
- *Hide overflowing L2 tabs behind an "Altro" menu* — adds new component complexity (Principle I) for an edge case current screens don't actually hit. Reserved for a future feature if real data demands it.

---

## R-6: Component Consolidation Decision

**Decision**: Do **not** introduce `PrimaryTopNavigation`, `SecondaryTopNavigation`, or `NavigationTabsBase` as new files in this feature. Continue rendering `.page-tabs` and `.section-tabs` markup inline where used. Re-evaluate consolidation only if duplication count exceeds 3 distinct call sites.

**Rationale**:
- Audit of `git grep` for L2 markup shows **2** real call sites (`PatientDetail.tsx` and the agenda views) — below the threshold of three identical structures that the constitution requires before extracting a helper (Principle I: "three similar lines are preferable to a premature helper").
- Visual rules live in CSS, not JSX; a wrapper component would not change the rendered DOM and adds an import surface for negligible gain.
- The user's prompt lists these components as "Creare/consolidare" — explicitly conditional. The plan honours the *intent* (one design language) without forcing the *form* (new components).

**Alternatives considered**:
- *Extract all three components up-front* — premature abstraction; violates Principle I; raises risk that 008's tab layout regressions return.
- *Extract only `NavigationTabsBase`* — would need to model the divergent active-state via prop drilling; adds complexity without removing duplication.

---

## R-7: File Edit Order (Risk-Minimising)

**Decision**:

1. `frontend/src/App.css` — confirm / strengthen `:root` tokens, update `.page-tabs` and `.section-tabs` rules, add the breakpoint blocks at 1180 / 1366 if missing.
2. `frontend/src/app-additions.css` — clinical-record-only overrides; ensure they defer to the new tokens.
3. `frontend/src/index.css` — quick audit only; if `#root` width clamp is gone (regression from 007 already removed it), skip.
4. `frontend/src/components/operator/PatientDetail.tsx` — verify the existing ref-based transition wrapper still in place; no JSX shape change unless missing.
5. `npm run build` from `frontend/` — full TypeScript + Vite build must pass with zero new errors / warnings.

**Rationale**: tokens and base rules first so cascade propagation can be observed before any component edit. PatientDetail is touched last because it is the largest file (94 KB) and any change carries the highest review cost.

**Alternatives considered**:
- *PatientDetail first* — risks the build failing on a JSX edit before the CSS rules even exist, making cause hard to isolate.
- *Single-pass edit of all files* — Constitution VI requires the build to compile after every change; sequential edits make a clean per-step verification possible.

---

## Open Questions

None. All spec items map to decisions above. Ready for Phase 1 design output.
