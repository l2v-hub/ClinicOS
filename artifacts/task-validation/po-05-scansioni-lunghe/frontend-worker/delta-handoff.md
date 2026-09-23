# PO-05 source labels and selected demographics — integration delta

Root authorized this follow-up after the initial frontend handoff. Copy **only the five files in `delta-source-manifest.json`**. Its SHA256 is `2f452e9a5dbad695b41b9305b92f2fba0e26ba4e4d10a28ad821718b9e343811`; the preceding full source manifest remains `5197b7e4c27701cd93d7f9299ed6226064d082a176279922b64ae8afac1a3820`.

`ImportDocumentsWorkspace.tsx` and `ImportSession.css` were not modified in this follow-up. Preserve root's integrated empty-group and 44px-control changes in those files.

## Corrections

The narrative adapter previously put `fileName` into `fileId`, discarding the backend's group ID. The section renderer then failed its ID lookup and fell back to the first original's filename. The adapter now retains ID and display name separately; known IDs resolve to their matching document/group, legacy names remain names, and unknown sources display an explicit unidentified-source label. No source is assigned to the first original by default. With several sources, “Confronta con la fonte” shows explicit per-source buttons instead of opening one arbitrarily; the selected button forwards the original group/document ID.

The effective review model now projects explicit select/defer decisions into the same eight demographic fields used by backend `pageDraftNarrative`: first/last name, birth date, sex, phone, email, address and fiscal code. An unresolved/deferred demographic conflict has no automatic candidate. Source narrative text and therapy prescribing decisions remain unchanged and server-owned.

The real section review component keeps manual demographic overrides separately from source-derived values. Untouched fields immediately follow saved choices, including Alba→Bea→defer, while manual corrections (including intentional blanks), section edits and section review state survive result changes.

## Verification

- Focused import/intake/sections/scanner suite: **125 passed, zero failed** (`delta-regression-tests.log`). Four new tests cover all eight demographic mappings, selection changes/defer, real review render/event state with preserved manual and section edits, distinct source IDs, explicit multi-source comparison and safe legacy/unknown-source fallback. Leaf visual components are stubbed in the state harness; the real review component handlers and state are exercised.
- Frontend `npm run build`: **PASS** (`delta-build.log`), including TypeScript and Vite. Existing chunk-size advisories remain.
- ESLint on all five delta files: **zero errors, zero warnings** (`delta-eslint.json`).
- Focused `git diff --check`: **PASS**. All delta files remain below 500 lines.
- Source hashes were rechecked after validation; protected launcher files and all other previously handed-off source files are unchanged.

Root owns final browser verification against the combined integration worktree. This delta involved no backend, dependencies, lockfiles, commit, push, server or publication operation.

## Policy receipt

`ALLOW_FRONTEND_DELTA`: root explicitly authorized these two observed frontend fixes and tests, with a new exclusive claim and explicit exclusion of the two root-modified UI files. `claims.json` records release to root; this receipt does not authorize publication.
