# Evidence provenance and contents

The private candidate was curated against the clean source worktree at `e405399427e7c738dc32070b17a50494b629608b`. The independent QA9 source seal records that same SHA and its source-status result.

Exact copies of QA9 `validation-report.md`, `summary.json`, `STOP.json`, `seal.json` and `seal.sha256` are under `independent-qa/`. The QA9 seal copy is 1,881-file provenance metadata; all 1,881 referenced source files in the private QA9 directory were verified against hash, size and inode before and after curation. The exact author continuation-1 report, results, hashes and STOP record are under `author/`; the author 666-file initial seal and 624-file continuation seal remain verified in their original private locations.

The QA9 summary's nested `retained.noClinicalRuntime=true` is inherited preparation-phase metadata. It is preserved unchanged for byte integrity. The later QA9 work did run the affected 19 HTTP/PostgreSQL tests and four selected actual App/HTTP/SQL checks, as shown in the sealed QA9 top-level report and summary check fields.

Only four decoded synthetic screenshots and the fully decoded selected-runtime video are copied into `media/`. `media-index.json` binds those five files by their QA9 SHA-256 values and byte sizes. QA9 redacted 77 synthetic bearer occurrences in its private trace; the raw trace, raw SQL rows, request headers and logs are not copied. No actual patient data or credentials are included.

Original seven-issue acceptance receipts and screenshots/videos remain in immutable packet8 at GitHub source commit `c02e34c0041752eb4f4772255580807201f2c863`. They are linked per issue and are not duplicated in this small candidate. Actual Claude4 approval and subsequent independent final Codex failure are separate historical records, both retained as such.
