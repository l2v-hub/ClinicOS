# Author validation — cycle3/4

Baseline d1324cb3; branch codex/standalone-pr-review. Root authoritative CAS reserved attempt3 before edits. Attempt1 and attempt2 FAILED independent QA; their original source freezes, reports and evidence remain immutable. Cycle3 source is stopped for a fresh independent QA3, with fifteen source/test/docs paths frozen in source-freeze.json. The only new trusted policy files are github.mjs and github.test.mjs (fixed eighteen paths total).

| Acceptance | Author result | Evidence |
| --- | --- | --- |
| F3: valid CJK/astral and pretty JSON storage | PASS | Existing compact100000UTF16 code-unit review validation unchanged; raw stored representation150000codeunits/512000UTF8bytes; aggregate2MiB unchanged. Luna bounded pure test plus senior near-limit four-report and100finding cases |
| Standalone UTF8 CLI pre-read | PASS | ProductionCLI DI with actual temp report files:50000CJK and24900emoji import; standalone512000-byte pre-read; normal60000-byte pre-read unchanged; final comment60000-codeunit guard still rejects61000ASCII summary before send |
| F4: large durable state readable, SHA-bound | PASS | Actual QA2 synthetic1,124,638-byte state now loads through Contents encoding:none→metadataSHA GitBlob with exact size/base64/UTF8/digest checks; no URL fallback |
| Bounded save/CAS/readonly dashboard | PASS | Exact8MiB raw prettyJSON saves/reloads; >8MiB rejects before any API/guard; invalid metadata/encoding/base64/size/hash/UTF8/JSON cannot authorize save; original metadataSHA retained across CAS409; dashboard uses same decoder without branch initialization/writes |
| Existing concurrent owner remains pending | PASS | Production finalize and pipeline barrier while first independentQA awaits: second caller changes no state/label, invokes no model/merge; first stores result by CAS and merges once. Existing open merge reservation also stays pending; actual completed receipt recovery retained |
| Prior integrity and normal boundaries | PASS | Fifty cycle1/QA1/cycle2 proof files and49QA2 evidence files unchanged; normal plan/state/100KBguard, externalreview rounds, protectedmerge and clinical release holds retained |

Full author regression `node --test agent-team/tests/bug-pipeline/*.test.mjs`:670tests,667PASS,0FAIL,3existing native-Windows-onlySKIP. Exit status preserved. Prettier and git diff --check PASS. Source edits stopped after that regression. Relevant logs and counterexample scripts/results are append-only under cycle3/.

Exact QA2 Unicode counterexample now schema-valid, submitted and imported:50106compact codeunits,150106UTF8bytes,50373comment codeunits. Actual local committed PR393/PR491 trees/packets also accept that Unicode report through the production handoff with synthetic authorization/nativechecks/CAS only; each retains original three implementation attempts, then four near-limit multilingual reports validate together. PR393 importedsubject141351codeunits; four-reportsubject486548codeunits. PR491 importedsubject63548; four-reportsubject408745. This proves local source/input compatibility, not actual hosted adoption, nativeCI or model review.

GitHub state file fallback is bounded at8MiB raw bytes and16MiB blob-response output, checks regular-file metadata, exact metadata/blobSHA and declared/decoded size, canonical base64, actual GitBlobSHA and valid UTF8 before JSONparse, and retains the Contents metadataSHA for optimistic concurrency. Small inline compatibility remains for existing transports; supplied size/encoding is validated. Failed loads do not authorize saves. Save bound is measured on actual pretty serialized UTF8 payload before mutation or guard awaits.

A running independent Codex reservation is pending ownership, never inferred abandoned from a second invocation. It is not automatically restarted or cleared. Explicit owner execution failure remains blocked/pending for operator diagnosis; no review or implementation budget reset was introduced.

No author commit/push, liveGitHub mutation/read call, model/provider invocation, DB operation, deployment or merge was performed. Tests use local synthetic transports and Git objects. Root remains sole publisher/state owner. The parent's earlier actual cloud Codex initialization probe failed on a managed read-only config filesystem before model review; this author does not claim that limitation resolved or that local-PC model runtime has executed. Genuine adapter Claude review and independent actual Codex review/bootstrap publication remain pending. Clinical application merge/deployment stays outside the infrastructure-only boundary, and all existing holds persist.

## Final Decision

IMPLEMENTED — NOT VERIFIED

Author cycle3 regression passed. Fresh independent QA3, genuine external reviews and protected publication remain required; no main-live/deployment claim.
