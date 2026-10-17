# Independent QA1 — issue review communication

Final Decision: **BLOCKED**

Dedicated QA session, never the author. Candidate implementation 1/4 remains uncommitted at baseline `8124b1bc88c0f086b1ee328214f87f4802005d11`, bound to source manifest SHA-256 `ee950d8c2403885facb1d27105011fb1505619a5aadcdb1bc7e5b7d2a4f20c8c` and author candidate seal `8407c6efd99a25846b2ae1654b9abf3538b25e88b90e444460134cbd1f24c1bb`. QA changed no implementation, contract, author proof, guard or budget.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS — explicit user communication request and all AC1–AC7 read; three frozen contracts verified | `phase0-contract.md`, `before-proof.json` |
| 1 Diff review | **FAIL** — two during-guard publication races violate AC3/AC4; source scope seven, frozen guards nineteen otherwise unchanged | `diff-security-review.md`, `source-preservation-check.json` |
| 2 Build & tests | Existing suite PASS: 622 total = 619 passed / 3 native-Windows skips / zero failures; independent HTTP probes **7 PASS, 2 FAIL**; types and production build PASS, 740 modules, 29.34 s; syntax six / formatter seven / contract / whitespace PASS | `full-regression.log`, `independent-probes.json`, `types.log`, `build.log`, `static-checks.json` |
| 3 Actual browser | Browser runner exit 0, 12 scenarios exercised: 10 expected behavior checks PASS, two confirm product failures and are **not acceptance passes**. Zero page/console/relevant HTTP errors. Reload persistence, mirror/ack idempotency, findings/digest visibility, existing correction → test → simplify → test → independent QA → new SHA handoff, failed/spent old-worker state all exercised | `browser-results.json`, screenshots, `trace.zip`, `review-bridge.webm` |
| 4 Security | **BLOCKED** — bridge policy authorization can become stale during its own subject awaits. No real credentials, PHI, external repository operations, provider inference, production data or new dependency | `diff-security-review.md`, `privacy-audit.json` |

## Required corrections

1. **SEC-1 (medium):** `issue-review-communication.mjs:283` checks actor authorization before `subject(expected)`'s asynchronous full cohort reads. Revocation inside that guard still allows the first label mutation. Own HTTP fixture records exactly one write with `authorizedAtWrite: false`, followed by rejection. This demonstrates the application-policy stale authorization, without asserting that GitHub itself would accept an API action that its own permissions reject.
2. **COR-2 (medium):** source validation at `:284` / `:378` also precedes the full subject reads. Editing the source during that interval publishes its former body/digest into the PR; only acknowledgement rejects. The source-race screenshot shows current issue text `New source version` beside actual stale mirrored `Filter lost on reload`.

Revalidate actor/source near the final publication transport boundary after subject inventory, add meaningful regression assertions for these precise await points, and preserve all cohort/PR/state/budget checks. Do not promise atomic remote multi-resource reads. These are source defects requiring a root-reserved implementation attempt and a NEW dedicated QA session; this QA did not fix them.

## Evidence and execution limits

The browser runs the actual production communication module through a newly written HTTP GitHub fixture on loopback and an internal QA-only surface. It does not import the author's registered test fixture. It executes the actual existing `externalReviewStep` correction control flow with synthetic workspace callbacks; no model or real implementation is invoked. All network operations in the surface are local fixture calls. The native workflow, actual PAT notification delivery and actual Max report remain root-owned and unverified here.

`new-sha-ready.png` and `blocked-review-preserved.png` demonstrate the expected cycle and retained failed attempts; `finding-role-race.png` / `finding-source-race.png` show failures. Final trace ZIP is CRC-valid and final VP8 video is real, 1440×1150, 4.12 seconds. Screenshots visually inspected.

QA harness preflights are preserved honestly: absent default ffmpeg cache was resolved with the existing system-ffmpeg cache; a no-op role test was changed to request a real pending label transition; an earlier complete browser run's recorder-close order required SIGINT after its 12 assertions (exit 130), retained in `browser-history-close-order/`. The final run closes the recorder correctly and exits 0. None of these harness adjustments changed product source or constituted a product implementation attempt.

All seven source hashes, nineteen guard Git objects, three frozen contracts and twenty author files were reverified unchanged. Borrowed local dependency symlinks are removed after validation. No commits, pushes, issue comments, review retries, durable-state writes, labels on GitHub, deployment, merge or issue closure were performed by QA. Root retains all publication decisions. Existing real failed Max attempts are not repaired, retried or approved by this feature.
