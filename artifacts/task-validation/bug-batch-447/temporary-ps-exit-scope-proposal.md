# Proposed exact scope amendment — approved clinical decisions

Status: proposal only. No backend/type/App/queue edits are authorized or made by this proposal.

Read clinical-decisions-2026-10-17.md. The real pre-clinical subset passed seven scenarios with immutable source/harness fingerprint eb257755c74d9776fb057d400e4df92e4236acccef42f2156c643da23b0e9914. Both product decisions are now answered; their implementation remains required.

## Existing behavior inspected

- Temporary exits are JSON `liberatoria.usciteLog` records. DimissioneTab appends/deletes them through a generic full-record cartella update. There is no current authoritative temporary administration hold or verified return action.
- PUT /patients/:id/cartella already enforces clinical_record.save plus patient scope. Nurse and doctor can save; OSS cannot. Supervisor's existing denial remains unchanged.
- saveCartella locks Patient and Cartella rows and protects selected read-only legacy histories. It currently does not protect managed exit/hold metadata.
- Scheduled writes share administration-record.ts; PRN has a shared authoritative, idempotent writer. Both must honor the same persisted hold, including tool/API channels.
- Giro reads bounded slots; pending-work attention uses due-therapy-query.ts. Existing completed records/history must remain visible, and a hold must not merely hide controls in the browser.
- App's serial full-record write queue currently accepts only a boolean persist result. A verified command needs a serialized, server-confirmed snapshot result so later unrelated clinical updates cannot overwrite the exit or display optimistic success.

## Minimal persisted design — no schema migration, no new permission

Use the existing authorized PUT cartella route with an explicit, strictly validated `temporaryPsExit` command mode, mutually exclusive with generic `data`. The command reads and changes the latest chart under the existing patient/record locks. It appends exactly one server-managed uscitelog entry plus one small server-managed active-exit pointer under liberatoria. Actor identity and facility timestamp come from the authenticated session/server. A chart without a legal liberatoria can still receive an exit log: do not invent signed consent, legal declarations or a completed legal form merely because the log branch exists. Preserve existing legal fields; normalize incomplete legacy/exit-only forms only for safe display. A requestId replays only the identical actor/patient/action/body; concurrent new departures cannot produce two active exits.

The operator must explicitly choose `pause` or `continue`, then confirm registration. Opening/printing has no mutation. Pause changes neither prescription status nor dose history; it authoritatively refuses new scheduled/PRN administration while active. Existing given-dose protections and PRN replay semantics remain unchanged. Bounded slot/PRN reads expose the actual hold, with disabled actions and a clear reason. Due/overdue attention omits temporarily held work; prescription context and already-recorded doses remain available.

Return is a separate explicit authorized action: record server time/actor and close the active pointer atomically. The button states that the administration round resumes. Existing administered doses remain immutable and cannot re-open; remaining missed/pending doses require normal operator review, with the exit interval retained in the history. No automatic invented administration/non-administration records and no permanent prescription suspension are introduced.

Generic chart writes preserve the managed state/history and reject explicit tampering. Existing manual legacy exit records remain usable; the existing table shows managed PS decisions/return date and does not offer deletion of protected entries.

## Exact additional files requested

Backend implementation:
- backend/src/patients/temporary-ps-exits.ts (new shared command validation, atomic persistence, protected projection and scoped hold readers)
- backend/src/patients/cartella-update.ts (preserve server-managed exit projection/history)
- backend/src/routes/patients.ts (command branch on existing authorized PUT; existing response/error contract)
- backend/src/therapies/administration-record.ts (authoritative scheduled hold enforcement; keep already-given invariant)
- backend/src/therapies/prn-administration.ts (authoritative PRN hold after valid replay; no duplicate dose)
- backend/src/therapies/therapy-slots.ts (bounded patient hold metadata; preserve exact totals and recorded-dose visibility)
- backend/src/therapies/due-therapy-query.ts (exclude active paused work from due attention without altering history)
- backend/src/routes/therapy.ts (existing PRN read adds scoped hold metadata)

Backend verification:
- backend/src/patients/__tests__/temporary-ps-exits.test.ts (new strict input, projection/tamper, civil-time/idempotency cases)
- backend/src/patients/__tests__/temporary-ps-exits-db.test.ts (new real DB/HTTP role, concurrency, uncertain retry, scheduled/PRN/patient scope, return/no-double-dose cases)

Frontend integration and verification:
- frontend/src/types.ts (optional typed managed exit/hold fields; legacy exit shape preserved)
- frontend/src/lib/temporaryPsExit.ts (new typed existing-route command client and update event)
- frontend/src/lib/therapySlotPage.ts (validate optional authoritative hold metadata rather than discarding it)
- frontend/src/lib/__tests__/therapySlotPage.test.ts (malformed/foreign/missing metadata negatives)
- frontend/src/components/operator/cartella/TherapyDrugDosePanel.tsx (PRN controls reflect authoritative pause)
- frontend/src/components/operator/cartella/DimissioneTab.tsx (show actual PS decision/return and prevent deletion of managed entries)
- frontend/src/App.tsx (pass verified serialized exit command handler to patient workspace; session/patient isolation)
- frontend/src/lib/cartellaWriteQueue.ts (minimal serialized mutation accepting confirmed snapshot; preserve normal enqueue behavior)
- frontend/src/lib/__tests__/cartellaWriteQueue.test.ts (verified exit followed by unrelated queued update, failure/session isolation)

Existing66 files already cover InvioPSModal, PatientDetail/PatientToday, TherapyGiroRows, therapy form, relevant model/print tests, supervisor refresh and both E2E harnesses. These are reused. The #453 warning/acknowledgement stays in already authorized frontend files. No auth capability catalog, baseline, schema/migration, deployment or unrelated domain change is proposed.

## Integration and QA order

Integrate stable batch432 before touching its shared writers/slot query and preserve all new patientId/scope/exact-dose negatives. Integrate batch450 and new main infrastructure in the root-approved sequence; reconcile PatientList presentation without changing draft lifecycle. Root must approve/freeze this exact amendment before any additional file is edited. The implementation round remains1/4.

Real synthetic E2E must separately verify: allergy warning scoped to patient/product/current allergies, invalidation on switch/change/reload and unchanged prescription payload; ordinary known-negative prescription remains ≤5 interactions; both explicit exit decisions; print-only zero writes; one persisted exit after uncertain response and double click; unauthorized/no-scope/tamper failure; actual scheduled and PRN API hold; relevant attention/controls after reload; explicit next-day return and no reopening of already-given doses; source fingerprints, PNG/trace/video and final independent QA.
