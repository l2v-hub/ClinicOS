# PO13 MNA frontend implementation notes

Preparation only. These notes do not authorize application writes. Root must assign the PO13 checkout and issue GO after PO12 publication/verification. Existing PO12 sources and evidence remain frozen.

## Scoped integration after GO

- Add dedicated MNA types, A–R definitions, computation, wire validation and local input helpers under `frontend/src/lib/assessments/`; keep individual files below 500 lines.
- Add MNA form and summary components under the existing assessment workspace. Reuse clinical date/correction fields, compact choice controls, identity, session ownership, private drafts, exact operation retry, conflict resolution, final display and archive access.
- Add explicit `mna` branches to shared assessment type/version/definition/validation/workspace/summary/history/print/archive integration. The MNA result is an object containing three nullable outcomes; shared code must never assume its `total` is numeric.
- Preserve existing PAINAD, Transfers and Tinetti snapshots and workflows. No broad choice-control rewrite, dependency change, lockfile change or new clinical default.

## Local input state

Place MNA raw measurement/date strings and their local errors in the session-owned draft, outside `answers` and outside every wire payload. Keep metadata optional for other modules. Store updates copy this metadata, mark the draft dirty, increment revision and invalidate preview even when the canonical number has not changed.

Use visible raw input for the editing control whenever a raw entry exists, including an empty string. Otherwise format the canonical nullable value. Measurement text controls with decimal input mode preserve malformed text; allow the Italian decimal comma through explicit parsing and reject malformed mixtures rather than using permissive `parseFloat`. Date editing must preserve invalid or partial input instead of allowing native input sanitization to hide it. Explain the accepted date format and validate actual calendar days in years 0001–9999.

One store transition must cover raw input, canonical value, relevant error and F/Q/R mode. Empty input explicitly sets its canonical field to null. Valid text updates the canonical value and clears that field's error. An invalid edit stays visible and blocks save, preview/finalize and save-and-exit. A nonfinite or nonpositive derived BMI also blocks the operation without imposing invented physiological limits. No successful operation may submit a hidden preceding measurement while different invalid text is displayed.

While any local error affects measurement interpretation, the form must not display a current derived BMI/risk as if the preceding canonical value were the visible input. Show the field error and a calculation-unavailable state. Saved-record preview remains available only after successful validation/save under the existing revision/version checks.

Raw/error state survives closing the form, switching patient/type, and retaining local fields during conflict rebase. Explicitly accepting the remote version resets it from that record; discard/session clear removes it. Existing exact-retry locking prevents edits from changing an in-flight payload. `begin(save)` validates local input errors before constructing a new operation; local metadata is excluded by the explicit editable-wire projection.

## Measurement transitions

Initially F/Q/R use `{method:'category',category:null}` with no clinical choice. A complete valid canonical measurement set moves the respective item to `{method:'measured'}` and removes category in the same update. The UI explains that the score is calculated from the measurements. Clearing a required measurement makes category mode available; it never restores a hidden old category. Dates remain independent, including when a value is explicitly cleared.

F measured with only one numeric input remains a valid incomplete draft and has no numeric BMI. Q/R behave similarly when their measurement is missing. Category may coexist with an incomplete measurement set. Save validation rejects category with a complete competing measurement set, or measured mode carrying even a null category property. Stored values must not be removed to fit a manual choice.

## Progressive form and retained global data

Screening opens first. The extent control is a workflow choice and preserves every A–R response, measurement and date. K has three explicit nullable yes/no controls and counts as one complete item only when all three are answered. Section progress uses A–F out of 6 and G–R out of 12; no note/date is a required scored item.

Complete screening shows its own 14-point result and an invitation to complete the global part; the invitation is prominent at 11 or below and remains available at 12–14. A screening final is titled `Screening MNA®` and has no 30-point total, even with complete retained G–R. Retained global information remains inspectable and is labeled additional data excluded from the total. Full finalization requires all A–R and is titled `Valutazione completa MNA®`. A later full record is new or a tracked correction.

The summary renders every retained partial response, including all K subanswers, without applying total risk bands to a global subtotal. Render authoritative snapshot sex/age separately from the unchanged common patient identity. Missing demographic/measurement values are explicit. Source references, copyright, E, K and the Q correction remain visible in form/summary/PDF as appropriate.

## Focused verification after implementation

- Import production definition functions for maxima, bands, all eight K combinations and each missing subanswer, distinct false/unknown/null answers, exact half points, F/Q/R boundaries and measurement completeness/contradiction.
- Verify input parsing and raw-state persistence, local-error save/preview/exit blocking, atomic mode transition, corrected input recovery, no stale derived display and preservation of G–R/date data across extent changes.
- Verify strict history/detail/snapshot DTO branches, extent/result consistency, source metadata, demographics and the distinction between an incomplete field and a valid zero score.
- Verify MNA create/PATCH/replay/CAS/finalize workflows through the existing store, with shared PAINAD/Transfers/Tinetti regressions. Run the focused suites, build, lint comparison and source/bundle secret scan once the source state is ready.
- Root owns browser desktop/tablet/mobile, real HTTP/PostgreSQL, rendered PDF/print and publication. Bind the worker's source/evidence manifests to the assigned implementation state and release only the claimed worker scope at handoff.

No tests, builds, scans, clinical validation, runtime preparation or deployment are claimed by this preparation document.
