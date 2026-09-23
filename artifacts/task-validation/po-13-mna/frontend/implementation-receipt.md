# PO13 MNA frontend handoff

Implemented in the root-assigned isolated checkout `C:/Workspace/ClinicOSHouse-worktrees/po13-mna-ui`, baseline `4e594aa39cb2cf9ef3bfc403e4680ae66a41c3be`, after the explicit GO following verified PO12 deployment.

The MNA module is available in Moduli and uses the existing private-draft, session/patient/type isolation, CAS, exact retry, immutable final/correction, PDF recovery and typed archive flow. The agreed DTO `9d24743fafe6b78ce71dc4c119603ccae1bdde6babbe44907b30bf79b8e9eb2a` is extended only by the root-approved frozen K subitems snapshot addendum.

The progressive form distinguishes screening from full assessment and retains G–R responses when switching extent. Screening finals have an explicit title and no 30-point total. Three K booleans remain distinct; incomplete sections have null outcomes. Dedicated MNA validation checks results, progress, snapshot contents, measurement/date consistency, source notices and demographics without changing old published snapshot shapes.

Measurement/date controls preserve raw invalid input in session-owned local state. Invalid input blocks save, preview/finalization and any caller attempting to save the draft, and cannot display a score calculated from a hidden previous measurement. Corrections update the raw state, canonical value and category-to-measured transition together. Explicitly clearing a measurement preserves its optional date and never restores an old category. Notes retain 4000 Unicode codepoints and remain editable above the limit.

MNA-only time helpers pad calendar years, reject year zero/out-of-range Rome dates and retain exact saved instants. Dedicated handling covers years 0001–9999, historical Rome second offsets and contemporary DST ambiguity without changing other assessment time behavior. Archive dates use the same MNA calendar projection. Snapshot-only K labels remain available for partial screening finals. UI preserves Unicode source symbols and copyright; backend owns PDF text layout.

Validation against the frozen candidate: 127 tests passed, including 18 MNA tests and 109 regressions; TypeScript/Vite production build passed; focused baseline-relative lint stayed at 18 existing diagnostics with zero introduced; 30 changed/new source files plus 110 emitted text bundle files passed the credential-signature scan. Runtime parity with backend passed 89 scenarios for canonical answers, completion, results and snapshot items, plus exact item/options/K/measurement/source literals. Whitespace checks passed.

The initial MNA-only run found a test fixture calling the archive builder with reversed arrays; the fixture was corrected. Lint found two control-regex expressions; both were replaced by one explicit Unicode codepoint predicate and the final tests/build/lint were rerun. No unresolved diagnostic is suppressed.

The root PO12 mobile sticky CSS is preserved at SHA256 `b36eca8bc9fd9f584410f7ff3a3469f812f197d6e96a435659902adc5ee91be1`, along with both pre-existing dirty PowerShell scripts. No package/lockfile, backend, shared dependency or server/port changes occurred. No worker commit, push, deploy or live patient writes occurred.

Root owns integrated HTTP/PostgreSQL and browser desktop/tablet/mobile checks, actual PDF/print inspection and publication. SSR tests verify structure and retained data, not browser geometry or PDF pagination. Root preview uses a static build on port 4194; this worker starts no Vite middleware.
