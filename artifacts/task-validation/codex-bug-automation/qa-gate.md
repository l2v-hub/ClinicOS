# Independent QA gate — Codex bug automation

**Verdict: READY FOR CODEX QA for the scoped implementation and draft PR update.**

This is an independent QA session, separate from the source implementers. The full live integration remains **PARTIAL / operationally blocked**: the actual local doctor returns `claudeAuth:false` and `sandbox:false`. No paid model run, live issue execution, production merge or deployment was performed. Mocked model/GitHub adapters are explicitly distinguished from real Git process, test exit, evidence parser and browser execution.

Baseline: `fe40c01d`; branch: `codex/claude-github-labels`; existing draft PR: #471. The user conversation and `task-contract.md` define scope; the PR and its comments were read (only a prior Vercel deployment-status comment, no additional acceptance criteria). Unrelated untracked `scripts/maintenance/demo-patient-cleanup.sql` is preserved and excluded.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `task-contract.md`; `test-results/qa-pr-context.json`. AC1–AC9 reviewed, including optional exact-head production release. |
| 1 Full scoped diff | PASS after corrections | New controller modules/tests, three new workflows, guide/skill/form/README and backend package-lock deploy path reviewed. No application frontend/backend/schema edits. The mandatory independent Codex QA session runs read-only after final validation and after corrections, before checkpoint/publication; its actionable report feeds the next executor attempt within the existing budget. `qa-reviewed-files.sha256` binds the final 25 reviewed files. |
| 2 Build/tests | PASS | `test-results/qa-final-scoped.txt`: **67/67**; `qa-independent-probes.txt`: **5/5**; `qa-existing-regression.txt`: **14/14**. Separate `tsc --noEmit` and frontend build passed (`qa-typescript.txt`, `qa-frontend-build.txt`). `qa-workflow-semantic.txt`: three parsed workflows and deployment/security invariants pass. |
| 3 Browser evidence | PASS | `result.png`, `trace.zip`, `playwright-report/index.html`, `test-results/qa-playwright.txt`: **1/1**. Opt-in localhost-only QA surface renders the actual saved 67-test result, checks concrete counts and named behavior, no console/page errors or HTTP failures, and preserves values after reload. Actual PNG/trace also passed the new structural/CRC/action validators. No application UI changed; video is not required for this internal report surface. |
| 4 Security | PASS | `qa-security.md`; permission checks, trusted checkouts, exact command parsing, role credentials, protected control files, normal sandbox use, bounded durable budgets and evidence hashes reviewed. No actual secret or PHI found or accessed. |
| 5 Report | PASS for this code scope | This report and `qa-reviewed-files.sha256`; final integration activation is explicitly not certified. |

## Findings corrected before the final run

1. Review thread GraphQL omitted `pageInfo`, which could hide unresolved threads beyond the first 100. The request now includes `hasNextPage` and blocks additional pages; independent probe passes.
2. Verification/reviewer processes could inherit a local Codex auth directory when no API binding existed. Only the Codex model role can use that directory; independent no-key probe passes.
3. Agent instruction/configuration paths were writable in a model plan. Root/nested policy files and Codex configuration are now excluded; independent scope probe passes.
4. Terminal release batches could be reprocessed as blocked after their PR merged. Merged/deployed batches remain terminal; current suite covers this and REST merged-state mapping.
5. Release initially omitted AI-runtime monitoring and exact deployment checkout separation. Backend/runtime jobs are now monitored for the exact merge SHA; trusted control and deployment checkouts are distinct sibling directories, independently parsed and asserted.

The independent QA session delta was separately reviewed: a fresh senior-model session accepts only verified/blocked, never implementation status; QA rejection prevents publication and exhausts the same four implementation attempts. The scoped tests cover both properties and ordering after final verification. Implementation/simplification explicitly reads prior QA findings as untrusted feedback.

The final review also checked CAS reservation before model calls; interrupted triage and attempts block recovery without resetting limits; per-source coverage; dirty/foreign worktree rejection; frozen packet hashes; real exit codes and no-test detection; fresh evidence and symlink rejection; read-only Claude tools; four-round caps; new-comment invalidation; unresolved human review guards; SHA-bound review/evidence and required checks; no direct main push or force push. Optional release never runs merely to install this change and requires trusted main workflow, explicit configuration, protected environment and actual prerequisites.

## Action-reference correction after first hosted CI attempt

The first hosted regression run, [38861061131](https://github.com/l2v-hub/ClinicOS/actions/runs/38861061131), failed during Set up job before any tests executed because the setup-node reference could not be resolved. The three new workflows now use setup-node `49933ea5288caeca8642d1e84afbd3f7d6820020` and upload-artifact `ea165f8d65b6e75b540449e92b4886f43607fa02`. Independent GitHub REST reads confirmed both replacement commits exist in the official repositories and match their v4 tags. Only these references changed; the 22 other reviewed files retain their prior hashes. The three-workflow semantic probe passed again and the manifest was refreshed. See `test-results/qa-action-reference-verification.json`.

The existing **67/67 result remains a local test result**. This addendum does not claim a successful replacement hosted CI run; the parent will push the reference fix and observe that run. No source/test behavior changed, so the existing browser and build evidence remains applicable.

## Practical limits

- `test-results/qa-doctor.json` is a real read-only local probe: Codex CLI/auth and model configuration pass; Claude authentication and sandbox readiness fail. Normal sandbox protections were not bypassed.
- The workflow must be integrated into the default branch and supplied usable GitHub Actions credentials/model bindings, required branch checks and protected deployment configuration before an end-to-end live demonstration. GitHub secret-metadata API access was denied to the parent integration; this does not establish that secrets are absent.
- The existing repository-wide suite was not repeated: its three prior failures are documented in the previous packet, with relevant existing files unchanged. Current relevant regressions passed; this report does not claim the whole repository suite is green.
- Approval is limited to the exact files in the manifest. Subsequent source/workflow/doc changes invalidate this snapshot and require appropriate independent revalidation. Validation-report/operational evidence additions do not change the reviewed executable source.

**Codex must now re-run the QA Gate.**
