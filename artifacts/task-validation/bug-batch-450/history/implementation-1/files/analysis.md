# Frozen analysis

Group: bug-batch-450
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Feature: patient-intake/document-review-and-draft-lifecycle

Aggregate450 with472/473/475/476 because they share IntakeWorkspace, StepAnagrafica and intakeProgress and the document-to-patient lifecycle. Keep perissue acceptance and evidence; adopt PR469 rather than create duplicate work.

Baseline origin/main a516d42e31f6674c39c1d130c9706cd80a7ab4c6. Source PR469 head29b2f5c9b72b4d909b954d5360ec08095825f29e. Owner comment6154947896 supersedes the two-screen/five-field redesign. Reuse scoped source only; correct existing tablet three-column regression, source-only assertions and incomplete runtime error/persistence verification. Historical backend denied-access-ack failure must be reproduced/classified without weakening assertions. Actual bodies and all comments read for472/473/475/476. Importreview currently nests constrained fullheight surfaces; validate actual geometry and sourcevisibility. Missing source, corrupt PDF and asset/CSP failures remain separate hypotheses pending reproduction.476 permits name/surname/validCF draft continuation but invalid provided fields, clinical review and duplicate safeguards remain enforced.473 medication rows are prescriptions for review, never evidence of actual administration.

Integration order: Manual and import intake are consolidated to avoid IntakeWorkspace overlap. PatientList and patientListView overlap future452 list presentation: land this batch first, then rebase452 and rerun both draft/status and identity/list regressions; do not modify unrelated row presentation. Therapygroup owns therapy administration/AIFA, which are outside this intake scope.
