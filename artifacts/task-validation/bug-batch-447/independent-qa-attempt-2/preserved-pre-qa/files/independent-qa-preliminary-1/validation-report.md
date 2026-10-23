# Independent preliminary QA — batch447 candidate1

Reviewer: dedicated `/root/ux_447_qa`, independent of implementation and coordination.
Date: 2026-10-17. Worktree: `agent-team/.worktrees/bug-batch-447`.
Baseline: `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`.

This is a source-review rejection of the current development candidate, not certification
of a stable final revision. Root explicitly restricted this session to contract and source
review until ROOT STABLE GO. No test, build, browser, database or production operation ran.

## Contract

Read all current GitHub issue bodies and comments for #447, #451, #452, #453, #454, #456,
#457, the four frozen packet documents, and the recorded clinical decisions.
The user approved confirmable allergy warnings without automatic prohibition (#453), and
an explicit authorized operator decision on therapy during temporary PS exit (#457).
Those decisions remove the essential product questions; implementation/proof remain required.

## Certain findings

1. **P1 — An empty appointment agenda hides actual therapy doses and their actions.**
   `frontend/src/components/operator/OperatorAgenda.tsx:452` gates the entire daily
   `.agt-day-wrap` behind `todayApts.length > 0`. The same block contains the only
   `TherapySlotCard` rendering at lines474 and570, including out-of-hours therapy slots.
   With no appointments and a real pending therapy slot, the new UI renders neither the
   dose nor its action. The previous implementation rendered those slots. The #452
   requirement is to remove empty grids while preserving positive clinical data, not
   remove occupied therapy slots. Retain a compact occupied-therapy presentation when
   appointments are absent; test ordinary and out-of-hours doses, modal action and reload.

2. **P1 — NEWS2 visibility treats a paginated prefix and individual fetch failure as
   proof that known scores are absent.**
   `frontend/src/components/operator/PatientRoster.tsx:294` uses `Promise.all` over all
   patients. At lines296–302 it requests only the first page, then tests for a complete
   NEWS2 observation without checking `hasMore`/`nextCursor`. The shared client defaults
   to 50 readings (`frontend/src/lib/patientParameterReadings.ts:195`). A patient with
   50 newer partial observations and an older complete observation loses the chip and
   potentially the entire NEWS2 column despite unknown completeness. The normal existing
   `News2Chip` supports loading older pages, but the new roster guard prevents it mounting.
   Also, one patient's rejected fetch clears `ids` for every patient at lines313–315,
   hiding other successfully available complete scores. Both contradict #452's retained
   real values and explicit partial/error state. Establish completeness per patient or
   retain an explicit unknown/partial indicator; retain successful patients when another
   source fails. Exercise 50+1 readings, one-of-two patient failure, and recovery.

3. **P1 — Existing browser trace packets contain signed bearer credentials.**
   `e2e/qa-bug-batch-447-browser.mjs:523` stops tracing directly into the publishable
   evidence ZIP; the touch-specific branch does the same at line1105. There is no
   token sanitization between network capture and output. A read-only ZIP scan of
   existing development evidence found `Bearer sim.*` values in `trace.network`
   and in several `trace.trace` entries. Only occurrence counts were output:
   issue447105, role-negative22, issue45170+2, touch15, issue452198,
   issue45383, issue45457+2, issue45663, issue45745+2.
   These are synthetic local simulator sessions, not production patient credentials,
   but the packet must still not publish signed authorization tokens. Redact only the
   exact tokens issued during this run, including response/resource bytes, preserving
   trace JSON/schema, screenshots and synthetic clinical assertions. Validate ZIP
   readability and zero signed bearer residue before publication. Treat current raw
   development packets as private, unpublishable artifacts.

## Full preliminary scope review

All66 approved scope paths were inventoried and hashed. The current diff contains
44modified tracked files,15new source/harness files and7unchanged approved files;
no source change escapes the approved scope. The original4 frozen packet hashes
and all5 amendment hashes match their recorded values. Complete per-file SHA256
snapshot: `qa447-preliminary-1-source.json` beside this report.

The full current changed source/test/CSS diff and all new helper/component/harness
files were reviewed. This includes451 daily-zero-only selection, saved-summary
protection, cursor traversal and failure/uncertain write behavior;453 preset/manual
payload equivalence, fraction preservation, civil duration and payload-derived
sentence;447 current-patient/day reads, role boundaries and header geometry oracles;
454 current-band selection and existing explicit calendar navigation;456 authoritative
urgency queue, source-specific targets, shift schedules and occupancy uncertainty;
457 patient-bound source collection, actual versus prescribed administration times,
24-hour context, unknown allergies and print-side-effect boundary. No additional
source-certain correctness rejection was identified in these inspected paths.
This statement is not a runtime pass or endorsement of still-missing policy code.

The development browser fixture already creates51partial observations after an older
complete observation, but its452scenario checks only removal of missing-data prose,
not retention/discovery of that patient's known NEWS2 score. It must gain a positive
score assertion and partial-source recovery scenarios, not merely rerun unchanged.
The existing empty-agenda assertion likewise checks disappearance of the entire grid
without asserting retention of the seeded real therapy slots; add the positive oracle.

No453warning or457exit/pause implementation was present in the reviewed source;
their user decisions are recorded, and required future backend scope is not approved
by this report. `therapyPages.test.ts` remains unchanged/deferred until432 integration,
as required by amendment4. Serial450PatientList integration is also still mandatory.

## Source identity at review

| File | SHA256 |
|---|---|
| OperatorAgenda.tsx | bdcd888be5f1abad410b8c0deffb10269d6f5c6b5c1da14da67d86f1c74f19cd |
| PatientRoster.tsx | e159daabcba59be49114c2e6cc1acf9db256d90bfb9ee6adae7be0d2104ad3e9 |
| patientParameterReadings.ts | a636b9be45ac56d9083a417f679f6136d08662647d16da2b4e7931842398c2d3 |
| News2Chip.tsx | ee6afe7a38c4571f30637bc26a253df8d507467f8e777a49fa2a08a091cf57e0 |

## Phase status

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | READ | Seven issue bodies/comments and frozen packet + decisions |
| 1 Diff review | FAIL | Full current66-path source review; two clinical UI regressions above |
| 2 Build/tests | NOT RUN | Root held runtime checks until stable handoff |
| 3 Playwright | NOT RUN | No independent browser evidence claimed |
| 4 Security | BLOCKED, partial audit | Signed simulator bearers in existing trace ZIPs; final policies/integration audit pending |

**BLOCKED** by trace credential publication, with **FAILED VALIDATION** of the current
clinical UI candidate. Root must reserve the next implementation cycle before correction.
Final QA must re-read final approved scope and source hashes, integrate dependencies432/450,
review the new medical-policy implementation, and independently complete every mandatory phase.
