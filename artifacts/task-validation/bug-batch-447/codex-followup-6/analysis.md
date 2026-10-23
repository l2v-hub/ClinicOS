# Analysis

The previous native browser run39645185680 / job119386669520 completed API persistence for both viewports, then timed out waiting for `allergy-status-*` in Clinica. `PatientDetail.tsx` renders the empty-list summary at `data-chart-anchor="allergie"`; `AllergiesEditor` and its radio controls are rendered inside `AccessibleDialogSurface` with the accessible name “Allergie e Intolleranze”. The current source labels the summary action “Verifica” (the supplied contract calls it “Modifica”), so the journey uses the actual accessible label scoped to the allergy summary.

The E2E now checks the exact viewport-specific visible summary after the existing return to the real patient list, opens that summary action, and verifies the saved radio's `aria-checked="true"` plus the exact existing status hint in the actual dialog. No application UI or clinical behavior changed. Existing upload, intake, therapy acceptance, API persistence, empty-list contradiction, reload, and console/HTTP failure assertions remain in place.

The native failure log remains private and unchanged. Pre-edit and post-edit source hashes and immutable QA4/QA5 and packet9 evidence identities are recorded in `source-hashes.json`; all preserved artifacts matched their pre-edit bytes, inode, and SHA-256 after the source edit.
