# Bug batch 447 follow-up 3 — author validation

**Final Decision: IMPLEMENTED — NOT INDEPENDENTLY VERIFIED**

The Giro secondary menu now uses the full primary toolbar as its containing block. It opens at the toolbar's left edge and sizes to that content column up to 680px, so its bounds follow the therapy area across viewport widths. Native `<details>` behavior and menu contents remain in place.

The positive `createWithoutSchedules` API fixture now supplies its known `viaSomministrazione: 'orale'` explicitly. No negative or scope assertions were changed. The canonical 452 browser helper now checks the real open menu's bounding box and document horizontal overflow at 1180×820, 820×1180, 390×844, and 320×740, and checks native Enter close/reopen behavior.

Validation used the repository `createRunner` in credential-stripped verification mode. Four focused existing frontend suites passed **29/29**; frontend typecheck/build passed; integrated browser harness syntax passed; `git diff --check` passed. The build reported its chunk-size and plugin-timing warnings and completed successfully.

The real API/database fixture and actual browser interaction were not run in the author session. They remain for a fresh independent QA session, along with the remaining 486/recorded criteria and parent batch 7 criteria. The exact before/after source hashes, diff count, and prior QA STOP are recorded in [source-hashes.json](source-hashes.json). Raw logs and source snapshots remain private under the author evidence directory; no historical proof was changed or promoted.
