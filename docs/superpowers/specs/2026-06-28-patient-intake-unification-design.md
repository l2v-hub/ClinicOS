# Patient Intake Unification — Design (EPIC #120)

**Status:** approved design · **Date:** 2026-06-28 · **Repo:** l2v-hub/ClinicOS
**Issues:** EPIC #120; sub-issues #121 (BUG-069), #122 (BUG-070), #123 (BUG-071), #124 (BUG-072), #125 (BUG-073)

## Problem

Three inconsistent representations of patient data exist: the **Patient Chart** (Scheda Paziente), the **manual new-patient popup**, and the **document-import review**. Consequences: not all data can be entered at intake; the operator must create the patient then complete it across many screens; data is lost between intake and chart; manual vs import paths produce different results; components/validations/data models are duplicated; entry is slow.

## Goal

A single intake process that lets the operator fill — **before** final creation — anagraphics, admission data, all Clinica sections, required Moduli, therapy/allergies/pain/vitals, documents and sources, imported data, and fields the import did not recognize. Manual and document paths converge on one model: **`PatientIntakeDraft`**, edited in one full-screen guided workspace (not a growing popup).

## Section 1 — Data model & draft lifecycle

New Prisma model **`PatientIntakeDraft`** (server-persisted — enables cross-session/device resume, audit, and import writing into the same draft):

- `id`, `status` (`draft` | `confirmed` | `abandoned`), `createdById`, `createdAt`, `updatedAt`, `confirmedPatientId?`
- `data` JSON — accumulates every filled section (anagrafica, admission, clinica per section, moduli, vitals/pain/therapies…), same shape as `Cartella` + anagraphics
- `source` (`manual` | `import`), `importJobId?` (link to extraction job)
- documents reuse the existing **`ImportDocument`** (bytes-in-DB) linked to the draft
- `sourceReferences` for imported fields (reuse the existing narrative source refs)

**Lifecycle:**
`POST /intake/drafts` (create) → `PATCH /intake/drafts/:id` (per-section autosave, idempotent) → import writes into the same draft → `POST /intake/drafts/:id/confirm` = **transactional materialization** (one tx): `Patient` + `Cartella`/ClinicalSections + Allergies + Therapies+TherapySchedules + VitalSigns + PainAssessments + Medications + Restraints + Exams/Consultations + ClinicalModules + `PatientDocument` + `sourceReferences`.

Rules (#125): **idempotent** (re-confirm → same patient, no duplicate), full **rollback** on error, never a silently partial patient, no document loss, no double save, **resumable** draft (stays `draft` until confirm succeeds; "Torna ai documenti" works until creation), operator **audit**.

**Reuse:** the existing `confirm-service.ts` (already does the transactional Patient+Cartella+narrative+documents create for import) is **extended** to read from the draft instead of the import payload.

## Section 2 — Shared clinical components (#123)

Today each clinical tab (e.g. `TerapiaFarmacologicaTab`, `ParametriTab`) reads/writes `Cartella` via `onUpdate` — coupled to the chart.

**Approach (low-risk): presentational sections + per-mode data adapter.**

- Each editor becomes **controlled**: `value` + `onChange` props, no internal fetch/persist. Pure UI.
- A **per-mode adapter** wires data:
  - `mode="patient-chart"` → read/write `Cartella` (as today)
  - `mode="intake"` → read/write `PatientIntakeDraft.data` (autosave PATCH)
  - `mode="review"` → read the extraction result (read+edit pre-confirm)
- Thin per-section wrapper: `<PatientTherapySection mode draftId|patientId />` selects the adapter and passes value/onChange to the presentational editor.

**Canonical registry** `patientSections.ts` — single source of truth iterated by workspace, chart and import:

```ts
interface PatientSectionDefinition {
  sectionKey: string;
  title: string;
  component: React.ComponentType<SectionProps>;
  availableDuringIntake: boolean;
  requiredDuringIntake: boolean;
  supportedByDocumentImport: boolean;
  permissions: string[];
}
```

**Shared minimal editors** (extracted from existing tabs, UI unchanged): Allergies, Anamnesis, Diagnosis, Therapy, VitalSigns, Pain, Medications, Restraints, Exams/Consultations, ClinicalNotes, ClinicalModuleRenderer, Documents. **No copies** (`New*`, `Imported*`, `Chart*`).

**Incremental migration** (no big-bang): extract the core first (Allergies/Diagnosis/Therapy/VitalSigns/Pain/Anamnesis); the chart keeps working through the same wrappers.

## Section 3 — Intake workspace (#122) + Import (#124)

**Full-screen workspace** replacing the `NewPatientModal` popup, 6 steps:
`[1 Anagrafica] [2 Ingresso] [3 Clinica] [4 Moduli] [5 Documenti] [6 Verifica e crea]`

- Stepper consistent with the design system (reuse the `DischargeImportModal` review L3 pattern).
- Steps 3/4/5 render sections from the **registry** (`availableDuringIntake`), shared editors (Section 2), `mode="intake"`, autosaving to the draft.
- Step 4 Moduli: `ClinicalModuleRenderer` from the registry; non-required modules are skippable.
- Step 5 Documenti: reuse Importa / Scatta foto (CameraCapture, fixed in #118) / order / preview / link.
- Step 6 Verifica: summary from `draft.data` → `POST /confirm` (Section 1).

**Import → same draft (#124):**

- Flow: Importa/Scatta → order → process (existing runtime extraction) → **write into `PatientIntakeDraft`** (`source=import`) instead of a separate path → open the **same workspace** at the Clinica/Verifica step.
- Extracted fields prefill the sections; not-found fields stay empty and manually fillable.
- Every imported field shows a **"Importato dal documento"** badge + **"Confronta con la fonte"** action (reuse `sourceReferences` + the compare panel fixed in #70). Manual edits do NOT remove the source reference.
- "Torna ai documenti" available until create.

**Reuse:** the existing `ImportSectionsReview` becomes the workspace Clinica/Verifica step in `mode="review"/"intake"`; the job-service writes into the draft instead of holding separate state.

## Section 4 — Phases (mapped to the 5 sub-issues)

Dependency order (EPIC rule: unblocked sub-issues first; EPIC closed last):

| Phase  | Sub  | Work                                                                                                                                                          | Depends on                  |
| ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **F1** | #121 | Runtime gap analysis → `docs/patient-intake/patient-chart-intake-gap-analysis.md` (inventory chart fields/sections/modules vs manual vs import). **Doc only** | —                           |
| **F2** | #123 | Presentational shared editors + per-mode adapter + `patientSections.ts` registry. Incremental core migration                                                  | F1                          |
| **F3** | #125 | `PatientIntakeDraft` table + CRUD/autosave endpoints + transactional confirm (extends `confirm-service`) + audit/idempotency                                  | F1 (may run parallel to F2) |
| **F4** | #122 | 6-step manual workspace using F2 editors + F3 draft                                                                                                           | F2, F3                      |
| **F5** | #124 | Import writes into the draft → same workspace; source badge + compare                                                                                         | F3, F4                      |
| **F6** | #120 | End-to-end E2E (manual + import converge), close EPIC                                                                                                         | F1–F5                       |

**Cross-cutting (#125):** idempotent, rollback, no silent partial patient, no document loss, resumable draft, audit.

**Machine constraint:** heavy local builds OOM on this machine → authoritative type-check runs on Vercel deploys; each phase = branch → verify → deploy → proof → close sub-issue.

## Non-goals / YAGNI

- No new clinical data captured beyond what the chart already supports.
- No redesign of the chart's visual layout (only component extraction; UI unchanged).
- No multi-operator concurrent editing of the same draft (single-owner draft).
- No offline mode.

## Reuse map (existing assets)

- `confirm-service.ts` (transactional create) → extend to read from draft.
- `ImportDocument` (bytes-in-DB) → draft documents.
- `ImportSectionsReview` + `sourceReferences` + compare panel (#70) → review/intake step + source badge.
- `CameraCapture` (#118 fix) → Documenti step.
- Existing clinical tabs → extracted into presentational shared editors.
- Existing runtime extraction (clinicos-ai-runtime) → writes into the draft.
