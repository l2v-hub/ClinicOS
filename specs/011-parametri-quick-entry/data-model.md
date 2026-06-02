# Phase 1: Design Model — Parametri Pazienti Compact Quick-Entry

**Feature**: 011-parametri-quick-entry | **Date**: 2026-06-02

No new backend entities or TypeScript interfaces. The design model is the CSS-token + row-state contract.

---

## CSS Design Tokens (`:root` in `App.css`)

### Tokens this feature adds

| Token | Value | Used by |
|-------|-------|---------|
| `--qe-row-h` | `56px` | Resting row height — also the SC-002 bar |
| `--qe-row-vpad` | `8px` | Row vertical padding |
| `--qe-row-hpad` | `12px` | Row horizontal padding |
| `--qe-input-h` | `36px` | Clinical input height (touch-friendly, fits within 56-px row) |
| `--qe-input-w-narrow` | `64px` | Single-value numeric inputs (FC, TC, DTX, SpO2) |
| `--qe-input-w-wide` | `96px` | Wider inputs (PA needs `SBP/DBP`, Evacuazione needs text/select) |
| `--qe-patient-col-w` | `220px` | Fixed left column for avatar + name + camera |
| `--qe-row-gap` | `8px` | Column gap inside the row grid |
| `--qe-divider-color` | `var(--border-subtle)` | 1-px hairline between rows |

### Tokens this feature does **not** introduce

- No new color tokens. All colors reuse existing primary / surface / text tokens.

---

## CSS Classes — New `.qe-row*` block (App.css)

| Selector | Purpose |
|----------|---------|
| `.qe-list` | Container for the patient-row list. `display: flex; flex-direction: column; width: 100%;` |
| `.qe-row` | Single row. `display: grid; grid-template-columns: var(--qe-patient-col-w) repeat(6, auto) auto auto; gap: var(--qe-row-gap); align-items: center; min-height: var(--qe-row-h); padding: var(--qe-row-vpad) var(--qe-row-hpad); border-bottom: 1px solid var(--qe-divider-color); box-sizing: border-box;` |
| `.qe-row__patient` | Left column. Avatar + name + camera inline. `display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis;` |
| `.qe-row__avatar` | Avatar circle, `width:32px; height:32px; border-radius:50%; flex: 0 0 32px;` |
| `.qe-row__name` | Patient name, `font-weight: 600; font-size: 14px;` truncated with `text-overflow: ellipsis`. |
| `.qe-row__room` | Camera/letto, `font-size: 12px; color: var(--text-soft);` |
| `.qe-row__input` | Numeric input, `width: var(--qe-input-w-narrow); height: var(--qe-input-h); padding: 0 8px; font-size: 14px; border: 1px solid var(--border-subtle); border-radius: 4px; background: var(--surface, #fff);` |
| `.qe-row__input--wide` | Modifier for PA / Evacuazione → `width: var(--qe-input-w-wide);` |
| `.qe-row__input:focus-visible` | `outline: 2px solid var(--primary); outline-offset: 2px;` |
| `.qe-row__note-btn` | Note affordance. `width: 36px; height: 36px; border: 1px solid var(--border-subtle); border-radius: 4px; background: transparent;` |
| `.qe-row__note-btn--has-note` | Filled state: `background: rgba(26,86,219,0.12); border-color: var(--primary);` |
| `.qe-row__save` | Save action button. Reuses existing `.btn-sm` styles + `min-width: 56px`. |
| `.qe-row__note-input` | Expanded note input (full row width below clinical inputs). `grid-column: 1 / -1; padding: 8px 0;` |
| `.qe-row--has-note-open` | Row in note-edit mode. Allows row to grow past 56 px while open. |
| `.qe-row:hover` | `background: rgba(0,0,0,0.02);` — subtle scan affordance |

### Responsive

```css
@media (max-width: 1180px) {
  /* Narrow tablet: shrink patient column slightly */
  .qe-row { grid-template-columns: 180px repeat(6, auto) auto auto; }
}
```

---

## Row State Contract (React)

| State | Storage | Lifecycle |
|-------|---------|-----------|
| `riga` (six clinical fields + note) | `useState` inside `RigaPaziente` | Per-row; seeded from `parametroToRiga(existing)` |
| `noteOpen` | hoisted to the parent `MultiPatientParametri` as `noteOpenForPazienteId: string \| null` | Only one row at a time has the note input open (R-4) |
| `saving` | `useState` inside `RigaPaziente` | `true` while save promise pending, blocks double-click |
| `errorMessage` | `useState` inside `RigaPaziente` | Surfaces FR-014 session-expired and FR-015 network-failure |

### Save handler

```ts
async function handleSave() {
  if (saving) return;
  setSaving(true);
  const auto = {
    ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    firmaIpM: operatoreNome,  // current prop, NOT a closure capture
  };
  try {
    await onSalva(paziente.id, { ...riga, ora: auto.ora, operatore: auto.firmaIpM });
    setErrorMessage(null);
  } catch (e) {
    setErrorMessage('Salvataggio fallito — riprova');
    // Riga state remains intact per FR-015
  } finally {
    setSaving(false);
  }
}
```

### Removed surface

| Removed | Why |
|---------|-----|
| `<input>` for `ora` | Replaced by auto-injection at save (FR-005) |
| `<input>` for `operatore` | Replaced by auto-injection at save (FR-006) |
| Always-visible `<textarea>` for `noteRapide` | Replaced by opt-in expansion (FR-007 / US3) |
| Card chrome (border, shadow, rounded background) around each patient | Replaced by flat row + hairline divider (R-1 / SC-002) |

---

## Files Modified by This Feature (summary)

| File | Change Type | Notes |
|------|-------------|-------|
| `frontend/src/App.css` | EDIT | Add 9 `--qe-*` tokens + the `.qe-*` rule block + 1 media query |
| `frontend/src/components/operator/MultiPatientParametri.tsx` | EDIT | Refactor `RigaPaziente` to compact grid; remove `ora` / `operatore` inputs; add per-row note expansion; inject auto-`ora` + auto-`operatore` at save; hoist `noteOpen` state to parent |
| `frontend/src/components/operator/PatientDetail.tsx` | READ-ONLY | Verify the call site still passes `operatoreNome` (already does) |

No backend, no Prisma, no API, no env changes.
