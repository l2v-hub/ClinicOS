# UI readability correction 16

This continuation fixes the independent UI15 contrast finding in the reserved source snapshot, with changes limited to `PatientRecordData.css` and its existing design-contract test. Allergy body and label text in regular and severe alert strips, the patient allergy strip, and the compact topbar now use the existing `--text` token. The amber/red backgrounds, borders, severity cues, and layout remain intact. The stale confirmation implementation is unchanged.

The test parses actual color values from `App.css`, computes WCAG sRGB relative luminance ratios, and verifies the affected CSS rules select `--text` on their existing backgrounds. It also asserts that the former `--amber`/`--amber-bg` and `--red`/`--red-bg` combinations fail the 4.5:1 small-text threshold, guarding against regression. Measured ratios are 14.916:1 for text on amber and 14.380:1 for text on red; former ratios were 3.147:1 and 3.955:1 respectively.

Verification: the four-file focused suite passed 28/28, the full frontend test runner passed 1,550/1,550, and frontend `tsc --noEmit -p tsconfig.app.json` passed with no diagnostics. A 1,656-file inventory audit found exactly the two authorized source files changed, with no missing or added source files. The snapshot initially had no dependency links; after recording that setup issue, test execution used symlinks to the existing read-only dependency trees. No dependency installation occurred.

The independent UI15 QA failure is preserved unchanged in its existing evidence path. This task did not run browser/E2E, database, backend, Git mutation, provider, GitHub, or canonical operations. Fresh integrated-source browser verification and the separate PostgreSQL concurrency proof remain pending.
