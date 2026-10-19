# Bug batch 447 follow-up 4 — author validation

**Final Decision: IMPLEMENTED — NOT INDEPENDENTLY VERIFIED**

At 320px, the real dose action row was 258px wide while its two flex buttons stayed on one line and contributed to a 356px document scroll width. The mobile `.giro-drug > .giro-row__act` now wraps its contents. Existing button flex growth remains, so buttons can use the available row width after wrapping. The change is inside the existing 720px media query; labels, actions, and badge styles are unchanged.

Validation used the repository `createRunner` in credential-stripped verification mode. Existing focused frontend suites passed **29/29** with zero failures or skips. Frontend typecheck/build passed, and `git diff --check` passed. The build emitted the existing Vite chunk-size warning and plugin timing diagnostics.

No browser, API, or database run was made in the author session. A fresh independent QA session must verify canonical issue 452 at all four viewports and continue the remaining clinical checks. Previous QA3, QA2, and earlier evidence remain immutable. The exact source hash and command results are in [source-hashes.json](source-hashes.json); raw logs and the pre-edit CSS snapshot remain private under the author evidence directory.
