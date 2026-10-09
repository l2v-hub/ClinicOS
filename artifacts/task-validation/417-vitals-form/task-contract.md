# Task Contract

## Task
- Title: 417-vitals-form
- Slug: 417-vitals-form
- Type: bugfix
- Date: 2026-10-09

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Original GitHub417 and zero comments read as evidence. Accepted baseline0d7adc361b92c8466655d9ed830d2b87bbd0f419, separate C:/w-417 codex/bug-417-vitals-form sole root writer. Preserve dirty primary and unrelated launcher changes. Chart PatientParameterEntry and ward ParameterEntryPanel differ in PA format, order, choice wording, previous readings, keypad and validation focus. Read-only architecture completed: share controlled presentation, not save controllers. Original audit deployment not identified. Ruflo registration unavailable; source/ADR fallback, coordination cannot grant release authority.

## Expected Behaviour

One controlled ParameterReadingForm with shared display schema, fields and responsive layout; patient selection/context remain in wrappers. Keep chart pending/session/inflight guards and ward generation-fenced draft store/save controller. Persist PA unchanged as systolic/diastolic string. Existing validator/API/news2 thresholds/options unchanged. Bounded previous-readings loader is read-only, separate from blank current values; no patient fanout. Numeric Enter advances through choices, never auto-saves. Explicit save, linked identical errors and keypad disabled when focus is non-numeric. No backend/schema/auth/dependency changes, physical acceptance or clinical dosing claims.

## Acceptance Criteria

- AC1: Stesse etichette, unità, ordine e formato di immissione nelle due viste. Assert identical ordered schema DOM, canonical full options, split PA adapters preserve malformed pasted text rather than truncation.
- AC2: I campi NEWS2 e le relative informazioni sono raggiungibili con ordine Tab coerente. Verify native Tab across FR, SpO2, O2, PAS, PAD, FC, TC, coscienza, DTX and remaining fields; Enter/Next do not skip choices or submit. Same live NEWS2 and help links.
- AC3: Le misure precedenti non sembrano valori nuovi già compilati. Latest bounded historical captions with timestamp/read status in both, new controls blank, drafts only explicit user input, loading/failure/pagination truthful.
- AC4: Validazione, errori e comportamento del tastierino sono verificati con gli stessi casi di input. Same valid/invalid PA, slash paste, decimal comma/dot, FR bounds/decimal, SpO2 bounds, malformed/oversized raw, empty/note-only. Invalid produces no POST and same message/aria-invalid/focus. Keypad append/backspace/decimal/current field, choice disable and uncertain-save lock identical. Lost-response retry identical request identity and one synthetic persisted reading; definitive rejection editable; patient switch/inflight/session safeguards preserved.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | RED then shared schema/navigation/raw-input/SSR and existing pad, draft, validation/news2 tests |
| Integration | yes | types/build/focused/full baseline delta, no new failures against accepted baseline1215/1203/12 |
| API | yes | unchanged client boundary exercised with synthetic POST successes/rejections/lost response, never production patient writes |
| Playwright | yes | actual SPA chart and ward same matrix desktop1150x1004/tablet/mobile, keyboard and pointer, no hidden test-only app |
| Persistence after refresh | yes | synthetic fixture durable reading response/reload, draft ownership unchanged |
| Agnos action registry | no | out of scope |
| Voice simulation | no | out of scope |
| OCR/import test | no | out of scope |
| Security/privacy scan | yes | all API intercepted before nav/external blocked, source/dist configured credential scan, canonical staged blobs/archive members before publication |

## Evidence Plan

Contract validate before source changes. Root source-bound synthetic before/after and command outputs preserved including preliminary failures. Root local browser lane7479 then explicit handoff to fresh independent QA in new detached clean candidate checkout; root reads full report/scripts and reruns independently. Exact clean candidate commit + physical source manifest, baseline differences, immutable screenshot/traces/video/test evidence. Only CLOSED — VERIFIED after all four original criteria pass, exact commit deployment READY + root/assets HTTP and compiled online synthetic checks, proof commit pinned screenshot/hash verified GitHub then close. User authorized release gate is root, not QA/Ruflo. No frontend candidate416 promotion; retain physical/device blocked issues OPEN. Backend remains409 release if unchanged; baseline CI/security failures disclosed, no global-green invention.

## Risks

Shared presentation must not replace chart session-bound pending controller with ward store, nor mutate API thresholds. Do not prefill history or remove raw invalid characters. Previous loader bounded50 with abort guard. Keep native select full ACVPU choices and explicit partial NEWS2 vs valid partial reading distinction. Keypad append/end deletion is existing behavior, not selection-aware claim. Source files under500 lines where new, no unrelated refactor. Canonical form-input/ds buttons, CSS layout only; existing baseline visual tests not used to conceal regressions.

## Gate Status

READY FOR IMPLEMENTATION
