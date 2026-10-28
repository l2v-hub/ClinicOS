# PR497 followup10 independent browser QA

The single corrected actual browser journey passed on desktop and tablet against a private synthetic database, compiled backend, and CI mock AI runtime. The saved allergy summary opened through Verifica and the editor showed the persisted selected status and exact hint in both viewports.

- Desktop: Paziente nega allergie; selected paziente_nega; hint Paziente nega allergie.
- Tablet: Allergie assenti (verificato); selected assenti; hint Allergie assenti — verificato dall’operatore.
- API persistence passed for both patients; no relevant backend HTTP failures or browser console errors. Four document jobs reached the local mock runtime.
- Result: 1 browser invocation, 2/2 viewports passed, 16 screenshots, 2 Playwright traces. Migrations and synthetic seed passed.
- Source commit: 74b260cdbcf36b1f7395477f4e35d07aba7fcf90; E2E source SHA-256: f728aa6066a3b4d4c984e3023eb405981cb0b7a3cf42c8d87a9de118881292b5. Source and sealed prior proof files remained unchanged.
- Cleanup: private PostgreSQL removed, all owned ports and QA lock free, baseline container still running unchanged.

Evidence is under attempt-006/output/evidence; runner receipts and runtime logs are under attempt-006/output/test-results. Prior failed attempts remain intact and are not counted as acceptance. No broad suites or release checks were run. See FOLLOWUP10-REPORT.json for full counts and provenance and FOLLOWUP10-STOP.json for the handback.
