# Standalone PR review subjects

The trusted-main handoff CLI supports explicit review-only adoption of an existing PR. Normal bug batches retain their identity, plan, editable-file and release guards. A standalone subject lives in `standaloneReviews` in the existing CAS state file; its real PR number is never used as a source issue. Only an authenticated authorized maintainer can adopt or revise it.

Run the CLI from trusted reviewed main, never from a PR checkout:

```sh
node agent-team/src/bug-pipeline/review-handoff-cli.mjs adopt --pr N --manifest /absolute/manifest.json
node agent-team/src/bug-pipeline/review-handoff-cli.mjs request --pr N
```

The maintainer supplies a bounded JSON manifest with these exact top-level fields:

```json
{
  "schemaVersion": 1,
  "repository": "l2v-hub/ClinicOS",
  "pr": { "number": 81, "url": "https://github.com/l2v-hub/ClinicOS/pull/81" },
  "sha": "CURRENT_HEAD_SHA_40_HEX",
  "baseSha": "FROZEN_PR_MERGE_BASE_SHA_40_HEX",
  "baseRef": "main",
  "branch": "feature/actual-branch",
  "issues": [],
  "packet": { "path": "artifacts/task-validation/standalone-pr-81", "files": {} },
  "sourceManifest": [],
  "implementation": [],
  "reviews": [],
  "reviewLedger": null,
  "reviewReports": {},
  "releaseHold": "Preserve existing release/deployment hold"
}
```

`packet.files` maps every tracked relative file in that packet to its SHA-256 content digest. Required files are task-contract.md, analysis.md, implementation-plan.md, validation-report.md and imported-history.json. Each imported implementation attempt requires its original contiguous round, status, historical `subjectSha` and `evidence` (a frozen relative packet file). Preserve original fields and evidence; do not replace actual history with a count. At most four attempts and four review rounds are allowed. A failed/blocked uncommitted historical attempt may honestly have `subjectSha: null`, `uncommitted: true` and its actual `sourceManifestSha256`; a passed attempt requires a real tested commit.

`baseSha` is the frozen PR merge base, authenticated through GitHub compare against the current native main tip and pinned head. Main may advance while that merge base stays unchanged; changed review ancestry fails closed. `sourceManifest` contains the full frozen merge-base-to-head tree delta outside the selected packet, including old artifact blob identities. Each entry has exactly `path`, `blob`, `mode`, `baseBlob`, `baseMode`; blob fields are Git blob OIDs, modes are 100644 or 100755. Deleted sides are null. Symlinks and submodules in the changed scope fail closed. Historical artifact bytes need not be downloaded. All non-validation-artifact Git objects and modes must match the latest passed attempt's tested commit, so evidence publication can change the head without transferring validation across source/config changes.

The committed `imported-history.json` contains `implementation`, `reviews`, `reviewLedger`, `reviewReports`, `sourceManifest`, and `packetFiles`. Its source manifest and implementation are exactly those supplied to adoption. `packetFiles` is exactly packet.files excluding imported-history.json itself. This avoids a self-referential current commit SHA; the CAS adoption record binds the final current SHA. Prior review reports and ledger must be preserved and hash-consistent. New review rounds append to the immutable imported prefix.

Both nonempty branch-required checks and all currently reported PR checks must pass (skipped checks are allowed only in the latter inventory). Forks, draft/closed PRs, changed base/head, fake or closed source issue IDs, incomplete tree inventories, packet changes and existing normal batch ownership block adoption and reservation. A new revision of the same PR requires a fresh packet path, preserves branch, issues, release hold and all historical attempts/reviews, and retains every earlier packet byte at its original path on the new head (verified through preserved packet digests); old attempt evidence copies in the new packet keep their original digests; corrections require a new tested commit and an available implementation attempt. Evidence-only head updates retain their historical tested SHA. Existing running workers cannot be replaced.

The local Claude coordinator uses the same status/claim/submit/reconcile commands. Claim consumes a CAS-reserved round before analysis. The report remains authenticated-owner, nonce, request, round and SHA bound, validated against the entire tracked head tree. Exclusive handoff labels apply to the PR only. The normal pipeline imports the comment and starts a fresh independent read-only Codex QA after clean Claude review. Neither reviewer executes PR tests, installs packages or invokes source code. Native checks and committed evidence establish execution results; the reviewers inspect their adequacy.

Findings, changed feedback or an explicitly failed owner QA stop at an orchestrator handoff. This adapter does not automate standalone source corrections. Privileged workflow/auth/tool changes remain orchestrator-owned. The infrastructure merge function requires a trusted explicit file allowlist, genuine clean Claude plus independent Codex proof, current checks, unchanged subject/feedback and no release hold, then reuses the existing exact-SHA protected merge API. Application and deployment changes fail closed at this boundary and require the verified deployment controller. The trusted main controller automatically invokes this boundary only for the fixed eighteen infrastructure paths in its source policy (the adapter’s fifteen tool/test/docs paths and the three source-topology diagnostic paths). PR manifests and environment flags cannot expand that list. It saves a CAS merge reservation, records the confirmed exact-SHA merge receipt, and can recover a completed merge after interruption without another review or merge. Merged subjects are terminal on subsequent ticks. No deployment, provider call or issue closure is introduced.

Installing this adapter itself requires independent QA and genuine Claude review before publication to main. Until that bootstrap is reviewed and merged, existing main cannot claim that standalone adoption is live. A prompt, queued label or fixture is not an actual Claude review or a deployment result.

The standalone-only finalizer shares that exact controller path:

```sh
node agent-team/src/bug-pipeline/review-handoff-cli.mjs finalize --pr N
```

After genuine Claude review, it invokes a separate actual Codex read-only QA session with the configured senior planner (default gpt-6.1-sol), then applies the same fixed-policy protected merge boundary. It reuses an existing explicit Codex authentication directory, or an already-existing current-user .codex directory without reading/copying tokens. Model and GitHub credentials remain separated. Runtime outputs live outside the reviewed worktree. It does not run application installation/tests or the application-execution doctor; Codex itself must support its read-only sandbox. Missing authentication, unavailable sandbox or failed QA records a block/pending ownership for explicit recovery, never a verified result. Running this tool from a candidate PR on an authenticated PC remains prohibited: first complete the independently audited source plus genuine review bootstrap and use only the resulting trusted pinned tools. Clinical release holds remain effective.

Standalone metadata is sanitized by field with an explicit two-MiB aggregate cap and bounded structure. Each retained report separately passes the existing review schema/content bound (100,000 compact JSON characters), with at most four reports. The adoption descriptor file and standalone report-file pre-read are bounded to512,000 UTF-8 bytes; normal batch report-file pre-read remains60,000 bytes. The final serialized review comment remains bounded to60,000 UTF-16 code units for either subject type. Stored pretty report JSON has separate150,000-code-unit/512,000-byte representation caps, while the unchanged compact review validator enforces100,000 code units. CJK and surrogate pairs are measured consistently with that validator. The normal batch100KB structured-text policy is unchanged.

Durable state saves preflight the actual pretty JSON UTF-8 payload plus512KiB for each active external-review, independent-QA or merge result at a fixed8MiB limit before any API mutation. Every writer counts reservations across normal batches, manual batches and standalone subjects; each standalone subject also includes its own reservations in its compact2MiB cap. A claim or QA that cannot reserve capacity stops before persisting a running round or starting inference. Recording the result releases its allowance atomically. This conservative backpressure keeps other writers from spending promised result space. Contents responses above1MiB may omit inline data; controller and read-only dashboard load the exact metadata-pinned Git blob, enforce file/encoding/size/base64/UTF-8 bounds and its Git blob digest, then parse JSON. Blob transport output is bounded to16MiB and CAS retains the original Contents blob SHA. Oversized or malformed state fails closed; no download URL or credentials are copied.

A pre-existing running independent Codex reservation is pending ownership. Concurrent finalize/controller calls return without changing state or labels, starting another inference, or merging. Only the owner records its model result or explicit execution failure. An existing merge reservation on a still-open PR is also pending; only a confirmed exact-SHA completed merge is recovered automatically. An operator must explicitly diagnose an abandoned reservation; elapsed time alone never authorizes a retry or changes budgets.

Default state saves retain strict compare-and-swap behavior. Trusted orchestration explicitly enables at most three disjoint-entity rebases after a confirmed409. Each retry merges the original persisted base, intended change and fresh remote state into a new body; it reruns full schema/ownership/capacity validation and the original native/authentication guards. Concurrent changes to the same entity, or conflicting shared root fields, fail closed. Caller collection, entity and nested attempt references remain valid after synchronization. This is bounded best-effort persistence: exhausted retries or a same-subject conflict can still leave a durable QA reservation running after the local result could not be saved. An operator must diagnose that case; the controller never silently repeats the inference or resets a budget. Persisted diagnostics use bounded owned error codes, without raw model output, stderr or credentials.
