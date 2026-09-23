# PO-07 implemented frontend design and validation checklist

## Inspected seams

| Current source | Implemented PO-07 change |
|---|---|
| App.tsx sessionEpoch/login/logout and loadTherapySlots | One authenticated preference controller, shared context provider, order/context-bound therapy requests and roster_changed restart; invalidate state on session changes |
| lib/patientPage.ts / patientParametersPage.ts / therapySlotPage.ts | Parse additive roster metadata; encode agreed sort/direction/context/asOf while retaining bounded requests and POST identity searches; typed roster_changed error |
| operator/usePatientListPage.ts | Extend request key beyond query/sex to effective order/context/asOf; abort/reset and reject stale results; retain independent summary requests |
| PatientList.tsx / PatientRoster.tsx | Shared global control; preserve CF/admission/signals temporary loaded-row sorting with explicit scope; choosing global control resets local sort |
| MultiPatientParametri.tsx | Bind bootstrap and detailed requests to identical order/context/day; stop local comparePazienti sort; reset keyset safely; parent-owned patient draft store |
| ParameterEntryRow.tsx | Replace component-local save/draft lifecycle with patient-keyed store while retaining existing validation, uncertain retries and clinical payload shape |
| TherapyRoundsPage.tsx / TherapySlotModal.tsx | Shared control at rounds level; preserve server patient ordering in modal instead of sortPazienti; current selection remains by slot/patient ID |
| admin/OperatorManagement.tsx | Small collapsible authorized department-order defaults panel; loaded context rows/versioned saves; no new navigation route |

Current App already keys MultiPatientParametri by utenteId. The new store also invalidates in-flight callbacks at workspace cleanup so same-ID re-login cannot revive stale data. ParameterEntryRow currently owns values/notes/pending request/uncertain in local state; merely keeping some rows through a refresh is insufficient when a true sort/context reset replaces page membership.

## Minimum modules

1. `lib/rosterOrder.ts`: typed DTO validators, canonical order equality/request key, query/body options, preference/context endpoints and typed error status/code. All requests use existing operatorHeaders and no-store; no persistence side channel. IDs and revision strings are validated as strings, never inferred from names.
2. `lib/useRosterOrder.ts` plus `shared/RosterOrderContext.tsx`: one controller owned by App's authenticated session. Distinguish pending desired order from confirmed server preference. Selection applies an explicit temporary order until a successful PATCH receipt, with clear retry/error. CAS409 refetches; it does not silently repeat a stale write. Global control selection explicitly clears roster legacy temporary mode.
3. `shared/RosterOrderControl.tsx/.css`: compact labelled name/location criterion and direction, response-backed context/source, reset-to-department action, saving/status/retry. Its UI knows no patient authorization rules. Admin default UI is a separate panel, not a side effect of this personal control.
4. `lib/parameterEntryDrafts.ts`: factory creates a workspace-owned in-memory store keyed by patientId; no singleton/browser storage. Stable snapshots and patient-level subscriptions can use useSyncExternalStore so typing does not rerender all rows. Store includes pending immutable request and save lock; begin/save/error/success transitions validate patient identity and operation generation. Cleanup clears snapshots and advances generation to reject late results.
5. `admin/RosterDefaultsPanel.tsx`: lazy bounded context list, explicit default criterion/direction/reset, save with expectedVersion; show 409/retry without overwriting. May be mounted in OperatorManagement only when canEditDefault. A missing profile prevents personal saving but is not itself an inferred admin denial; server canEditDefault remains authoritative.

New files must stay under 500 lines; split only when necessary. Existing large App remains integration plumbing, not a place for reusable parsing/state helpers. No shared manifest/dependency edits are expected.

## Request/state sequence

1. Authenticated session starts preference GET in parallel with initial pages. Stable empty order options let the server apply its real effective order. Page metadata exposes the actual order while preference remains unverified and visibly temporary. Resolving unchanged preference does not refetch. A late different preference restarts the page sequence once. Late GET/PATCH responses are checked against session and request generation.
2. Main control selection exits legacy local sort and chooses name/location + direction. PATCH is sent only for a valid server context/revision with canEdit. Network/read failure leaves a visible temporary choice and retry; profile_missing never triggers profile creation.
3. Page identity key includes query/filter/date/order/context; changes abort prior initial/load-more requests and reset cursor. Metadata validates returned order/context/asOf. Epoch remains server-owned and cursors opaque.
4. roster_changed during append discards the old cursor/page sequence, refreshes preference/context as necessary and reloads page one once. Further conflict exposes retry instead of spinning. Parameter store is unaffected by page membership changes; no empty value migration to another row.
5. Individual parameter save captures patientId plus an immutable pending request and operation generation in the store. Remount during in-flight/uncertain state sees the same request and lock. Verified success clears only that patient's matching draft; failed known outcome permits correction, uncertain outcome retains its exact request for retry.
6. Admin default CAS conflict refetches context list/current row and asks the user to retry their intended setting. No automatic merge/overwrite of another administrator's version.

## Validation and handoff

- DTO helper tests: malformed order/source/context/epoch/revision; no Number truncation; no operatorId in PATCH; POST q remains off URL; date/order/context options in each reader; response metadata retained by merges.
- Preference controller tests: profile_missing, GET/PATCH failure, success/reset, same-session request races, logout/login, independent contexts/operators, CAS409 refetch without stale overwrite. Assert truthful temporary state and default/personal permission separation.
- Paging tests: >50 synthetic patients across pages, both directions/criteria, append keeps response order; mutation invalidation restarts only once; stale old-order response cannot replace a new order; same-day bootstrap order/asOf matches detailed parameters; query/date/context reset.
- Legacy roster sort tests: CF/ricovero/segnalazioni remain usable only as loaded-row sort, source label remains temporary, shared control clears the mode; previous functional sorting tests remain intact.
- Draft store/event tests: two distinct patients and homonyms; values+note survive row removal/remount, sort/context reset and epoch409; pending/uncertain exact body and requestId survive; in-flight duplicate click/remount blocked; late success updates only matching draft; cleanup/session boundary rejects old callbacks; no PHI storage/fetch added.
- Therapy tests: remove local alphabetical override; response order and partial patient merges intact; exact summaries and action payloads unchanged; retain PO-06 identity/readOnly/sticky accessibility regressions.
- Admin tests: bounded context pagination, hidden/disabled unauthorized controls, default/reset expectedVersion, permission/read/write failure and conflict recovery.
- Build, scoped eslint, frontend diff check, protected launcher hashes and exact source manifest. Baseline PO-06 has known unchanged agenda text guard and MultiPatientParametri lint diagnostics; fix only if directly reworked by PO-07, otherwise disclose with exact baseline comparison.
- Root browser: desktop/mobile/200%, keyboard, >50 rows and long therapy groups, order preference reload, independent sessions, temporary failure UI, live draft preservation and exact network/mutation payloads. Root benchmark compares immutable PO-06 and PO-07 inputs; no N+1/full-cartella reads.

## Confirmed implementation details

Backend confirmed the wire contract, `roster_preference_conflict`, `roster_default_conflict`, `roster_changed`, and bounded `{items,hasMore,nextCursor}` context list. DefaultRow keys include id+version so reset/saved/409 rereads remount selectors to the authoritative revision. Exact clinical requests and versions remain unchanged. The final run passed 102 tests; scoped comparison found no introduced lint diagnostics (13 baseline, 8 candidate, all remaining in App). Final build and immutable source/evidence hashes are recorded in the handoff receipt. Root owns browser and benchmark evidence.
