# Implementation Plan: Redesign Navigazione Scheda Paziente Tablet-First

**Branch**: `003-patient-nav-redesign` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-patient-nav-redesign/spec.md`

## Summary

Ridisegnare la gerarchia visiva dei tre livelli di navigazione in ClinicOS per tablet. L1 (nav-rail) diventa più compatta (64px vs 96px). L2 (PageTabs) diventa visivamente dominante — font più grande, active state forte. L3 (SectionTabs) resta pill-style ma visibilmente subordinata. Header paziente compattato (≤ 80px). Topbar de-duplicata. Strategia: CSS-only dove possibile + JSX minimo in PatientDetail.tsx e App.tsx.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Vite

**Primary Dependencies**: React, CSS esistente (`App.css`, `app-additions.css`). Nessuna nuova dipendenza.

**Storage**: N/A — frontend-only

**Testing**: Nessun test automatico — verifica manuale su viewport 1024×768, 1180×820, 1440×900

**Target Platform**: Browser tablet-first, minimo 1024px

**Project Type**: Web application (frontend only per questa feature)

**Performance Goals**: Standard — nessun requisito specifico

**Constraints**: Nessun nuovo package npm. Nessuna modifica backend/Prisma/VITE_API_URL. UI in italiano. Nessun overflow orizzontale.

**Scale/Scope**: CSS refactor + 2 file JSX con modifiche minime (`App.tsx`, `PatientDetail.tsx`)

## Constitution Check

| Principio                   | Status  | Note                                                                       |
| --------------------------- | ------- | -------------------------------------------------------------------------- |
| I. Simplicity First         | ✅ PASS | CSS-only dove possibile. Nessun nuovo componente. Nessun nuovo framework.  |
| II. Healthcare UX           | ✅ PASS | Migliora tablet-first, UI italiana preservata, gerarchia visiva più chiara |
| III. Backend Data Authority | ✅ PASS | N/A — nessun dato clinico coinvolto                                        |
| IV. Schema & API Stability  | ✅ PASS | Nessuna modifica a Prisma o Express routes                                 |
| V. Role-Aware Development   | ✅ PASS | Nessun tocco a logica ruoli. Sidebar L1 e permessi immutati.               |
| VI. Integration Integrity   | ✅ PASS | Build TypeScript deve passare. Funzionalità esistenti preservate.          |
| VII. Environment Safety     | ✅ PASS | N/A — nessuna variabile d'ambiente coinvolta                               |

**Gate result**: PASS — nessuna violazione.

## Project Structure

### Documentation (this feature)

```text
specs/003-patient-nav-redesign/
├── plan.md              ← questo file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md             ← generato da /speckit-tasks
```

### Source Code (modifiche previste)

```text
frontend/src/
├── app-additions.css        ← MODIFICATO: nav-rail (L1), page-tabs (L2), section-tabs (L3), cr-header
├── App.css                  ← MODIFICATO se necessario: --sidebar-w ridotto
├── App.tsx                  ← MODIFICATO: topbar breadcrumb semplificato in dettaglio-paziente
└── components/operator/
    └── PatientDetail.tsx    ← MODIFICATO: header compatto, back integrato, rimozione cr-breadcrumb
```

Nessun nuovo file. Nessun nuovo componente React.

## Implementation Phases

### Phase 1 — Nav Rail L1: riduzione width e active state migliorato

**Obiettivo**: La sidebar L1 diventa 64px, più simile a Teams, con active state più forte.

**File modificati**:

#### 1a. `frontend/src/app-additions.css` — sezione `.nav-rail`

Cambiamenti:

1. `.nav-rail` → `width: 64px` (da 96px)
2. `.nav-rail__item` → `width: 52px` (da 80px), `min-height: 60px` (da 64px), `padding: 8px 4px`
3. `.nav-rail__item.active` → active state più forte: `background: rgba(26,86,219,0.28)` + `color: #fff`
4. `.nav-rail__item.active::before` → left indicator bar più visibile: `width: 3px; height: 32px; background: var(--blue)`
5. `.nav-rail__label` → `font-size: 10px` (da 10.5px), `max-width: 56px`
6. `.nav-rail__brand` → ridurre padding verticale a `10px 0 8px`

#### 1b. `frontend/src/App.css` — variabile `--sidebar-w`

- `--sidebar-w: 64px` (da 240px — già era usato solo come variabile, la nav-rail ha la propria width)
- Verificare che `--sidebar-w-collapsed` resti 60px o venga rimosso se non usato

**Checkpoint Phase 1**: Sidebar ≤ 64px. Active state forte. Nessun overflow.

---

### Phase 2 — PageTabs L2: barra prominente e dominante

**Obiettivo**: L2 diventa visivamente il riferimento principale della Scheda Paziente. Più grande, più evidente di L3.

**File modificati**:

#### 2a. `frontend/src/app-additions.css` — sezione `.page-tabs`

Cambiamenti:

1. `.page-tabs` → `padding: 8px 8px`, `margin: 0 0 0`, `border-radius: 0`, `background: var(--surface)`, `border-bottom: 1px solid var(--border)` — da segmented control a navigation bar piatta
2. `.page-tabs__btn` → `padding: 10px 22px`, `font-size: 15px`, `font-weight: 600`, `min-height: 44px` — più grande e touch-friendly
3. `.page-tabs__btn--active` → `color: var(--blue)`, `background: rgba(26,86,219,0.08)`, `border-bottom: 3px solid var(--blue)`, `border-radius: 6px 6px 0 0`, `box-shadow: none` — active state forte con accent blu
4. `.page-tabs__btn:hover` → `background: rgba(0,0,0,0.04)`, `color: var(--text)`
5. `.page-tabs__badge` → dimensione coerente, padding leggermente aumentato

**Struttura visiva target**:

```
[Panoramica]  [Clinica ●]  [Diario]  [Moduli]  [Documenti]
              ────────────
              (bordo blu 3px attivo)
```

**Checkpoint Phase 2**: PageTabs dominante su SectionTabs. Active state inconfondibile. Font e altezza superiori.

---

### Phase 3 — SectionTabs L3: pill compatti e subordinati

**Obiettivo**: L3 visibilmente più leggero e subordinato a L2.

**File modificati**:

#### 3a. `frontend/src/app-additions.css` — sezione `.section-tabs`

Cambiamenti:

1. `.section-tabs` → `padding: 4px 16px`, `margin: 6px 0 0`, `gap: 3px`
2. `.section-tabs__btn` → `padding: 5px 14px`, `font-size: 12px`, `font-weight: 500`, `border-radius: 20px` (invariato)
3. `.section-tabs__btn--active` → `background: rgba(26,86,219,0.09)`, `color: var(--blue)`, `font-weight: 600` — tint leggero, non pieno
4. Verificare `overflow-x: auto; scrollbar-width: none` già presente

**Gerarchia target**:

```
L2: 15px 600 | padding 10px 22px | altezza ~44px | active: fill + border 3px
L3: 12px 500 | padding  5px 14px | altezza ~30px | active: tint leggero
```

**Checkpoint Phase 3**: Gerarchia L2 > L3 visivamente evidente. Nessuna confusione tra livelli.

---

### Phase 4 — Header paziente: compatto e de-duplicato

**Obiettivo**: Header ≤ 80px, back integrato, breadcrumb topbar de-duplicato.

**File modificati**:

#### 4a. `frontend/src/app-additions.css` — sezione `.cr-header` e `.cr-breadcrumb`

Cambiamenti:

1. `.cr-breadcrumb` → rimuovere o azzerare: `padding: 0; display: none` — il back è nell'header
2. `.cr-header` → `padding: 10px 16px`, `margin: 8px 12px 0`, `border-radius: 12px`
3. `.cr-header__name` → `font-size: 16px` (da 20px)
4. `.cr-header__patient` → `gap: 8px`
5. `.cr-header__meta` → `font-size: 12px`, `gap: 4px`
6. Allergie: inline nella riga meta, non riga separata — ridurre margin-top a 0

#### 4b. `frontend/src/components/operator/PatientDetail.tsx` — render header

Cambiamenti JSX:

1. Verificare/spostare back button nella prima riga dell'header (già presente come `<button className="link-btn">`).
2. Rimuovere `<div className="cr-breadcrumb">` se presente come wrapper separato.
3. Assicurare allergie inline (`cr-header__allergy-chips` nella stessa riga di `cr-header__meta`).

#### 4c. `frontend/src/App.tsx` — topbar breadcrumb

Cambiamento JSX:

1. Nel blocco `navKey === 'dettaglio-paziente'` del topbar breadcrumb (righe ~702–714), mostrare solo `<span>Scheda Paziente</span>` invece di `Pazienti › Nome` — il back button è già nell'header paziente.

**Checkpoint Phase 4**: Header ≤ 80px. Un solo punto di back navigation visibile. Topbar non duplica.

---

### Phase 5 — Contenuto: riduzione spazi vuoti

**Obiettivo**: Il contenuto clinico inizia il prima possibile dopo L3.

**File modificati**:

#### 5a. `frontend/src/app-additions.css` — layout `.cr-detail-layout` e `.cr-tab-content`

Cambiamenti:

1. `.cr-tab-content` → verificare/ridurre `padding-top` a max 12px (da eventuale 20px+)
2. `.cr-detail-layout--no-sidebar` → verificare che non ci sia margin/padding extra tra L3 e contenuto
3. Sezioni header blu flat (`.cr-section-header`, `.cr-card-header` blue) — preservati invariati

**Checkpoint Phase 5**: Primo blocco clinico visibilmente più vicino a L3. Nessun gap inutile.

---

### Phase N — Build e QA

**File**: nessuno

1. `npm run build` — 0 errori TypeScript frontend e backend
2. Test manuale per `quickstart.md`:
   - Viewport 1024×768: sidebar ≤ 64px, L2 dominante, L3 subordinato, header ≤ 80px, no overflow
   - Viewport 1180×820: layout proporzionato
   - Viewport desktop: nessuna regressione
   - Navigazione L2 e L3: tutti i tab funzionanti
   - Back button: unico, funzionante

---

## Implementation Strategy

### Ordine di esecuzione

```
Phase 1 (nav-rail) → Phase 2 (PageTabs L2) → Phase 3 (SectionTabs L3) → Phase 4 (header) → Phase 5 (content gap) → Phase N (build + QA)
```

Phases 1–3 sono indipendenti (file CSS, sezioni diverse) — parallelizzabili.
Phase 4 modifica sia CSS che JSX — sequenziale.
Phase 5 è CSS-only — parallelizzabile con Phase 4.

### Priorità se tempo limitato

1. **MVP**: Phase 2 (L2 prominente) + Phase 1 (nav-rail compatta) — massimo impatto visivo
2. **Full**: tutte le fasi

### Regola chiave: minimo diff

- Non toccare logica dei tab-content, CRUD, form, state clinici
- Non toccare TAB_GROUPS, TabId, TabGroup
- Non toccare backend, Prisma, API calls
- Non toccare NavComponents.tsx (componenti React rimangono invariati)

## Open Questions

Nessuna. Scope completamente definito da spec + ricerca codice.
