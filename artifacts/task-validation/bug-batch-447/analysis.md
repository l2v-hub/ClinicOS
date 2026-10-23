# Frozen analysis

Group: bug-batch-447
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Feature: Shared patient clinical workspace and operational rounds

447/452/453/454/457 share PatientDetail and therapy parent;452/454 share Giro identity;451 and456 consume the same patient/current-day operational workflows. A single canonical worktree and PR prevents repeated competing edits, while preserving each source acceptance and separate evidence.453 and457 contain explicit unresolved clinical-policy gates, never inferred from UX instructions.

Baseline a516d42e31f6674c39c1d130c9706cd80a7ab4c6; all seven issue bodies and comments read2026-10-17. Source confirms global repeated cartella banners, missing Today doses, parameter save without auto advance, always-present keypad, repeated missing previous text, calendar default, duplicate allergy details and supervisor legacy urgency summary. InvioPS loads only active prescriptions. Temporary exits are liberatoria.usciteLog via verified cartella update; assessments/transfers is unrelated mobility assessment and is excluded. Full group is not ready to implement clinical-policy portions until explicit decisions; root may authorize only the independent clear UX/print subset and must retain unsatisfied acceptance. No application edits made while proposal is reviewed.

Integration order: Batch432 owns authoritative therapy write/query/schema, AIFA catalog semantics and App.tsx; this batch owns clinical presentation and reuses its public read/write contracts without editing backend or App.tsx. Integrate tested432 before final therapy/UI QA. Batch450 owns intake/import draft lifecycle and changes PatientList.tsx; this batch changes existing row presentation only. Integrate450 first, reconcile PatientList without overriding draft visibility/status, rerun both draft and operational-list regressions. Shared identity component gains an opt-in compact presentation preserving default callers and accessible disambiguation. No parallel edit to another worktree or silent frozen scope expansion.
