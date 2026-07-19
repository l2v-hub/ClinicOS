# Implementation Plan: Terapia Farmacologica Unica e Agenda Coerente

**Branch**: `001-terapia-farmacologica-agenda` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-terapia-farmacologica-agenda/spec.md`

## Summary

Unificare la sezione Terapia Farmacologica nella Scheda Paziente rimuovendo i file UI
duplicati non referenziati (`TerapiaMedicaTab.tsx`, `TerapiaScheduleTab.tsx`), aggiungere
supporto al tipo `al_bisogno` nel form e nel filtro backend, e verificare che l'Agenda legga
solo da `PatientTherapy` con i filtri corretti. Nessuna migrazione DB richiesta — schema già
completo. Build `npm run build` deve passare senza errori al termine.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+

**Primary Dependencies**: React 18, Vite, Express 4, Prisma 7, PostgreSQL

**Storage**: PostgreSQL — modelli `PatientTherapy` e `MedicationAdministration` già presenti

**Testing**: Build check (`npm run build`), test manuale golden path via browser

**Target Platform**: Web app — frontend Vercel, backend Railway

**Project Type**: Full-stack web app (frontend + backend separati, monorepo)

**Performance Goals**: Risposta API < 500ms per slot agenda con ≤ 50 pazienti

**Constraints**:

- NO `prisma migrate reset`
- NO `prisma db push --force-reset`
- Nessuna migrazione DB (schema sufficiente)
- `VITE_API_URL` mantenuto
- Build non deve rompersi

**Scale/Scope**: RSA tipica ≤ 100 pazienti, 5 fasce orarie, 1 operatore per sessione

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio                   | Status | Note                                                                             |
| --------------------------- | ------ | -------------------------------------------------------------------------------- |
| I. Simplicity First         | ✅     | Rimozione dead code (TerapiaMedicaTab, TerapiaScheduleTab). No nuove astrazioni. |
| II. Healthcare UX           | ✅     | Sezione unica, UI italiana, ClinicalTable già usato, nessun tooltip.             |
| III. Backend Data Authority | ✅     | TerapiaMedicaTab (violatore) rimosso. TerapiaFarmacologicaTab usa solo API.      |
| IV. Schema & API Stability  | ✅     | Nessuna migrazione. Nessun reset. /patients API invariata.                       |
| V. Role-Aware Development   | ✅     | TerapiaFarmacologicaTab riceve `operatoreNome` dal contesto operatore.           |
| VI. Integration Integrity   | ✅     | /patients, /therapy-slots invariati. Build deve passare dopo ogni cambio.        |
| VII. Environment Safety     | ✅     | Nessun hardcoding DB locale. VITE_API_URL mantenuto.                             |

**Post-design re-check**: ✅ Nessuna violazione — nessun Complexity Tracking richiesto.

## Project Structure

### Documentation (this feature)

```text
specs/001-terapia-farmacologica-agenda/
├── plan.md              # Questo file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # API contracts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (impatto questa feature)

```text
backend/
└── src/
    └── routes/
        └── therapy.ts               # FIX: filtrare al_bisogno dagli slot Agenda

frontend/
└── src/
    └── components/
        └── operator/
            ├── cartella/
            │   ├── TerapiaMedicaTab.tsx        # RIMUOVERE (dead code, violazione III)
            │   ├── TerapiaScheduleTab.tsx      # RIMUOVERE (dead code, duplicato)
            │   └── TerapiaFarmacologicaTab.tsx # UPDATE: aggiungere tipo al_bisogno
            └── PatientDetail.tsx               # VERIFY: tab terapia-farmacologica corretto
```

**Structure Decision**: Web app (frontend + backend separati). Impatto minimo — 2 file eliminati,
2 file modificati, 1 file verificato.

## Phase 0: Research ✅ Completo

Vedere [research.md](./research.md) per tutti i dettagli.

**Findings chiave**:

- Schema Prisma già completo — nessuna migrazione
- `TerapiaMedicaTab` e `TerapiaScheduleTab` sono dead code non importato — rimuovere
- `therapy.ts` manca filtro per `al_bisogno` — fix necessario
- `TerapiaFarmacologicaTab` manca opzione `al_bisogno` nel form — aggiungere
- `PatientDetail` già usa solo `TerapiaFarmacologicaTab` — corretto

## Phase 1: Design ✅ Completo

Vedere [data-model.md](./data-model.md) e [contracts/api.md](./contracts/api.md).

### Cambiamenti Backend

#### `backend/src/routes/therapy.ts` — Filtro al_bisogno

Nel filtro `validTherapies`, aggiungere prima dei check data:

```typescript
// Escludi 'al_bisogno' dall'Agenda (non ha slot fissi)
if (pt.tipo === 'al_bisogno') return false;
```

Posizione: subito dopo il check `if (!pt.patient) return false;`.

#### Nessun altro cambio backend richiesto

Le route `/patients/:id/therapies` (CRUD) e `/therapy-slots/confirm` + `/not-administered`
sono già corrette.

### Cambiamenti Frontend

#### `TerapiaFarmacologicaTab.tsx` — Aggiungere tipo al_bisogno

1. Aggiungere `'al_bisogno'` all'enum `TherapyForm.tipo`:

   ```typescript
   tipo: 'periodica' | 'una_tantum' | 'al_bisogno';
   ```

2. Aggiungere opzione al radio group:

   ```tsx
   <label>
     <input
       type="radio"
       name="tf-tipo"
       value="al_bisogno"
       checked={form.tipo === 'al_bisogno'}
       onChange={() => updateForm({ tipo: 'al_bisogno' })}
     />{' '}
     Al bisogno
   </label>
   ```

3. Nascondere fasce orarie quando `tipo === 'al_bisogno'` (non serve per agenda):

   ```tsx
   {
     form.tipo !== 'al_bisogno' && (
       <div className="form-group form-group--full">
         <label>Fasce orarie</label>
         ...
       </div>
     );
   }
   ```

4. In `formToPayload`: per `al_bisogno`, non inviare dataSomministrazione/orario:

   ```typescript
   dataSomministrazione: form.tipo === 'una_tantum' ? form.dataSomministrazione : null,
   ```

   (già corretto — il branch `una_tantum` è esplicito)

5. Aggiungere badge per `al_bisogno` in `TIPO_BADGE`:

   ```typescript
   const TIPO_BADGE: Record<string, string> = {
     periodica: 'badge--blue',
     una_tantum: 'badge--gray',
     al_bisogno: 'badge--amber',
   };
   ```

6. Aggiornare le column defs `tipo` options per includere `al_bisogno`.

#### `TerapiaMedicaTab.tsx` — Eliminare

File da rimuovere. Non è importato da nessun componente in `frontend/src`.

#### `TerapiaScheduleTab.tsx` — Eliminare

File da rimuovere. Non è importato da nessun componente in `frontend/src`.

#### `PatientDetail.tsx` — Verifica

Confermare che il tab `terapia-farmacologica` nella sezione "Clinica" renderizzi
`TerapiaFarmacologicaTab` con `paziente` e `operatoreNome`. Nessuna modifica attesa.

### Verifica TypeScript Post-Modifica

```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
npm run build
```

## Complexity Tracking

> Nessuna violazione della costituzione — tabella non necessaria.
