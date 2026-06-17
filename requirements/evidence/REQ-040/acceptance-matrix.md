# REQ-040 — Acceptance Matrix

Issue #53 — Assistente AI globale di ricerca e correlazione. Branch `req-040-ai-assistant-backend`.

## Scope of this deliverable
The **backend orchestration** of the assistant: a deterministic `ClinicOSQueryAgent` that turns a
question into a typed `QueryPlan`, executes it over the REQ-039 Data Gateway, and assembles a
**SOURCE_ONLY** answer (results + sources + navigation actions), refusing clinical-advice questions
and role-gating cross-patient access. Backend-only → Railway-deployable now.

The deterministic planner stands in for the model NL layer: the executor and SOURCE_ONLY contract are
identical, so an Agno model can later emit the same `QueryPlan` without changing the trusted boundary.

| # | Criterion | Method | Final | Evidence |
|---|-----------|--------|-------|----------|
| Every answer shows sources | unit+integration | PASS | answer.sources from gateway sourceRefs; "results carry sources" |
| Open the original record | code | PASS | navigation actions carry real patientId/recordId/documentId/sectionKey |
| Open document + page | code | PASS | open_document nav carries documentId + pageNumber |
| Answers contain no invented data | integration | PASS | unknown → notFound, results=[]; SOURCE_ONLY executor |
| "Information not found" handled | integration | PASS | notFound flag |
| No autonomous clinical calculation | design | PASS | all numbers come from gateway tools |
| Numeric data comes from tools | unit | PASS | vitals/systolic via gateway filters |
| Cross-patient respects roles | integration | PASS | operator → refusal; manager+env → runs |
| Assistant does not modify data | design | PASS | read-only gateway only; no writes |
| Model swappable via Railway | design | PASS | provider-neutral; model env on runtime |
| Diagnosis/therapy requests refused | unit+integration | PASS | refuse_clinical intent |

UI criteria (global panel, current-patient default scope, desktop/tablet) are the **frontend** layer —
see Deploy note.

## Tests
- unit `assistant-plan.test.ts` (14): all required question types incl. refusals + cross-patient flags.
- live integration `api-integration-check.txt` (12/12): allergies/therapy/narrative/vitals/timeline/
  appointments intents, authorized vs unauthorized cross-patient, unknown→not-found, diagnosis +
  therapy-suggestion refused, SOURCE_ONLY sources present.
- full backend suite **137/137**, `tsc` 0.

## Deploy note
Backend orchestration → **Railway** (live). The two remaining layers are tracked separately and are
blocked on external infra:
- the **frontend** "Assistente ClinicOS" side panel (global button, context, mic, results+sources,
  navigation, session history) — blocked by the Vercel deploy authorization error.
- the **Agno NL agent** (model emits the QueryPlan) — runtime layer.
