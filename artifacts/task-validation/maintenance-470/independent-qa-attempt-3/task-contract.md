# Independent contract extraction — #470 attempt 3

Reviewed issue #470 and its current status comment through GitHub, plus the pre-code cleanup contract/addendum. Baseline is `7c31be8f0caba1811023bd0d43b8be56b93556d1`. This QA session did not author or coordinate the candidate. Root owns the unchanged four-attempt ledger (1 failed, 2 passed, 3 running).

The user authorized deletion of all fictional demo patient/clinical/import/orphan/source/backup data. Existing production cleanup must not run again. Preserve account/config/catalog tables and schema. Verify the actual public demo, rather than changing its backend or hiding data.

Required outcomes:

1. Exact project/demo environment/backend/domain/private database guards precede any mutation; unknown target/catalog/FK/storage fails closed.
2. Complete 43-table catalog: explicitly truncate 30 clinical/import/mixed tables without CASCADE/RESTART IDENTITY; preserve all 13 account/config/catalog tables byte for byte. Transaction rollback, FK and trigger invariants hold.
3. Separate fresh read-only inventory proves zero clinical/import/mixed data; temporary worker ownership and teardown are bounded and verified.
4. Temporary source directory is actually checked/erased safely. Backend and runtime caches require proven fresh serving processes, not only restart request acceptance.
5. Identify the actual demo database persistence volume, delete only its native backup IDs, and independently re-query zero. Unknown persistence remains a blocker.
6. Hosted online browser uses standard TLS and ordinary simulator admin UI, proves empty patients/therapy and reload, records screenshot/trace/video without credentials or unexpected patient data, and revokes its session.
7. Independent synthetic PostgreSQL, security negatives, frontend TypeScript/build and internal Playwright evidence precede any root publication or live operation.

No live Railway API/SSH/mutation/login was performed by this QA session. Live SQL, storage/backup and online proof remain root-only gates after a passing candidate. This candidate is blocked by reproduced defects F1–F3.
