# PO13 MNA frontend preparation

Preparation only, authorized by root after PO12 frontend integration. PO12 source/evidence remain frozen. The implementation worktree and GO will follow PO12 publication. Root contract and source text were read from `C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-13-mna/`; no new source research or user confirmation is needed.

The new type is `mna`, version `mna-it-2026-09-22-q-corrected-v1`, attached-source SHA256 `67964491d0ceb5c221e776079c3af2bc7c1ddbf834428997f1b5531e469c6ffa`. Preserve the Italian A–R source, E “demenza moderata” and K “una o due volte la settimana”. Correct only the documented editorial defects and Q: CB below21 scores0,21–22 inclusive scores0.5,above22 scores1. Preserve MNA®, full references, trademark/copyright and the source website; do not invent clinical validation or a commercial license.

## Workflow and progressive UI

Use the current assessment workspace, patient identity, clinical date/DST/correction fields, session-owned store, private drafts, exact retry, CAS, immutable finals, PDF recovery and typed archive links. Add one explicit MNA branch to type/result/snapshot validation and presentation. Avoid a new general form framework or changes to published PAINAD/Transfers/Tinetti snapshots.

The default extent is Screening A–F. It is a workflow choice, not a clinical preselection. Progress shows completed items out of6, then G–R out of12 when global assessment is opened. K counts as one item only when all three distinct Yes/No answers are present, with subprogress out of3. Notes and optional measurement dates do not inflate response progress.

After complete screening, show the14-point screening result and its own band. A score at or below11 prominently invites full assessment; the same continuation remains available at12–14. The global portion has a16-point subtotal only when complete, without total-risk bands. The30-point total and its own band require all A–R and the full extent. Screening finalization is explicitly titled Screening MNA, has no30-point total, and does not clear already-entered G–R data. Switching the chosen extent must retain all responses. A later full assessment uses a new record or tracked correction.

Keep compact, wrapped labeled radio controls with44px targets; group long choices vertically where needed. Measurement inputs sit beside F, Q and R, with units. No A4 grid is imposed on mobile. Reuse the measured sticky identity and existing scroll margins so focus and errors remain visible.

## Measurements and category rules

Canonical measures are nullable `weightKg`, `heightCm`, `armCircumferenceCm`, `calfCircumferenceCm`; positive finite numbers only, no synthetic interval representatives. The source is manual entry in this assessment. Each measure has its own optional calendar date in `measurementDates`; years 0001–9999, unknown stays null, no current-date default. Dates are independent of assessment/registration dates and may remain when their numeric value is null. No automatic chart prefill is planned.

F/Q/R are tagged measured-versus-category choices. Category mode may coexist with incomplete numeric inputs, but cannot survive a complete valid set of the competing measurements. Completing the numeric set triggers one explicit UI/store transition: measured mode, derived display, manual category removed from payload, values retained. Display a short explanation of the derivation. Manual category becomes available again only after the required numeric set is incomplete; clearing or changing a measurement is always explicit.

F computes weight/(height/100)^2; no numerical BMI if either measure is missing. Scoring uses the unrounded value at19/21/23. Show enough significant digits near boundaries to avoid displaying an apparently contradictory rounded category, with a threshold hint if needed. Reject nonfinite or zero BMI/intermediates from extreme values rather than displaying Infinity or assigning a fabricated bin. Q uses21/22 inclusive half-point boundaries; R uses31 inclusive for1point.

Local raw input must not disappear or permit a successful save of a hidden older value. Prefer session-owned draft metadata for raw measurement strings and input errors, excluded from the wire DTO. Invalid typed text remains editable, marks the draft dirty and blocks normal save/preview/exitguard-save. Valid parsing clears its local error and updates canonical numbers/mode atomically; empty input explicitly clears the value. Preserve raw/error state across patient/type navigation. Domain assertions remain at save/DTO boundaries, not render. Notes follow the Tinetti codepoint counter and recoverable over-limit error.

## Agreed DTO contract

The exact backend/frontend contract is frozen in `backend-contract.snapshot.md`, SHA256 `9d24743fafe6b78ce71dc4c119603ccae1bdde6babbe44907b30bf79b8e9eb2a`. It was agreed with `/root/po01_backend_audit`; the root task contract remains authoritative. All names, enums, missing paths, result labels, demographics and source literals are specified there. There are no pending DTO decisions.

`MnaAnswers` contains `extent`, letter keys A–R, `measurements`, `measurementDates` and `notes`. K contains `dairyDaily`, `eggsOrLegumesWeekly`, `meatFishOrPoultryDaily`, each boolean or null. F/Q/R are `{method:'category',category:C|null}` or `{method:'measured'}` with category absent in measured mode. Server snapshot provenance is `manual_assessment`; no client provenance selector or client score is accepted. Local raw/errors remain outside this DTO.

History/detail expose `extent`, `answeredCount` from0–18 and `completion:{complete,missingPaths,screening,global}`. Each section has `{answeredCount,requiredCount,complete,missingPaths}` with required counts6/12. Overall completeness/missing paths follow the chosen extent. K missing paths name each subanswer while K contributes at most one completed item.

`result` always exists and is `{screening,global,total}`. Screening is null or `{score,maximum:14,band,label}`; global is null or `{score,maximum:16}`; total is null or `{score,maximum:30,band,label}`. Bands are `malnourished|at_risk|normal`, with distinct screening/total labels. Each incomplete section result is null. Total is always null when extent is screening, even with complete retained G–R.

The dedicated MNA snapshot preserves common snapshot fields and adds extent/title, full canonical answers, completion, all18 items with partial responses, measurement array with units/date/source, BMI, result, notes, provenance, three bibliography strings in `references` and one complete `copyright` string containing trademark/copyright/website. `demographics` is `{sex,ageAtAssessment,ageOnDate,timeZone:'Europe/Rome'}` from authoritative backend patient data and the assessment instant. Unknown sex/age remains null; no published old snapshot changes. Detail drafts have `finalSnapshot:null` and `snapshotSha256:null`; finals have the dedicated snapshot and a64-character lowercase SHA256. History omits both.

## Focused verification planned

Import production scoring and test maxima14/16/30, risk boundaries7/8/11/12 and16.5/17/23.5/24, all8K combinations and each missing K subanswer, zero/No/non-sa/null distinctions, half points inM/P/Q, BMI threshold sides/missing/zero/extreme numbers, Q21/22,R31. Exercise category mode without all measures, automatic measured transition, contradictory payload rejection, raw invalid-input retention, screening/full finalization and preservation of extra G–R answers. Reuse focused session/CAS/replay/snapshot/archive regressions. Root owns real browser/PDF/HTTP/PostgreSQL verification and publication.
