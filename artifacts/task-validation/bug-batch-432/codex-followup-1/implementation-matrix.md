# PR483 clinical continuation: read-only implementation matrix

Analysis date: 2026-10-18. Repository HEAD verified as `34c865233df53a3930f29c8b7befc02208588d64` in `/workspace/ClinicOS/agent-team/.worktrees/bug-batch-432`; worktree was clean before and after inspection. No application, packet, controller, GitHub, or database writes were performed. No runtime validation was performed by this analysis.

The prior four-cycle question in `/workspace/.clinicos-cloud/therapy-followup-analysis/implementation-plan.md` is answered by the user's continuation authorization supplied by root. That historical document was not rewritten. Root owns the durable continuation reservation, preserved counters, approved scope amendment, implementation handoff, publication, review, and release.

## Sources actually inspected

- Live PR483 body, all issue comments, its full Claude round-2 review, and the review-comments endpoint (no inline comments returned). Authoritative findings: https://github.com/l2v-hub/ClinicOS/pull/483#issuecomment-6237430324 ; later reconciliation: https://github.com/l2v-hub/ClinicOS/pull/483#issuecomment-6243056665 . Review remains changes-requested on the verified HEAD.
- Live issue441 body/comments and issue460 body/comments; original batch contract and full plan-proposal fileMap/scope/acceptance/tasks/evidence; prior independent QA3 report and actual harness sources.
- `CLAUDE.md`, `.claude/skills/clinicos/SKILL.md`, `agent-loop-quality-gate/SKILL.md`, `qa-gate/SKILL.md`, `playwright-evidence/SKILL.md`, `run-clinicos/SKILL.md`, and the cloud onboarding setup skill. The worktree does not contain the later `clinicos/references/bug-delivery.md` cited by GitHub; its old budget language must not be treated as a new user-permission blocker.

## Finding 1: explicit refused-dose correction

Actual flow: `PatientTherapySlotDetail.tsx` derives `missedToday` from server `not_administered` entries, `administerAgain` calls its generic `record`, and `administrationBody` always emits `expectedStato:'da_erogare'`. Server parser accepts only that literal. `confirmTherapyAdministration` resolves the authoritative prescription, finds the day/band record, rejects already-erogata, then rejects a refused record because it differs from the expected pending state. The same shared writer is used by HTTP and Tool Layer.

Minimal safe implementation:

1. Add a typed client option `expectedStato?: 'da_erogare' | 'non_erogata'`, default `da_erogare`. The only new override call site is `administerAgain`; pass it through local `record`, including the confirmation-required branch and glucose measurement branch. Leave Giro, Turno, and assistant pending operations on their existing default.
2. Extend server input type/parser to permit `non_erogata` only for the confirm operation (`requireReason === false` under the current API). Reject it on `/not-administered` rather than accidentally allowing another correction mode.
3. Compare the observed state before write. For `non_erogata`, require an existing refused record; absence is a conflict. Merely adding the literal to the parser is unsafe: current guard runs only if `existing` exists and would otherwise create a new dose. Preserve already-erogata denial, authoritative dose, role confirmation, ACL, patient scope, SERIALIZABLE isolation, bounded retry, and immutable receipt behavior.
4. Retain reload-safe request identity. The request signature already includes the body, so the new expected state separates explicit correction from old pending confirmation and refusal. The same uncertain correction retry must reuse its requestId; it must replay the first result after authorization recheck. A new request with the old expected refused state after successful correction must conflict.

Required regressions: builder default/override; refuse then explicit client correction HTTP200 and exactly one record now erogata; pending-only confirm on refusal409; correction without a record409/no create; correction on erogata409; correction state rejected on not-administered400; stale scope404 before receipt disclosure; same correction requestId replay200/no duplicate; changed payload conflict; concurrent explicit corrections produce one result and no second dose; supervisor428 then confirmed200. Browser: real refusal, visible Somministra ora, request body value, Erogata after reload, actual DB record/receipt assertions, dedicated media.

## Finding 2: representation and classification

Current `TherapySlot[]` has five writable band literals and string times everywhere. `therapySlotPage.ts` explicitly rejects any sixth band. `giroTimes`, Agenda time maps, week cells, dose status, dashboard, and proactive sources all assume a scheduled time. Do not set `fascia:'da_verificare'`, empty time, a band default, or pending status on an ambiguous prescription.

Recommended wire contract: retain scheduled slot objects and introduce a separate discriminated read-only group in the same legacy array and paged `slots` collection. Name the union `TherapyReadGroup = TherapySlot | TherapyVerificationGroup`; retain `FasciaOrariaTerapia` unchanged. Example:

```ts
type TherapyVerificationItem = {
  therapyId: string;
  drugName: string;
  status: 'to_verify';
  reason: 'missing_time' | 'invalid_time' | 'conflicting_schedule';
  prescriptionText?: string; // existing prescription text, never inferred administration dose
  scheduledTime: null;
  quantityLabel: null;
  canAdminister: false;
};
type TherapyVerificationGroup = {
  kind: 'verification';
  id: 'therapy-verification';
  date: string;
  label: 'Da verificare';
  fascia: null;
  ora: null;
  summary: { total: number; verification: number };
  patients: Array<PatientIdentity & { items: TherapyVerificationItem[] }>;
};
```

Scheduled slots may keep their current shape; the type guard can use `kind === 'verification'`, with scheduled `kind?:'scheduled'`. The null fields make the absence explicit and the separate item collection prevents accidental reuse as `TherapyActionInfo`. Strict parser must reject verification groups containing writable time/band/quantity/status combinations, invalid counts, or missing identity/reason. Partition at each data-reading boundary; scheduled-only helpers and time grids retain their narrow types. Render the verification group outside time grids in a small reusable read-only panel, including exact count and partial detail messaging. No new Prisma schema or migration is necessary.

An additive versioned day envelope with `verification` beside `slots` would also work, but requires a separately negotiated change to the bare-array legacy response and all fetch sites. The discriminated read group keeps the outer response contract and valid scheduled records intact while making the new semantic explicit. Do not attach ambiguous therapies to an arbitrary existing band merely to preserve old types.

Classification contract, shared conceptually across TS and SQL:

- Normalize only a valid `H:MM` or `HH:MM` into HH:MM. A malformed value remains invalid; null/empty remains missing. Be explicit about whitespace (prefer the same trimmed convention in both implementations).
- A one-off is schedulable when explicit normalized clock exists and its optional unique schedule agrees with the clock and derived band. Legacy flags do not decide one-off band.
- Multiple schedule rows must not multiply one therapy/day. Safest minimal rule is to classify more than one schedule as conflicting and require clinician review, even if clocks repeat, rather than select a quantity. If deduplication is preferred, it must prove the complete dose quantity/unit and band are identical; clock equality alone is insufficient.
- Use normalized clock in SQL comparisons, band derivation, schedule joins, TS read slots, writer matching, and returned write key. Normalizing only `oneTimeSlot` leaves `resolveAuthoritativeTherapy` comparing `8:30` schedule to `08:30` input and still rejects.
- Ambiguous therapies produce exactly one verification item on their explicit prescription date, regardless of flags/schedule multiplicity; never infer a clock, band, or quantity. Apply date/weekday and current ACL before return. Candidate pagination already includes them before clock filtering, so reuse the same candidate page and roster binding.
- Normalize newly saved one-off clocks in `therapy-create.ts` (the shared intake creation path) and the patient-therapy PUT path if touched; accept and correctly read legacy H:MM without needing data migration. `confirm-therapies.ts` currently validates H:MM but does not perform persistence itself.
- Existing one-off day records remain untouched and continue to prevent re-administration after time/band changes. If an already-recorded one-off becomes ambiguous, its verification representation can expose the recorded outcome separately as historical metadata, but must not turn it into pending or erase the saved record.

Read/SQL design:

1. Extract a pure normalized one-off classifier in `slot-scheduling.ts`; use it in one-time reader and write guards.
2. Add SQL helpers in `therapy-query.ts` for normalized valid clock and schedulability/verification predicates. SQL null logic must explicitly treat missing/invalid clocks as verification; `NOT NULL-predicate` alone silently drops nulls.
3. `therapy-slots.ts`: construct verification details from the SAME authorized bounded candidate page, once per therapy. Add an exact verification aggregate to the first-page summary in the same roster transaction. Existing first-page `FASCE.flatMap` must explicitly preserve the new group: otherwise it overwrites it away. Continuations carry details; merge preserves first-page exact count and deduplicates by therapyId.
4. Scheduled TS and SQL paths must emit exactly one row for a valid one-off and retain periodic multidose joins. A UNION branch is easier to audit than cross joining verification across the five bands. Keep all predicates parameterized through Prisma.sql.
5. `due-therapy-query.ts`: add `toVerifyCount` and bounded `toVerify` samples as a separate category without minute calculations. Do not run `split_part::int` on invalid clocks. SQL category should use one authorized row per ambiguous therapy/day and count before bounded sample. `truncated` includes verification samples.
6. Assistant `service.ts`: facility snapshot and operator queue add `therapiesToVerifyCount`, sample count, samples, distinct source text without “delle HH:MM”, dueSoon or minutesLate. `facility-signals.ts` pure oracle/types should mirror the distinction.

## Required producer/consumer scope amendment

The original 37-path scope is insufficient. Root should approve an additive revision before application editing, retain the original packet/contract/history, and link the new revision from the continuation contract.

| Area | Existing scoped paths reused | Additive scope needed / audit boundary |
| --- | --- | --- |
| F1 client | `frontend/src/lib/therapyAdministrationWrite.ts`, retry tests | `frontend/src/components/operator/cartella/PatientTherapySlotDetail.tsx`; focused builder/correction tests |
| F1 server | `backend/src/therapies/{therapy-write,administration-record}.ts`; `routes/__tests__/therapy-authoritative-write.test.ts` | Add focused parser/state regression file if clearer; no schema change |
| F2 authoritative TS/SQL | `backend/src/therapies/{slot-scheduling,therapy-query,therapy-slots,due-therapy-query,therapy-write}.ts` | Pure scheduling tests and real summary/due SQL regressions (`therapies/__tests__/therapy-query.test.ts`, `due-therapy-query.test.ts`, route contract tests as needed) |
| F2 persistence normalization | none | `backend/src/therapies/therapy-create.ts`; `backend/src/routes/patient-therapies.ts` if PUT normalization included; associated creation/update/import tests. `intake/confirm-therapies.ts` only if validator must share normalizer |
| API/tool adapters | `backend/src/routes/therapy.ts`, `tools/capabilities/therapy.ts` | Keep HTTP/tool feeds consistent. `therapy-candidate-page.ts` audited: already includes ambiguous therapies; change only if selected date semantics require it |
| Assistant backend | `backend/src/ai/assistant/{facility-signals,service}.ts`, `backend/src/skills/executors.ts` | Dedicated assistant queue/snapshot integration assertions; `executors.ts` pending path explicitly narrows scheduled groups, due-read reply includes verification |
| Frontend DTO/parser/cache | `frontend/src/App.tsx` | `frontend/src/types.ts`, `frontend/src/lib/therapySlotPage.ts`, parser/merge tests. App keeps both collections and passes read-only data to relevant surfaces; raw casts in other fetch sites must be updated |
| Giro/week | none | `frontend/src/components/operator/{TherapyRoundsPage,TherapyWeekCalendar}.tsx`; new shared verification panel; tests. Partition before `giroTimes`, render day/week verification outside timed cells |
| Cartella prescription calendar | none | `frontend/src/lib/patientTherapyCalendar.ts`, calendar tests; `PatientTherapyCalendar.tsx` if server-group integration needed; existing `PatientTherapyScheduleSummary.tsx` may be reused for incomplete display |
| Cartella detail/drug | none | `PatientTherapySlotDetail.tsx`, `TherapyDrugDosePanel.tsx`: parse/narrow read groups before timed helpers; read-only verification output where relevant |
| Turno/dashboard | none | `frontend/src/lib/{dashboardTherapies,dashboardTherapyRead}.ts`, dashboard consumer showing existing `senzaOrario`/new verification collection, `useRiepilogoSomministrazioni.ts` types; tests. Verification increments its own count, never pending/late, and has no bulk-action key |
| Agenda/admin | none | `frontend/src/components/operator/OperatorAgenda.tsx`, `frontend/src/components/admin/AdminAgenda.tsx`: keep verification outside maps indexed by ora; show shared read-only panel. Scheduled modal/overlay can remain unchanged if only scheduled slots reach them |
| Rendered assistant | none | `frontend/src/components/shared/agnos/AgnosBrief.tsx`, relevant brief render tests: new count/sample row; include verification in total/partial/all-clear logic |
| Internal proactive | none | `backend/src/proactive/sources.ts`: explicitly use scheduled partition so no fake occurrence or timestamp. If `buildTherapySlots` remains scheduled-only internally and new day-builder is used by HTTP/tools, this file can remain unchanged with a regression |
| Supporting helpers | none | `therapyGiro.ts`, `therapyWeek.ts`, `therapyDoseStatus.ts`, `TherapySlotModal.tsx`, `TherapySlotOverlay.tsx` can remain scheduled-only when boundaries narrow correctly; change/test only if compiler or actual call graph requires it |
| Harness/proof | existing `e2e/qa-bug-batch-432*.mjs`, retry/completeness scripts | New continuation harness output parameters or external copies with explicit root/output paths; new focused correction/verification browser scenario and per-issue media |

Important cartella trap: `buildPatientTherapyDay` currently enters the generic schedules loop BEFORE reconciling one-off explicit time, so a contradictory one-off appears at the schedule's time even when server feed hides it. Classify one-offs first and send ambiguous cases to `unscheduled`, reusing the existing read-only warning/clinician reference. The client is not allowed to invent a dose because its raw prescription still contains a schedule.

Important assistant trap: `AgnosBrief.tsx` facility snapshot says “Tutto sotto controllo” when overdue and consegne counts are zero, and operator total sums only overdue+dueSoon. New backend fields alone do not satisfy visible assistant acceptance; update those calculations and distinct rows.

`backend/src/skills/http.ts` is outside this proposed scope and is owned by active PR393 voice analysis. No traced requirement needs it. If implementation finds a need, coordinate root before changing it. UX447 is frozen/inactive: no writes to its worktree/proof; no concurrent therapy UI writer.

## Per-issue acceptance and fresh proof matrix

| Issue | New critical coverage | Existing critical regression retained |
| --- | --- | --- |
| 432 | Ambiguous prescription visible in inventory and date-specific read-only group, exact totals across >100 candidates, patient switching/partial details/reload; no invented action | Complete106 inventory pages, PRN/day/week/period, malformed/repeating/cross-patient pages fail closed, print, HTTP/DB retained/excluded import reconciliation |
| 441 | null clock+legacy flag, invalid99:00, no flags, many flags, conflicting schedule, duplicate/multiple schedule, legacy8:30→08:30; TS feed/SQL summary/assistant parity, one item/day, denied patient absent; ambiguous writes create no administration/receipt | Valid explicit one-off in every band including no flags, wrong date/band/time denial, actor/dose server authority, one successful dose |
| 442 | Shared list_slots union does not allow ambiguous skill write and stale preview still fails | Deterministic held interpreter correction under full suite load, bounded cleanup and unchanged clinical safety assertions |
| 460 | Explicit refusal correction, missing/stale refusal denial, correction request identity and same-key replay after lost response/reload, ACL recheck; pending-only still409 | Immutable first receipt, payload conflict, concurrent retries, actor isolation, Turno/Giro/assistant default pending |
| 463 | New read-only panel causes no per-drug lookup when catalog is empty | Available/absent/unreachable/malformed catalog distinction, public rate limit |
| 464 | Verification has no fake due/late minute; normalized valid clock has existing Rome boundary meaning | Midnight/year boundary/both DST transitions,00:30/00:45/00:46 exact counts |
| 467 | Time changes on already refused/given one-off remain one day record; ambiguity does not reopen dose or multiply by schedules | Cross-band edit, periodic08:00/10:00 same-band distinct dose/quantity, no mutation of original given record |

For each touched issue, append fresh PNG/trace/WebM to a new continuation directory. #441 needs dedicated assertions/media for verification rather than relabeling the prior432 trace. Root/independent QA should record final source SHA/fingerprints and artifact hashes; old QA3 remains true only for its old source and remains byte-identical.

## Existing harness reuse and runtime inputs

Do not execute `e2e/qa-bug-batch-432.mjs` unchanged: `out` is hardcoded to the historical packet and it rewrites old test-results, report/media and summary. Its browser companion also writes/copies to historic destinations. Prior `independent-qa-attempt-3/*` helpers are immutable proof, not editable harness templates. Reuse via a new versioned harness or external analysis/run copy with explicit repository root, new run directory, scoped fingerprint list and all nested output arguments redirected. Preserve failed attempts as separate run directories rather than overwriting one failure.json.

Useful existing components:

- `e2e/qa-scheduled-retry-browser.mjs` and `qa-therapy-completeness-browser.mjs` accept output directory argv; can be called with unique new paths.
- Canonical batch harness owns lock `/tmp/clinicos-browser-qa.lock` over complete DB/runtime/backend/frontend lifecycle, not browser alone; preserve this serialization to avoid Chromium/veth interference.
- Canonical ports: backend3432, frontend5433, mock runtime8432; Docker Postgres loopback55432. New run must establish ownership and refuse occupied resources rather than stopping unrelated services.
- Docker branch pins `postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d`, refuses an existing container, labels owner, checks SQL readiness, and verifies owner before cleanup. Native branch expects trusted local PostgreSQL16 admin target `clinicos_test` on5432 and creates owned `clinicos_qa_batch432`; no current DB availability/credential is established by this analysis.
- Sanitize inherited environment names: mock AI provider/runtime only, no paid-provider calls. Existing harness allows only selected runtime variables and sets `AUTH_MODE=demo`, `NODE_ENV=test`, explicit VITE_API_URL and local runtime model IDs. Role simulator is enabled only in the isolated app process.
- Node24.19.0/npm11.9.0 and executables chromium/docker/ffmpeg/flock were observed. `psql` and `/usr/lib/postgresql/16/bin` were not found by the read-only shell checks. Docker daemon, image availability, Python uvicorn/runtime dependencies, DB access, and free ports remain unverified; do not claim stack readiness.
- Both workspaces and node_modules exist. Builds can regenerate dist/client locally; first establish correct schema/client and no shared generated client collision.
- Existing runner serializes global DB suites; use canonical `npm --prefix backend test`, not an ad hoc broad parallel glob. Keep #442 under full suite load. Five prior opt-in skips remain classified as unrun unless actually executed.
- PDF suites have historical fixed output paths; prior harness snapshots/restores their original bytes and archives fresh generated artifacts. Preserve this behavior and prove old packet/history integrity before/after. Outputs added by full suites must not leak into unrelated proof.

Suggested sequence after root reservation and contract/scope revision: implement F1 plus focused unit/HTTP tests; implement F2 classifier and SQL parity then typed response/consumer surfaces; run targeted regressions, both builds and full suites once; run real isolated browser/DB/import harness with fresh per-issue proof; simplify/audit scope; independent QA in a new dedicated session; exact-SHA Claude review; release gates remain root-owned. Avoid a new paid provider or real production database.

Estimates for planning only (not elapsed claims): F1 implementation+focused validation 30–60min; F2 coherent contract/SQL/UI 2–4h; author full stack/suites/browser and fixes 45–90min; independent QA 45–90min plus fixes if findings arise. Surface/contract changes dominate; a two-line server/client patch cannot satisfy F2. QA must be independent from author/coordinator per qa-gate skill, with one serialized owned stack and byte-preserved history.
