# PO-01 frontend handoff

Source frozen in isolated `po01-demographics-ui`, baseline `af48e322`. `frontend-source-manifest.json` identifies 30 source files and their exact SHA256; copy only these paths. No backend, manifests, lockfile, dependency installation, live data, commit or publication changes.

## Implemented behavior

Manual and OCR intake accept missing DOB, CF and phone while rejecting invalid provided values. `Anagrafica da completare` lists fields and links to editors; profile completion patches the same patient and can add DOB. Provided existing CF/phone cannot accidentally be cleared in this editor. All DOB displays and ages are nullable-safe. Incorrect OCR identity values explicitly cleared by the operator remain cleared at handoff.

Manual draft ID is retained per operator in sessionStorage (no demographics are stored locally). Concurrent initializers share one request; save-and-close flushes queued autosave; reopen and timeout retry reuse the same draft. Confirm has a synchronous submit lock. Known confirmed drafts reopen the original patient. Failed resume never silently creates another draft.

Imported therapy exclusion sets `excludedFromConfirm: true` on the retained source row; no source row is deleted. Only included verified/valid rows produce input, with `intakeSource: {type,index}` metadata. Before final autosave and payload generation, included imported rows get their complete `reviewedTherapy` form snapshot if absent, preserving original text/status/data. Existing mapper intentionally omits the legacy redundant textual `dosaggio` payload when full reviewedTherapy exists; structured strength and schedules remain identical and raw dose stays in the source row. `_narrative`, `_sections`, `_terapiaText`, `_confirmation` are excluded from editable patches, retained untouched in local source data and on the server. Profile offers read-only retained-therapy review through agreed `/patients/:id/intake-review` endpoint, guarded against late responses/patient/operator switches.

## Validation

Final focused run: **36 tests passed, 0 failed**; see `frontend-focused-tests.log` (demographics, absent/invalid DOB, status rendering/actionability, source mapping, clinical guards, exclusions, full snapshot normalization, protected patch fields, draft resume/timeout/concurrent-init, existing phone and identity guards).

Final `npm run build`: **exit 0**, see `frontend-build.log`. Existing large-chunk warning remains. `git diff --check -- frontend` passed. Browser/manual end-to-end and backend integration remain for root QA.

Earlier broad run recorded 551 tests, 540 passed, 11 failed. Three task-relevant failures (two SSR test React global fixtures and the previous `4 obbligatori` textual contract) were fixed and all pass in focused verification. Eight remaining failures are in unchanged baseline code; no repeat broad suite was run. Exact test and production source baseline equality is recorded in `frontend-baseline-comparison.json`:

- `agnosWorkflow.test.ts`: `preview retains full narrative diff and refuses ambiguities; hostile content stays escaped` — preexisting missing React global under this runner.
- `patientRosterGuard.test.ts`: `multi-patient parameters uses one bounded page instead of cartella fan-out`; `multi-patient quick entry exposes every action and field to assistive technology`; `multi-patient quick entry reuses the ClinicOS form and action design system`; `a single parameters table is always visible and uses the operational table contract`; `multi-patient refresh keeps the previous roster visible and announces progress`; `multi-patient mobile layout is a labelled two-column card without horizontal scroll` — baseline textual contracts on unchanged multi-patient source.
- `therapyAgendaDateGuard.test.ts`: `weekly and monthly views never repeat one-day therapy data across calendar cells` — obsolete expected text in unchanged agenda sources.

Do not claim a fresh all-green full suite. Original full output is `frontend-tests.log`.
