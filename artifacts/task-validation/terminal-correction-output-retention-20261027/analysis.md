# Retain evidence of known terminal correction failures

Trusted base/main 655f028e3b0bdcc621ac15209fd0af38cee3d26b. Tested immutable source 0fa1d7266e148e78dc0cffcaa95edbd7e539153d. PR515 is already merged and remains historical; this small follow-up fixes its proven post-review QA retention gap.

## Actual failure and limits

Official normal correction run40461210338 executed implementation7 for issue506. Model execution, verify-before, simplify and verify-after passed. Independent QA then returned BLOCKED; controller phase is blocked with failureCode independent-qa-blocked. Workflow success means a partial controller result, not a clinical success. The branch remains5105becde8bb222652ab2df7e72b0d32f05a7262. No attempt is reset or replayed.

The terminal upload12715351500 contained exactly two files: diagnostic.json and one verification JSON. The independent report and implementation7 changed code were not exported because CLI and exporter admitted only verification failures. Read-only relay40465140627 verified the native ZIP SHA25629166c2b8f21acb536da3bdaae6c4f463aa1880b1b6db1b97f683e72f0a0c990 and exact inventory. The QA7 finding text and changed source are UNAVAILABLE. This source does not claim their cause or invent recovered output. A later correction from known published source must be a NEW authorized attempt with full previous journal preserved.

## Behavior and guards

The shared knownTerminalFailure predicate admits only definite terminal initial/correction outcomes with exact native checkpoint, source/base, plan and feedback identity and no active or unknown publish operation. CLI and exporter use the same predicate. Existing physical checkpoint verification, allowed scope, regular-file/mode/hash/size checks, symlink/path refusal, credential guards and bounded output remain. Safe typed actual BLOCKED model reports are checkpoint-bound and retained without changing status or findings; unavailable or unsafe reports receive finite truthful availability metadata. It does not export arbitrary raw model output or normalize an approval. Unknown/running/publish and unsafe scope are refused.

No controller retry loop, runtime allowance extension, external authorization, provider, sandbox, stdout policy or artifact upload permission is changed. A safe partial export is not a restorable full ephemeral checkpoint. Remote durability requires actual upload receipts; this pre-publication packet does not claim a future clinical recovery or closure.

## Real validation

Author baseline regression:17 tests,9PASS/8FAIL. Final focused49PASS. Required native CI-equivalent37files:1738 total,1735PASS,3 Windows skips,0FAIL (35 bug-domain files1683PASS/3skip plus2 required script files52PASS). Independent fresh QA VERIFIED_CORE_TERMINAL_RETENTION_SOURCE, blockers0, independently ran49 focused tests and verified exact immutable source and the required-suite evidence. Author projection SHA256fcda630714593598bcb4715e77eb78288c59274396d7f67bdcda10632647f209; author seal SHA256fc3231862e4dec050ccae449b77602d17a944f1acde1dcfc5da24994a4d4117f. Independent seal rawSHA256 6e69cea1693c74a18c2eeb2df79bb13000e84e5a54440b5d8a2635c3c8120807.

An optional broader62-file run had1757PASS/34FAIL/3SKIP and is NOT claimed green. Its raw log remains in the private author output; the report and immutable baseline identity proofs preserve missing sparse fixture, three unchanged broader static assertion and zombie-process observations. No existing test was deleted, skipped, weakened or relabeled green. Required remote six-check CI on the actual published head remains authoritative. Raw local TAP logs remain preserved locally and are not duplicated into reviewer context.

## Exact source identity

| File | Git blob SHA1 | Raw SHA256 |
|---|---|---|
| agent-team/src/bug-pipeline/cli.mjs | 1b70d185805929ecd26564b20aeb9d57d8ccc660 | 8b631bc276749d238e095c45b9964bdbb3c9f5e916986d224bc28c95325e9898 |
| agent-team/src/bug-pipeline/failed-output-export.mjs | 7db3088515a1cc6a26e20d569635566756a8dfd6 | 237bdaf5fb30bf9c461af9df51d21ec750a09ea4e9cfb9744ec6767b81a11a53 |
| agent-team/src/bug-pipeline/workspace.mjs | 6c87559085a55e169694a74e4ec613d46e6de9ce | 307c2053c4a6b08fc9c5e2398f3bf20493d63e4f88d278b9ba00df89a1ca6e03 |
| agent-team/tests/bug-pipeline/terminal-output-retention.test.mjs | 0a5af6b4b4a1852ae9702b9542d71d8f46f949f2 | 3b3c5fa79cd60b775a021b78c38b8eab8c3774c474018fcea3dc987b74ba9702 |

The final packet-only head must retain every pair. AFTER all six current-head app15368 checks succeed, an authenticated plain comment will bind actual head, these pairs, actual CI IDs and QA before a genuine peer request.

## Sequential gates

Native standalone constructor verification and actual reader capacity follow publication. Current-head six CI, genuine Claude review, NEW independent final Codex review and ordinary protected merge are pending sequential gates; neither this peer nor the future final review is falsely declared complete here. Automatic trust-root human release holds remain unchanged. User-authorized ordinary protected bootstrap is used only after genuine peer and fresh final verification, without invented human approval or force/admin bypass.

Clinical506 remains unresolved. Clinical507 has a genuine approved peer but its newer final Codex review requested changes, so it is also unresolved. Issue516 backend/client partials,505 skills/runtime,475 original-PDF acceptance and470 demo maintenance remain separate unfinished work.
