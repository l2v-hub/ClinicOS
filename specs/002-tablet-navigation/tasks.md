---
description: "Task list — Ottimizzazione Navigazione Tablet-First"
---

# Tasks: Ottimizzazione Navigazione Tablet-First

**Input**: Design documents from `specs/002-tablet-navigation/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · quickstart.md ✅

**Tests**: Nessun test automatico — verifica manuale viewport per golden path.

**Organization**: Tasks raggruppati per user story. Scope: frontend-only. Nessuna modifica a backend, Prisma, VITE_API_URL.

## Format: `[ID] [P?] [Story] Descrizione con file path`

- **[P]**: Eseguibile in parallelo (file diversi, nessuna dipendenza pendente)
- **[Story]**: User story di appartenenza (US1–US5)

---

## Phase 1: Setup

> Nessun setup richiesto — progetto esistente, nessuna nuova dipendenza npm.

---

## Phase 2: Fondamentale (Pre-requisiti bloccanti)

**Purpose**: Verificare che i componenti nav esistenti siano integri e rimuovere il CSS che li nasconde.

**⚠️ CRITICAL**: Completare prima di qualsiasi lavoro sulle user story.

- [x] T001 Verify `frontend/src/components/shared/NavComponents.tsx` — confermare che `PageTabs` e `SectionTabs` siano esportati con le props `groups`/`tabs`, `activeId`, `onChange`. Verificare che `PageTabGroup` abbia `badge?: number` e `SectionTab` abbia `badge?: number` e `urgent?: boolean`. Nessuna modifica attesa — solo verifica.

- [x] T002 [P] Fix `frontend/src/app-additions.css` — rimuovere il blocco che nasconde page-tabs e section-tabs (righe ~3724-3725):
  ```css
  /* DA RIMUOVERE: */
  .patient-record-view .page-tabs,
  .patient-record-view .section-tabs { display: none; }
  ```
  Questo riabilita i componenti che erano stati disabilitati quando si è passati alla sidebar.

**Checkpoint**: `NavComponents.tsx` verificato. `.page-tabs` e `.section-tabs` non più nascosti nel CSS.

---

## Phase 3: User Story 1+2 — Tab orizzontali in PatientDetail (Priority: P1) 🎯 MVP

**Goal**: Rimuovere la seconda sidebar da PatientDetail e sostituirla con PageTabs (L2) e SectionTabs (L3).

**Independent Test**: Aprire Scheda Paziente → nessuna sidebar a sinistra del contenuto → tab orizzontali visibili sopra il contenuto → click su gruppo → sotto-tab visibili → click su sotto-tab → contenuto cambia.

### Implementazione per User Story 1+2

- [x] T003 [US1] Update `frontend/src/components/operator/PatientDetail.tsx` — aggiungere import e stato:
  - Aggiungere al top degli import: `import { PageTabs, SectionTabs } from '../shared/NavComponents';`
  - Rimuovere stato `expandedGroups` e `drawerOpen`
  - Rimuovere `useCallback` per `toggleGroup`
  - Rimuovere `useEffect` che chiama `setExpandedGroups` quando `tab` cambia (righe ~188-193)
  - Aggiungere stato: `const [activeGroup, setActiveGroup] = useState<TabGroup>('panoramica')`
  - Inizializzare `activeGroup` correttamente: `TAB_GROUPS.find(g => g.tabs.some(t => t.id === tab))?.id ?? 'panoramica'`

- [x] T004 [US1] Update `frontend/src/components/operator/PatientDetail.tsx` — aggiornare `switchGroup`:
  ```typescript
  function switchGroup(groupId: TabGroup) {
    const group = TAB_GROUPS.find(g => g.id === groupId);
    if (!group) return;
    setActiveGroup(groupId);
    if (!group.tabs.some(t => t.id === tab)) {
      setTab(group.tabs[0].id);
    }
  }
  ```

- [x] T005 [US1] Update `frontend/src/components/operator/PatientDetail.tsx` — rimuovere dalla funzione render:
  - Rimuovere il bottone `<button className="cr-drawer-toggle">` (righe ~1682-1686)
  - Rimuovere il div `{drawerOpen && <div className="cr-drawer-backdrop">}` (riga ~1689)
  - Rimuovere l'intera `<nav className="cr-sidebar-nav">` e il suo contenuto (righe ~1694-1732)
  - Il div `<div className="cr-detail-layout">` diventa: `<div className="cr-detail-layout cr-detail-layout--no-sidebar">`

- [x] T006 [US2] Update `frontend/src/components/operator/PatientDetail.tsx` — aggiungere PageTabs e SectionTabs nel render, subito dopo la fine del blocco header (`</div>` a riga ~1680) e prima del `<div className="cr-detail-layout">`:
  ```tsx
  {/* L2 — Navigazione orizzontale gruppi */}
  <PageTabs
    groups={TAB_GROUPS.map(g => ({ id: g.id, label: g.label, badge: groupBadgeSum(g.id) || undefined }))}
    activeId={activeGroup}
    onChange={id => switchGroup(id as TabGroup)}
  />
  {/* L3 — Sotto-tab del gruppo attivo (solo se gruppo ha >1 tab) */}
  {(() => {
    const grp = TAB_GROUPS.find(g => g.id === activeGroup);
    if (!grp || grp.tabs.length <= 1) return null;
    const urgentConsegna = grp.id === 'panoramica' && mieConsegne.some(c => c.priorita === 'urgente' && c.stato !== 'completata');
    return (
      <SectionTabs
        tabs={grp.tabs.map(t => ({
          id: t.id,
          label: t.label,
          badge: TAB_BADGES[t.id] || undefined,
          urgent: t.id === 'consegne' && urgentConsegna,
        }))}
        activeId={tab}
        onChange={id => switchTab(id as TabId)}
      />
    );
  })()}
  ```

**Checkpoint**: User Story 1+2 funzionali. PatientDetail mostra tab orizzontali L2 e L3. Nessuna `.cr-sidebar-nav` nel DOM. Contenuto full-width dopo sidebar L1.

---

## Phase 4: User Story 3 — Sotto-tab compatti CSS (Priority: P2)

**Goal**: SectionTabs L3 visivamente compatti e scrollabili su tablet, non overflow.

**Independent Test**: Su 1024px larghezza — aprire Clinica (6 tab) → SectionTabs mostra tutti i tab scrollabili orizzontalmente, non va a capo su più righe, nessun overflow orizzontale globale.

### Implementazione per User Story 3

- [x] T007 [US3] Update `frontend/src/app-additions.css` — aggiornare layout `.cr-detail-layout`:
  - Cambiare da `display: flex; flex-direction: row` a `display: flex; flex-direction: column`
  - Rimuovere colonna sidebar (width/min-width per `.cr-sidebar-nav`)
  - `.cr-detail-content` deve avere `flex: 1; overflow-y: auto; min-width: 0`
  - Aggiungere regola per `.cr-detail-layout--no-sidebar .cr-detail-content { width: 100%; }`

- [x] T008 [P] [US3] Update `frontend/src/app-additions.css` — verificare/aggiungere stili per `.section-tabs` compatti su tablet:
  - `.section-tabs` deve avere `overflow-x: auto; scrollbar-width: none; flex-shrink: 0`
  - Tab devono avere `white-space: nowrap` per non andare a capo
  - Padding/font compatti: `padding: 6px 12px; font-size: 13px`
  - Stesso breakpoint 1024px già esistente

**Checkpoint**: SectionTabs scrollabili. Layout verticale senza overflow. Contenuto paziente piena larghezza.

---

## Phase 5: User Story 4+5 — Leggibilità e modello unificato (Priority: P2)

**Goal**: Applicare il pattern nav unificato alle altre pagine prioritarie.

**Independent Test**: Navigare in Agenda, Admin su 1024px → nessuna seconda sidebar → stesso pattern visivo di PatientDetail.

### Implementazione per User Story 4+5

- [x] T009 [P] [US5] Verify `frontend/src/components/operator/OperatorAgenda.tsx` — verificare se ha sotto-navigazione interna. Se presenti sezioni (Giorno/Settimana/Terapie/Appuntamenti) come tab verticali o hidden, convertirle in `<SectionTabs>` orizzontali con lo stesso import da `NavComponents.tsx`.

- [x] T010 [P] [US5] Verify `frontend/src/components/admin/AdminDashboard.tsx` e `frontend/src/components/admin/RoomsManagement.tsx` — verificare struttura navigazione interna. Applicare `<SectionTabs>` se presente navigazione multi-livello nascosta o verticale.

- [x] T011 [US4] Verify `frontend/src/App.css` e `frontend/src/app-additions.css` — verificare che il contenuto paziente (`.cr-detail-content`) abbia `min-width: 0` e `flex: 1` su tutti i breakpoint tablet (1024px, 1180px, 1366px). Nessun hard-coded width che comprima il contenuto.

**Checkpoint**: Tutte le pagine prioritarie usano lo stesso modello sidebar + tab orizzontali. Nessuna seconda sidebar visibile.

---

## Phase N: Polish & Cross-Cutting

**Purpose**: Build pulita e golden path verificato.

- [x] T012 [P] Run build check: `npm run build` da root del monorepo — verificare 0 errori TypeScript in frontend e backend. Fix eventuali errori di tipo (es. import mancanti, tipo `TabGroup` non riconosciuto).

- [ ] T013 [P] Manual golden path test per `specs/002-tablet-navigation/quickstart.md` — testare viewport 1024×768, 1180×820, 1366×1024 e verificare tutti gli step del quickstart.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Fondamentale (Phase 2)**: Nessuna dipendenza — inizia subito
- **US1+US2 (Phase 3)**: Dipende da Phase 2 (T001, T002 completati)
- **US3 (Phase 4)**: Dipende da Phase 3 completata (T003-T006 completati) — il layout CSS dipende dalle modifiche al JSX
- **US4+US5 (Phase 5)**: Può iniziare dopo Phase 2; non dipende da Phase 3 (file diversi)
- **Polish (Phase N)**: Dipende da Phase 3+4+5 completate

### User Story Dependencies

- T001 e T002 paralleli (file diversi)
- T003, T004, T005, T006 sequenziali (stesso file `PatientDetail.tsx`)
- T007 e T008 paralleli (stesso file CSS ma sezioni diverse — procedere con cura)
- T009, T010, T011 paralleli (file diversi)
- T012 e T013 paralleli (build e test manuale)

### Parallel Opportunities

```bash
# Phase 2 — lancia T001 e T002 insieme:
Task: "Verify NavComponents.tsx — PageTabs/SectionTabs"
Task: "Fix app-additions.css — rimuovere display:none"

# Phase 5 — lancia T009, T010, T011 insieme:
Task: "Verify OperatorAgenda.tsx nav pattern"
Task: "Verify AdminDashboard/RoomsManagement nav pattern"
Task: "Verify cr-detail-content width CSS"
```

---

## Implementation Strategy

### MVP (User Story 1+2 only)

1. Completa Phase 2 (T001, T002)
2. Completa Phase 3 (T003–T006)
3. **STOP e VALIDA**: PatientDetail ha tab orizzontali, nessuna sidebar, layout full-width
4. Build check: `npm run build`

### Full Delivery

1. Phase 2 → Phase 3 → Phase 4 → Phase 5 → Polish
2. Build check dopo Phase 3 e dopo Phase N

---

## Notes

- [P] = file diversi o sezioni indipendenti, nessuna dipendenza pendente
- [US?] = user story di appartenenza
- Nessuna migrazione DB, nessun nuovo package npm
- Nessuna modifica a backend, Prisma, VITE_API_URL, logic dati
- Commit dopo Phase 3 (MVP) e dopo Phase N (final)
- Total task count: 13
