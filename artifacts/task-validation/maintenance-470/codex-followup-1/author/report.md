# Maintenance 470 continuation 5 — author source/harness STOP

Status: **IMPLEMENTED — NOT VERIFIED remotely. AUTHOR SOURCE AND HARNESS STOP.** Fresh independent QA, actual Claude review, final Codex review at the exact committed SHA, native CI and any protected diagnostic dispatch remain root-owned and unexecuted by this author. No provider/GitHub requests, DB work, secrets/config values, package installation, commit, push or other remote mutation occurred during implementation/tests.

Only three permitted source files changed on the dedicated maintenance branch at base `9817a4c1b454a5911db902021df7f51c06fc5161`. Never merge this historical maintenance branch into main or replace main's deploy workflow.

| Source | SHA-256 |
|---|---|
| `.github/workflows/deploy-backend.yml` | `41942f2b685508294158fe853af418c4a2ccf4faa4b63a6a712578ce1dc8d785` |
| `scripts/maintenance/demo-storage-inspect.mjs` | `ef67dc97b06c9bc7e7d9157240dbb71f913eb216e28ff0a28c00bce5e5d29429` |
| `scripts/maintenance/demo-storage-inspect.test.mjs` | `e52f4ea1b669758db4391ad63d163828d71fe2b1806ab36ddc704150fbf55b7d` |

The workflow adds only optional reviewed_sha, explicit demo-storage-inspect input and an independent job. All old jobs remain byte-identical, verified by suffix SHA `fc90d6c15c39d9ba8c3e54f25c20f152cbb11e531d889ef0dc67382e74e30e97`. The new job uses dedicated `demo-storage-inspect` concurrency, not railway-backend, so it cannot cancel a pending production deployment through that shared group. It requires exact repository, maintenance branch and reviewed_sha == github.sha; pins checkout/setup, runs offline tests and CLI5.66.0 installation before secret injection, and binds only existing RAILWAY_DEMO_TOKEN plus automatic GitHub token in the protected demo environment. No cleanup dependencies, erase/deploy operation or artifact/log upload.

The wrapper validates exact context and current maintenance branch SHA before/after reads. It performs project-token identity preflight, imports/calls actual unchanged inspectStorageBinding twice around two native snapshot-list reads, and compares all private CLI configuration/domain/environment/binding observations canonically. Mount, credential equality, deployment/container identity and config changes block; no secret/config/hash is published. Exact CLI argv/phase/candidate provenance and exact query+variable allowlists reject writes and foreign resources before spawn/fetch. Child output is captured/bounded with no shell. Native body, timeout, total deadline and request count are bounded. HTTP status, GraphQL, timeout/network, JSON/shape/size and CLI causes retain finite codes/phases, including the 19 original helper guard codes.

Success prints only an immutable allowlisted console receipt with validated operational IDs/counts, two binding observations, stable snapshot counts and fixed no-cleanup/no-source-storage-claim flags. Failure prints a finite annotation and receipt; raw errors/config/URLs/credentials never cross that boundary. Stable nonzero snapshot count is a successful observation and never triggers deletion. First/second binding observations are not atomic and can detect only observed drift; no project-wide visibility or complete file/cache/backup cleanup is claimed. Array order changes conservatively count as drift. Actual hosted API/CLI/environment permissions remain untested.

Validation on final frozen source:

- `node --test scripts/maintenance/demo-storage-inspect.test.mjs`: **115 passed, 0 failed/skipped/cancelled**. Actual immutable helper exercised, all 19 guard codes, fixed target/context/allowlists, early and late branch drift, snapshot drift/limits, ten valid-but-changed private binding cases, second-observation guard failure, output/annotation redaction, forged receipt/context refusal, bounded transport failures and unchanged old jobs covered.
- Both new modules pass `node --check`; `git diff --check` passes. No UI/application/package/schema changes, so no application build or browser gate was claimed.
- Previous author test runs are retained: attempt1 original contract 100/100 pass; attempt2 amended contract 111/111 pass; final attempt3 115/115 pass. No failing test run is hidden. One unsuccessful patch application changed no source and was corrected before validation. These are author test captures, not resets or replacements of implementation rounds 1–4.
- Both imported helper hashes remain exact: storage `f663075284f14b479fd4c5d2bb2dbf952c0b360fe3dc5582a3490a57dd0e5189`; inventory `ea94b7ff88a2570eb57c7e86c2b5ff64544a99d67f6be42d2451d2ad8d833bb1`.
- All **5,931** prior-present proof files independently hash-match (1,149,600,589 bytes). The manifest remains 982,837 bytes, SHA `4c2716a4f64483d123e5eedfcf71a97e04f336284a30dfe0af07d4295d68a649`. Original contract/plan are unchanged; amendment1 was read after durable reservation and before its behavior edits. Old attempts remain preserved.

Evidence lives in this owned directory: `author-source-seal.json`, `source-input-manifest.json`, `frozen-source/`, `author-test-attempt-1.tap`, `author-test-attempt-2.tap`, final `author-test-attempt-3.tap`, `validation-results.json`, `prior-proof-check.json`, `inputs-before.json`, `workflow-before.yml`, `workflow.diff`, and `git-status.txt`. The final seal binds exact source/input/TAP hashes. Synthetic strings in tests are fixtures; no real credential values were read.

The exact original live binding guard remains unknown. Root must reserve fresh independent QA and complete the required exact-SHA review/publication flow before any diagnostic dispatch. This implementation neither repeats completed SQL deletion nor closes issue470/unblocks release.
