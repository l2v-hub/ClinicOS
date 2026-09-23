# PO-06 frontend handoff

Frontend candidate based on `0418463a94801bf2d22bdb3155eb6d4a05e9a2dd`, implemented under root GO in the assigned isolated worktree. No commit, push, deployment, backend/schema/generated package, manifest/lockfile, server or port changes were performed.

## Behavior

- Shared patient identity renders surname/name, CF or DOB with `CF da completare`, and `Anagrafica da completare` when CF/DOB metadata is missing. It renders no MRN and does not require phone.
- Location uses the server projection only. Assigned, explicitly unassigned, unavailable and client loading are distinct. Invalid/absent projections never imply unassigned. Partial cartella location preserves its known label with the missing counterpart explicit. Historical/non-current dates remain visible; today's Europe/Rome date is suppressed. Cartella provenance remains visible.
- Roster table/cards, parameter entry, therapy groups, handover cards and combobox selections/options share the presentation. Query limits, sorting, patient keys, pagination, summaries and clinical payloads remain unchanged. Parameter room state no longer depends on clinical-summary loading.
- Therapy patient headers are sticky within each patient group. Action labels include patient, identifier, drug and dose. Controls have 44px minimum height and visible focus. The modal now restores/traps keyboard focus and closes with Escape. Read-only rendering suppresses the expanded signing form as well as signing buttons.
- Consegna null/absent/malformed/mismatched identity shows only the already-authorized patient name and no chart action. A valid identity must match the handover patient ID. No identity fetch was added.

## Evidence

- `tests-final.log`: 74/74 final focused/regression tests pass.
- `tests.log`: broader initial run 75/76 pass. Its only failure is an unchanged `therapyAgendaDateGuard` assertion for old weekly/monthly guidance text absent from OperatorAgenda at baseline. No unrelated guard or agenda was modified.
- `build-final.log`: `npm run build` passes. Existing bundle-size warning remains; no latency/bundle improvement is claimed.
- `lint-changed-without-baseline.log`: all changed TS/TSX except the already-failing MultiPatientParametri pass ESLint.
- `lint.log`, `baseline-comparison.json`, `baseline-check.log`: MultiPatientParametri has exactly the same two errors and two warnings at baseline/candidate. Baseline comparison also proves the agenda guard inputs unchanged and `buildInfo` clinical payload unchanged.
- `diff-check.log`: scoped frontend whitespace check passes. Pre-existing launcher whitespace is intentionally untouched; protected launcher hashes are in the receipt.
- `source-manifest.json` binds all 24 changed frontend source/test files to this baseline. `final-receipt.json` binds the source manifest and validation logs.

## Browser/integration ownership

Root owns browser/port 4187 and final combined verification. Unit/SSR/source checks do not prove CSS geometry, live focus, mutation events, or draft persistence across rerenders. Verify sticky group changes, 200% zoom, narrow widths, long patient names, keyboard loop/Escape, preserved drafts/notes during refresh, exact therapy action payload and null-identity handover network behavior.

Reusable synthetic fixture exports are in `frontend/src/components/operator/__tests__/operationalIdentity.fixtures.ts`: `identityPatient`, `identityHomonym`, `assignedLocation`, `identityHandover`, `identityTherapySlot`. The slot includes two homonyms, two distinct identifiers, partial legacy location and deliberately stale scalar aliases. Extend the administrations in the fixture for long scrolling.

The node_modules junction points to the authorized quality-loop dependency tree and must not be copied as source. Build artifacts remain local. Claims are released to root upon final receipt creation; subsequent source changes require renewed ownership.
