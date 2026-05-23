---
description: "Task list — Terapia Farmacologica Unica e Agenda Coerente"
---

# Tasks: Terapia Farmacologica Unica e Agenda Coerente

**Input**: Design documents from `specs/001-terapia-farmacologica-agenda/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅

**Tests**: Nessun test automatico richiesto dalla spec — verifica manuale tramite build + golden path.

**Organization**: Tasks raggruppati per user story. Scope minimo — 2 file eliminati, 2 file modificati.

## Format: `[ID] [P?] [Story] Descrizione con file path`

- **[P]**: Eseguibile in parallelo (file diversi, nessuna dipendenza pendente)
- **[Story]**: User story di appartenenza (US1, US2, US3)

---

## Phase 1: Setup

> Nessun setup richiesto — progetto esistente, schema già completo, nessuna migrazione.

---

## Phase 2: Fondamentale (Pre-requisiti bloccanti)

**Purpose**: Rimuovere dead code che viola la costituzione e verificare la struttura tab.
Nessuna user story può iniziare con dead code che introduce confusione o violazioni.

**⚠️ CRITICAL**: Completare prima di qualsiasi lavoro sulle user story.

- [x] T001 Verify `frontend/src/components/operator/PatientDetail.tsx` — confermare che il tab `terapia-farmacologica` nel gruppo "Clinica" importi e renderizzi `TerapiaFarmacologicaTab` con props `paziente` e `operatoreNome`. Nessuna modifica attesa.
- [x] T002 [P] Delete `frontend/src/components/operator/cartella/TerapiaMedicaTab.tsx` — dead code non importato, usa cartella JSON come sorgente primaria (viola Principio III)
- [x] T003 [P] Delete `frontend/src/components/operator/cartella/TerapiaScheduleTab.tsx` — dead code non importato, duplicato di TerapiaFarmacologicaTab (viola Principio I)
- [x] T004 Verify `frontend/src/components/operator/cartella/TerapieModuloView.tsx` — dopo T002 controllare se è ancora importato da altri file; se nessun import rimane, eliminarlo (dead code). Se importato altrove, lasciare.

**Checkpoint**: Dead code rimosso — 0 import di TerapiaMedicaTab e TerapiaScheduleTab nel progetto.

---

## Phase 3: User Story 1 — Gestione Terapia Farmacologica (Priority: P1) 🎯 MVP

**Goal**: Sezione unica "Terapia Farmacologica" con supporto tipo `al_bisogno`.

**Independent Test**: Aprire Scheda Paziente → tab "Terapia Farmacologica" → form "Nuova terapia"
→ verificare che appaia l'opzione "Al bisogno" nel tipo → salvare → il farmaco appare in lista
con badge "Al bisogno" → le fasce orarie non vengono mostrate nel form per tipo al_bisogno.

### Implementazione per User Story 1

- [x] T005 [US1] Update `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`:
  - Aggiungere `'al_bisogno'` all'union type `TherapyForm.tipo`
  - Aggiungere radio button "Al bisogno" nel form (dopo "Una tantum")
  - Nascondere il blocco fasce orarie quando `form.tipo === 'al_bisogno'`
  - Aggiungere `al_bisogno: 'badge--amber'` a `TIPO_BADGE`
  - Aggiungere `{ value: 'al_bisogno', label: 'Al bisogno' }` alle `options` dei column defs `tipo` (attiviColumns e programmazioneColumns)

**Checkpoint**: User Story 1 funzionale e testabile indipendentemente. Farmaco al_bisogno
salvato nel backend, visibile in lista, non genera slot in Agenda.

---

## Phase 4: User Story 2 — Agenda Terapia da Sorgente Reale (Priority: P2)

**Goal**: Agenda mostra solo pazienti con terapia reale, valida per data e fascia.
Terapie `al_bisogno` escluse dagli slot Agenda.

**Independent Test**: Inserire terapia `al_bisogno` per un paziente → aprire Agenda → cliccare
qualsiasi slot → verificare che il paziente NON appaia. Inserire terapia `periodica` con fascia
"Mattina" → aprire Agenda slot "Terapia Mattina" → verificare che il paziente APPAIA.

### Implementazione per User Story 2

- [x] T006 [US2] Fix `backend/src/routes/therapy.ts` — nel filtro `validTherapies` aggiungere PRIMA del check `una_tantum`:
  ```typescript
  if (pt.tipo === 'al_bisogno') return false;
  ```
  Posizione esatta: subito dopo `if (!pt.patient) { console.error(...); return false; }` e prima di `if (pt.tipo === 'una_tantum')`.

**Checkpoint**: User Stories 1 e 2 funzionali. Slot Agenda mostrano solo pazienti con terapie
periodiche/una_tantum attive e valide. Al_bisogno mai visibile in Agenda.

---

## Phase 5: User Story 3 — Registrazione Erogata / Non Erogata (Priority: P2)

**Goal**: Erogata/Non erogata persistite nel backend, visibili dopo refresh.

**Independent Test**: Aprire popup Agenda → cliccare "Erogata" su un farmaco → ricaricare pagina
→ riaprire popup → farmaco mostra stato "Erogata" con nome operatore. Stesso test con "Non erogata"
+ motivo.

### Implementazione per User Story 3

- [x] T007 [US3] Verify `frontend/src/components/operator/TherapySlotModal.tsx` e `frontend/src/components/operator/OperatorAgenda.tsx` — confermare che i callback `onConfirmTherapy` e `onNotAdministeredTherapy` chiamino correttamente `/therapy-slots/confirm` e `/therapy-slots/not-administered`. Verificare che dopo la chiamata venga ricaricato lo slot (re-fetch). **Nessuna modifica attesa** — funzionalità già implementata. Se si trova un bug, documentarlo e fixarlo.

**Checkpoint**: Tutte e 3 le user story funzionali e testabili indipendentemente.

---

## Phase N: Polish & Cross-Cutting

**Purpose**: Build pulito e golden path verificato.

- [x] T008 [P] Run build check: `npm run build` da root del monorepo — verificare 0 errori TypeScript in frontend e backend. Fix eventuali errori di compilazione (es. import di TerapiaMedicaTab residui, tipo al_bisogno non gestito).
- [x] T009 [P] Manual golden path test per `specs/001-terapia-farmacologica-agenda/quickstart.md` — eseguire tutti i 12 step del quickstart e verificare che ogni step passi.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundamentale (Phase 2)**: Nessuna dipendenza — inizia subito
- **US1 (Phase 3)**: Dipende da Phase 2 completata (T001–T004)
- **US2 (Phase 4)**: Dipende da Phase 2 completata; può iniziare in parallelo con US1
- **US3 (Phase 5)**: Dipende da Phase 2 completata; può iniziare in parallelo con US1 e US2
- **Polish (Phase N)**: Dipende da US1 + US2 + US3 completate (T005–T007)

### User Story Dependencies

- **US1 (P1)**: Può iniziare dopo Phase 2 — nessuna dipendenza da US2/US3
- **US2 (P2)**: Può iniziare dopo Phase 2 — nessuna dipendenza da US1
- **US3 (P2)**: Può iniziare dopo Phase 2 — dipende da US2 (Agenda deve funzionare per testare)

### Within Each Phase

- T002 e T003 possono girare in parallelo (file diversi)
- T005 (frontend) e T006 (backend) possono girare in parallelo (file separati)
- T008 e T009 possono girare in parallelo

---

## Parallel Example

```bash
# Phase 2 — lancia T002 e T003 insieme:
Task: "Delete TerapiaMedicaTab.tsx"
Task: "Delete TerapiaScheduleTab.tsx"

# Phase 3+4 — lancia T005 e T006 insieme:
Task: "Update TerapiaFarmacologicaTab.tsx — al_bisogno tipo"
Task: "Fix therapy.ts — al_bisogno filter"
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Completa Phase 2 (T001–T004)
2. Completa Phase 3 / T005 (TerapiaFarmacologicaTab)
3. **STOP e VALIDA**: Form al_bisogno funziona, farmaco salvato, badge corretto
4. Build check: `npm run build`

### Full Delivery

1. Phase 2 → Phase 3 → Phase 4 → Phase 5 → Polish
2. Ogni fase testata indipendentemente prima di passare alla successiva
3. Build check finale obbligatorio prima di merge

---

## Notes

- [P] = file diversi, nessuna dipendenza pendente
- [US?] = user story di appartenenza
- Nessuna migrazione DB in questo feature
- Nessun nuovo package npm da installare
- Commit dopo ogni task o gruppo logico (facoltativamente tramite `/speckit-git-commit`)
- Total task count: 9
