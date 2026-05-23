# Implementation Plan: Ottimizzazione Navigazione Tablet-First

**Branch**: `002-tablet-navigation` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-tablet-navigation/spec.md`

## Summary

Rimuovere la seconda sidebar laterale (`.cr-sidebar-nav`) dalla Scheda Paziente e sostituirla con tab orizzontali (`PageTabs` L2 + sotto-tab L3). I componenti `PageTabs` e `SectionTabs` esistono già in `NavComponents.tsx` — erano stati nascosti via CSS quando si è passati alla sidebar. La strategia è riabilitarli, rimuovere la sidebar interna, e applicare il pattern alle altre pagine principali. Nessuna modifica al backend, Prisma o logica dati.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Vite

**Primary Dependencies**: React, CSS esistente (`App.css`, `app-additions.css`)

**Storage**: N/A — frontend-only

**Testing**: Nessun test automatico — verifica manuale su viewport 1024×768, 1180×820, 1366×1024

**Target Platform**: Browser tablet-first, minimo 1024px

**Project Type**: Web application (frontend only per questa feature)

**Performance Goals**: Standard — nessun requisito specifico

**Constraints**: Nessun nuovo package npm. Nessuna modifica backend/Prisma/VITE_API_URL. UI in italiano. No routing complesso.

**Scale/Scope**: ~7 componenti frontend modificati, CSS aggiornato, nessuna nuova dipendenza

## Constitution Check

| Principio | Status | Note |
|-----------|--------|------|
| I. Simplicity First | ✅ PASS | Riuso componenti esistenti. Nessun nuovo framework. Rimozione di complessità (sidebar). |
| II. Healthcare UX | ✅ PASS | Migliora compliance: tablet-first, UI in italiano, controlli visibili (no tooltip) |
| III. Backend Data Authority | ✅ PASS | N/A — nessun dato clinico coinvolto |
| IV. Schema & API Stability | ✅ PASS | Nessuna modifica a Prisma o Express routes |
| V. Role-Aware Development | ✅ PASS | Il cambio nav non tocca logica ruoli. Sidebar L1 e permessi immutati. |
| VI. Integration Integrity | ✅ PASS | Build TypeScript deve passare. Funzionalità esistenti preservate. |
| VII. Environment Safety | ✅ PASS | N/A — nessuna variabile d'ambiente coinvolta |

**Gate result**: PASS — nessuna violazione. Nessuna entry in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-tablet-navigation/
├── plan.md              ← questo file
├── spec.md
├── research.md          ← decisioni architetturali
├── data-model.md        ← entità navigazione (solo UI state)
├── quickstart.md        ← test manuali
├── checklists/
│   └── requirements.md
└── tasks.md             ← generato da /speckit-tasks
```

### Source Code (frontend only)

```text
frontend/src/
├── components/
│   ├── shared/
│   │   └── NavComponents.tsx          ← PageTabs, SectionTabs — già esistono
│   └── operator/
│       ├── PatientDetail.tsx          ← rimuovere cr-sidebar-nav, aggiungere PageTabs+SectionTabs
│       ├── OperatorAgenda.tsx         ← applicare pattern se ha sotto-sezioni
│       └── cartella/
│           └── (tab components)       ← invariati nella logica
├── components/admin/
│   ├── AdminDashboard.tsx             ← verificare/applicare pattern
│   └── RoomsManagement.tsx            ← verificare/applicare pattern
└── App.css / app-additions.css        ← CSS: rimuovere hide su page-tabs, aggiornare tablet styles
```

**Structure Decision**: Single frontend project. Nessuna nuova directory. Modifiche concentrate su `PatientDetail.tsx` e CSS.

## Implementation Phases

### Phase 0 — Research ✅ Completata

Vedi `research.md`. Decisioni prese:
- Riutilizzare `PageTabs` / `SectionTabs` (già in `NavComponents.tsx`)
- Rimuovere `.cr-sidebar-nav` e il drawer toggle da `PatientDetail`
- Nessun routing aggiuntivo
- PatientDetail first, poi altre pagine

### Phase 1 — PatientDetail: rimozione sidebar L2, aggiunta tab orizzontali

**Obiettivo**: La Scheda Paziente mostra `PageTabs` (gruppi L2) orizzontali + sotto-tab interni (L3) per il gruppo Clinica. Nessuna `.cr-sidebar-nav`.

**File modificati**:

#### 1a. `frontend/src/components/operator/PatientDetail.tsx`

Cambiamenti necessari:

1. **Rimuovere** lo stato `expandedGroups`, `drawerOpen`, `toggleGroup` — non più necessari
2. **Aggiungere** stato `activeGroup: TabGroup` (inizia a `'panoramica'`)
3. **Importare** `PageTabs` e `SectionTabs` da `NavComponents.tsx`
4. **Sostituire** nel render:
   - Rimuovere `<button className="cr-drawer-toggle">` e il drawer backdrop
   - Rimuovere `<nav className="cr-sidebar-nav">` e tutto il suo contenuto
   - Aggiungere `<PageTabs>` con i TAB_GROUPS come gruppi (L2)
   - Aggiungere `<SectionTabs>` con i tab del gruppo attivo (L3) — solo se il gruppo ha >1 tab
5. **`switchGroup`**: aggiorna `activeGroup` + setta il primo tab del gruppo come `tab` attivo
6. Layout: il contenuto paziente diventa `flex-col` (header → PageTabs → SectionTabs → contenuto) invece di `flex-row` (sidebar + contenuto)

**Struttura render target**:
```
<div className="patient-record-view">
  <PatientHeader />                   ← header con nome, badge, back button
  <PageTabs groups={TAB_GROUPS} />    ← L2: Panoramica | Clinica | Diario | Moduli | Documenti
  <SectionTabs tabs={activeTabs} />   ← L3: tab del gruppo corrente (hidden se gruppo ha 1 tab)
  <div className="cr-tab-content">    ← contenuto della sezione attiva
    ...
  </div>
</div>
```

#### 1b. `frontend/src/app-additions.css` (o `App.css`)

1. **Rimuovere o commentare** il blocco che nasconde page-tabs/section-tabs:
   ```css
   /* DA RIMUOVERE: */
   .patient-record-view .page-tabs,
   .patient-record-view .section-tabs { display: none; }
   ```
2. **Rimuovere** stili `.cr-sidebar-nav`, `.cr-sidebar-nav__*`, `.cr-drawer-toggle`, `.cr-drawer-backdrop`
3. **Aggiungere** layout verticale per `.patient-record-view`:
   ```css
   .patient-record-view {
     display: flex;
     flex-direction: column;
     height: 100%;
     overflow: hidden;
   }
   ```
4. **Verificare** `.page-tabs` scrollabile orizzontalmente su 1024px:
   ```css
   .page-tabs {
     overflow-x: auto;
     scrollbar-width: none;
     flex-shrink: 0;
   }
   ```

**Checkpoint Phase 1**: Aprire Scheda Paziente su 1024px → tab orizzontali visibili, nessuna seconda sidebar, contenuto full-width. Build pulita.

---

### Phase 2 — Agenda e Admin: verificare/applicare pattern

**Obiettivo**: Le altre pagine principali non mostrano second sidebar. Se hanno sotto-sezioni, usano tab orizzontali.

**File da verificare**:

#### 2a. `frontend/src/components/operator/OperatorAgenda.tsx`
- Verificare: ha sezioni interne (Giorno, Settimana, Terapie, Appuntamenti)?
- Se sì: aggiungere `SectionTabs` orizzontali sopra il contenuto
- Se no: verificare che non usi pattern sidebar

#### 2b. `frontend/src/components/admin/AdminDashboard.tsx` e `RoomsManagement.tsx`
- Verificare struttura navigazione interna
- Applicare tab orizzontali se presente navigazione multi-livello

**Checkpoint Phase 2**: Navigare in Agenda e Admin su 1024px → nessuna second sidebar. Stesso pattern visivo di PatientDetail.

---

### Phase 3 — CSS tablet polish e regressioni

**Obiettivo**: Layout pulito su tutti i viewport target. Nessuna regressione visiva.

#### 3a. Viewport check per i 3 breakpoint target

| Viewport | Check |
|----------|-------|
| 1024×768 | Tab orizzontali visibili, contenuto non compresso, nessun overflow orizzontale globale |
| 1180×820 | Spazio adeguato, tab leggibili |
| 1366×1024 | Layout ampio, contenuto centrato o full-width |

#### 3b. Regressioni da verificare

- **PatientDetail**: tutti i tab (Riepilogo, Profilo, Anamnesi, Diagnosi, Terapia, Parametri, Diario, Moduli, Dimissione) funzionano e mostrano contenuto corretto
- **Form inline**: form di aggiunta (diagnosi, terapia, parametri) si aprono e salvano correttamente
- **Print view**: `mode-modulo` e print CSS non rotti (DimissioneTab, altri tab con stampa)
- **Sidebar L1**: rimane funzionale, navigazione macro-aree non toccata

#### 3c. Build finale

```bash
npm run build
# 0 errori TypeScript in frontend e backend
```

**Checkpoint Phase 3**: Tutti i viewport OK, nessuna regressione, build pulita.

---

## Implementation Strategy

### Ordine di esecuzione

```
Phase 1 (PatientDetail) → Checkpoint → Phase 2 (Agenda/Admin) → Checkpoint → Phase 3 (CSS+QA) → Build finale
```

### Regola chiave: minimo diff

- Non toccare la logica dei tab-content (CRUD, form, state) — solo la navigazione
- Non toccare `TAB_GROUPS` o `TabId` — la struttura è corretta
- Non toccare la sidebar L1 in `App.tsx`
- Non toccare backend, Prisma, API calls

### Priorità se tempo limitato

1. **MVP**: Solo Phase 1 (PatientDetail) — massimo impatto, usato più spesso
2. **Full**: Phase 1 + 2 + 3

## Open Questions

Nessuna. Scope completamente definito da spec + ricerca codice.
