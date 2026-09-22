# Task Contract

## Task
- Title: Parametri caricamento rapido e conteggio note
- Slug: parametri-caricamento-rapido-e-conteggio-note
- Baseline: 0f4524043bc0c6c762f48fb1a07a85b111a1c79d
- Authority: current user requests faster parameter patient listing and a visible note indicator. Prior push/publication authorization persists for the verified changes.

## Impact Classification
Frontend/UI yes. Backend/API yes, additive daily entry projection and daily note count required for accurate persistent badge without per-patient fetch fan-out. Database schema no. Existing reading persistence unchanged. Auth/permissions no. AI/voice/OCR no. Config/env no. Security review yes.

## Current Behaviour
Fixed 250ms debounce on initial entry. Roster waits on a monthly JSON projection although the form uses daily count/time only. Note button highlights only a draft string; saved notes are not counted, and whitespace counts as a note.

## Expected Behaviour
Initial requests immediate. Unfiltered identities can display before optional daily metadata, with explicit unknown states. Entry API omits unused month JSON and aggregates daily count/time/noteCount. Search by room preserved. Note badge counts saved notes today and distinctly indicates one draft note. Persisted counts come from the server, never readingCount. Same-filter refresh preserves rows and active drafts; late summaries cannot undo save results.

## Acceptance Criteria
- AC1: no initial/retry debounce; typing debounced. Early identity rows usable; late/error metadata explicit, independently recoverable.
- AC2: entry projection bounded to25, scoped/authenticated and pagination compatible; no month JSON or per-patient request fan-out on opening. Existing monthly consumers unchanged.
- AC3: note indicator handles zero, whitespace, draft, saved count, reload and rejected/uncertain save; daily semantics accessible and visible.
- AC4: save remains idempotent and per-patient; late search/day/page responses cannot overwrite new results or newer saved counts; paging no duplicates.
- AC5: controlled before/after evidence, mobile/desktop, focused frontend/backend tests, builds, independent QA, no real patient writes.

## Test Plan
Frontend helper/unit and controlled browser scenarios: slow identity/summary, errors/retry, note input and save/reload, race/paging, mobile. Backend SQL/DB tests: entry versus legacy projection, note count trimming, daily boundary, pagination/scope and idempotent save. Builds/type checks both sides. Test DB only; never run write suites against deployment DB.

## Evidence Plan
Task report, source manifest, tests/build logs, synthetic preview baseline/candidate, screenshots and DOM assertions. Supported CUA cannot export trace/video; disclose limitation and preserve actual evidence. No PHI/secrets in artifacts. Source-bound release receipt and read-only live smoke.

## Ownership and safety envelope
Root sole writer in existing isolated worktree. Audit read-only; independent QA receives writer handoff only for evidence. Port4181 reserved for synthetic preview. No migrations, environment changes or new infrastructure. Preserve launchers/product docs/other artifacts. Explicit curated staging, no force push or merge. Release exact committed source to existing demo backend and frontend only after green gates.

## Gate Status
READY FOR IMPLEMENTATION
