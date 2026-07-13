# Task Validation Report — attempt 3 (remediation)

## Task
- Title: Agent Team LLM-first con Claude development loop e Codex QA indipendente
- Slug: 263-agent-team-llm-first
- Issue: l2v-hub/ClinicOS#263 · PR: #264 (draft, unchanged)
- Attempt: 3 (remediation of Codex qa_result comment 4957169054, decision qa-failed)
- Claim: comment 4957297633 (work.claim attempt 3, lease 2f1099fa-b2d5-49a6-bcac-e4e1cbd12d8e)
- Branch: codex/agent-team-architecture (same branch, same worktree C:/tmp/ClinicOS-agent-team, same draft PR)
- Date: 2026-07-13
- Producer: claude-development worker (Claude Code)

Attempt-2 report is superseded by this attempt but remains committed in history at the attempt-2
SHA; Codex QA artifacts (`codex-qa-report.md`, `agent-team/qa-result.json`,
`agent-team/qa-result-attempt-2.json`) are preserved byte-for-byte.

## Remediation summary

Both attempt-2 code findings resolved with strict RED→GREEN TDD:

- **QA-263-010 (high)** — a successful development run now publishes a schema-valid
  `work.claim_released` after the handoff is preserved, and released leases are excluded from
  claim arbitration, recovery, and the status projection even while unexpired. The stale
  attempt-2 claim (comment 4955564065, lease e2431891…) was explicitly released on GitHub
  (comment 4957297859) as live cleanup.
- **QA-263-011 (critical)** — nested Claude execution is made unavailable: the worker argv now
  carries the documented `--tools` (restricted surface without Task/Agent), `--allowedTools`, and
  `--disallowedTools` (Task, Agent, and claude/npx-claude subprocess denies; deny rules beat
  allow rules). The fail-closed policy is enforced identically at config validation, in doctor,
  and at worker launch; the exact safe argv is pinned by regression tests with literal fixtures.
  A timed-out worker escalates to a process-tree kill (`taskkill /pid <pid> /T /F` on win32), so
  timeout/shutdown cannot leave an Agent Team-owned process alive — and no nested Claude process
  can be created in the first place.

QA-263-008 remains explicitly unresolved as an external GitHub Actions billing condition owned by
the repository owner (reported, not faked). Finding-by-finding detail: `remediation-map.md`.

## TDD Record — attempt 3 (each RED observed before production code)

| Cycle | Finding | RED (exit ≠ 0) | GREEN |
|---|---|---|---|
| A3-1 claim release lifecycle | QA-263-010 | tdd/a3-1-claim-release-red.txt (4 fail: arbitration, recovery, projection, success-release) | tdd/a3-1-claim-release-green.txt (16/16) |
| A3-2 worker tool policy + tree kill | QA-263-011 | tdd/a3-2-tool-policy-red.txt (13 fail incl. missing worker-policy module) | tdd/a3-2-tool-policy-green.txt (42/42) |

RED evidence is normalized with `sanitizeText` (node:test YAML failure blocks emit
whitespace-only lines); the normalization is its own commit for byte-level traceability. The
whitespace regression was caught by this attempt's evidence harness running git directly — an
output-filtering shell proxy had masked it in a manual check, which is exactly why every gate
below is recorded through `runProcess` with authentic timestamps.

## Fresh verification (real timestamps in checks/command-log.jsonl)

- `node --test --test-reporter=tap agent-team/tests/unit/*` → `test-results/unit.tap` (exit 0)
- `node --test --test-reporter=tap agent-team/tests/integration/*` → `test-results/integration.tap` (exit 0)
- `node agent-team/src/cli.mjs doctor` → `checks/doctor-smoke.json` (exit 0, 21/21 checks ok,
  including the strengthened `claude-worker-options` verifying documented `--tools` and
  `--disallowedTools` against the installed CLI, and `worker-permission-policy` running the
  fail-closed nested-agent validator against the shipped config)
- `cmd /d /s /c npm run build` → `checks/build.txt` (exit 0, frontend + backend)
- `git diff --check origin/main...HEAD` → `checks/git-diff-check.txt` (exit 0, empty)

Full suite after both fixes: 80/80 (unit + integration).

## New/changed tests

- `worker-policy.test.mjs` (new): pins `NESTED_AGENT_TOOLS` and all ten
  `REQUIRED_DISALLOWED_TOOLS` by literal value; exact-argv regression for
  `buildClaudeWorkerArgs`; per-rule policy rejection diagnostics; bypass-token rejection in
  every list; launch refusal before any spawn.
- `claude-development-worker.test.mjs`: exact safe argv deep-equal (literal fixtures, never
  echoed from the implementation); refusal when policy exposes Task or lacks disallowedTools.
- `claim-lifecycle.test.mjs`: released claims lose arbitration; released claims are never
  recovered as active work.
- `remediation-loop.test.mjs`: successful development publishes the release after the handoff
  (comment-order asserted), same lease, `development-handoff-published` reason, ready-for-qa
  label with `active_claim: null` in the projection.
- `supervisor-lifecycle.test.mjs`: projection clears a lease-matched release even for a
  schema-invalid claim comment (the real attempt-2 shape) and reports `released_claims`.
- `process-runner.test.mjs`: timeout escalates to the injected tree kill; default kill provably
  terminates the child (pid liveness poll).
- `config.test.mjs` / `worker-operability.test.mjs` / `doctor.test.mjs`: required `tools` +
  `disallowedTools` keys, nested-agent rejection, missing-deny rejection, doctor negatives for
  undocumented CLI options and unsafe policy.

## Security / privacy

- The worker tool surface excludes every nested-agent tool; nested Claude execution is denied at
  three independent layers (tool surface, deny rules, prompt constraint) and validated at three
  gates (config, doctor, launch).
- No bypass or dangerous permission token can appear in any policy list or in the built argv
  (validated + regression-tested); permission mode is pinned to `acceptEdits`.
- Process-tree timeout kill prevents orphaned owned processes on win32.
- Sanitizer discipline unchanged (credentials, tokens, identifiers, deterministic whitespace).
- Evidence contains no secrets or account identifiers.

## Evidence binding (QA-263-005 architecture, unchanged)

Committed manifest binds artifacts at its evidence commit; the authoritative `evidence_binding`
envelope is generated after the final commit, published as a protocol comment bound to the exact
PR head, and machine-verified with `verifyEvidenceBinding` (blob IDs + committed contents read
from the commit). The dogfood verification result of this attempt is recorded in the handoff
comment.

## Final Decision

READY FOR CODEX QA
