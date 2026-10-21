<!-- clinicos-review-handoff:v1 -->
{
  "kind": "report",
  "actor": "l2v-hub",
  "pr": 497,
  "subject_sha": "17a127c432f39e094f2746dc33c38bcb234ce719",
  "request_id": "670c5248-7b3a-4881-8418-b06998ba0d81",
  "claim_id": "9387a7cb-f302-4f3d-9d9a-e438a4386ecf",
  "round": 1,
  "report": {
    "subject_sha": "17a127c432f39e094f2746dc33c38bcb234ce719",
    "verdict": "changes-requested",
    "summary": "Round 1 (read-only), batch bug-batch-447 (#447 #451 #452 #453 #454 #456 #457 #486). Scope: the 130 code files that differ from both the base 05fd62363 and the approved parent #483 (4983de2bd); #483 itself was not re-reviewed. Findings: 2 high, 10 medium, 6 low. No migrations. CI green on 17a127c43.\n\nFRONTEND (97 files): Scope: the 97 frontend/e2e files at 17a127c43 compared with #483 head 4983de2bd. Every frontend file in scope is byte-identical between the evidence sources (QA4 8a27ef3 for 447-457 and QA5 b76eb6b for 486) and 17a127c43. Only e2e/import-happy-path.mjs changed after them. Per issue: #447 is mostly met. The chart header now carries the allergy and risk chips, the first tab is 'Oggi' (PatientToday) with today's doses, urgencies and a one-line vitals summary, the anomaly banner moved to per-drug badges in Terapia, and empty diagnosis, allergy and anamnesis sections take one row. Risk: PatientToday remounts its dose rows on every window focus. #451 is met: placeholders show the previous value with its age, NEWS2 fits on one line, the pad appears only on coarse-pointer devices, there are O2 buttons, and the round auto-advances. Bug: the next-patient search wraps back to earlier loaded patients before it loads later pages. #452 is met: the bed comes first, the Regime and NEWS2 columns hide when empty, missing-data text is gone from rows, the empty agenda hides the grid and the filters, and there is one incomplete-demographics disclosure. Risks: (a) when CF and bed are both missing, the visible identity disambiguator is removed and the DOB is only in sr-only text, and this hits the Giro administration rows; (b) a signal check that failed now renders exactly like a clean row; (c) the roster now loads each patient's NEWS2 history, one patient at a time, with no limit on concurrency. #453 is met: quick schedules, 7-day and no-end durations, status hidden on creation, a sentence summary from formToPayload, prefill of a single unambiguous strength, an explicit allergy acknowledgement re-read before POST, and the creation requestId is still reused via createKey.for(payload). #454 is met: the operatore role enters on the Giro with band selection matching the backend FASCE_RANGES, one row of controls plus a 'Data, vista e ordine' disclosure, the allergy details no longer repeat names, and the day grid scrolls to the first dose. #456 is met: 'Richiede attenzione' shows the same takeChargeRows queue as the Consegne badge and 'Ho capito', today-only doses, on-duty staff from real schedules, and one occupancy row. #457 is met functionally: the reason is prefilled, last vitals with time, doses from the last 24 h, contact, explicit pause/continue with a verified receipt, retry with the same requestId, and pause enforced in Giro, PRN and the slot modal. Risks: print is fully blocked by any source failure or a missing capability, it loads full multi-year histories, and the clinical reason has maxLength. #486: the route is now empty by default and required. This deliberately departs from the issue text, which asked for a form-based default, and follows an owner/Codex comment. Owner sign-off should be explicit before closure. App.tsx: the new updateTemporaryPsExit and the confirmed-snapshot installs are guarded by session epoch and serialized via CartellaWriteQueue.enqueueMutation; the backend preserves PS exit fields on full PUTs. CSP 'wasm-unsafe-eval' comes from the pdf.js work of the intake parent and is acceptable. E2E: the harnesses guard the DB name (clinicos_qa_), assert persisted DB/API values and reload, and are evidence-only. However, three of them are near-identical forks of about 2,700 lines. Evidence binding: frontend parity with the tested sources is confirmed. However, backend administration-record.ts changed after QA4 (f394e3a7), so the #454/#457 administration UI evidence predates the current backend. The packet itself also states that the #453 trace exceeds the current verifier limit. I did not run any tests; this is a static review.\n\nBACKEND (33 files): Scope: the 33 files that #497 adds on top of approved parent #483 (4983de2bd..17a127c43). No Prisma schema or migration change. #486: validateTherapyCreateInput now requires an explicit non-blank viaSomministrazione (therapy-create.ts:134) and createTherapyInTx no longer defaults to 'orale'. All create channels go through it: POST therapies, the assistant tool (schema now requires the route), intake/AI import pre-validation (validateConfirmTherapies runs before any write) and diary-with-therapy. The legacy diary replay path (prepareDiaryTherapyReplayInput) only allows a missing route to match an existing same-patient/requestId pair, and the strict validator rejects any new write. The skills engine only binds doseMode 'fixed'. This matches the owner decision on #486 (no form-to-route table, no implicit oral). Legacy display/PRN fallbacks to 'orale' remain for old rows only. #457 (temporary ER exit): a new command mode on the existing PUT /patients/:id/cartella, gated by clinical_record.save plus requirePatientScope. Strict parser, server actor/time (facilityClock, Europe/Rome), a requestId+hash replay per actor, and one active exit at a time. Return is explicit and stores returnedAt and actor. Generic saveCartella preserves the managed state and rejects tampering. Scheduled-confirm and PRN writers take the same Patient row-version lock (serializeTemporaryPsPatient) and refuse during 'pause'. Not-administered records stay allowed. Due attention omits paused work. Slot and PRN reads expose the hold. Bed and occupancy are deliberately untouched (temporary exit), and the prescription is not changed. The 'already given' invariant and the #460 requestId receipts are kept: the receipt lookup still comes first and retry now covers P2010/40001 as well as P2034. PRN replay now re-checks patient scope. Facility-day fixes: occupancy, admin-rooms and patient-room-options now use facilityDate() instead of the UTC slice, which is correct across midnight and DST. Intake patient-review gains a bounded retry for the new row-version conflicts. Gaps found: (1) the new Patient row-version write also breaks other RepeatableRead readers that lock the patient, and only patient-review was fixed; (2) the managed exit state lives in a JSON blob that other cartella writers (parameters, voice, AI-import merge) rewrite without the Patient lock or the preserve/tamper guard, so the pause can be lost or forged; (3) a single malformed exit state makes the whole Giro slot page fail. Evidence binding: backend sources at 17a127c43 are byte-identical to f394e3a7 (git diff empty for backend/ and scripts/e2e). Independent QA11 at f394e3a7 reports 51 backend PASS (30 pure, 19 HTTP/PostgreSQL, 2 temporary-PS DB, including the lock interleavings). The per-issue UI recordings come from QA4 source 8a27ef37 and QA5 b76eb6ba. Both predate f394e3a7, which changed administration-record.ts serialization, so the UI proofs are not bound to the backend under review. Packet 12 itself declares PARTIAL. I ran no tests.",
    "findings": [
      {
        "severity": "high",
        "file": "frontend/src/components/operator/TherapyGiroRows.tsx",
        "line": 200,
        "problem": "Giro patient header (the medication administration surface) now shows only the room when assigned and the CF when present. A patient with no bed and no CF is shown by name only, and the DOB or UUID moved to ds-sr-only, rendering the raw ISO date. Two same-name patients become visually indistinguishable at the point of administration. PatientIdentity compact applies the same reduction to the Pazienti roster and ConsegnePatientRoster (age only).",
        "requested_change": "Keep one visible secondary identifier whenever CF and bed are both absent, e.g. the formatted 'Nato/a il dd/mm/yyyy' via formatBirthDate. Issue #452 removes missing-data prose, not identity. Format the sr-only DOB as well.",
        "test_expectation": "Render test with two patients sharing first and last name, no CF and no bed, distinct DOBs: the visible (non-sr-only) text of each giro-patient__head differs, and the DOB is formatted dd/mm/yyyy."
      },
      {
        "severity": "high",
        "file": "frontend/src/components/operator/InvioPSModal.tsx",
        "line": 148,
        "problem": "The emergency PS sheet cannot be printed unless all five capabilities are granted and every source loads completely. loadEmergencyTransferSources (emergencyTransferContext.ts:166) sequentially pages the full lifetime readings, diary and administration history (MAX_PAGES 1000 each) and rejects on any single malformed historic row or PRN day >=200. A long-stay resident means seconds to tens of seconds before print is enabled. One corrupt legacy row, or a role without e.g. administration.history_page, blocks the sheet entirely. Before this PR, printing was always available.",
        "requested_change": "Read only bounded windows (latest readings per field / last 24-48 h diary and administrations) through bounded queries. When a source fails or is not permitted, render that section as 'non verificabile, compilare a mano' and keep printing possible. Keep blocking only on the operator-entered reason.",
        "test_expectation": "Unit test: with one source rejecting, the model renders the failed section as unverifiable and the print button is enabled once a reason exists. Load test with 2,000 historical readings: print is enabled after a bounded number of requests."
      },
      {
        "severity": "medium",
        "file": "frontend/src/lib/parameterRound.ts",
        "line": 10,
        "problem": "nextParameterPatient orders the candidates as later loaded items followed by earlier loaded items (wrap-around). nextParameterPatientAcrossPages only loads further pages when no candidate exists in the loaded set. If an earlier patient on page 1 was skipped, saving the last patient of page 1 jumps back to that earlier patient instead of continuing to page 2. Ordering therefore depends on pagination, and the 25/25/1 evidence only covers the case where all prior patients were done.",
        "requested_change": "Search forward across loaded items, then remaining pages, and wrap to earlier items only when the roster is exhausted (nextCursor null). Alternatively pass a forward-only flag to the first nextParameterPatient call.",
        "test_expectation": "nextParameterPatientAcrossPages([skipped(0), saved(1)], 'saved', day, 'p2', page2=[later(0)]) returns 'later'. It returns 'skipped' only when no unfinished patient exists on later pages."
      },
      {
        "severity": "medium",
        "file": "frontend/src/components/operator/PatientToday.tsx",
        "line": 113,
        "problem": "Every window 'focus' bumps revision. The dose rows are keyed `${key}:${revision}:${time}` (line 180), so they remount, and TherapyDrugDosePanel.useExitRevision (TherapyDrugDosePanel.tsx:478) resets each panel to loading. Any in-progress 'Non somm.' reason/note or glucose value is silently discarded when the tablet regains focus, e.g. after a print dialog or app switch. Each focus also invalidates the ward /therapy-slots cache and refetches per panel.",
        "requested_change": "Refresh data on focus without changing the React keys or the loading key: keep the previous slots visible while revalidating, preserve local row state, and debounce focus refreshes. React only to TEMPORARY_PS_EXIT_CHANGED for the same patient.",
        "test_expectation": "Component test: open the 'Non somm.' reasons, type a note, dispatch window focus. The note and the expanded state persist and the slots are revalidated."
      },
      {
        "severity": "medium",
        "file": "frontend/src/components/operator/PatientRoster.tsx",
        "line": 54,
        "problem": "PatientSignals now returns null when there are no positive signals, even if the patient's summary is missing or the anomaly verification failed or is incomplete. PatientList shows a banner for summaryError, but there is no row-level or list-level indication for anomalie.fallito or verificaIncompleta. An unverified patient therefore looks identical to a verified clean one, which presents 'unknown' as 'absent'.",
        "requested_change": "Keep rows clean only when they are verified. Show one list-level status when anomaly verification failed or is partial, and a compact per-row 'da verificare' marker when that patient's summary is missing.",
        "test_expectation": "Render the roster with anomalie.fallito=true and an empty summaryMap: a status mentions that the verification is unavailable. With complete data and no signals, rows contain no marker."
      },
      {
        "severity": "medium",
        "file": "frontend/src/lib/news2History.ts",
        "line": 87,
        "problem": "loadRosterNews2 runs loadNews2History for every listed patient at once with unbounded Promise.allSettled. For each patient without a complete NEWS2 it walks the entire readings history. The list re-runs on every PARAMETER_READING_SAVED_EVENT (PatientRoster.tsx:299), and each visible LazyNews2 then loads the same history again. On a 50-100 patient ward this is a request burst that can hit the API rate limiter and slow the main list.",
        "requested_change": "Use a batched or server-side 'has complete NEWS2' read. Failing that, bound concurrency (e.g. 4) and pages per patient, and share or cache results with LazyNews2.",
        "test_expectation": "Unit test with 60 patient ids and a counting fetcher: at most N requests are in flight at once and the total stays below a stated bound. LazyNews2 reuses the roster result without a second fetch."
      },
      {
        "severity": "medium",
        "file": "frontend/src/components/operator/TherapyGiroRows.tsx",
        "line": 310,
        "problem": "During a PS pause, the disabled button visibly reads 'In pausa per uscita PS' but keeps aria-label 'Erogata: <patient · drug · dose>'. Screen readers announce 'Erogata' (administered) for a held dose, which is clinically misleading and fails WCAG 2.5.3 (label in name).",
        "requested_change": "Set the aria-label to e.g. 'Somministrazione in pausa per uscita PS: <target>'.",
        "test_expectation": "Render a paused patient: no element with an aria-label starting 'Erogata:' is disabled, and the pause label contains the visible text."
      },
      {
        "severity": "medium",
        "file": "frontend/src/components/operator/InvioPSModal.tsx",
        "line": 420,
        "problem": "The clinical 'Motivo dell'invio' textarea has maxLength={10000}, which silently truncates pasted clinical text. This contradicts the project rule 'never sanitize clinical input / no maxLength'. The 2000-character limit for registering the exit is enforced correctly by rejecting.",
        "requested_change": "Remove maxLength. Keep the explicit validation message and the disabled submit beyond the server limit.",
        "test_expectation": "Paste 12,000 characters: the textarea keeps the full value, print reflects it, and 'Registra uscita PS' is disabled with a visible length message."
      },
      {
        "severity": "medium",
        "file": "artifacts/task-validation/bug-batch-447/review-packet-12/README.md",
        "line": 5,
        "problem": "Evidence binding: the UI recordings come from 8a27ef3 (seven issues) and b76eb6b (#486). Frontend sources are identical to 17a127c43. However, backend/src/therapies/administration-record.ts changed afterwards (f394e3a7, legacy administration guard plus PS serialization). The #454/#457 Giro administration and PS-pause UI flows were therefore not re-run on the tested commit. Line 7 also states that the #453 trace fails the current evidence verifier size limit.",
        "requested_change": "Re-run the #454 and #457 browser scenarios (administration persistence, pause/return) on 17a127c43 or a later SHA and bind the receipts to it. Resolve the #453 trace-size gate before closure.",
        "test_expectation": "evidence-manifest entries for 454/457 reference source 17a127c43 or later, and the verifier passes for all eight issues."
      },
      {
        "severity": "medium",
        "file": "backend/src/patients/temporary-ps-exits.ts",
        "line": 98,
        "problem": "serializeTemporaryPsPatient runs a real row-version UPDATE on the Patient row for every scheduled confirm, not-administered record, PRN dose, ER exit and return. RepeatableRead transactions that take lockPatient (SELECT ... FOR SHARE) after their snapshot will now get SQLSTATE 40001 when a dose for the same patient commits concurrently. Before this change, dose writes never modified the Patient row, so this conflict could not happen. The PR adds a retry only to intake/patient-review.ts. assessments/history.ts:79-143 and assessments/attestations.ts:131-221 (both RepeatableRead + lockPatient) still have no retry and will intermittently return 500 while nurses record doses. The assistant error mapper (tools/errors.ts:110) maps only P2002/P2034 to a conflict, not P2010/40001.",
        "requested_change": "Either take a lock that does not create a new row version (e.g. SELECT ... FOR UPDATE of Patient, or a transaction advisory lock keyed by patient) and keep the row-version bump only where stale Serializable snapshots must fail, or add the same bounded isConcurrentWriteConflict retry to every RepeatableRead lockPatient reader. Also map P2010/40001 to a conflict in tools/errors.ts.",
        "test_expectation": "Real PostgreSQL interleaving test: an assessment history page read and an attestation page read, started while a dose confirm for the same patient holds the Patient row, both return 200 (after retry) and never 500. Assistant administration under induced 40001 returns a conflict, not an internal error."
      },
      {
        "severity": "medium",
        "file": "backend/src/patients/temporary-ps-exits.ts",
        "line": 199,
        "problem": "The authoritative pause and exit history live in Cartella.data.liberatoria. They are protected only against saveCartella (Patient FOR UPDATE + preserveTemporaryPsExits). Other full-blob read-modify-write writers do not take the Patient row lock and can overwrite them with a stale copy. parameters-update.ts:135 reads under an advisory lock only, ai/voice/write-services.ts:39-57 has no lock at all, and executeTemporaryPsExit reads the Cartella here without FOR UPDATE. In READ COMMITTED, if a parameters or voice save overlaps a departure or return, the last upsert wins. The registered exit, or the return, can silently disappear after the API has already answered 200, which lifts or re-imposes the therapy pause with no audit trail. The AI-import merge (ai/upload/confirm-service.ts:354, mergeCartella) does lock Patient. However, it deep-merges a client-supplied cartella.liberatoria without preserveTemporaryPsExits, so it can inject or alter temporaryPsExit or psExit rows and bypass the managed-state guard.",
        "requested_change": "Make every Cartella writer serialize on the same Patient lock and preserve the managed exit state (call preserveTemporaryPsExits, or strip liberatoria.temporaryPsExit and psExit rows from incoming data in parameters, voice and AI-import paths). In executeTemporaryPsExit, read the Cartella row with SELECT ... FOR UPDATE. Alternatively, move the active-exit pointer out of the free-form JSON.",
        "test_expectation": "DB interleaving tests: parameters save concurrent with depart, voice vital concurrent with return, and AI-import update containing liberatoria.temporaryPsExit or psExit rows. Expected: the exit and its history are intact after each one, the forged state is rejected or ignored, and the scheduled/PRN hold matches the persisted state."
      },
      {
        "severity": "medium",
        "file": "backend/src/therapies/therapy-slots.ts",
        "line": 397,
        "problem": "currentTemporaryPsExit throws TemporaryPsExitError (409) on any malformed or unverifiable exit state. It is evaluated for every patient in the slot page. One patient's inconsistent chart (reachable, for example, through the AI-import merge above, or legacy data with a dangling pointer) therefore makes the whole facility Giro and therapy slot page fail for all patients. GET /therapy/prn (routes/therapy.ts:261) also lets the error escape to the generic handler. Meanwhile due-therapy-query.ts:128 reads only the raw decision, so attention and Giro disagree.",
        "requested_change": "Do not let one patient's exit state fail a multi-patient read. Mark that patient as 'stato uscita PS da verificare' (fail closed for that patient's administrations only) and keep serving the others. Map TemporaryPsExitError in the PRN read to its status and code.",
        "test_expectation": "A slot page with one patient whose temporaryPsExit has no matching usciteLog row returns 200. The other patients' doses are listed and actionable, and the affected patient is flagged with administration refused. The PRN read for that patient returns the typed 409 code."
      },
      {
        "severity": "low",
        "file": "frontend/src/components/operator/TherapyPatientAllergies.tsx",
        "line": 90,
        "problem": "The documentation details now label entries 'Voce 1', 'Voce 2' instead of the allergen. A reader can no longer tell which allergen a documentation row (source and author) refers to without relying on matching order.",
        "requested_change": "Keep the allergen name as the row heading (remove only the duplicated summary sentence), or associate each row with its summary chip.",
        "test_expectation": "Render two allergies: each documentation row names its allergen once, and the summary is not repeated."
      },
      {
        "severity": "low",
        "file": "frontend/src/components/admin/AdminAttentionList.css",
        "line": 42,
        "problem": "New styles use tokens that do not exist (--medical-blue, --bg-subtle, --blue-bg). They fall back to non-brand colors (#2563eb vs brand --blue #2F6BED). There are also more hard-coded hex values (PatientRecordData.css topbar chips #fff2df/#805000/#fdecee/#a92235, ParameterReadingForm.css:77 #b36e11, an inline amber style in TerapiaFarmacologicaTab). This breaks the rule that design tokens live in App.css.",
        "requested_change": "Use the existing App.css tokens (--blue, --amber, --red, --bg, --border), or add any new token to App.css :root.",
        "test_expectation": "grep finds no var(--medical-blue|--bg-subtle|--blue-bg) and no new raw hex values in the changed CSS."
      },
      {
        "severity": "low",
        "file": "frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx",
        "line": 465,
        "problem": "If a window focus refresh increments allergySequence during the pre-save allergy re-read, handleSave returns without any message. The prescriber's Save click does nothing and gives no feedback.",
        "requested_change": "When the save is superseded, set saveError (e.g. 'Contesto allergie aggiornato: verifica e salva di nuovo') or ignore focus refreshes while saving.",
        "test_expectation": "Simulate focus during the pending readGiroAllergies in handleSave: a visible message appears and no POST is sent."
      },
      {
        "severity": "low",
        "file": "frontend/src/lib/__tests__/therapyEntry454.test.ts",
        "line": 92,
        "problem": "Several new or changed tests assert on App.tsx source text with regexes instead of behavior (also patientListIdentityGuard regex loosened from {0,120} to *?). These pass on refactors that break behavior and fail on harmless reformatting.",
        "requested_change": "Replace the source-regex assertions with behavioral tests of the exported helpers or rendered output, or limit them to documented contract guards.",
        "test_expectation": "The tests exercise facilityLocalDate defaults through rendered TherapyRoundsPage or App helpers and not through readFileSync(App.tsx)."
      },
      {
        "severity": "low",
        "file": "backend/src/routes/patients.ts",
        "line": 1227,
        "problem": "The ER exit/return command reuses PUT /patients/:id/cartella. The route gate audits it as a generic clinical_record.save, so the audit log cannot tell a therapy-pausing ER departure or return apart from an ordinary chart edit. There is also no check that the patient is currently admitted or not discharged before an exit is registered.",
        "requested_change": "Record a distinct audit action or outcome for the depart and return commands (field names and decision only, no PHI). Refuse a departure for discharged or archived patients.",
        "test_expectation": "After depart and return, the audit log contains distinguishable entries with actor and role. A departure on a discharged patient returns 409 and writes nothing."
      },
      {
        "severity": "low",
        "file": "artifacts/task-validation/bug-batch-447/review-packet-12/validation-report.md",
        "line": 5,
        "problem": "Evidence binding: backend sources at 17a127c43 are identical to f394e3a7, and the 51 independent backend tests ran on f394e3a7. The per-issue UI and E2E recordings for #447-#457 (QA4 source 8a27ef37) and #486 (QA5 b76eb6ba) predate f394e3a7, which changed the administration-record.ts serialization and conflict handling. So the clinical UI flows for #457 (pause, then dose refused, then return) and #486 are not proven on the backend under review. The packet itself says PARTIAL.",
        "requested_change": "Re-run at least the #457 exit/pause/return UI scenario and the #486 explicit-route scenario against the final 17a127c43 tree (or a tree with byte-identical backend/frontend sources), and record the source hash in the evidence index.",
        "test_expectation": "evidence-index lists tested source = 17a127c43 (or a proven identical tree) for #457 and #486, with PASS results."
      }
    ]
  }
}