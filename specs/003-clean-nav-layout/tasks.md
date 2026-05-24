# Tasks: Clean Navigation Layout

**Input**: Design documents from `specs/003-clean-nav-layout/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-components.md ✓

**Tests**: No automated tests — manual QA at 4 viewports per quickstart.md.

**Organization**: Tasks grouped by user story. All tasks are frontend-only (`frontend/src/`). No backend/Prisma/API changes.

**Hard constraints** (Constitution + user):
- Italian labels only
- No new npm dependencies
- `npm run build` must pass after every phase
- No modification of VITE_API_URL
- No backend/Prisma changes
- Visual difference must be evident — not micro-retouches

---

## Phase 1: Setup (Verify baseline)

**Purpose**: Confirm current build is clean before any changes.

- [X] T001 Verify `npm run build` passes clean in `frontend/` (baseline — commit nothing, just confirm)

---

## Phase 2: Foundational CSS Tokens (Blocking prerequisite)

**Purpose**: Add new sizing/color tokens and layout classes to `App.css` and `app-additions.css`. These underpin all visual changes in every user story. No component extraction yet.

**⚠️ CRITICAL**: All user story phases depend on these tokens being in place.

- [X] T002 In `frontend/src/App.css`: add CSS custom properties block `/* 003-clean-nav */` with tokens: `--sidebar-w: 64px`, `--topbar-h: 36px`, `--l2-h: 44px`, `--l3-h: 36px`, `--l2-font: 14px`, `--l3-font: 11.5px`. Add `.teams-sidebar` class (width: var(--sidebar-w), background: var(--navy), flex-direction: column, align-items: stretch, flex-shrink: 0, height: 100vh, position: fixed, left: 0, top: 0, z-index: 100). Add `.teams-sidebar__item` (display: flex, flex-direction: column, align-items: center, justify-content: center, height: 56px, cursor: pointer, color: rgba(255,255,255,0.65), gap: 3px, border-left: 3px solid transparent, font-size: 10px, user-select: none). Add `.teams-sidebar__item.active` (color: #fff, border-left-color: var(--blue), background: rgba(255,255,255,0.08)). Add `.teams-sidebar__item:hover:not(.active)` (background: rgba(255,255,255,0.06), color: rgba(255,255,255,0.85)). Add `.teams-sidebar__icon` (width: 22px, height: 22px). Add `.teams-sidebar__label` (font-size: 10px, letter-spacing: 0.2px). Add `.teams-sidebar__badge` (background: var(--red), color: #fff, border-radius: 10px, font-size: 9px, padding: 1px 5px, min-width: 16px, text-align: center). Add `.teams-sidebar__footer` (margin-top: auto, padding: 12px 0). Update `.app-shell` to use `padding-left: var(--sidebar-w)` instead of current sidebar width. Update `.main-area` to `margin-left: 0`

- [X] T003 In `frontend/src/App.css`: add `.compact-topbar` class (height: var(--topbar-h), display: flex, align-items: center, justify-content: flex-end, padding: 0 16px, background: var(--surface), border-bottom: 1px solid #E5E7EB, flex-shrink: 0). Add `.main-h-nav` class (display: flex, align-items: stretch, height: var(--l2-h), background: var(--surface), border-bottom: 2px solid #E5E7EB, flex-shrink: 0, overflow-x: auto). Add `.main-h-nav__tab` (display: flex, align-items: center, padding: 0 20px, font-size: var(--l2-font), font-weight: 500, color: var(--text-muted), cursor: pointer, border-bottom: 3px solid transparent, white-space: nowrap, user-select: none, transition: color 0.15s). Add `.main-h-nav__tab.active` (color: var(--blue), border-bottom-color: var(--blue), font-weight: 600). Add `.main-h-nav__tab:hover:not(.active)` (color: var(--text), background: var(--bg)). Add `.main-h-nav__badge` (background: var(--red), color: #fff, border-radius: 10px, font-size: 9px, padding: 1px 5px, margin-left: 6px)

- [X] T004 In `frontend/src/App.css`: add `.context-sub-tabs` class (display: flex, align-items: center, gap: 4px, padding: 6px 16px, background: var(--bg), border-bottom: 1px solid #E5E7EB, flex-shrink: 0, overflow-x: auto, min-height: var(--l3-h)). Add `.context-sub-tabs__pill` (display: inline-flex, align-items: center, height: 26px, padding: 0 12px, border-radius: 13px, font-size: var(--l3-font), font-weight: 500, white-space: nowrap, cursor: pointer, color: var(--text-muted), background: transparent, border: 1px solid transparent, user-select: none, transition: all 0.15s). Add `.context-sub-tabs__pill.active` (background: var(--blue), color: #fff, border-color: var(--blue)). Add `.context-sub-tabs__pill:hover:not(.active)` (background: var(--surface), border-color: #D1D5DB). Add `.context-sub-tabs__badge` (background: var(--red), color: #fff, border-radius: 8px, font-size: 9px, padding: 1px 4px, margin-left: 4px). Add `.context-sub-tabs__badge--urgent` (background: var(--red)). Add `.patient-compact-header` (display: flex, align-items: center, gap: 12px, height: 56px, padding: 0 16px, background: var(--surface), border-bottom: 1px solid #E5E7EB, flex-shrink: 0, overflow: hidden). Add `.patient-compact-header__name` (font-weight: 600, font-size: 15px, color: var(--text), white-space: nowrap, overflow: hidden, text-overflow: ellipsis, max-width: 240px). Add `.patient-compact-header__meta` (font-size: 12px, color: var(--text-muted), white-space: nowrap). Add `.patient-compact-header__badge` (font-size: 11px, padding: 2px 8px, border-radius: 4px, white-space: nowrap). Add `.content-panel` (flex: 1, overflow-y: auto, padding: 12px 16px 16px, min-height: 0)

- [X] T005 In `frontend/src/App.css`: update the existing `.page-tabs` selector to set height to 44px, update `.section-tabs` to use pill/compact style consistent with `.context-sub-tabs`, update `.nav-rail` width to 64px if it differs. Ensure `.app-shell` grid/flex does not create double spacing when both `.nav-rail` and `.teams-sidebar` coexist temporarily during migration

**Checkpoint**: `npm run build` must pass. No visual changes yet (new classes defined but not used).

---

## Phase 3: User Story 1 — 3-Level Nav Visual Hierarchy (Priority: P1)

**Goal**: L2 nav is dominant and clearly the "main menu"; L3 nav is subordinate pills; topbar is minimal single-row.

**Independent Test**: Open `http://localhost:5173`, log in, navigate to any patient detail. Verify L2 tabs are 44px tall with filled-blue active state, L3 tabs are small pills, topbar is ≤36px with no breadcrumb.

### Implementation for User Story 1

- [X] T006 [US1] In `frontend/src/components/shared/NavComponents.tsx`: rename `PageTabs` component to `MainHorizontalNav`. Replace `.page-tabs` class usages in JSX with `.main-h-nav`. Replace `.page-tabs__tab` with `.main-h-nav__tab`. Replace `.page-tabs__tab--active` with `.main-h-nav__tab.active` (use conditional className). Replace badge span class with `.main-h-nav__badge`. Add backward-compat export: `export const PageTabs = MainHorizontalNav;`. Keep `PageTabGroup` interface unchanged. Do NOT break existing callers.

- [X] T007 [US1] In `frontend/src/components/shared/NavComponents.tsx`: rename `SectionTabs` component to `ContextSubTabs`. Replace JSX class `.section-tabs` → `.context-sub-tabs`, `.section-tabs__tab` → `.context-sub-tabs__pill`, active class → `.context-sub-tabs__pill active` pattern. Replace badge/urgent spans with `.context-sub-tabs__badge` and `.context-sub-tabs__badge--urgent`. Add backward-compat export: `export const SectionTabs = ContextSubTabs;`. Keep `SectionTab` interface unchanged. Do NOT break existing callers.

- [X] T008 [US1] In `frontend/src/App.tsx`: find the topbar JSX block (the div with class `.topbar` or similar, containing breadcrumb and search button). Replace the entire topbar block with a minimal version using class `.compact-topbar` containing only the search button (Ctrl+K trigger). Remove breadcrumb text, back button, and any page title from the topbar. The patient name/context is handled in PatientCompactHeader (T011). Verify the topbar renders at ~36px height.

- [X] T009 [US1] In `frontend/src/App.css`: reduce `.page-content` top padding from current value to `padding-top: 0` or `8px`. Reduce `.section-tabs` bottom margin if any. Remove any `margin-top` on `.page-tabs` or `.section-tabs` that creates gaps between the nav and content. Goal: first clinical card starts within 8px of the L3 nav bar.

**Checkpoint**: Build passes. Log in → patient detail → L2 tabs visually dominant (44px, blue fill on active), L3 is small pills, topbar is 1 row no breadcrumb.

---

## Phase 4: User Story 2 — TeamsLikeSidebar Component (Priority: P2)

**Goal**: L1 sidebar extracted as proper component, 64px wide, Teams-style with icons+labels, role-aware.

**Independent Test**: Sidebar renders at 64px, icons centered, labels below, active state has left blue border, all 6 nav items visible, badge on Note if unread > 0.

### Implementation for User Story 2

- [X] T010 [US2] Create `frontend/src/components/shared/TeamsLikeSidebar.tsx`. Component must: accept props `{activeKey: NavKey, utente: UtenteApp, onNavigate: (key: NavKey) => void, onLogout: () => void, unreadNotes?: number}`. Render a `<nav className="teams-sidebar">` with role-filtered nav items. For operator role: items = [{key:'operator-dashboard', label:'Dashboard', icon:<IcoDashboard/>}, {key:'pazienti', label:'Pazienti', icon:<IcoPazienti/>}, {key:'parametri-multipaziente', label:'Parametri', icon:<IcoActivity/>}, {key:'consegne', label:'Consegne', icon:<IcoConsegne/>}, {key:'agenda-operatore', label:'Agenda', icon:<IcoCalendar/>}, {key:'note', label:'Note', icon:<IcoMessage/>, badge:unreadNotes}]. For admin role: items = [{key:'admin-dashboard', label:'Dashboard', icon:<IcoDashboard/>}, {key:'gestione-operatori', label:'Operatori', icon:<IcoOperatori/>}, {key:'agenda-admin', label:'Agenda', icon:<IcoCalendar/>}, {key:'posti-letto', label:'Posti Letto', icon:<IcoBed/>}, {key:'consegne', label:'Consegne', icon:<IcoConsegne/>}, {key:'note', label:'Note', icon:<IcoMessage/>, badge:unreadNotes}]. Each item renders as `<div className={\`teams-sidebar__item \${activeKey===item.key?'active':''\}`} onClick={()=>onNavigate(item.key)}>`. Inside: `<span className="teams-sidebar__icon">{item.icon}</span>` + `<span className="teams-sidebar__label">{item.label}</span>` + if badge>0: `<span className="teams-sidebar__badge">{badge}</span>`. Footer: user initials avatar + logout icon button calling onLogout. Import NavKey and UtenteApp from `../../types` (adjust path as needed). Import icons from `../../icons`.

- [X] T011 [US2] In `frontend/src/App.tsx`: import `TeamsLikeSidebar` from `./components/shared/TeamsLikeSidebar`. Find the existing inline sidebar JSX (the `.nav-rail` block). Replace it entirely with `<TeamsLikeSidebar activeKey={navKey} utente={utente} onNavigate={pushNav} onLogout={handleLogout} unreadNotes={noteLette...} />`. Compute `unreadNotes` as count of unread notes from existing state. Wrap the remaining content area in a `<div className="main-area">` that uses `margin-left: var(--sidebar-w)` or `padding-left: var(--sidebar-w)` to clear the fixed sidebar. Ensure `.app-shell` flex layout is preserved correctly.

**Checkpoint**: Build passes. Sidebar is 64px, Teams-style, role-switching works, logout works, badge count correct.

---

## Phase 5: User Story 3 — PatientCompactHeader (Priority: P3)

**Goal**: Patient detail header is ≤56px tall, single row with essential info, no wasted space.

**Independent Test**: Open patient detail. Header row shows: back chevron, name+MRN, age, sex, room/bed, allergy badge if applicable. Height ≤56px. Long name truncates with ellipsis.

### Implementation for User Story 3

- [X] T012 [US3] Create `frontend/src/components/operator/PatientCompactHeader.tsx`. Props: `{paziente: Paziente, cartella: CartellaPaziente, onBack: () => void}`. Render `<div className="patient-compact-header">`. Inside: (1) back button: `<button className="icon-btn" onClick={onBack}><IcoChevronLeft /></button>`. (2) name block: `<span className="patient-compact-header__name">{paziente.lastName}, {paziente.firstName}</span>`. (3) MRN: `<span className="patient-compact-header__meta">MRN: {paziente.medicalRecordNumber}</span>`. (4) age: compute from `paziente.dateOfBirth` as `Math.floor((Date.now() - new Date(paziente.dateOfBirth).getTime()) / 31557600000)` → `<span className="patient-compact-header__meta">{age}a</span>`. (5) sex: `<span className="patient-compact-header__meta">{paziente.sex === 'M' ? '♂' : '♀'}</span>` (or use M/F text if sex field has different values). (6) allergy badge: if `cartella.allergie && cartella.allergie.length > 0` → `<span className="patient-compact-header__badge" style={{background:'var(--amber)',color:'#fff'}}>⚠ Allergie</span>`. (7) a right-aligned status badge from `cartella.presaInCarico?.statoAttuale` if that field exists and is non-empty. Import `Paziente` and `CartellaPaziente` from `../../types`. Import `IcoChevronLeft` from `../../icons`.

- [X] T013 [US3] In `frontend/src/components/operator/PatientDetail.tsx`: import `PatientCompactHeader` from `./PatientCompactHeader`. Find the existing patient header block at the top of the component return (typically a div with patient name, back button, age). Replace it with `<PatientCompactHeader paziente={paziente} cartella={cartella} onBack={onBack} />`. Verify the `onBack` prop is wired to the existing back navigation callback. Remove any CSS classes from PatientDetail that set large top padding/margin for the old header.

**Checkpoint**: Build passes. Patient header is ≤56px, single row, allergy badge visible if applicable.

---

## Phase 6: User Story 4 — Tablet QA + Content Tightening (Priority: P4)

**Goal**: Content area starts immediately after nav; no horizontal overflow; all 4 viewports verified; build clean.

### Implementation for User Story 4

- [X] T014 [US4] In `frontend/src/app-additions.css`: find section header patterns (`.view-header`, `.section-header`, `.tab-header` or similar) and reduce top/bottom padding from current values to ≤12px top, ≤8px bottom. Find `.page-content` first-child margins and set `margin-top: 0`. Find any `.section-container` or `.tab-content` wrapper and set `padding-top: 8px`. Goal: first clinical card starts within 16px of the ContextSubTabs bar. Do NOT change card internal padding or clinical content layout.

- [X] T015 [US4] In `frontend/src/App.css`: add responsive adjustments: `@media (min-width: 1024px) { .teams-sidebar { display: flex; } .main-area { padding-left: var(--sidebar-w); } }`. Add `@media (max-width: 1023px) { .teams-sidebar { display: none; } .main-area { padding-left: 0; } }` as safety fallback. Ensure `.main-h-nav` has `overflow-x: auto; -webkit-overflow-scrolling: touch;` for tablet scroll. Ensure `.context-sub-tabs` has same. Add `max-width: 100%; overflow-x: hidden;` on `.app-shell` or `body` to prevent horizontal scroll.

- [X] T016 [US4] Run `npm run build` in `frontend/`. Fix any TypeScript errors that arise from the component extractions (missing imports, wrong prop types, unused variables). Do NOT change logic — only fix type errors. Ensure build exits 0.

**Checkpoint**: Build clean. No horizontal scroll at 1024px. Content visible without vertical scroll.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T017 [P] In `frontend/src/App.css`: clean up any conflicting old CSS rules — if `.nav-rail` and `.teams-sidebar` coexist, ensure `.nav-rail` is marked `display: none` when `.teams-sidebar` is present (add `.app-shell--clean .nav-rail { display: none; }` or just remove the old nav-rail JSX from App.tsx entirely if T011 was completed). Verify no duplicate sidebar renders.

- [ ] T018 [P] In `frontend/src/App.css` and `frontend/src/app-additions.css`: scan for any `margin-top` > 16px on the first element after nav containers. Reduce to ≤8px. This catches any remaining vertical waste above clinical content.

- [ ] T019 Final visual sanity check: open `http://localhost:5173` at 1024x768. Verify: (1) sidebar 64px dark rail with icons, (2) topbar single row ~36px, (3) patient header compact row ~56px, (4) L2 tabs prominent 44px blue-on-active, (5) L3 pills compact ~26px, (6) clinical content starts within 16px of L3 bar, (7) no horizontal overflow. Run `npm run build` — must pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (CSS Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 — Nav Hierarchy)**: Depends on Phase 2
- **Phase 4 (US2 — TeamsLikeSidebar)**: Depends on Phase 2; independent of Phase 3
- **Phase 5 (US3 — PatientCompactHeader)**: Depends on Phase 2; independent of Phases 3-4
- **Phase 6 (US4 — QA + Build)**: Depends on Phases 3, 4, 5 completion
- **Phase 7 (Polish)**: Depends on Phase 6

### Within Each Phase

- T002→T003→T004→T005 sequential (all write to App.css — must not conflict)
- T006→T007 can be parallel (different components in NavComponents.tsx; edit same file so sequential safer)
- T008, T009 sequential with T006/T007 (App.tsx changes)
- T010→T011 sequential (T011 imports T010)
- T012→T013 sequential (T013 imports T012)
- T014, T015, T016 sequential in Phase 6
- T017, T018 parallel (different files/selectors)

### Parallel Opportunities

```bash
# After Phase 2 completes, these can start in parallel:
Phase 3 (US1): T006 → T007 → T008 → T009
Phase 4 (US2): T010 → T011          # independent of Phase 3
Phase 5 (US3): T012 → T013          # independent of Phases 3-4
```

---

## Implementation Strategy

### MVP Scope (Phases 1-3 only)

1. Phase 1: Verify baseline build
2. Phase 2: Add CSS tokens (no visible change)
3. Phase 3: Apply new nav classes → immediate visual impact on L2/L3/topbar
4. **Validate**: L2 dominant, L3 pills, topbar compact → visible redesign achieved

### Full Delivery

1. MVP above +
2. Phase 4: TeamsLikeSidebar extraction
3. Phase 5: PatientCompactHeader extraction
4. Phase 6: QA + build validation
5. Phase 7: Polish
6. Commit: `redesign clean tablet navigation layout`

---

## Notes

- No automated tests — verification is manual browser QA
- Each phase ends with `npm run build` checkpoint
- Italian labels: all sidebar labels in Italian (Dashboard, Pazienti, Parametri, Consegne, Agenda, Note)
- No new npm packages
- No backend/Prisma/API/VITE_API_URL changes
- The visual change must be obvious — not a micro-retouch
