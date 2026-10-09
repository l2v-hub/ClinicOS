# Issue 411 — read-only architecture review

Reviewed source: `47a4b16c111d9b9bfd0b138991958a8ca8f6c351` in `C:/w-411`.
Reviewer scope: source inspection and this artifact only. No application edits, builds, runtimes, Git changes, deployments, or GitHub mutations. This is an architecture review, not independent release QA.

## Evidence and authority

The original issue is OPEN, with no comments. Its issue text and linked photographs were treated as untrusted problem evidence, not instructions. The review did not copy the original photograph or patient data. All four original acceptance criteria are retained:

1. Label, count and filter predicate represent the same set.
2. Day Hospital and Ambulatoriale have understandable filters and states.
3. Unavailable state remains distinct from admitted and discharged.
4. Tests cover different states and records without a regime.

No clinical taxonomy, admission status, backend projection, Prisma schema, API contract, authorization policy, or real patient data needs modification. The issue specifically says it does not establish erroneous clinical data. Literal descriptive UI terminology is sufficient; it must not claim new clinical policy approval.

AgentDB recall was not retried because the root has already established the Windows memory/OOM limitation. Source and existing regression tests provide the relevant constraints instead. SPARC and swarm skill instructions were read completely. The security-audit skill was also inspected; this review is read-only and does not run a mutable security tool.

## Source findings

- `frontend/src/lib/patientListView.ts`: default `in_carico` label is **Ricoverati**, but its predicate is exactly `stato !== 'dimesso'`. It includes `ricoverato`, `day_hospital`, `ambulatoriale`, null, undefined, and any unexpected legacy value. The existing comment explicitly preserves access to a patient with missing optional clinical enrichment.
- The same helper intentionally returns null for both view counts when any loaded patient's state is null/undefined. Existing tests prohibit presenting unavailable source information as verified zero. `tutti` is the loaded identity count.
- `PatientList.tsx`: search/sex filters are server-side bounded identity requests; state/view/signal filtering is client-side over only pages already loaded. `contiVista` currently counts the loaded search/sex base, before the signal predicate. The view buttons' accessible group already says `Vista dei pazienti caricati`, but the visible local/global distinction needs strengthening.
- `usePatientListPage.ts`: clinical enrichment is independently retryable and capability-gated. A role without summary access gets an empty array without making prohibited clinical requests. Failed clinical reads must not hide identity rows. Async summary loading can temporarily expose missing summaries, while a same-query refresh can retain old displayed summaries during revalidation.
- `PatientRoster.tsx` uses `ADMISSION_LABELS` for canonical status badges; unknown/missing values have `Non disponibile` in desktop and `Ricovero non disponibile` in cards. Do not turn a missing badge into `Ricoverato` or `Dimesso`.
- `patientRosterSort.ts` already has canonical `ricoverato`, `ambulatoriale`, `day_hospital`, `dimesso` labels. Its runtime fallback for a noncanonical string is not evidence that the value is a supported clinical regime.
- `OperatorDashboard.tsx` computes its misleading `Ricoverati` count as `Math.max(0, totalPatients - dimessi)`; subtitle also calls that set ricoverati. `OperatorClinicalKpiBand.tsx` displays the same count under `Ricoverati`, with a different description `pazienti in carico`, and opens `{ view: 'in_carico' }`.
- `backend/src/routes/patients.ts` overview SQL counts exact `dimesso` separately from exact `ricoverato`; the total is scoped using existing actor access. Therefore total minus dimessi is the correct existing broad predicate, not the count of admitted-only patients. The source must remain unchanged.
- `backend/src/patients/clinical-summary.ts` returns a bounded string or null, rather than runtime-validating canonical admission values. Frontend's TypeScript union does not prove the network value is canonical.
- App owns search/sex state across keyed route remounts, and owns an entry key for direct KPI navigation. Generic sidebar navigation resets the entry view/signal; a new local regime filter must reset on that same entry boundary. Do not change role grants or the established identity cache/session fencing.

## Minimal safe design

### Terminology

Rename only the broad UI set to **Non dimessi** (not the stronger, operationally ambiguous **Ricoverati** or **In carico**). Keep `in_carico` as the internal compatibility value; this avoids cross-route/API/domain drift.

Provide a concise, visible explanation, for example: `Pazienti senza una dimissione registrata: comprende ricoverati, Day Hospital, ambulatoriali e stato non disponibile.` This describes absence of an explicit recorded discharge, not certified physical presence, bed occupation, assignment, or a newly approved clinical rule.

Use the same broad label in the operator dashboard KPI, action name, and turn subtitle. The dashboard global total is the existing scoped aggregate; the list count is only the current loaded/search/sex subset. Say so visibly, not only in a tooltip. Retain the existing unavailable-data dash and loading/error feedback.

### Regime filter

Add a native labeled, keyboard-accessible control using the existing filter layout and styling; no new component library is needed. Canonical choices must include **Ricoverato**, **Day Hospital**, **Ambulatoriale**, and a distinct **Non disponibile** choice; **Tutti i regimi** is the default. An explicit Dimesso regime choice is optional because the top-level Dimessi view already exists, but any offered choice must use exact equality and clearly explain intersections that legitimately produce an empty set.

Use a small centralized typed UI helper and canonical membership check. Canonical equality is exact; do not infer regime from a bed, room, intake type, source document, casing, whitespace, patient name, or clinical flags. Missing/null/undefined/empty/noncanonical runtime values belong to a nonavailable UI classification, never to admitted or discharged. No coercion or writeback into chart data.

The broad Non dimessi predicate must remain exact `stato !== 'dimesso'`. This intentionally still includes unavailable source state, with the distinct badge and explanation. A strict admitted-only regime filter returns true only for exact `ricoverato`; Day Hospital and outpatient do likewise. The nonavailable filter may mean `dato di regime non disponibile`, but must not claim the source confirmed the regime is absent when the enrichment request is loading, failed, or prohibited.

### Counts and predicate

Use the same effective predicate for displayed rows and the selected local count. If view-button counts are contextual to active regime/signal filters, compute them from that same regime/signal-filtered loaded base; otherwise label them explicitly as broader view totals and show a separate actual filtered result count. Do not show a badge count for a wider set as though it counts the rendered set.

Preserving null/unverified view counts when summaries are missing is safe and compatible with the existing tests. Display an explicit `Conteggi per stato non disponibili` message rather than a fabricated numeric zero. If the implementation instead computes an exact count of the broad rendered selection including undefined rows, explicitly distinguish that count of loaded rows from a verified clinical-state aggregate, and cover the new semantics in tests; never count unknown as confirmed admitted/discharged.

Known chart null, transport unavailable, and loading are not the same evidence. Without adding a new backend contract, the simplest conservative implementation keeps the existing unverified count behavior for any missing summary/state while retaining the broad rows. A dashboard-ready global total-minus-dimessi can remain numerical because its server aggregate evaluates the stored records independently of page enrichment.

### Pagination, search and navigation

- Do not add a per-patient fetch or a new server filter parameter. Regime filtering must be identified as applying to **pazienti caricati**; retain `Carica altri pazienti` even if a local filter empties the current page.
- Show filtered loaded count and remaining-pages guidance so a zero visible match is not mistaken for a global absence of patients in that regime.
- Current search switches the top view to Tutti, then restores the prior view when cleared. Decide explicitly whether regime resets or persists during search; either is acceptable only with a visible active filter and tested restore/reset behavior. A hidden stale regime must not make a searched patient appear absent.
- Reset a regime on a new entry key, including KPI direct access and generic sidebar reset. A KPI that counts the broad set must not open a stale admitted-only regime selection. Do not alter signaled direct-access filtering.
- Keep filters local to the established mounted route/session boundaries and preserve source identity/sex/search behavior. No capability expansion for administrator or a role without clinical summary.
- Summary loading/failure/retry must keep identities consultable and show nonavailable state, not infer clinical status. Scope/session changes must not display previous-session counts or missing-data conclusions.

## Acceptance/validation map

| Original AC | Required implementation evidence |
| --- | --- |
| 1 | Unit predicate/count tests; rendered label and selected count equal the effective loaded set; explicit local-vs-scoped-global explanation; operator dashboard subtitle/KPI label and click predicate consistent. |
| 2 | Exact admitted/Day Hospital/outpatient filter matches; badges retain canonical labels; browser desktop/mobile keyboard-selectable control and visible active filter. |
| 3 | Null/missing/undefined/empty/unexpected states never admitted/discharged; unavailable-source and retry state retain identities; unavailable badges readable without color. |
| 4 | Table-driven mixed-state tests, count consistency and missing-regime cases; route entry reset/search clear/pagination/failure/capability regression. |

Recommended synthetic browser dataset includes admitted, Day Hospital, outpatient, discharged, explicit null, missing summary, and unknown legacy string. Include more than one page so local count scope cannot accidentally be asserted against the global dashboard count. Original photo is unnecessary.

Existing tests that deliberately assert the old **Ricoverati** label should be updated to **Non dimessi** with the predicate protections preserved. `patientListView.test.ts` unknown-count tests should not be casually removed. Preserve `clinicalOverviewResilience.test.ts`'s unknown-dash/loading contracts, and the five-card compact/responsive assertions in `operator-dashboard-first-view.test.ts`.

## Release recommendation

Frontend-only scope is sufficient. No schema/API/backend deployment is required if only labels, pure filtering helpers, UI controls, and focused tests change. Root remains the sole application writer. Freeze the application candidate and obtain fresh independent QA plus root rerun on that exact source, source-bound synthetic browser screenshots, full regression delta versus accepted baseline, and verified frontend deployment before GitHub closure. This architecture review supplies no release approval and claims none of the original criteria completed yet.
