---
description: "Task list — Redesign Navigazione Scheda Paziente Tablet-First"
---

# Tasks: Redesign Navigazione Scheda Paziente Tablet-First

**Input**: Design documents from `specs/003-patient-nav-redesign/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · quickstart.md ✅

**Tests**: Nessun test automatico — verifica manuale viewport per golden path.

**Organization**: Tasks raggruppati per user story. Scope: CSS-only per US1–US3, CSS+JSX minimo per US4–US5. Nessuna modifica a backend, Prisma, VITE_API_URL.

## Format: `[ID] [P?] [Story] Descrizione con file path`

- **[P]**: Eseguibile in parallelo (file diversi o sezioni indipendenti)
- **[Story]**: User story di appartenenza (US1–US5)

---

## Phase 1: Setup

> Nessun setup richiesto — progetto esistente, nessuna nuova dipendenza npm.

---

## Phase 2: Fondamentale (Pre-requisiti bloccanti)

> Nessun prerequisito bloccante — CSS e componenti esistono già.

---

## Phase 3: User Story 1 — Sidebar L1 stile Microsoft Teams (Priority: P1) 🎯 MVP

**Goal**: Nav-rail più compatta (64px), active state forte, simile a Teams.

**Independent Test**: Aprire app su 1024×768 → sidebar ≤ 64px, icone centrate, label breve, active state chiaramente distinguibile dagli altri item, nessun overflow.

### Implementazione per User Story 1

- [x] T001 [US1] Update `.nav-rail` width da 96px a 64px in `frontend/src/app-additions.css` (riga ~2490)

- [x] T002 [US1] Update `.nav-rail__item` width da 80px a 52px, padding da `10px 6px 8px` a `8px 4px`, in `frontend/src/app-additions.css` (riga ~2552)

- [x] T003 [US1] Strengthen `.nav-rail__item.active` background a `rgba(26,86,219,0.30)` e `.nav-rail__item.active::before` height a 32px in `frontend/src/app-additions.css` (righe ~2577–2593)

- [x] T004 [P] [US1] Update `.nav-rail__label` max-width da 76px a 56px in `frontend/src/app-additions.css` (riga ~2617); aggiornare `--sidebar-w` da 240px a 64px in `frontend/src/App.css` (riga ~66) se usato per il layout

**Checkpoint**: Sidebar ≤ 64px. Active state visibilmente forte. Nessun overflow. Tutto il resto invariato.

---

## Phase 4: User Story 2 — Navigazione L2 orizzontale forte e prominente (Priority: P1) 🎯 MVP

**Goal**: PageTabs L2 diventa visivamente dominante — più grande, più pesante, active state inconfondibile rispetto a L3.

**Independent Test**: Aprire Scheda Paziente → barra L2 visibilmente più grande e pesante di L3 → tab attivo ha indicatore forte (fill + bordo inferiore) → tutti 5 tab visibili su 1024px senza scroll.

### Implementazione per User Story 2

- [x] T005 [US2] Trasformare `.page-tabs` da segmented-control pill a navigation bar: rimuovere `border-radius: 14px`, aggiungere `border-bottom: 1px solid var(--border)`, cambiare `background: var(--surface)`, aggiornare `padding: 0 8px`, `margin: 0` in `frontend/src/app-additions.css` (riga ~3739)

- [x] T006 [US2] Update `.page-tabs__btn`: `padding: 10px 22px`, `font-size: 15px`, `font-weight: 600`, `min-height: 44px`, `border-radius: 6px 6px 0 0` in `frontend/src/app-additions.css` (riga ~3754)

- [x] T007 [US2] Update `.page-tabs__btn--active`: `color: var(--blue)`, `background: rgba(26,86,219,0.07)`, aggiungere `border-bottom: 3px solid var(--blue)`, `box-shadow: none` in `frontend/src/app-additions.css` (riga ~3776)

**Checkpoint**: L2 visivamente dominante su L3. Font 15px vs 12px. Altezza ~44px vs ~30px. Active state: bordo blu 3px + fill. Gerarchia chiara.

---

## Phase 5: User Story 3 — Sotto-tab L3 compatti e subordinati (Priority: P2)

**Goal**: SectionTabs L3 visibilmente più leggeri e subordinati a L2.

**Independent Test**: Con "Clinica" aperto → SectionTabs hanno font size e altezza inferiori a PageTabs → active state meno vivace → scroll orizzontale se necessario senza overflow globale.

### Implementazione per User Story 3

- [x] T008 [US3] Update `.section-tabs`: `padding: 4px 16px`, `margin: 6px 0 0`, `gap: 3px` in `frontend/src/app-additions.css` (riga ~3802)

- [x] T009 [US3] Update `.section-tabs__btn`: `padding: 5px 14px` (da `4px 12px`), verificare `font-size: 12px` e `font-weight: 500` invariati; update `.section-tabs__btn--active` active state rimane tint leggero `rgba(26,86,219,0.09)` — confermare subordinato a L2 in `frontend/src/app-additions.css` (riga ~3816)

**Checkpoint**: Gerarchia L2 (15px/44px/border 3px) > L3 (12px/30px/tint) visivamente evidente. Nessuna confusione tra livelli.

---

## Phase 6: User Story 4 — Card paziente compatta (Priority: P2)

**Goal**: Header paziente ≤ 80px, padding ridotto, info dense su max 2 righe.

**Independent Test**: Aprire Scheda Paziente → header paziente (dalla cima alla fine card) ≤ 80px → nome + info su max 2 righe compatte → allergie inline → più spazio verticale per contenuto.

### Implementazione per User Story 4

- [x] T010 [US4] Update `.cr-header`: `padding: 10px 16px` (da `20px 24px`), `margin: 6px 12px 0` (da `10px 16px 0`), `border-radius: 12px` in `frontend/src/app-additions.css` (riga ~2709)

- [x] T011 [US4] Update `.cr-header__name`: `font-size: 16px` (da 20px); update `.cr-header__meta`: `font-size: 12px`, `gap: 4px`; update `.cr-header__allergy-chips`: `margin-top: 0` per inline con meta in `frontend/src/app-additions.css` (righe ~2738–2770)

- [x] T012 [US4] Update `.cr-breadcrumb`: `padding: 0; margin: 0; display: none` per rimuovere la riga breadcrumb separata sopra la card in `frontend/src/app-additions.css` (riga ~2703)

- [x] T013 [P] [US4] Verify `frontend/src/components/operator/PatientDetail.tsx` — assicurare che il back button `← Pazienti` sia nella prima riga del `.cr-header` (non in `.cr-breadcrumb` separato). Se `.cr-breadcrumb` è un wrapper JSX separato da `.cr-header`, spostare il back button dentro `.cr-header__patient` e rimuovere il wrapper `<div className="cr-breadcrumb">`.

**Checkpoint**: Header paziente ≤ 80px totali. Back button dentro header. Nessun `.cr-breadcrumb` visibile come riga separata.

---

## Phase 7: User Story 5 — Back button senza duplicazione breadcrumb (Priority: P2)

**Goal**: Un solo elemento back visibile. Topbar non duplica il nome paziente quando si è in Scheda Paziente.

**Independent Test**: Aprire Scheda Paziente → topbar mostra solo "Scheda Paziente" (non "Pazienti › Nome") → un solo back button visibile → click back → torna alla lista pazienti.

### Implementazione per User Story 5

- [x] T014 [US5] Update `frontend/src/App.tsx` righe ~702–714: nel blocco `navKey === 'dettaglio-paziente'` del topbar breadcrumb, sostituire `<button>Pazienti</button> <span>›</span> <span>Nome</span>` con `<span>Scheda Paziente</span>` — rimuovere la navigazione "Pazienti › Nome" dal topbar (il back è già nell'header paziente)

**Checkpoint**: Topbar mostra "Scheda Paziente" in dettaglio-paziente. Nessuna duplicazione. Back button funzionante nell'header.

---

## Phase N: Polish & Cross-Cutting

**Purpose**: Content gap, build pulita, golden path verificato.

- [x] T015 [P] Verify/reduce `.cr-tab-content` padding-top in `frontend/src/app-additions.css` — cercare `.cr-tab-content` e ridurre padding-top a max 12px se superiore, per avvicinare contenuto alla navigazione

- [x] T016 [P] Run build check: `npm run build` da root del monorepo — verificare 0 errori TypeScript in frontend e backend

- [ ] T017 Manual golden path test per `specs/003-patient-nav-redesign/quickstart.md` — testare viewport 1024×768, 1180×820, desktop e verificare tutti gli step del quickstart

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 3)**: Indipendente — inizia subito. Solo `app-additions.css` sezione nav-rail + `App.css`
- **US2 (Phase 4)**: Indipendente — inizia subito. Solo `app-additions.css` sezione page-tabs
- **US3 (Phase 5)**: Indipendente — può iniziare dopo Phase 4 per verificare gerarchia visiva relativa
- **US4 (Phase 6)**: Dipende da Phase 5 completata (verifica gerarchia) — CSS + JSX minimo
- **US5 (Phase 7)**: Dipende da Phase 6 completata (back button in header) — modifica `App.tsx`
- **Polish (Phase N)**: Dipende da Phase 3–7 completate

### Parallel Opportunities

```bash
# Phase 3 e 4 sono indipendenti (sezioni CSS diverse) — lancia insieme:
Task: "T001–T004 nav-rail CSS + App.css"
Task: "T005–T007 page-tabs CSS"

# Phase 6: CSS e JSX-verify paralleli:
Task: "T010–T012 cr-header CSS"
Task: "T013 PatientDetail.tsx verify"

# Phase N: build e test paralleli:
Task: "T016 npm run build"
Task: "T017 quickstart test"
```

### User Story Dependencies

- T001–T004 sequenziali (stessa sezione `app-additions.css` nav-rail)
- T005–T007 sequenziali (stessa sezione page-tabs)
- T008–T009 sequenziali (stessa sezione section-tabs)
- T010–T012 sequenziali (stessa sezione cr-header)
- T013 parallelo con T010–T012 (file diverso: `PatientDetail.tsx`)
- T014 indipendente (file diverso: `App.tsx`)
- T015–T016 paralleli (file diverso: css vs build)

---

## Implementation Strategy

### MVP (User Story 1+2 only)

1. Completa Phase 3 (T001–T004) — nav-rail compatta
2. Completa Phase 4 (T005–T007) — PageTabs prominente
3. **STOP e VALIDA**: gerarchia L1/L2 corretta, nessuna regressione
4. Build check: `npm run build`

### Full Delivery

1. Phase 3+4 (MVP) → Phase 5 → Phase 6+7 → Phase N
2. Build check dopo Phase 4 (MVP) e dopo Phase N (final)

---

## Notes

- [P] = file diversi o sezioni indipendenti, nessuna dipendenza pendente
- [US?] = user story di appartenenza
- Nessuna migrazione DB, nessun nuovo package npm
- Nessuna modifica a backend, Prisma, VITE_API_URL, logica dati, NavComponents.tsx
- Nessuna modifica a TAB_GROUPS, TabId, TabGroup
- Total task count: 17
