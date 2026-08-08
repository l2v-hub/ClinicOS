# Task Contract

## Task
- Title: Persist patient chart context across page refresh
- Slug: persist-patient-chart-context-across-page-refresh
- Type: bugfix
- Date: 2026-08-08

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
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

While an operator is viewing a patient's chart (`dettaglio-paziente` view), a hard refresh or
reopened tab loses all in-memory state. `frontend/src/App.tsx`'s hash-restore effect (~lines
274-279) explicitly skips restoring `dettaglio-paziente` from the URL hash ("patient data is
in-memory only"), so `pazienteSelezionato` resets to `null`. The app then falls through to the
empty-state block (~lines 1539-1546), showing only "Nessun paziente selezionato" with a single
"Vai alla lista pazienti" button. The operator loses their place and must re-search the patient
from scratch. Verified by read-only code inspection this session (no prior fix existed for this
path).

## Expected Behaviour

On refresh/reopen while viewing a patient's chart, the app re-fetches that patient by id (encoded
in the URL hash/query) and restores the chart view directly — no intermediate empty state, no
manual re-search required. If the patient id in the URL is invalid, deleted, or the fetch fails,
the empty-state fallback still applies (with a clear reason), so the fix only changes the "should
succeed" path, not error handling.

## Acceptance Criteria

- AC1: Refreshing the browser while `dettaglio-paziente` is showing patient P re-opens directly on
  patient P's chart (same `paziente.id`), without landing on the "Nessun paziente selezionato"
  empty state first.
- AC2: The restored chart correctly re-fetches live patient data from the backend on mount (not a
  stale/cached copy), so any changes made by another operator since the last load are reflected.
- AC3: If the patient id encoded in the URL no longer resolves (404 / deleted / malformed), the
  existing empty-state fallback still renders (with the "Vai alla lista pazienti" action) instead
  of an unhandled error or an infinite loading spinner.
- AC4: No regression to the existing hash-restore behavior for other views/tabs already handled by
  that same effect (verified by exercising at least one other hash-restored view after the change).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Pure UI state/effect wiring; no isolated pure-function logic worth a unit test beyond what integration/Playwright already covers |
| Integration | no | No backend contract change |
| API | no | Reuses the existing get-patient-by-id endpoint; no new/changed endpoint |
| Playwright | yes | Core, user-visible navigation flow — needs real browser evidence of refresh→restore, desktop and mobile viewport |
| Persistence after refresh | yes | This IS the bug being fixed — must literally reload the page and observe the chart survives |
| Agnos action registry | no | Not touched |
| Voice simulation | no | Not touched |
| OCR/import test | no | Not touched |
| Security/privacy scan | no | No new data exposure; still fetches by id the operator was already viewing |

## Evidence Plan

Required evidence:

- validation-report.md
- Playwright trace + screenshots: before (empty-state on refresh) and after (chart restored) — desktop viewport
- Playwright trace + screenshots: after, mobile/responsive viewport
- Playwright trace + screenshots: AC3 invalid-id fallback still shows empty state
- Playwright trace + screenshots: AC4 regression check on one other hash-restored view
- sanitized console/network log excerpt showing the re-fetch call on mount (field names only, no PHI)

## Risks

- Risk: encoding the patient id in the URL hash/query could leak it into browser history / shared
  links. Mitigation: patient id is an opaque internal identifier already visible in-app during
  normal use (not a PHI value itself, e.g. name/DOB), consistent with how other hash-restored
  views in this same file already encode entity ids — no new exposure class introduced.
- Risk: restoring on mount could race with the existing hash-restore effect for other views and
  double-fetch or flash the wrong view. Mitigation: AC4 explicitly checks another hash-restored
  view for regression; implementation will follow the existing effect's guard pattern rather than
  adding a parallel/competing effect.

## Gate Status

READY FOR IMPLEMENTATION
