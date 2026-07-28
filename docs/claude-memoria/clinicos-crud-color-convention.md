---
name: clinicos-crud-color-convention
description: 'ClinicOS CRUD action colors — green create/save, blue edit, red delete + ConfirmDialog — live on prod, using existing tokens'
metadata:
  node_type: memory
  type: reference
  originSessionId: 7a45fd8d-9aea-4836-82a8-521a0c24281f
---

CRUD actions are color-coded across ALL screens (live on Vercel prod), using **existing App.css tokens** (no palette change):

- **Create/Save** → `.btn-success` (green `--emerald`, computed `rgb(22,163,123)`). Shape mirrors `.btn-primary`.
- **Edit** (matita) → `.icon-btn--edit` (blue `--blue`, `rgb(47,107,237)`).
- **Delete** → `.btn-danger` (red `--red`, `rgb(217,58,74)`) + always opens the shared **`ConfirmDialog`** (`components/shared/ConfirmDialog.tsx`, `role=alertdialog`, ESC/overlay close, focus-on-open) — replaced all native `window.confirm` for deletes (Lista pazienti, Diario, Terapia, Camere, Consegne).
- **Left blue on purpose** (NOT create/save): navigation, wizard "Avanti", "Chiudi", print, Invio-in-PS, AI send/execute, import actions, and active/inactive state toggles (AllergiesEditor, TherapyFormFields).

Classes defined once in `App.css` (`.btn-success`/`.icon-btn--edit`/`.btn-danger` + `:hover`/`:focus-visible`). `.confirm-dialog__*`/`.modal-box--confirm` in `app-additions.css`. `DischargeImportModal` still has 2 non-delete `window.confirm` (import/overwrite). Related: [[clinicos-restyle-tokens-and-import-gotcha]], [[clinicos-deploy-mechanics]].
