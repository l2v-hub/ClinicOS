Independent review of the sealed backend and PS author sources found no confirmed production-source defect in the assigned scope. Static and pure verification passed. Actual PostgreSQL, HTTP, browser, and final integrated clinical acceptance remain UNRUN; this result does not approve publication or integration.

Binding and preservation
- Reservation nonce a1bd36a6-aec1-4881-943d-5a54b86db32f, reserved before this review; canonical state 557ed044756b73c3395fcef86d3935055c4ba4f9.
- Backend seal SHA256 1d86672f12d5eac6b765b3c392190d10c11b057941ce5c70ff087082db0c4555: all 30 sealed author proof files and all 15 declared source files match.
- PS seal SHA256 1c6d5a0fe5100fbd52521cd082078539803ee4016e5668481b55671a6d9476f5: all 21 sealed author proof files and all 5 declared source files match.
- Before/after freezes match for backend source1510 files, PS source1509 files, both isolated Git indexes, and complete backend31/PS22 original author proof files. Active UI/integration/root proof groups were excluded.
- No source, index, ref, canonical, GitHub, dependency, provider, or shared-module mutation. No DB/server/browser/HTTP/network runtime started.

Fresh verification
- 10 targeted backend tests PASS; backend production source types PASS.
- 47 targeted PS tests PASS; frontend source types PASS.
- Four new private backend adversarial tests PASS, importing the actual modules. These cover first-matching duplicate id, malformed pointer/history, truthy/falsy returnedAt JSON values, invalid matched-history dates, guard forgery/shape erasure, narrow conflict mapping, and actual parameters/voice/saveCartella call lock order and preservation of 12000-character unrelated clinical text.
- Two new private PS adversarial tests PASS: worst-case two-page feeds plus three PRN spring-DST days require exactly11 GETs with maximum3 in flight; denied sources make no data calls and a403 body/cross-patient corrupt row remains unverifiable and absent from returned clinical data.
- All commands use trusted createRunner with envMode verification, PATH-only parent environment, private runtimeRoot and existing linked dependencies. Total63 tests PASS.
- One redundant frontend-types invocation encountered EEXIST while writing its immutable receipt. The original frontend-types PASS receipt is retained unchanged. duplicate-types-runner-failure.json preserves this orchestration failure; the second check is not counted as additional evidence.

F10
- Patient real row-version UPDATE remains unchanged. Receipt-first scheduled/PRN paths, prior parent483 logic, and isConcurrentWriteConflict's exact P2010+TransactionWriteConflict+(40001 or40P01) classification are retained.
- All explicit RepeatableRead+lockPatient readers were inventoried: history and attestation pages now use assessmentReadTransaction (whole read retries, maximum3); intake patient-review retains its previous maximum3 retry. Other assessment lockPatient consumers (catalog/current/get/service writes) use default ReadCommitted. Other RepeatableRead consumers do not take the scoped Patient SHARE lock.
- Assistant mapper reuses the narrow helper; unrelated P2010 errors stay internal. Fresh tests and private error-kind matrix pass. Actual PostgreSQL retry timing and adapter metadata remain UNRUN.

F11
- Enumerated every production Cartella full-blob writer. saveCartella, parameters, voice vital, import existing-patient, temporary departure/return, and demo setup all acquire Patient first then Cartella FOR UPDATE in the same transaction. New-patient import creates its Patient within the transaction. The fiscal-code removal UPDATE first updates/locks Patient and updates Cartella in place, without stale full-blob replacement.
- Parameters/voice preserve the existing whole chart, add their own fields and invoke preserveTemporaryPsExits. Private tests execute those real functions with transaction spies and assert lock order, full unrelated text and active/history equality. Import retains preexisting job→draft→Patient→Cartella order; preserveTemporaryPsExits runs on incoming data before merge and on merged output. No new nested transaction was introduced.
- Managed-history/active-pointer forgeries, explicit erase and managed-row changes reject. Omitted state/history is preserved. Real concurrent lock behavior and actual import transaction forgery rejection remain UNRUN.

F12
- Multi-patient slot building computes temporaryPsExitReadState per chart; only the corrupt patient gets temporaryPsExit:null plus temporaryPsExitUnverified:true. It does not synthesize a valid exit. Administration writers retain strict currentTemporaryPsExit and reject unverifiable state; valid continue state remains allowed and pause denies. PRN GET catches TemporaryPsExitError and returns its status/code.
- Due-attention SQL uses the shared strict-policy predicate: missing/null pointer allows, otherwise only verified continue is allowed; JSON history expansion is guarded, first matching duplicate id is enforced, and returnedAt uses the JSON equivalent of JS falsiness. Independently reviewed against the strict reader and private behavioral edge cases. Actual SQL execution/parity is UNRUN, never inferred from a source-regex test.
- Prepared root-runtime-sql-parity-cases.UNRUN.json with50 actual JSON fixtures, including matching-history dates, all returnedAt types and duplicate orders. Root must compare actual PostgreSQL predicate output against the actual strict reader for each before runtime acceptance.

F17
- Successful/replayed depart and return record distinct temporary_ps_exit.depart/return operational audit actions with actor, role and safe field/decision metadata. Reason, actor name and unrelated clinical text are not sent to this new audit call; existing audit persistence remains best effort.
- Before chart writes, depart rejects actual chart statoRicovero dimesso and legacy literal archiviato. The preceding Patient version write is in the same transaction and rolls back on refusal. No invented database archive field. Pure tests check both statuses, chart-write avoidance and audit contents. Actual durable audit/rollback remain UNRUN.

PS F2 and F8
- Loader uses existing backend query contracts: readings descending measuredAt/id with two pages50; diary supported civil from/to window with two pages100; scheduled administrations two pages100 ordered by scheduled date/creation (not falsely filtered by confirmedAt); active therapies two pages100 with consistent summary; PRN all facility civil days intersecting24h, cap200 explicitly partial. No invented filters.
- Three workers, per-source8s abortable deadline, independent progress; two pages per paged source. Max10 GETs normally and11 over spring DST. Capability-denied sources are skipped. Errors, corrupt rows and unauthorized sources become unverifiable; capped/truncated feeds stay partial. Printable notices explicitly identify manual completion; unknown doses/therapies are not presented as verified absence. Print depends only on nonblank reason and never registers an exit.
- Full12000-character field/event/print behavior passes; textarea has no maxLength or slicing. Visible correct2000 limit and existing handler/button guards apply to new registration only; print stays enabled. Exact base/current function byte parity confirms psExitRequestForRetry, verifyPsExitReceipt, recordExitDecision unchanged. Source changes do not alter existing registration capability, confirmation, receipt or uncertain retry conditions.
- Existing PRN-cap/malformed test changed legitimately from rejecting entire context to section-level unknown with independently verified therapies; original registration/identity/receipt assertions remain. Several inherited layout/source-text contract tests remain and are not credited as SQL/browser behavior.

Written PostgreSQL harness review (UNRUN)
- qa497-Claude1-concurrency.mjs guards local owned clinicos_qa_* DB and local base URL, does not provision services. The F10 dose is held after the actual Patient version write; real Patient lock waiters are observed before release, rather than relying on fixed sleep. F11 parent barriers queue actual depart/parameters and return/voice operations on the same Patient lock. Failure cleanup releases gates/rolls back clients and settles pending operations.
- HTTP read paths match actual /patients/:id/assessments, attestations, /therapy-slots/page and /therapy-slots/prn routes. Mixed patients and typed409 are asserted; valid patient's dose is then actually recorded. Import uses real confirmJob with chart-before/after equality. Audit checks persisted distinct actions plus actor/role and no reason text.
- Root runtime preconditions/coverage: headers require demo auth with role simulator disabled, or adapt authentication in a root-owned runner. The harness currently checks induced error maps409 but should additionally assert actual adapter originalCode40001. Its invalid-date fixture has empty history and therefore does not independently exercise date validation; use the prepared matched-history50-case matrix. Add actual legacy archiviato refusal and explicit registration capability/confirmation refusals to root's owned runtime checks. These are runtime acceptance notes, not a claim of production defects or test execution.

STOP. Root remains sole publisher and runtime owner. No confirmed actionable source finding; no fixes authored. Runtime claims remain UNRUN and broader UI/integration was not reviewed or frozen.
