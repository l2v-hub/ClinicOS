# Intake Clinical Editors (Terapia / Parametri / Dolore) — Design

**Date:** 2026-06-29
**Context:** EPIC #120 follow-up. The unified intake workspace (`IntakeWorkspace`, 6 steps) renders the shared clinical editors in `mode="intake"`. Three of them — `TherapyEditor`, `VitalSignsEditor`, `PainAssessmentEditor` — are still placeholders in intake mode. This design makes them controlled, fillable editors and persists their data on the transactional `confirmDraft`.

## Problem

During intake, an operator cannot enter drug therapy, vital signs, or pain (NRS) assessments — those three sections show "in arrivo" placeholders. They must create the patient first, then re-open the Patient Chart and fill them there. This breaks the EPIC #120 goal (fill everything before final creation) and forces a second pass.

## Goal

The operator fills therapy, vitals, and pain during intake. On "Crea paziente" they are persisted in the same single transaction as the rest of the draft:

- **Therapy** → real `PatientTherapy` + `TherapySchedule` rows (full parity with the Patient Chart therapy tab — same fields, same DB rows, queryable via the existing `/patients/:id/therapies` API).
- **Vitals** (`parametriMensili`) and **Pain** (`valutazioniNRS`) → stored in the `Cartella.data` JSON (these have no dedicated DB table today; the Patient Chart already stores them in the cartella JSON).

## Current state (verified)

- `SectionProps<T> = { mode, value: T, onChange, readOnly?, operatoreNome? }` (`frontend/src/components/operator/sections/types.ts`). `StepClinica` already passes `value={data[sectionKey]}` + `onChange={(v) => onUpdateSection(sectionKey, v)}` to each editor; `onUpdateSection` debounce-patches the draft.
- `TherapyEditor`/`VitalSignsEditor`/`PainAssessmentEditor` wrap `TerapiaFarmacologicaTab`/`ParametriTab`/`ScalaNRSTab` (lazy) and render a placeholder when `mode==='intake'`.
- `TerapiaFarmacologicaTab` is **API-backed**: it GET/POST/PUT/DELETEs `/patients/:patientId/therapies`. Its in-form shape is `TherapyForm` (farmaco, pharmaceuticalForm, commercialStrength{Value,Unit}, allowedFractions[], via, tipo, stato, dataInizio/Fine, schedules[{time,quantityNumerator,quantityDenominator,administrationUnit}], prescrittore, note, dataSomministrazione, orarioSomministrazione). `formToPayload` maps it to the POST body.
- `ParametriTab` and `ScalaNRSTab` are **cartella-backed**: they read `cartella.parametriMensili` / `cartella.valutazioniNRS` and persist via `onUpdate(patch)`. No API, no patientId needed.
- Backend `materializePatient` (`backend/src/ai/upload/confirm-service.ts`) creates Patient + Cartella(JSON) + narrative + documents — but NOT therapy rows. `confirmDraft` calls it.
- `POST /patients/:patientId/therapies` (`backend/src/routes/patient-therapies.ts`) normalizes schedules, derives legacy fascia booleans, and creates `PatientTherapy` + child `TherapySchedule[]` in a transaction.
- Prisma: `PatientTherapy` + `TherapySchedule` tables exist. No vitals/pain tables.

## Architecture

### A. Backend — shared therapy create + transactional materialization

1. **Extract** the normalize-and-create logic from the `POST /patients/:patientId/therapies` handler into a shared function `createTherapyInTx(tx, patientId, input): Promise<PatientTherapy>` (new file `backend/src/therapies/therapy-create.ts`, or a sibling of the route — wherever fits the codebase layout). The route calls it (behaviour unchanged → backend suite stays green). `input` is the existing POST body shape (`TherapyCreateInput`).
2. **Extend** `materializePatient` with an optional `therapies?: TherapyCreateInput[]` arg. Inside the existing `prisma.$transaction`, after the Cartella create, loop and call `createTherapyInTx(tx, patient.id, t)` for each. No therapy → no-op (manual drafts without therapy, and the import path, are unaffected).
3. **Thread** `therapies` through `confirmDraft`: read `payload.therapies` and pass it to `materializePatient`. Add `therapies?` to the `ConfirmPayload` type. Vitals/pain need **no backend change** — they arrive inside `payload.cartella` (parametriMensili / valutazioniNRS) and are already written verbatim into `Cartella.data`.

### B. Frontend — shared therapy form (parity) + controlled intake editor

4. **Extract** the therapy _form_ (all fields + the schedule builder, no fetch/list/API) from `TerapiaFarmacologicaTab` into a presentational, controlled component `TherapyForm` (props: `value: TherapyForm`, `onChange`, `operatoreNome?`). `TerapiaFarmacologicaTab` (chart mode) consumes `TherapyForm` for its add/edit form — its API list/save logic stays. Verify the chart therapy tab is visually + behaviourally unchanged (no-regression) before building the intake editor.
5. **`TherapyEditor` intake mode**: a controlled list editor — `value: TherapyDraftItem[]` (the `TherapyForm` shape per item) — that uses `TherapyForm` to add/edit items and shows the added list with remove. No API, no patientId. `onChange(next[])` updates the draft (`data.terapia`).

### C. Frontend — vitals/pain shims (reuse the tabs as-is)

6. **`VitalSignsEditor` intake mode**: synthesize a minimal cartella `{ parametriMensili: value }`, render `ParametriTab` with it, map its `onUpdate(patch)` → `onChange(patch.parametriMensili ?? value)`. `value: ParametriMensili[]` (`data.parametri`).
7. **`PainAssessmentEditor` intake mode**: same shim over `ScalaNRSTab` with `{ valutazioniNRS: value }` → `onChange(patch.valutazioniNRS ?? value)`. `value: ScalaNRSValutazione[]` (`data.dolore`).

### D. Frontend — confirm wiring

8. **`IntakeWorkspace.handleConfirm`**: add to the cartella object `parametriMensili: data.parametri` and `valutazioniNRS: data.dolore` (when present); add `therapies: data.terapia?.map(formToPayload-equivalent)` to the top-level `ConfirmPayload` (NOT inside cartella). `confirmDraft` client sends `payload` verbatim, so include `therapies` in the payload object.

## Data flow

```
intake editors → draft.data.terapia: TherapyFormValue[]
               → draft.data.parametri: { parametriMensili: ParametriMensili[]; parametriVitali: ParametriVitale[] }   (object slice — ParametriTab has two mutation paths; the intake editor forwards the full patch so quick-vital adds are not dropped)
               → draft.data.dolore: ScalaNRSValutazione[]
handleConfirm  → cartella.parametriMensili + cartella.valutazioniNRS
               → payload.therapies = data.terapia mapped to TherapyCreateInput[]
confirmDraft   → materializePatient (ONE tx): Patient + Cartella(JSON incl. parametri/dolore)
                 + PatientTherapy/TherapySchedule rows (per therapy) + narrative + documents
```

## Error handling

- A malformed therapy item throws inside the transaction → whole confirm rolls back (draft stays `draft`), consistent with existing `confirmDraft` behaviour. `createTherapyInTx` validates required fields (farmacoNome, dataInizio) and surfaces a clear Italian error.
- Vitals/pain are free-form JSON; no extra validation beyond what the tabs already enforce client-side.
- The import path (`source='import'`) and manual drafts without therapy pass `therapies=undefined` → unchanged.

## Testing

- **Backend:** unit test `createTherapyInTx` (creates row + schedules, derives fascia booleans). Extend a `confirmDraft` test: a draft/payload with 2 therapies + parametri + dolore → assert 2 `PatientTherapy` rows (+ their `TherapySchedule`s) created, and the created `Cartella.data` contains `parametriMensili`/`valutazioniNRS`. Full backend suite stays green (route refactor = no behaviour change).
- **Frontend:** `tsc -b` 0 errors. Chart therapy tab unchanged after the `TherapyForm` extraction (live visual no-regression via run-clinicos driver). Intake editors render and collect values (the date-input headless quirk from F4 still applies — verify by code + a chart-mode visual).

## Scope / YAGNI

- No new DB tables (vitals/pain stay JSON, matching the chart).
- No reprocess/invalidation logic (separate follow-up).
- Therapy reuses the existing create logic — no second therapy system.
- The `TherapyForm` extraction is the one structural refactor; it is justified (DRY + parity) and gated by a no-regression check on the chart tab.

## Out of scope (follow-ups)

- Moduli/Documenti steps content; Esami/Consulenze import prefill.
- Reprocess selective invalidation.
- Agenda list-refresh post-create.
