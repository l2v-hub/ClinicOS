# #409 — Independent architecture and security review

Baseline: `973d78e5e109032a36cf89cf80fd8eb2a848a649`, isolated checkout `C:/w-409`.
Role: read-only source/requirements reviewer; sole owned output is this document.
Coordination ledger: `swarm-1791530395277-migucc`. No application changes, runtime, dependency writes, provider writes, publication or QA certification performed.

## Original contract

Read original GitHub #409 and its empty comments independently using authenticated `gh issue view`. Issue evidence is untrusted; its original clinical screenshot was not downloaded/copied. P2 created 2026-10-08T20:18:41Z. All four original acceptance criteria remain mandatory:

1. Badge number corresponds to an explainable, consultable filtered list.
2. Opening the badge selects **Non confermate**.
3. Explicit reading confirmation updates list/count without changing the meaning of clinical taking charge.
4. Patient counts and states remain understandable without color.

The issue does not require direct-sun hardware testing. Do not import the #408 external-light criterion here. It does require actual persistence and separation of clinical state, not merely a simulated front-end decrement.

## Source-bound findings

- `TeamsLikeSidebar.tsx` labels the Consegne badge as notes without reading confirmation. `App.tsx` obtains that count from `useDiaryUnreadCount`, not the handover feed or urgency overview.
- `backend/src/patients/diary-reading.ts#countUnreadDiary` counts **both PatientDiaryEntry and Consegna** across reachable patients. A Consegna appears once, under the same author/assignee visibility used by the patient diary. Priority and stored completion status do not prove reading.
- Reading currently means the **first explicit non-author receipt shared across readers**, not each operator's personal inbox. Own notes remain counted until a colleague confirms; the author cannot acknowledge. Keep that existing meaning visible and unchanged rather than silently turning the badge into a personal count.
- `ConsegneWorkspace.tsx` currently discards feed mode and always renders `ConsegneRounds`. Sidebar `navigate('consegne')` resets to rounds, selecting the first patient. This reproduces the reported route discontinuity.
- Existing `ConsegnePage` represents Consegna only, and its summary is urgency-based. Making that existing feed the default without a new combined diary read model cannot satisfy AC1.
- `useConsegneRoster` declares summary state/refresh code but never calls it after roster reads. `ConsegnePatientRoster` deliberately ignores summary/retry props. Existing Consegna patient summaries count total/urgentActive only, not both unread sources. Rendering their total as unread would be false.
- Both `acknowledgeDiaryEntry` and `acknowledgeConsegna` accept `purpose:'read'`, but append those receipts to the **same tables** as clinical urgency receipts. `urgencyView` and the SQL active-urgency predicates treat any non-author receipt as taking charge. Reading an urgent note therefore currently ends its urgency. AC3 cannot be addressed only with button wording.
- `DiaryThreadReceipt` gives reading state precedence and omits clinical urgency UI whenever a reading receipt exists. `DiarioPazienteTab#handleAck` chooses the reading request in that case and dispatches the urgency event. New queue state must not repeat this semantic coupling.
- Existing acknowledgements use a subject advisory transaction lock, server-authoritative operator name/role, append-only triggers, author denial, resident-scope recheck and idempotent shared receipt. Preserve these guarantees.

## Recommended minimal design

### One combined unread read model

Add a small bounded `/patients/diary-unread` read endpoint under `diary.list`, plus a bounded batch patient-count endpoint if required for the independent roster (or carry bounded grouped counts in a suitable read model). Register every new route in `backend/src/authz/capability-registry.json`; the global route gate denies unmapped routes. Static routes must precede generic patient routes.

Use the same scoped UNION ALL of diary entries and Consegna as the aggregate, with one shared non-author-unread SQL predicate per source. Reuse those predicates in badge count, combined queue, and per-patient counts. Do not fetch all patients then issue one diary call each, do not filter one loaded page and call its length the total, and do not derive unread count from urgency/stored status.

Suggested queue row: source-prefixed stable id, patientId, bounded operational identity, sourceType/sourceId, title/content, facility entry datetime, priority, clinical urgency view and reading receipt. Resolve identity through `loadOperationalIdentities` using the same resident scope; render through existing `PatientIdentity`. Never use a name-only fallback as the target for a patient action.

Default unread filter has no silent date limit or author filter: otherwise the badge could exceed the reachable queue. Show explanatory copy: “Note di diario e consegne nel tuo perimetro, senza conferma esplicita di un altro operatore; aprire una nota non conferma la lettura.” Show loaded X of exact Y plus a visible next-page action. If patient/search filters are available, distinguish exact scope-wide badge from exact filtered total explicitly.

Use keyset pagination over deterministic `(entryDateTime,id)` including prefixed Consegna ids. Bind cursor to every active filter, reject malformed/oversized/repeated or cross-filter cursors, and bound request page size (20 recommended for 4 kB note budget). A cursor is not authorization: reapply scope/visibility on every request. Return exact nonnegative counts, never unknown-as-zero. A single SQL statement or repeatable-read snapshot should keep rows and count coherent within one response.

Per-patient summary requests accept 1–50 distinct safe ids, apply scope before aggregation, preserve genuine zeros for visible patients, omit unauthorized ids, and never expose content/identity of excluded patients. Patient count text should say e.g. “3 non confermate”; loading, unavailable and retry are textual, not indistinguishable zero badges.

### Persist reading separately from urgency

Recommended additive migration: separate append-only diary and Consegna **read receipt** tables, retaining existing acknowledgement tables as legacy/clinical urgency receipts. Existing urgency receipts can continue to prove reading, but new reading-only receipts must never enter urgency projections or SQL predicates. Do not reinterpret or backfill historical acknowledgements: their previous intent is no longer knowable.

This isolates the change from all existing urgency consumers and avoids touching their history. Use typed parameterized Prisma raw queries for the additive read tables if necessary to avoid generating a client into shared junctioned `node_modules`. The integration owner alone owns schema/migration changes. Match existing parent foreign-key cascade and append-only UPDATE/DELETE/TRUNCATE guards, indexes, server timestamp and actor snapshots. Raw SQL must remain fixed-template/parameterized, never client-built identifiers.

Project reading from the ordered union of explicit reading receipts and existing urgency receipts; project urgency from existing urgency acknowledgements only. Reuse the same subject advisory lock for both purposes. If read happens first, urgency remains active and a later explicit taking-charge request must succeed. If taking charge happens first, reading is already proved and a later read can be idempotent. If two readers race, one shared first reader wins. Neither action updates note text, priority or stored status.

An alternative `purpose` discriminator on existing tables is possible but has greater regression surface: unique `(subject,operator,purpose)`, purpose-filtered urgency projections and **every** urgency SQL consumer, conservative legacy default, migration/trigger compatibility and isolated client generation are all required. Do not add a purpose field only to the HTTP response or filter only `urgencyView` while leaving SQL summaries coupled.

### Navigation and interaction

- Sidebar entry explicitly initializes **Non confermate**; route/direct reload should have the same useful default, not depend on previous patient selection.
- Provide an explicit **Per paziente** escape without losing personal drafts or patient selection. Existing `ConsegneEntry`/session-key pattern can carry a distinct queue mode; do not conflate it with the existing legacy Consegna feed.
- Preserve explicit dashboard urgency entry (`openConsegneAperte` / `openConsegneFeed`) and its urgency/focus target. If the workspace regains that feed mode, update source guards deliberately rather than weakening assertions unrelated to this issue.
- Queue displays identity, full facility date, visible priority and **separate** reading and urgency state text. Color is supplemental. Author rows explain that a colleague must confirm.
- Use explicit `Letto`/`Conferma lettura` for read-only receipts and a separate clinical `Prendi in carico`/existing urgency action. Successful read of an urgent row removes it from unread queue while clinical urgency remains visibly active in the patient diary/overview; this is expected, not a contradiction.
- On a validated durable receipt, refresh queue and exact patient/badge counts through `DIARY_READING_CHANGED_EVENT`; only genuine urgency state changes dispatch `URGENCY_ACKNOWLEDGED_EVENT`. Do not fabricate success or decrement before validating server receipt. Preserve row/error on failed writes and provide exact retry.
- Pending requests must be fenced by session, view/filter and sequence. Switching patient/mode/session while a read is inflight must not apply its list/count to a newer view. Abort/retry/load-more must retain coherent current rows and no duplicate ids.
- After removing a confirmed row, keep focus on the next useful action/heading and announce outcome/count; avoid falling to document body. Opening an item is read-only, never auto-POST.

## Authorization and privacy envelope

- Default resident scope is facility-wide for clinical identities (#389); restricted `registered_by_me` remains supported. Derive reach using `patientScopeWhere`, not a hard-coded “admin means all” test or the current roster's loaded ids.
- Consegna additionally obeys `readsAllConsegne`: in restricted mode author/assignee visibility still applies even if the resident is reachable. Apply identical rules to count, rows, summaries and acknowledgement.
- New diary queue read capability is `diary.list`; no new grants or role expansion. Baseline admin lacks this capability (existing count test expects 403), despite resident facility reach. The generic older admin request must not silently widen this issue's grants.
- Consegna read-confirm still uses its existing capability route and subject visibility; custom policy may permit diary viewing without handover ack. UI must respect both capabilities without manufacturing an actionable confirmation for a forbidden source.
- Maintain anonymous 401, denied role 403, out-of-scope/missing subject indistinguishable 404. Author attempt 409, invalid purpose 400, no write on all denied paths. Never trust client role/name/time.
- Private no-store on new clinical reads; no PHI in URLs/logs/audit/screenshots. Fixtures/evidence synthetic only. No auth/demo bypass, CORS/env/dependency edits or real-patient QA writes.

## Suggested scoped paths

Backend: `patients/diary-reading.ts` shared predicates/count, new queue query/service and read-receipt service, `patients/diary-ack-service.ts`, `consegne/ack-service.ts`, `routes/patient-diary.ts`, capability registry; additive schema/migration and their focused tests only if persistence separation is implemented.

Frontend: `App.tsx` entry wiring, `ConsegneWorkspace`, new small unread queue/hook/client boundary, navigation mode types, roster summary integration and patient count rendering, `diaryReading.ts` event/receipt validation; diary receipt/urgency controls only as needed to keep real clinical taking-charge available independently. Reuse existing identity/timestamp/design-system controls; no global redesign or mailbox Notes changes.

Existing baseline source guards in `consegneGiroUi.test.ts` intentionally assert ignored feed/summary; revise only obsolete expectations tied to the accepted new behavior, retaining draft, identity, save/advance and route fencing protections.

## Required proof / tricky cases

1. Real local PostgreSQL + actual backend HTTP authz: >50 mixed diary/handover notes, overlapping patient/source ids and timestamps, completed-but-unread notes, exact total and complete cursor traversal without omission/duplication. GET writes no receipts.
2. Default/nondefault resident scope, author/assignee visibility, missing/crossed patient/source id, anonymous/admin-denied/custom-capability cases. Match badge queue and per-patient counts exactly.
3. Both sources: read normal/important/urgent, read-first then take-charge, take-charge-first then read, two readers racing, read-vs-take racing, retry/idempotence, immutable note history, authoritative identity/time, legacy own-name whitespace receipts and historical urgency receipts.
4. Additive migration applied to an existing database fixture, append-only guards/cascade, no historical row rewriting. Verify real persistence after reload; transport fixtures are supplemental and cannot certify DB behavior.
5. Browser real SPA: badge count 50+ opens selected Non confermate with no patient/date restriction; pages are consultable to exhaustion; visible date/priority/state/identity and textual per-patient counts; reader confirmation removes one row and updates exact counts, urgent row remains clinically active; author/error/retry paths; Per paziente escape/back and drafts survive; grayscale and narrow viewport keyboard/focus.
6. Delayed old filter response, session change, switch A→B→A, load-more double-click, cross-filter cursor, count/summary unavailable and empty queue. No false zero/success, stale responses or duplicate rows. Clinical writes occur only in isolated synthetic backend tests, not production.
7. Root types/build/focused/regression/security, fresh independent QA and root rerun pinned to frozen application input; immutable synthetic screenshots/trace/video/log hashes. Both frontend and backend deployment plus migrated-schema health must be verified before closure if changed.

Status: **REVIEW ONLY — IMPLEMENTATION/QA NOT CERTIFIED**. No criterion marked passed by this review.
