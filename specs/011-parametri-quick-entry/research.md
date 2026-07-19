# Phase 0: Research — Parametri Pazienti Compact Quick-Entry Layout

**Feature**: 011-parametri-quick-entry | **Date**: 2026-06-02

Spec produced zero `NEEDS CLARIFICATION` markers. This document records the technical decisions made to satisfy the spec, with rejected alternatives noted for traceability.

---

## R-1: Compact Row Layout — Grid, Not Card

**Decision**: One CSS-grid row per patient. Columns:

```
[avatar / name / room] [PA] [SpO2] [FC] [TC] [DTX] [Evacuazione] [Note button] [Save action]
```

Row height ≤ 56 px at rest. Inputs are inline; no surrounding card chrome (no shadow, no rounded card border around the row — only a 1-px hairline divider between rows). Patient identity (avatar + name + camera) fits in a single fixed-width left column (~ 220 px on 1024-px viewports). Each clinical field is a small fixed-width input (~ 64–80 px) sized for one numeric value plus its unit hint.

**Rationale**:

- Card chrome was the largest source of vertical space waste in the current layout (each card added ~ 24 px of border + shadow + padding).
- Grid lets the six clinical inputs and the Save button align across all rows — an operator can scan the same column on every patient at the same y-offset.
- 56-px row height satisfies SC-002 while remaining touch-friendly (44 px tap targets fit inside the row with normal vertical padding).

**Alternatives considered**:

- _Kept card chrome but reduced padding to ~ 4 px_ — still wastes ~ 16 px per patient; rejected.
- _Table layout with `<table>`_ — works visually but loses CSS grid's ability to gracefully wrap at narrow viewports (FR-013); rejected.

---

## R-2: Auto-Inject `ora` and `operatore` at Save Time — Frontend Only

**Decision**: At the moment the operator clicks Save on a row, the existing client-side `rigaToParametroGiorno()` mapper sets:

- `ora` = `new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })` — taken at save call time, not at form-load time.
- `firmaIpM` (the existing backend field that already holds the operator's signature) = `operatoreNome` prop value at the save moment.

No backend change. No new request shape. The existing `onUpdateCartella({ parametriMensili: ... })` call is preserved verbatim. FR-020's conditional backend allowance is **not exercised** because the auto-fields can be populated client-side without any contract change.

**Rationale**:

- The backend already accepts `ora` and `firmaIpM` in the payload — it cannot tell whether the operator typed them or the form synthesised them. Client-side synthesis is the smallest viable diff.
- Server-side injection would require a small backend change (FR-020 carve-out) and a new "missing → server fills" code path on a clinical entity. That is more invasive than the spec needs.
- Keeps Constitution IV intact without invoking FR-020.

**Caveats**:

- Client clock drift is possible. The spec edge-case "operator's clock is wrong" is acknowledged in the spec. For RSA tablets that are network-synced, drift is sub-second; the trade-off is accepted in exchange for zero backend changes.
- The `operatoreNome` value used must be the **current** prop value at save click — not a value closed over at form-mount. Implementation must read it inside the `onSalva` handler (not cache it in a `useRef` at mount).

**Alternatives considered**:

- _Backend injection (server fills `ora` / `firmaIpM` when missing)_ — invokes FR-020, requires backend deploy, adds latency between client-clock and server-clock that the operator cannot reconcile. Rejected unless a real defect emerges.
- _Hybrid (client sends, server validates within tolerance)_ — overengineered for v1.

---

## R-3: Backend Stays Untouched

**Decision**: No backend, Prisma, or `VITE_API_URL` change in this feature. FR-020 carve-out is **not invoked**.

**Rationale**: R-2's frontend-only auto-injection satisfies FR-005 / FR-006 / FR-016 without touching the backend. The spec explicitly says backend MAY change only if strictly necessary — R-2 demonstrates it is not necessary.

**Alternatives considered**:

- _Minimal backend change to default `ora`/`firmaIpM` server-side_ — see R-2 above. Rejected as overkill.

---

## R-4: Note Affordance — In-Row Expansion, One Row at a Time

**Decision**: Each row exposes a "Note" button (icon + small label). Click toggles an inline note input that occupies a second line **of the same row** (visually anchored below the clinical fields, inside the same grid container). Only one row at a time can have its note input open — opening Note on a second row closes the first.

When a note has been saved (non-empty `noteRapide`), the Note button shows a subtle "filled" indicator (e.g. dot or filled background) so the operator can scan for rows that already have notes.

**Rationale**:

- "One open at a time" prevents two side-effects: (a) keeping multiple draft note states alive in React, (b) inflating the page's resting height as the operator browses.
- In-row expansion keeps the spatial relationship between the note and the patient explicit. A separate modal would lose that.
- The filled-button indicator satisfies FR-010 (saved-note indicator visible at rest).

**Alternatives considered**:

- _Inline note always visible but compact_ — defeats the density gain of US1.
- _Modal dialog for note_ — pulls the operator's focus off the list; breaks fast-entry flow.
- _Multiple rows open simultaneously_ — height drift; rejected.

---

## R-5: Input Sizing and Tab Order

**Decision**:

- Each clinical input is `width: 64–80px`, `height: 36px`, `font-size: 14px`, with a placeholder that hints unit (e.g. `mmHg`, `bpm`, `%`). Inputs use `inputmode="decimal"` for numeric fields and `inputmode="text"` for `Evacuazione`.
- Tab order: `name → PA → SpO2 → FC → TC → DTX → Evacuazione → Save`. Shift+Tab reverses. The Note button is `tabindex="-1"` while the row is _not_ in note-edit mode (it is opt-in, not part of the rapid entry path).
- Enter key on any clinical input triggers Save for that row (rapid-entry power user).

**Rationale**:

- 36-px input height inside a 56-px row leaves 10 px vertical padding above and below — comfortable for touch while keeping the row compact (SC-002).
- Excluding the Note button from Tab order keeps the keyboard path lean for the 80 % case where the operator does not attach a note.
- Enter-to-save is a small "free upgrade" that further compresses click-to-save time (SC-009 ≤ 6 s).

**Alternatives considered**:

- _48-px inputs (canonical touch target)_ — bloats row to 64 px; conflicts with SC-002.
- _32-px inputs_ — too small for thumb-tap on tablets; rejected.
- _No keyboard shortcut_ — leaves SC-009 at the mercy of mouse-click latency.

---

## Open Questions

None. All spec items map to decisions above. Ready for Phase 1 design output.
