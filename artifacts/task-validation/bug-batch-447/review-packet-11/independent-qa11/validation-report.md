# Independent integration QA11

Final Decision: PARTIAL

Scoped independent verdict: PASS for the combined parent483 legacy guard and child497 temporary PS backend integration. This report does not grant a ready label, merge, deployment, or issue closure. Native6 exact-publication checks, parent actual Claude5, and child first actual Claude remain root gates.

Source: `f394e3a77925e96a2b54e63485fb45ad44678f54`, clean and unchanged, with actual merge parents `74b260cdbcf36b1f7395477f4e35d07aba7fcf90` and `4983de2bdb6ea571053f03a508c919d27ff1771b`. QA reservation `e9e6115d-9f5b-4a0f-82fa-a5e0858d31c3`; sole clinical grant `1e13ebab-a3a9-4b07-b91e-71735b43f938`.

| Check | Independent result | Evidence |
| --- | --- | --- |
| Targeted actual writer, scheduling, SQL scope, PS pure tests | 30/30 PASS, zero skipped | pure-attempt1/ |
| Official backend TypeScript check | PASS, exit 0 | types-attempt1/ |
| Existing authoritative writer HTTP/PostgreSQL suite | 19/19 PASS, zero skipped | runtime-attempt1/http-pg-* |
| Existing temporary PS PostgreSQL suite | 2/2 PASS, zero skipped | runtime-attempt1/temporary-ps-db-* |
| Diff, exact identities, preserved bodies, isolation and access | PASS | static-review.json, reviewed-scoped.diff |
| Source/index/prior proof integrity | PASS, zero mismatches | integrity-after.json |
| Owned resources removed, ports/lock free, baseline unchanged | PASS | resource-handback.json |

The 51 executed tests exercise actual production clinical helpers. The pure test transaction double supplies scoped lock/cartella dependencies and records calls; it does not stub production PS admission helpers. The real PostgreSQL run covers all four lock interleavings (scheduled/PRN, chart absent/present), observes two waiting writers, blocks both dose types after a committed pause, and permits an explicit absence record. Pause/continue/return persistence, immutable request replay, current access checks, refusal correction, legacy history identity, given priority, and concurrent retries passed.

Independent structural review confirms both imports, both scheduled-writer serialization calls, admission checking on confirmation, and the exact child P2010/P2034 conflict handler and keyed replay implementation. The parent recorded outcome lookup is exact. All original 15 legacy test bodies/denial assertions are byte preserved; added PS probes retain real helper behavior. The SQL fixture is byte identical to the child, including candidate patient projection and same-patient join. Only the authorized writer, legacy test, and HTTP test differ from the child. Frontend, Prisma, dependency manifests, and scripts are unchanged.

The exact source archive and independent snapshot were frozen before tests. The sole private execution exception narrows the copied HTTP fixture's `app.listen(0)` binding to `127.0.0.1`; all assertions remain exact. The original copy, one-line diff, and both hashes are in `loopback-bind-exception.json`. The repository was never edited. One private static diagnostic initially searched for unquoted `candidate.patientId`; it failed and was preserved before correcting the diagnostic to inspect actual quoted production SQL. This was a QA harness assumption, not an application failure. Author baseline missing-queryRaw and two failed assumptions remain preserved separately and were not treated as independent proof.

Security review found synthetic fixtures, unchanged endpoint validation and role/access checks, parameterized scoped patient locking, no new dependencies/config/auth bypass/logging, and no real patient or provider interactions. Commands ran through the trusted `createRunner` with `envMode=verification`, a private verification home, and no controller/provider credentials. Existing dependencies were reused read-only; no downloads or package installation ran.

PostgreSQL used the installed pinned image with `--pull=never`, a 512 MiB tmpfs, a new owned ordinary bridge, and only loopback 55432 publication. The nonwaiting QA flock covered execution and owned resource cleanup. The owned container/network and all child processes are gone; 55432/3447/5447/8432 and the flock are free. Baseline full ID `9000f70d4ee95b9e3bde723796daa050081db4274d20c97888413479232949ad`, image, start time, healthy state, and 5432 bindings are unchanged; baseline PostgreSQL was not queried or mutated. More than 1 GB disk remained throughout.

Integrity checks compare 16,858 original source/evidence files and 12,782 prior private proof files by bytes, inode, device, and links, plus 1,706 snapshot files with the recorded bind exception. Git HEAD, index listing and clean status are unchanged. Existing historical eight-feature evidence stays attributed to its original source. QA10 attempt006 desktop/tablet evidence stays attributed to child `74b260c...`; its original failed attempts and STOP are preserved. No fresh UI, screenshots, traces, deployment, native, or actual Claude result is claimed here.

Reports, source hashes, command receipts, complete actual output, proof manifests, and the final seal are private in this directory. Root remains the sole canonical/Git/provider writer and may publish a sanitized summary after checking the handback and remaining gates. No reusable setup draft changes were needed.
