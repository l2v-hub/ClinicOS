# ClinicOS Navigation Visual Contract

Source: `.claude/design-reference/*.png` analyzed 2026-06-09. Reference is an
industrial monitoring UI (red brand). **Copy only structure, hierarchy, spacing,
UX patterns. Do NOT copy logo, brand, or the red color — replace red with medical blue.**

## Images analyzed
| File | What it shows |
|---|---|
| `SideBar.png` | L1 vertical sidebar: icon-above-label, narrow, active item = white bg + colored LEFT bar, light grey track. |
| `image.png` | Full app: L1 sidebar + header (breadcrumb + title) + L2 underline tabs (Anomaly \| Performance \| Service). |
| `Screenshot 2026-06-08 231514.png` | Page with L2 uppercase underline tabs + a secondary segmented toggle (Published Procedure \| Local Draft). |
| `Card.png` | Header pattern: breadcrumb / bold title + icon / vertical separator / L2 underline tabs; two-panel content. |
| `Table-layout.png`, `tabella.png` | Table styling only (not navigation). |

## Palette (replaces red; whole-app brand shift)
- primary blue: `#0F5FD7`  (was `#1A56DB`)
- active blue:  `#004FC4`
- sidebar bg:   `#E9EDF2`
- active item bg: `#FFFFFF`
- text:         `#101828`
- muted text:   `#667085`
- border:       `#D0D5DD`

## Decisions (confirmed with user)
1. **Adapt existing components** — `TeamsLikeSidebar` (L1) and `TopNav` (L2+L3) already
   implement the unified pattern (shipped commit `54cff9b`). Restyle them; add thin
   re-export aliases `AppSidebar` / `PageTopNavigation` / `PageSecondaryNavigation`
   so the requested API exists with **zero duplicated logic**.
2. **L3 = segmented grey control** (grey track, white active pill, blue active text).
3. **Palette applied whole-app** (`--blue` → `#0F5FD7`).

## L1 sidebar rules (`.teams-sidebar`)
- Light theme: background `#E9EDF2` (was dark navy `#0C1E35`).
- Width ~96px desktop, ~88px tablet (was 80px).
- Icon above, label below, centered.
- Default text `#667085`; active text `#101828` + blue.
- Active item: white bg `#FFFFFF`, blue LEFT bar `#0F5FD7`, subtle shadow.
- Hover (non-active): faint white wash.
- Brand dot / avatar: blue `#0F5FD7`.

## L2 rules (`TopNav variant="level2"`) — already compliant
- Page title left, horizontal tabs, blue underline on active.
- NO pills, NO per-item border, NO rounded buttons. Strong/readable font.
- Example (Scheda Paziente): Panoramica \| Clinica \| Diario \| Moduli \| Documenti.

## L3 rules (`TopNav variant="level3"`) — CHANGE to segmented
- Segmented control: grey track, active item white bg, active text blue `#0F5FD7`.
- Horizontal items, one shared component everywhere. NO custom Diario tabs.
- Example (Diario): Tutti \| Medico \| Infermiere \| OSS \| Fisioterapista \| Operatore \| Altro.
- Example (Clinica): Presa in Carico \| Anamnesi \| Diagnosi \| Terapia Farmacologica \| Parametri Vitali \| Note & Visite.
- Example (Panoramica): Riepilogo \| Profilo \| Consegne.

## Do NOT copy
- Red brand color, the "O" logo, any product branding from reference.
- Industrial iconography unrelated to healthcare.

## Components to modify
- `frontend/src/App.css` — palette tokens + `.teams-sidebar*` light theme + width.
- `frontend/src/components/navigation/TopNav.css` — L3 underline → segmented grey.
- NEW `frontend/src/components/navigation/AppSidebar.tsx` — re-export `TeamsLikeSidebar`.
- NEW `frontend/src/components/navigation/PageTopNavigation.tsx` — wrapper over `TopNav` level2.
- NEW `frontend/src/components/navigation/PageSecondaryNavigation.tsx` — wrapper over `TopNav` level3.

## Files involved (consumers, no logic change needed)
- `frontend/src/components/shared/TeamsLikeSidebar.tsx` (L1 markup — unchanged, restyled via CSS).
- `frontend/src/components/operator/PatientDetail.tsx` (already uses `TopNav` L2+L3; Diario already unified, no custom pills).
- `frontend/src/components/navigation/TopNav.tsx` (shared L2/L3 component).

## Already-correct (no action — premise from older state)
- Diario no longer has custom blue pills (uses `TopNav level3`).
- L2/L3 tabs already consistent across pages (single `TopNav` component).
- No black-border tabs in current code.

## QA acceptance (FASE 6)
1. Sidebar light grey, active = white bg + blue left bar, medical blue (not red).
2. L2 underline tabs.
3. L3 segmented grey, white active, blue active text.
4. Diario uses shared L3 (no custom pills).
5. Clinica & Panoramica use same L3 component.
6. Responsive tablet/desktop, no horizontal overflow.
7. `npm run build` passes.
