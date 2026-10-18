# PR483 round6 — verification-only agenda wiring

READ-ONLY refinement, 2026-10-18. No product/test/harness/GitHub/controller/database edits. Only this analysis file and its superseded-v1 copy are written. All41 application/test files remain frozen at digest `333b7c06f4d16e1ba54f857f594093008758e2a2165c3962a623e82f9d6a57f0`, HEAD `34c865233df53a3930f29c8b7befc02208588d64`. Wait for root to seal QA5 FAILED, preserve its proof, record continuation6 and provide the new contract/reservation before implementation. Existing user authorization beyond4 persists.

This refinement supersedes v1's suggestion to connect the entire therapy feed or rework scheduled modals. **Preserve UX447: only read-only verification reaches Agenda.** Existing timed therapy props, cards, modal behavior and administration callbacks remain unwired in the actual App; no new administration path is introduced.

## Actual defect

App renders AdminAgenda at3601 and OperatorAgenda at3859 with appointment props only. Neither receives verification groups or an initial/day/retry/pagination loader. App2026–2030 requests the therapy feed only on Terapia. Agenda therapy props are optional, so the missing connection compiles and silently produces no verification section. The components' event handlers are insufficient: they never request a therapy day on initial mount.

Independent proof: `/workspace/.clinicos-cloud/pr483-followup-independent-qa-20261018/snapshot-qa5/artifacts/task-validation/bug-batch-432/independent-extra/failure.json` timed out on `QA independent missing` in actual OperatorAgenda. The retained `operator-week-agenda/failure-dom.txt` shows the real day agenda without a verification section. SQL/count/page/ACL, concurrent correction and week checks passed first; the integration defect must remain a FAILED round5 result.

## Exact minimal file list

Production — four files:

1. `frontend/src/App.tsx`.
2. `frontend/src/components/operator/OperatorAgenda.tsx`.
3. `frontend/src/components/admin/AdminAgenda.tsx`.
4. NEW `frontend/src/components/shared/AgendaTherapyVerification.tsx` — one required feed type, small eligibility helper and shared verification-only day/loading/error/pagination block. Exporting the small shared type/helper from this file avoids another module or a general feed-controller refactor.

Tests — two files:

5. NEW `frontend/src/components/shared/__tests__/agendaTherapyVerification.test.ts` — real used helper and real component render states, including absent/mismatched date/scope and readonly projection.
6. `frontend/src/lib/__tests__/therapyNavigationGuard.test.ts` — correct the therapy-page-only description/contract, retain no-session-prefetch and bounded parse/merge/abort guards, and guard both actual App verification call sites.

New round6 packet/harness only: root writes its contract/plan/manifest; author adds a fresh `agenda-verification-browser.mjs` and scoped launcher/output configuration there. Keep round5 harness/source/proof unchanged. No edit is expected in `TherapySlotModal.tsx`, `TherapyVerificationPanel.tsx`, `types.ts`, existing `therapyAgendaDateGuard.test.ts`, backend, schema, dependencies, policy/#486, `backend/src/skills/http.ts` or UX447/481 worktrees.

## Concrete minimum implementation

### App projection and ownership

Continue using the existing bounded `loadTherapySlots`/`loadMoreTherapySlots`, strict page parser, same roster metadata checks/recovery, abort/sequence/session epoch protections and exact summary merge. Do not fetch directly from either agenda or create an unbounded endpoint.

Project `therapySlots` to a typed `TherapyVerificationGroup[]` in App and pass it through a REQUIRED `verificationFeed` prop to both actual agenda JSX call sites. Do NOT pass `therapySlots`, the legacy timed loader props, confirm/not-administered callbacks or the mixed scheduled/verification array. TypeScript should reject a future missing feed prop. The small shared feed type contains only verification groups, accepted date/scope identity, current expected scope, loading/errors/page state, and stable day-bound load/append callbacks.

Record accepted first-page identity explicitly, e.g. `{date,scopeKey}` alongside the accepted data. Scheduled/empty responses cannot establish a date by inspecting their groups; App's existing `therapyDate` is requested date, not accepted-data ownership. Capture identity when the first page is accepted, retain it on an owned append, invalidate on scope/session reset and new first-page failure. Expected scope uses the current session identity/epoch, roster request key and policy version already available in App. Add it to loader dependencies and accepted metadata; preserve current sequence/epoch/roster guards. Do not redesign the wire union or backend classifier.

Extend/bind append to require the requested local agenda day and current accepted scope/cursor. A mismatched date/scope cannot append or reuse the old cursor. The backend still rechecks patient ACL, date, roster and authorization. New day/scope requests reset details/cursor through the existing full-load path. A denied `administration.list_slots` capability or403 must produce unavailable/error presentation, never a successful empty set or old names. Appointment permission remains independent. No policy changes are needed.

### Shared verification block, mounted from each agenda

Both components receive the required feed and render the shared block with `active={view==='giornaliero'}` and `date={isoDate(refDate)}`. Existing optional timed props and their handlers remain untouched/unwired. Existing appointment date/view/creation behavior remains untouched.

The new shared block owns one stable effect on active day, selected ISO date and the stable App load callback/current scope. It requests the exact selected day on initial mount, reload/navigation return and date/day re-entry. It stops/invalidate its own local pending completion on unmount/date change; App retains ownership of actual network abort/sequence. Use the existing selected-day convention, not a new clock/facility-date policy. Week/month render no verification block or day-specific continuation; existing day-view guidance remains.

The block only renders groups when accepted date equals local day, accepted scope equals expected scope, therapy read is allowed and no blocking first-page failure/loading exists. This gate runs during render, BEFORE the new date effect, preventing a flash of yesterday's groups. An actually accepted empty day is distinct from not-yet-loaded/error. Same-date/scope refresh must have honest loading/refresh indication. A small local pending state around the Promise returned by App's existing async loader can handle this without changing Terapia's established stale-while-revalidate behavior. Ignore old pending completions using effect cleanup/request generation; no parallel data cache/controller is necessary.

Reuse TherapyVerificationPanel for the readonly list. Add therapy-specific retry and bounded continuation outside that region, tied to the selected local day. While first-page request is pending/error, do not display a successful-zero/all-clear or stale verification names. Append error keeps accepted authorized same-day verification rows and exact total visible, with explicit partial/retry state and disabled duplicate append while loading. Keep exact first-page summary, count-before-limit and dedup behavior. The App projection never creates a time, band, dose or action key.

This does not require timed-card/modal lifecycle work: no timed slots reach production Agenda. Appointment operator/status filters remain appointment filters; do not treat them as patient ACL or therapy-prescriber filters.

## Meaningful verification before fresh independent QA

Unit/type checks must cover required App props and actual shared guard/component states. Existing static strings alone missed the defect; actual App/browser checks are mandatory.

| Check | Required result |
| --- | --- |
| Cold nurse OperatorAgenda direct entry and reload | Authenticate first; visit actual `#/agenda-operatore` without visiting Terapia. Observe bounded exact selected-day request and actual authorized ambiguity names/count; reload repeats it. |
| Cold admin Agenda direct entry and reload | Actual `#/agenda-admin` session; authorized verification visible, appointments independent, no timed therapy cards/modal/administer buttons and no administration POST. Verify existing server read permission; do not assume appointments permission implies therapy read. |
| Preserve UX447 | Inspect both actual agenda DOMs: only the projected verification panel is added; legacy timed slots/cards/controls and administration callbacks remain absent. Ordinary scheduled prescriptions do not appear as agenda therapy cards. |
| Date/view/navigation | Terapia dayA→Agenda local dayB; next/previous/today; week/month then open a day; browser back/return. Each panel belongs to selected day only, and no day panel/cursor appears in week/month. |
| Race | Hold dayA response, selectB, resolveB thenA. Old names never replaceB or flash underB. Hold append while changing date; no stale cursor merge. |
| Errors | Failed initial page shows therapy-specific error/retry while appointment UI remains usable; no false empty/all-clear/old names. Retry requests the selected day. Append failure preserves accepted same-day details/exact count and exposes retry. |
| Pagination | At least105 eligible candidates with verification after page1. Exact verification total before details; explicit partial state; follow actual continuation and show each ambiguous item once. New day does not reuse prior cursor. |
| Scope/ACL/session | Roster context/order change revalidates selected day and old cursor409 recovers. Denied read403/current patient ACL never exposes old names. Pending old-session read after logout/login cannot repopulate verification. Backend ACL checks remain authoritative and unchanged. |
| Regression | Frontend types/build/full suite; unchanged seven-issue browser/SQL/F1 coverage bound to exact source, with fresh required checks determined by the new contract/independent QA. Round5 overall verdict stays FAILED; only genuinely unchanged phase results may be explicitly inherited. |

No new DOM-test dependency is required. Existing React server-render tests handle presentation/helper cases; real browser effects/App wiring/date races require Playwright on the existing owned stack. Use synthetic fixtures and targeted delayed/error responses only for lifecycle negatives; positive visibility/ACL checks use actual backend/DB. Fresh output paths and full lifecycle lock remain required.

## Estimate and gate

The four-file product correction is plausibly20–35min once reserved; focused tests may take another10–20min. Actual browser/race/ACL/pagination validation and fresh independent QA are separate and cannot honestly be promised within20–30min. No broad refactor or backend work is indicated. Quality takes precedence over that estimate.

Preserve every QA5 failure/trace/DOM/log and original41-file manifest. Root owns round6 reservation, contract, state and eventual publication/release. No implementation or live validation occurred during this refinement.
