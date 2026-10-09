# #406 implementation / policy receipt

Root is the sole application writer in C:/w-406, based on released main45f3582d.
The pending #405 application changes are not present here. Unrelated launcher script changes
and Ruflo generated metadata are excluded from staging and publication.

Contract validated before source edits. RED: frontend3/4 failed for bad option/legacy preview/
missing explicit type; backend missing effective-update validator export. GREEN: focused
frontend38/38 and backend48/48; both types/builds and secret scan pass. Frontend full suite
1179 tests,1167 pass,12 exact unchanged baseline failures,zero new. Native PostgreSQL18.4,
56 candidate migrations:6/6 persistence/auth/review cases pass with successful fixture cleanup.
First DB attempt found missing runtime DLLs; second completed assertions but exposed a harness
pool shutdown error. Harness now waits for the external pool idle timeout; rerun exits0.
No application change was needed for that harness lifecycle repair. CI uses PostgreSQL16;
local18.4 proof is not claimed to be an identical CI environment.

ALLOW: freeze explicit scoped source/tests/doc paths into a local commit for independent QA.
User has authorized commit/push/deploy, but production promotion remains DENIED until fresh
independent QA and root rerun satisfy all criteria. No automatic clinical conversion,
production patient mutation, migration, auth change, dependency installation or external AI call.

Next owner: fresh independent QA, evidence-only writes; root stops source writes during handoff.
