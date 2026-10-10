# CI attempt 1 is retained, not waived

Run 38018242472, application 3f911cbd281d7c93c4796e97d5940258ceb331f0, failed at Backend unit tests with seven names: six diary-reading DB tests and the single already accepted therapy-scope static failure. Baselines 38013399240 (3cd984) and 37987185985 (422) have only the therapy failure. Sanitized provider excerpts are retained in ci-unexpected-failures.json.

Root and independent read-only reviewer bug423_release_helper_review inspected the source and excerpts:

- scripts/run-node-tests.mjs isolates five roster-epoch suites only. diary-reading-db.test.ts and diary-unread-queue-db.test.ts execute concurrently against the same job-local public schema with shared SIM-NURSE-1/SIM-DOCTOR-1 identities.
- diary-reading expects actor-wide unread baselines to remain stable at lines83/148/173/224; concurrent suites create and remove visible diary/handover rows. Actual surplus counts are10/7/3/1.
- The scope test sets RESIDENT_SCOPE_CONFIG at161 but fails at173 before cleanup at199. Later nurse acknowledgements of doctor-owned patients[0] consequently return404 at246/259, rather than the expected201.
- git diff 3cd984..3f911 for backend, prisma, scripts, package/lock, .github and railway.toml is empty. The source delta is exactly the seven reviewed frontend document-archive files.

This supports a pre-existing shared-fixture race, not proof that every backend behavior passes. One bounded exact-source failed-job rerun is allowed diagnostically, preserving attempt1. No workflow/env/test weakening, skip, new waiver, global CI-green claim, repeated rerun-until-green or backend promotion is allowed. A repeat must either be natively successful or match the exact previously accepted single therapy failure and stage before #423 can close. Fixing global DB test isolation is a separate source change, not silently folded into #423.

The first shell sequence continued to local evidence staging/privacy scan after ci-receipt asserted the mismatch and report generation failed. It made no evidence commit/push/GitHub closure. The indexed files remain task-scoped, but are not releasable; final report/CI inputs and canonical coverage must be rescanned before any publication.
