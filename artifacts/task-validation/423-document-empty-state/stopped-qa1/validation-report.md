# Independent QA stopped handoff — issue 423

Verdict: FAILED VALIDATION

Candidate: d6539fbb68973f01e97e2b5578e2d053537fd962 (superseded; NOT READY FOR CODEX QA).
Baseline: 3cd984a5a40f1fe5cdc368dbcc4bb629bd6d1510.
QA owner: /root/bug423_independent_qa1; isolated checkout C:/w-423-qa1.

## Release-blocking independent finding

The candidate prevents permitted note-only/details edits on an existing attached file whenever documents.update_type is denied, even with clinical_record.save allowed. DocumentiTab.tsx lines 108 and 158 and ArchiveResultList.tsx line 114 require canClassify for opening the entire existing-file form. This is a preservation regression, not an acceptable permission tradeoff.

The unchanged IO boundary, frontend/src/lib/patientDocumentArchiveIO.ts line 287, invokes classification only when the stored document type actually differs from the submitted type. ArchiveDocumentForm.tsx line 95 already rejects actual category changes without canClassify; line 162 disables the stored-file type selector. These narrower guards preserve note-only edits without granting classification.

The root integration owner accepted this finding and instructed this QA owner to stop, retain evidence, release the lane, and NOT test a revised candidate. A new clean freeze and a NEW independent QA agent are required. No application source was modified here.

Important test limitation: browser05 has 38 passing recipe assertions, but its two populated no-classify assertions encoded the candidate's overly broad denial. They do NOT prove preservation of authorized metadata edits. Therefore neither their green status nor the focused suite is acceptance evidence for this regression. The earlier diff-review.json is retained unmodified; this later independent finding overrides its initial empty findings list.

## Five-phase independent QA record

1. Specification: independently read original issue, four original acceptance criteria, comments, validated task contract, exact seven-file scope and mandatory repository/quality/security instructions. Native task validation returned CONTRACT VALIDO. No release authority was delegated.
2. Source review: full candidate-versus-baseline diff and complete changed files reviewed. Seven frontend files, each under 500 lines; taxonomy, capability model, IO, backend, dependencies and config unchanged. Preservation regression above prevents acceptance.
3. Static/test/security verification: reran immutable commands and security templates independently. Frontend and backend type checks, frontend TypeScript build, actual Vite React build and frontend secret scan passed. Focused tests: 44/44. Full regression: 1297 total, 1285 pass, 12 fail, zero new failure names against exact accepted baseline receipt 057dc6ca6374203d4a1c86d1e5c4b14b73810d48. This is NOT global green. Baseline and candidate changed-source scanner findings: zero; NOT a global CVE certificate.
4. Native browser evidence: real SPA compiled by repository Vite config; desktop 1150x1004 and mobile 390x844. Browser05 completed normally with 38 assertions and 26 guarded synthetic transport states. Categories, native keyboard details, 10 folder categories, native 9 optgroups/22 form types, cancel/no-write paths, genuine empty/compact controls, explicit capability denials, administrator/operator policy behavior, first synthetic upload and record save, retained mock state after native reload, populated search-zero, loading/delayed/error/malformed states and native retries were exercised. Traces, videos, screenshots and request receipts retained. The existing-file metadata preservation criterion FAILED by review, as above. The accepted-baseline checkout was prepared but baseline browser execution was NOT performed because root stopped this candidate.
5. Integrity and handoff: source-before/source-after bind the same 1551 physical application files to unchanged clean HEAD and actual Git blobs (strict UTF-8 CRLF-only normalization, binary exact). All failed attempts and their frozen recipes retained. Lane release and complete file SHA-256 manifest accompany this report. No commit, push, deployment, GitHub mutation, real-patient request, real backend or database write occurred.

## Original acceptance criteria status

AC1 next step for true empty: preliminary candidate browser assertions passed.
AC2 compact empty without inactive management controls: preliminary candidate desktop/mobile assertions passed.
AC3 unchanged categories available at first upload: preliminary native keyboard/type assertions passed.
AC4 useful capability-driven explanation and referent: denied-empty paths passed, but allowed existing metadata edits regress. Overall acceptance is FAILED; no criterion set is declared complete.

## All attempts retained

- browser01: failed guarded transport on initially omitted synthetic room-options, therapies/page and diary reads; zero accepted outcomes. Guard failure preserved.
- browser02: first two desktop assertions passed, then incorrect native wrapped-label locator. Corrected to the actual accessible combobox role in the next recipe; source unchanged.
- browser03: 16 desktop assertions passed, then incorrect dialog role. Actual native confirmation is alertdialog. Corrected in next recipe; source unchanged.
- browser04: 18 desktop assertions passed, then guard rejected legacy-null-policy prefetches (intake-review, narrative-sections, assessments/catalog). Exact source-informed synthetic fixtures added in the next recipe; no HTTP error was ignored.
- browser05: 38 recipe assertions passed, but candidate acceptance rejected due the independent preservation finding. Immutable passing browser recipe is not release permission.
- revocation01: optional native page-focus refresh probe failed to trigger another auth/me read in the headless environment (count remained one). No application state/event/DOM injection was used. Revocation while a form is open is NOT verified. Failure artifacts retained; no workaround claim.

## Safety and evidence limits

Only exact synthetic POST /patients/QA-PAT-423/documents and PUT /patients/QA-PAT-423/cartella were allowed in first-upload cases, one of each per viewport (four total mock mutations). Other synthetic states had zero clinical writes. API interception guarded before wire; external application traffic blocked. Intentional metadata error requests are asserted separately; browser05 has no unexpected requests/errors. Upload is a generated small synthetic PNG, not a supplied patient photo. Native reload persistence is mocked transport persistence, NOT real database or production proof. Playwright assertion receipts are custom library-run receipts, NOT a native Playwright Test runner report. Candidate QA screenshots must NOT be posted as evidence of a resolved/deployed issue.

## Exact recipes executed (from C:/w-423-qa1)

`node artifacts/task-validation/423-document-empty-state/independent-qa/recipes/source-receipt.mjs artifacts/task-validation/423-document-empty-state/independent-qa/source-before.json`

`node artifacts/task-validation/423-document-empty-state/independent-qa/recipes/commands.mjs artifacts/task-validation/423-document-empty-state/independent-qa/commands01`

`node artifacts/task-validation/423-document-empty-state/independent-qa/recipes/security.mjs artifacts/task-validation/423-document-empty-state/independent-qa/security01`

`node artifacts/task-validation/423-document-empty-state/independent-qa/recipes/diff-review.mjs artifacts/task-validation/423-document-empty-state/independent-qa/diff-review.json`

Browser01 through browser05 each used their frozen browser-lane.mjs with browser.mjs, QA_PORT=7531, SOURCE_COMMIT=d6539fbb68973f01e97e2b5578e2d053537fd962, and separate absent output directories. Revocation01 used the separate revocation-recipes/browser-lane.mjs and browser.mjs under the same lane. Frozen copies are inside each attempt's recipes folder; browser-plan.json enumerates their identities. They are retained for audit, not instructions to rerun a superseded candidate.

`node artifacts/task-validation/423-document-empty-state/independent-qa/recipes/source-receipt.mjs artifacts/task-validation/423-document-empty-state/independent-qa/source-after.json`

`node artifacts/task-validation/423-document-empty-state/independent-qa/recipes/bind-source.mjs artifacts/task-validation/423-document-empty-state/independent-qa/git-source-binding.json artifacts/task-validation/423-document-empty-state/independent-qa/source-before.json artifacts/task-validation/423-document-empty-state/independent-qa/source-after.json`

`node artifacts/task-validation/423-document-empty-state/independent-qa/recipes/seal-stopped.mjs`

## Accepted baseline failures (exact names)

- Assistant classic fallback with a known resident opens that resident section
- a single parameters table is always visible and uses the operational table contract
- multi-patient mobile layout is a labelled two-column card without horizontal scroll
- multi-patient parameters uses one bounded page instead of cartella fan-out
- multi-patient quick entry exposes every action and field to assistive technology
- multi-patient quick entry reuses the ClinicOS form and action design system
- multi-patient refresh keeps the previous roster visible and announces progress
- new-patient wizard auto-fills CF without assuming a sex or overwriting provenance
- only design-system.css decides how a canonical control looks
- schedule reads are abortable, session-safe and retryable
- src\components\operator\__tests__\assessmentCatalogUi.test.ts
- weekly and monthly views never repeat one-day therapy data across calendar cells
