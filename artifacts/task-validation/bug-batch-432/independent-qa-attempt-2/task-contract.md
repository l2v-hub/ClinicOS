# Independent QA contract — candidate 2

Issue bodies and every comment were read directly from GitHub for #432, #441, #442, #460, #463, #464, #467; the seven raw JSON snapshots are private outside the repository at /tmp/clinicos-qa432-private-inputs. Only source URLs, comment IDs and SHA256 hashes are published in issue-source-provenance.json; the criteria below are sanitized. The original frozen task-contract.md, analysis.md, implementation-plan.md, triage-index.md and cycle-2-correction.md apply unchanged. Root authorized downstream-447-coordination.md only as packet metadata.

- #432: all 106 stored prescriptions, 105 active plus one inactive, read-only absent-feed rows; PRN day/week and period bounds; incomplete/foreign/repeating pagination rejects, retry/switch/print complete; import five retained occurrences, three persisted and two explicitly deferred, no silent omissions/inference.
- #441: one-off explicit date/time with empty legacy flags, exact feed/summary/assistant/writer identity, wrong schedule rejected, one record.
- #442: deterministic held-interpreter race under the full backend suite, original completion/late correction/replay/one-write assertions, bounded cleanup on failures and original 120/80 value retained.
- #460: immutable actor/request receipt, lost-response and pre-write-failure retry across reload; pending-state guard prevents refusal overwrite; current ACL checked before replay disclosure, concurrent requests one record.
- #463: strictly empty catalog triggers zero automatic per-drug lookups for >100 inventory and authorized roles; available/malformed/unreachable preserves real lookup; public limiter unchanged.
- #464: Europe/Rome day/minute and exact midnight/DST results independent of host timezone; 08:00 future at 00:30, 00:45 due then one minute late at 00:46.
- #467: given/refused one-off stays recorded across an edited band; immutable original and no second write, periodic multidose stays distinct.

Scope: exact 37 source paths recorded in source-before.json. Full canonical command owns serialization, synthetic PostgreSQL on 55432 and services 3432/5433/8432. No existing dev database, paid model, production, deployment, commit or issue mutation. New screenshots/traces/videos must come from this independent invocation. Historical development evidence was relocated byte-for-byte under pre-run-development before canonical fixed outputs were recreated; it is not certified. Exact-SHA external review, required CI and verified release remain root-owned gates before closure.
