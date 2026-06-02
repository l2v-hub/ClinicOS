# Contract: UI Component Surface — Parametri Pazienti Compact Quick-Entry

**Feature**: 011-parametri-quick-entry | **Date**: 2026-06-02

This document freezes the prop / DOM / behavioural contracts for the refactored `RigaPaziente` sub-component and the parent-level note-state hoisting.

---

## Parent — `<MultiPatientParametri>`

### New / changed state

```ts
const [noteOpenForPazienteId, setNoteOpenForPazienteId] = useState<string | null>(null);
```

Only one row at a time has its note input open (R-4). Opening Note on row B closes row A.

### Changed prop wiring to `<RigaPaziente>`

```tsx
{pazienti.map(paziente => (
  <RigaPaziente
    key={paziente.id}
    paziente={paziente}
    cartella={cartelleById[paziente.id]}
    operatoreNome={operatoreNome}             // unchanged — used at save time, not at mount
    isNoteOpen={noteOpenForPazienteId === paziente.id}
    onToggleNote={(open: boolean) => setNoteOpenForPazienteId(open ? paziente.id : null)}
    onSalva={handleSalva}                     // unchanged signature
    onClickPaziente={handleClickPaziente}     // unchanged
  />
))}
```

---

## Refactored Sub-Component — `<RigaPaziente>`

### Props

```ts
interface RigaProps {
  paziente: Paziente;
  cartella: CartellaPaziente | undefined;
  operatoreNome: string;
  isNoteOpen: boolean;
  onToggleNote: (open: boolean) => void;
  onClickPaziente: (id: string) => void;
  onSalva: (pazienteId: string, riga: RigaEditabile) => Promise<void> | void;
}
```

### Rendered DOM

```html
<div class="qe-row" role="group" aria-label="Parametri paziente {Nome}">
  <div class="qe-row__patient" onClick="onClickPaziente">
    <div class="qe-row__avatar">{initials}</div>
    <div>
      <div class="qe-row__name">{nome}</div>
      <div class="qe-row__room">Camera {camera}</div>
    </div>
  </div>
  <input class="qe-row__input qe-row__input--wide" placeholder="PA" inputmode="text"   value={riga.pa}            onChange=... onKeyDown="Enter→save">
  <input class="qe-row__input"                     placeholder="SpO2 %"   inputmode="decimal" value={riga.spo2}   onChange=... onKeyDown="Enter→save">
  <input class="qe-row__input"                     placeholder="FC bpm"   inputmode="decimal" value={riga.fc}     onChange=... onKeyDown="Enter→save">
  <input class="qe-row__input"                     placeholder="TC °C"    inputmode="decimal" value={riga.temperatura} ...>
  <input class="qe-row__input"                     placeholder="DTX"      inputmode="decimal" value={riga.dtx}    ...>
  <input class="qe-row__input qe-row__input--wide" placeholder="Evac."    inputmode="text"    value={riga.evacuazione} ...>
  <button class="qe-row__note-btn [class.qe-row__note-btn--has-note]"
          type="button"
          aria-label="Apri note"
          aria-expanded={isNoteOpen}
          onClick={() => onToggleNote(!isNoteOpen)}>
    📝  <!-- icon -->
  </button>
  <button class="qe-row__save btn-sm" onClick={handleSave} disabled={saving}>
    {saving ? '...' : 'Salva'}
  </button>

  {isNoteOpen && (
    <div class="qe-row__note-input" style={{ gridColumn: '1 / -1' }}>
      <textarea class="form-input"
                rows={2}
                value={riga.note}
                placeholder="Note rapide"
                onChange=... />
    </div>
  )}
</div>
```

### Save Behaviour Contract

```ts
async function handleSave() {
  if (saving) return;
  setSaving(true);
  const oraAuto = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const operatoreAuto = operatoreNome;  // current prop, not a closure capture
  try {
    await onSalva(paziente.id, { ...riga, ora: oraAuto, operatore: operatoreAuto });
    setErrorMessage(null);
    onToggleNote(false);  // close note input on successful save
  } catch (e) {
    setErrorMessage('Salvataggio fallito — riprova');  // FR-015: row state intact
  } finally {
    setSaving(false);
  }
}
```

### Removed Surface

The following DOM is **deleted** by this feature:

| Removed | Reason |
|---------|--------|
| `<input>` for `ora` | Auto-injected at save (FR-005) |
| `<input>` for `operatore` | Auto-injected at save (FR-006) |
| Always-visible `<textarea>` for `note` | Replaced by opt-in expansion (FR-007) |
| `<div className="cr-form-section">` card wrapper around each patient | Replaced by flat `.qe-row` grid (R-1) |

### Keyboard Contract

| Key | Behaviour |
|-----|-----------|
| `Tab` | Moves focus across inputs in left-to-right reading order, then to `Note` (only when `isNoteOpen` is true), then to `Salva` |
| `Shift+Tab` | Reverse direction |
| `Enter` (on any clinical input) | Triggers `handleSave()` for that row |
| `Escape` (when `isNoteOpen`) | Calls `onToggleNote(false)` and returns focus to the Note button |

The Note button uses `tabIndex="-1"` while `isNoteOpen === false` so the rapid-entry Tab path skips it — operators who never need notes never tab through them.

### Accessibility Contract

- `role="group"` on `.qe-row` with `aria-label` carrying the patient name (FR-017 / Italian labels).
- Note button has `aria-expanded` mirrored to `isNoteOpen`.
- Save button has `aria-busy={saving}` while pending.
- Error message renders inside a `role="alert"` region inside the row.

---

## Backwards Compatibility

- The save payload shape sent to `onUpdateCartella` is **identical** to today. `ora` and `firmaIpM` are still in the payload — only their *source* changes (synthesised, not typed).
- The `RigaEditabile` interface keeps the `ora` and `operatore` fields so the mapper (`rigaToParametroGiorno`) does not change shape.
- No CSS class names introduced by 009 or 010 (`.page-tabs*`, `.section-tabs*`, `.clinical-card*`, `.tab-panel-transition`) are touched.
- The L1 sidebar, L2 / L3 nav, and the rest of the operator dashboard are unchanged.
