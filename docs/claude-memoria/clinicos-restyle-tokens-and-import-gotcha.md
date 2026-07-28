---
name: clinicos-restyle-tokens-and-import-gotcha
description: ClinicOS restyle is live (mockup design-mockup.html); + the misplaced @import that makes some clinicos-restyle tokens not override App.css :root
metadata:
  node_type: memory
  type: reference
  originSessionId: 7a45fd8d-9aea-4836-82a8-521a0c24281f
---

The full visual restyle toward `design_handoff_restyle/design-mockup.html` is DONE and live on prod (`clinicos-eosin.vercel.app`): medical-blue #2F6BED, Public Sans + JetBrains Mono, dark navy sidebar with L1 icon rail, L2/L3 tabs as filled-blue pills (deviates from CLAUDE.md's underline/segmented nav — intentional, user-approved), KPI cards with icon-in-tinted-pastiglia + chevron (no left border), navy "Prossimo appuntamento" banner, patient chart header card + Diario-as-role-cards + safety band, Consegne 5px priority borders, Presa-in-carico as separate inline-editable cards, Sezioni Cliniche restyled to the same `.clinical-card` look. Design tokens live in `frontend/src/clinicos-restyle.css` (and `design_handoff_restyle/`).

**Gotcha (dormant, not yet fixed):** `App.css` ends with `@import './clinicos-restyle.css';` — an `@import` after other rules is INVALID CSS position, so the browser drops it. Result: restyle-css tokens that ALSO exist in `App.css :root` do NOT get overridden — e.g. `--clinical-card-radius` resolves to App.css's **8px**, not restyle's 14px. Most brand tokens still apply (they're duplicated in App.css :root or loaded via the top font @import), so the app looks restyled; but if a specific restyle token value seems ignored, this is why. To truly adopt restyle token values, move that `@import` to the TOP of App.css — but that's a token-wide change → needs a dedicated visual-regression pass before shipping.

Related: [[clinicos-mobile-responsive-gotchas]], [[clinicos-deploy-mechanics]].
