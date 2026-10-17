# Independent QA — demo-source-topology

Verdict: **READY FOR CODEX QA**.

Reviewer: `/root/topology_independent_qa`, a fresh session independent of the implementer.
Candidate: implementation **3/4**, based on `299ba8ff8d048631cdb969f26656d02de981da83`.
Frozen source manifest SHA256: `ec6267fa6002af6620226dc89092092830a84be6068b0ef78448d767d303ca10`.
Scope: three new source files, four pre-implementation contract documents. All 22 legacy
source/release-guard files were independently compared to their baseline Git blobs.

## Gate results

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | Frozen task-contract, analysis, implementation-plan and source-references read; manifest verified before execution in `provenance.json` |
| 1 Diff review | PASS | All three new source files reviewed; no correctness or security findings; legacy scope unchanged |
| 2 Build and tests | PASS | `logs/operational-tests.txt`: 127 tests passed, zero failures/skips. `build-results.json`: frontend app and config typechecks plus actual Vite production build all exit 0 |
| 3 Browser and HTTP | PASS | `probe.mjs`, `browser-results.json`, `logs/browser.txt`: nine scenarios, 53 actual loopback HTTP requests, zero unexpected console/page/HTTP errors; nine final screenshots, one complete passing video and trace |
| 4 Security/privacy | PASS | Static trust-boundary review, parsed YAML assertions, actual negative browser cases and `media-privacy.json`: images/videos fully decoded; PNG OCR and all trace members scanned; no real credentials, patient data or provider calls |

## Acceptance criteria

| AC | Result and proof |
|---|---|
| AC1 | PASS. Workflow fixes repository/ref/exact reviewed SHA, pins all three actions, disables checkout credential persistence, runs tests before the sole existing-token step, uses read-only GitHub permissions and the existing Railway mutex. Legacy context/current-main verifiers are unchanged. `workflow-assertions.json` records independent parsed YAML checks. |
| AC2 | PASS. Operational tests independently rerun plus actual production `createClient` and `inspectTopology` through a synthetic loopback HTTP provider. Multipage scenario follows environment and service cursors across both snapshots; 18 reads and four `c-1` follow-ups asserted. Malformed cursor progress, unsafe metadata, foreign ownership, provider errors and changed snapshots reject with exact fixed codes. `schema-assertions.json` checks 30 selected fields/arguments against the hash-verified official public schema snapshot; it does not validate the hosted API. |
| AC3 | PASS. Singleton, multipage and inaccessible-environment results all keep `projectWideVisibility: unproven` and `serviceConnectAllowed: false`. Denied environment content is never queried; its result sets pagination completeness false. Mutation request fails before any transport request. Frozen receipt branding rejects a deep-cloned fabricated result in each successful browser scenario. |
| AC4 | PASS. Three additions only; 22 legacy sources remain byte-identical to baseline. Only static read queries are allowed and observed. No SQL, deployments, source writes, reconnect, identity changes, provider retries, model calls or remote ledger changes were performed. |
| AC5 | PASS. Fresh independent real browser/local HTTP execution, source and contract verification, meaningful negative cases, decoded screenshots/video and CRC/member-scanned trace retained under this QA packet. |

## Review detail

- `scripts/automation/inspect-demo-source-topology.mjs:55`: bounded metadata projection rejects unsafe
  values; provider extras do not cross the receipt boundary.
- `:71`: connections bound pages, nodes, total count and cursor progress; duplicate IDs are rejected.
- `:102`: visible project/environment ownership is checked before nested reads; inaccessible
  environments retain explicit metadata without requesting their content.
- `:188`: target service source and trigger metadata must agree with the legacy scoped inventory.
- `:236`: project token scope and unknown project-wide visibility always disallow service connection.
- `:243`: operation denylist precedes client access, only five fixed read queries are used,
  transport failures map to fixed phase-specific constants, two snapshots detect observed drift,
  and trusted-main checks run before/between/after snapshots.
- `:295`: only an immutable inspector-produced object may be serialized; exact context, receipt
  size, secret-shaped metadata and actual configured token reflection are checked.
- `.github/workflows/inspect-demo-source-topology.yml:20`: fixed trusted-main dispatch and exact SHA
  gate, sole existing credential step after tests, read permissions and pinned actions verified.

No actionable correctness/security findings found in this candidate. The public schema snapshot
hash was checked independently as `3c3d1448f2a746d6e5977ba3aa205889f959c427be5cfe37c72e79b1fa65f2be`.

## Execution provenance and artifacts

- `screenshots/singleton.png`, `multipage.png`, `inaccessible.png` visibly show concrete scope,
  pagination and service-connection refusal values. Six rejection screenshots show actual fixed
  codes; the result is not a placeholder or generic application homepage.
- `trace/trace.zip`, `video/*.webm`, `playwright-report/index.html`, `browser-results.json` bind the
  actual local test flow. No data is written, so product persistence/reload testing is inapplicable.
- First own QA probe incorrectly expected `DUPLICATE_ENTITY` for its cursor fixture. That fixture's
  empty follow-up page is correctly rejected as `PAGINATION_STALLED`. Entire failed attempt,
  original probe, screenshots/video and reason are retained under `attempt-1-probe-expectation/`.
  Only the exact expected safe rejection code was corrected; no production source or other assertion
  changed. The complete nine-scenario flow then passed. This is not an author implementation cycle.
- Existing dependency versions were reused without install or lockfile change: Vite 8.2.2,
  TypeScript 6.0.3, Playwright 1.61.1, each matching this checkout's package-lock. One QA-owned temporary
  dependency symlink was removed in `finally`; no shared dependency or user process was altered.
- Both frontend typechecks succeeded and the production build completed. Existing chunk-size/plugin
  timing warnings are in `logs/build-2.txt`; no error was suppressed. Generated bundles and buildinfo
  were hashed in `generated-build-manifest.json` then removed from the QA-owned packet to avoid
  publishing compiled product assets. Actual compiler/build logs and results remain.
- Full media/privacy results cover 12 PNGs, two videos (including preserved first attempt) and one
  successful trace. Passing screenshot `inaccessible.png` was also visually inspected by the reviewer.
- No backend/frontend/runtime source was touched. Product DB, backend runtime and actual provider
  integration are outside this inspect-only configuration change; no live schema, source setup,
  native GitHub CI, deployment, clinical feature or local Claude Max success is inferred.

## Residual limits and release boundary

The existing environment-scoped token cannot attest unfiltered project visibility. Pagination is
not such an attestation, and repeated cross-resource snapshots are non-atomic. Hosted schema or
permission failures remain possible and are deliberately safe fixed read failures. This candidate
cannot create a missing main trigger, repair source configuration or authorize service-wide changes.
The root coordinator alone owns publication and any subsequent actual read-only dispatch.

**READY FOR CODEX QA** — verified local inspect-only implementation; no merge, deployment or
clinical issue closure was performed by this reviewer.
