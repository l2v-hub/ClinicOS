# ClinicOS Agent Team — Shared Task Board

## Phase Status
- [x] PHASE 1 — Analysis (UI/UX + QA review, Implementer maps codebase)
- [x] PHASE 2 — Planning (Tech Lead synthesizes findings, assigns work)
- [ ] PHASE 3 — Implementation (Implementer applies changes)
- [ ] PHASE 4 — Verification (QA validates changes)
- [ ] PHASE 5 — Synthesis (Tech Lead writes final summary)

## File Lock Table (MUST update before editing any file)
| File | Locked By | Status |
|------|-----------|--------|
| _none_ | _none_ | free |

---

## UI/UX Reviewer — Findings
_Status: complete_

**HIGH (4)**
- `PatientDetail.tsx` — two-level tab nav, 2 clicks to reach anything clinical
- `DiarioTab.tsx` — clinical diary buried 2 levels deep, not central (violates design goal)
- `ExpCard.tsx` — expandable widget exists but not used in PatientDetail at all
- `OperatorAgenda.tsx` — weekly grid breaks on mobile (< 800px, no breakpoint)

**MED (9)**
- `PatientList.tsx` — no room/bed column
- `PatientDetail.tsx` — Clinica tab order wrong (Presa in Carico leads, should be last)
- `PatientDetail.tsx` — patient header lacks primary diagnosis
- `DiarioTab.tsx` — note textarea buried under metadata fields in entry form
- All forms — required field asterisks unstyled
- `OperatorAgenda.tsx` — daily view: half-hour slots have no time label
- `OperatorAgenda.tsx` — weekly view: 1-hour cells collapse 30-min granularity
- `App.css` — ~400 lines of dead `.sidebar*` CSS
- 3 card components — hard-coded `#fff`/`#E2E8F0` instead of CSS tokens

**LOW (5)**
- `PatientList.tsx` — "Sesso" column low-value; contact text too small
- `DiarioTab.tsx` — delete has no confirmation guard
- `PatientList.tsx` — filter bar overflows on narrow screens
- Global — typography scale inconsistent (12/14/17px jumps)
- `PatientDetail.tsx` — allergy chips may overflow patient header on mobile

---

## QA/Test Reviewer — Findings
_Status: complete (Phase 1 + Phase 4 build verification 2026-05-04)_

### Phase 1 Audit (original)

**[HIGH] Form labels not linked to inputs** — ALL forms (`NewPatientModal`, `PatientDetail`, `AppointmentForm`, all cartella tabs). No `htmlFor`/`id` association. Screen readers broken. Clicking label doesn't focus input.

**[HIGH] Search overlay + modals missing dialog semantics + focus trap** — `App.tsx:418-451`, `NewPatientModal.tsx:40`. No `role="dialog"`, `aria-modal`, `aria-labelledby`. Tab exits modal. No Escape handler.

**[MED] Nav rail buttons: `title` only, no `aria-label`** — `App.tsx:369-377`. Unreliable for screen readers, unavailable on touch.

**[MED] Priority/status badges: color-only indicators** — `ConsegnePage`, `PatientDetail`, `PatientList`. Agenda slot color indicators have no text alternative.

**[LOW] Avatar initials not `aria-hidden`** — `App.tsx:434`, `PatientList.tsx:130,164`. `PatientDetail.tsx:999` correct — not replicated elsewhere.

**[MED] `anamnesiForm` stale after external cartella update** — `PatientDetail.tsx:220`. `useState(cartella.anamnesi)` initialized once at mount, never re-synced. Save overwrites with stale data.

**[LOW] `goToPazienteByNome` silent fail on case mismatch** — `App.tsx:300-309`. Navigation from consegne/agenda fails silently on case/whitespace mismatch.

**[MED] `TerapiaMedicaTab` "+ Aggiungi" button white text hardcoded** — `TerapiaMedicaTab.tsx:68`. `color: white` assumes dark header — invisible in light-theme context.

**[LOW] Dead CSS `#social .button-icon`** — `index.css:48-50`. Vite template leftover.

### Phase 4 Build Verification (2026-05-04)

**BUILD STATUS: PASS** — `npm run build` clean, 0 TypeScript errors, 0 lint errors.
- Bundle: 664 kB JS (172 kB gzip), 127 kB CSS. Single chunk — no code splitting. Acceptable for current scope.
- Warning: chunk > 500 kB threshold. Not a blocker but flag for future lazy-loading of cartella tabs.

**NEW FINDINGS (from fresh audit)**

**[HIGH] `firstName[0]`/`lastName[0]` unguarded on empty string** — `App.tsx:453`, `PatientDetail.tsx:1027`. If a patient has `firstName=''` or `lastName=''` (possible from API), `[0]` returns `undefined`, renders empty avatar silently — but could crash if coerced. `PatientList.tsx:130,164` has same pattern but `aria-hidden` already set there. Fix: use `(firstName[0] ?? '?')`.
- Test case: seed a patient with blank firstName via API, navigate to patient list.

**[MED] `DiarioTab` delete has `window.confirm` guard** — VERIFIED at `DiarioTab.tsx:269`. This was listed as missing in UI/UX LOW — it IS implemented. Cross off that item.

**[MED] No `aria-label` on nav rail logout button** — `App.tsx:403`. Has `title="Esci"` but no `aria-label`. Inconsistent with nav items which do have `aria-label`.
- Test case: tab to logout button with screen reader.

**[LOW] `app-additions.css` is 4031 lines** — single file for all component CSS. Not a bug but high collision risk when multiple agents edit simultaneously. Coordinate via file lock.

**[LOW] Bundle size regression risk** — adding new clinical sections (fisioterapia, PS, scale di valutazione) will push bundle past 800 kB. Consider lazy imports for cartella tabs before adding more.

### High-Risk Files (do not touch without full read + plan approval)
| File | Reason |
|------|--------|
| `PatientDetail.tsx` | ~1130 lines, 16 tabs, 20+ state vars, all clinical CRUD |
| `App.tsx` | Central state + routing — changes ripple everywhere |
| `types.ts` | Interface changes cascade to all cartella tabs |
| `TerapiaMedicaTab.tsx` | Dual interactive/print view, type casting |
| `DimissioneTab.tsx` | 50+ boolean optional fields, print correctness critical |
| `ContenzioniTab.tsx` | Legal document printing, complex extended form |
| `app-additions.css` | 4031 lines, all component styles — concurrent edit risk |

---

## Frontend Implementer — Codebase Map
_Status: complete_

### Root / App
| File | Purpose | Complexity |
|------|---------|-----------|
| `App.tsx` | Main shell: hash-based routing, all global state, nav rail, topbar, search overlay, login gate. All CRUD handlers passed as props to children. | HIGH — do not touch without plan |
| `Login.tsx` | Simple login form with role select and mock credentials. | LOW |
| `ExpCard.tsx` | Reusable expandable card with collapse toggle. | LOW-MED |
| `app-additions.css` | Print styles, form grids, tab headers, most component-level CSS. Safe to edit. | SAFE |
| `icons.tsx` | SVG icon exports only. | LOW |
| `types.ts` | All TypeScript types/interfaces. | DO NOT CHANGE |
| `mockData.ts` | Mock seed data + createDefaultCartella factory. | LOW |
| `config.ts` | API_URL constant. | LOW |

### Operator views (`components/operator/`)
| File | Purpose | Complexity |
|------|---------|-----------|
| `OperatorDashboard.tsx` | Welcome banner, stat cards, today agenda list, urgent consegne preview. | LOW-MED |
| `PatientList.tsx` | Patient table (desktop) + card list (mobile), search/filter by name/MRN/sex, add patient trigger. | MED |
| `PatientDetail.tsx` | Full patient record: 5 tab groups, 16 tabs, inline CRUD for diagnosi/anamnesi/note/visite/consegne. Delegates to cartella tabs. | HIGH |
| `OperatorAgenda.tsx` | Day/week/month calendar, occupancy strip, click-to-add-appointment. | MED-HIGH |
| `ConsegnePage.tsx` | Consegne list with search/filters, urgent section, ConsegnaCard sub-component. | MED |

### Cartella tabs (`components/operator/cartella/`)
| File | Purpose | Complexity |
|------|---------|-----------|
| `shared.tsx` | Shared helpers: TabHeader, EmptyState, InlineForm. | LOW |
| `PresaInCaricoTab.tsx` | Intake: allergie, farmaci, obiettivo terapeutico CRUD. | MED |
| `DocumentiTab.tsx` | Document list, consents, discharge docs. | MED |
| `DiarioTab.tsx` | Diary entries; shared for infermieristico and medico via tipo prop. | MED-HIGH |
| `MedicazioniTab.tsx` | Wound care: wound list with treatment sessions. | HIGH |
| `ContenzioniTab.tsx` | Restraint records with active/inactive and audit trail. | MED-HIGH |
| `ScalaBradenTab.tsx` | Braden scale scoring (6 sub-scores) + history. | MED |
| `DimissioneTab.tsx` | Discharge report: summary, destination, follow-up, prognosis sections. | HIGH |
| `ParametriTab.tsx` | Vital signs recording and history list. | MED |
| `ParametriModuloView.tsx` | Print-only vitals form view. | LOW |
| `TerapiaMedicaTab.tsx` | Drug therapy list with dose/schedule/route per drug. | MED-HIGH |
| `TerapieModuloView.tsx` | Print-only therapy form view. | LOW |

### Admin views (`components/admin/`)
| File | Purpose | Complexity |
|------|---------|-----------|
| `AdminDashboard.tsx` | Stats cards, SVG occupancy gauge, reparto bars, operator workload, agenda summary, urgent consegne. | MED |
| `AdminAgenda.tsx` | Multi-operator agenda: day/week/month + operator color filter. | MED-HIGH |
| `OperatorManagement.tsx` | Operator CRUD: list, inline add/edit, toggle active. | MED |
| `RoomsManagement.tsx` | Room/bed management: add camera, toggle bed state. | MED |
| `OperatorSchedule.tsx` | Weekly schedule editor per operator. | MED |

### Shared components (`components/shared/`)
| File | Purpose | Complexity |
|------|---------|-----------|
| `AppointmentForm.tsx` | Modal form for appointments (patient, type, time, duration, notes). | MED |
| `NewPatientModal.tsx` | Multi-section patient creation modal (anagrafica/referente/provenienza/assegnazione/clinica). | MED |
| `NotesPage.tsx` | Notes/messages: filters, priority badges, mark read/resolved. | MED |

---

## Tech Lead — Plan
_Status: complete_

### Priority order (LOW → HIGH risk, HIGH → LOW impact)

#### BATCH A — Safe CSS/style only (no TSX logic risk)
**Owner: FE Implementer | Files: `app-additions.css`, `App.css`, `index.css`**

1. **Dead CSS removal** — delete ~400 lines of `.sidebar*` from `App.css` (UI/UX MED)
2. **Dead CSS `#social`** — delete 3 lines `index.css:48-50` (QA LOW)
3. **Required field asterisk style** — add `.required-asterisk { color: var(--danger); }` and apply in form fields across cartella tabs (UI/UX MED)
4. **Typography scale** — define 3 consistent sizes in CSS vars, audit all `font-size` hardcodes (UI/UX LOW)

#### BATCH B — CSS token cleanup (isolated component edits)
**Owner: FE Implementer | Files: affected card components only (read first, lock before edit)**

5. **Hard-coded colors** — replace `#fff`/`#E2E8F0` with CSS vars in 3 card components. Grep first: `grep -n "#fff\|#E2E8F0" frontend/src/components/**/*.tsx` (UI/UX MED)

#### BATCH C — Diario UX (MED risk — DiarioTab is MED-HIGH complexity)
**Owner: FE Implementer | File: `DiarioTab.tsx` only**

6. **Diario form field order** — move note textarea above metadata fields. Read file fully before edit. (UI/UX MED)
7. **Diario delete confirmation** — add `window.confirm()` guard before delete handler. Minimal change. (UI/UX LOW)

#### BATCH D — PatientList enhancements (LOW risk — MED complexity)
**Owner: FE Implementer | File: `PatientList.tsx` only**

8. **Add room/bed column** — add `stanza`/`letto` columns to desktop table. Read types.ts for field names. (UI/UX MED)
9. **Filter bar overflow** — add `flex-wrap: wrap` or scroll to filter container (UI/UX LOW)

#### BATCH E — Accessibility quick wins (LOW risk files)
**Owner: FE Implementer | Files: `App.tsx` nav rail section only (lines 369-377), `PatientList.tsx`**

10. **Nav rail aria-label** — add `aria-label` to nav buttons at `App.tsx:369-377` (QA MED). Lock `App.tsx` — read full file before touching.
11. **Avatar aria-hidden** — add `aria-hidden="true"` to avatar initials at `App.tsx:434`, `PatientList.tsx:130,164` (QA LOW)

#### DEFERRED — High-risk, needs separate session
- PatientDetail tab reorder (HIGH risk — 1050 lines, 16 tabs)
- ExpCard integration into PatientDetail (HIGH risk)
- Diario as central view (HIGH risk — requires routing change)
- Modal focus trap + dialog semantics (HIGH risk — App.tsx central state)
- anamnesiForm stale state fix (HIGH risk — PatientDetail state)
- Agenda mobile breakpoint (MED risk — needs testing)

### File conflict rules
- Only one file open at a time
- Update File Lock Table before starting each file
- Run `npx tsc --noEmit` after each batch

---

## Final Synthesis
_Status: pending_
