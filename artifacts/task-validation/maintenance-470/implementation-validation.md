# Implementation validation — independent QA pending

Issue #470 read-only maintenance follow-up. This is the implementer's test record, not a QA gate verdict or completion claim.

- Contract validator: PASS.
- Source syntax and whitespace: PASS.
- Unit/security/failure-path tests: 10 PASS, 0 FAIL, 0 SKIP (`unit-results.txt`).
- Real PostgreSQL 16 synthetic integration: 1 PASS, 0 FAIL, 0 SKIP (`runtime-results.txt`). Official local image ID `sha256:275447c94b11b151decd1f29877965301d5a77032037c46de93d990f739f00a9`; own temporary container `clinicos-qa-maint470`, loopback port 55470, no volumes, removed in finally.
- Existing trusted live workflow: SUCCESS, https://github.com/l2v-hub/ClinicOS/actions/runs/39015026575. Verified exact demo target binding; actual patient page empty; deleted zero patients; maintenance session revoked. Aggregate sanitized results in `live-run-results.json`.

Meaningful integration assertions: the patient table was empty while non-FK ImportJob/PatientIntakeDraft still contained synthetic rows; inventory correctly rejected an empty-data claim. Mixed note/audit/recipient records without patient IDs also blocked completion. Unknown tables blocked completion. A real INSERT inside a READ ONLY PostgreSQL transaction failed with SQLSTATE 25006. Synthetic auth table counts remained unchanged. All inventory connections close and rollback; no live database connection was made by the new script.

Security boundaries: hardcoded demo project/environment/backend/domain/database guards; parent recomputes count-derived empty status and drops extra log fields; only a private Railway variable reference is passed to the new service; no raw driver/CLI/API error is printed; no patient rows, PHI or credential values are recorded. The workflow adds only one exact-branch/exact-operation demo job. Existing production branch guards remain unchanged. New code has no patient DELETE, SQL data writes, snapshot deletion, backup creation or public endpoint.

Pending: root full diff review, dedicated independent QA, authorized publication and dispatch of the new inventory code, actual SQL counts, demo-native and external backup/storage inventory, independent online browser screenshot. Chromium currently rejects the official environment proxy certificate because its existing legacy NSS trust DB lacks that CA; no certificate validation bypass has been used. The legitimate environment trust repair requires managed permission to update the existing user trust DB. Therefore #470 must remain open until all actual requirements are verified.
