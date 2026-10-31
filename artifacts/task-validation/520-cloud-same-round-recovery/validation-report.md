# Technical preparation validation

Code reviewed/tested: `2a90c6873b63ea55d866c8081a34c555b2e24d38`.
Base: `59f0a9ea60bd56d1823305da9b18fa0bca8db213`.
Evidence-only commits do not alter that source projection.

## Scope and authority

Separate infrastructure PR only. No actual Claude probe or review, execution
capability, recovery dispatch, allowance, merge, deployment or issue closure.
PR520 remains at `6b7055d773f4e36d85f149aecbf31059ed5bb00e` with the original
failed fifth round still consumed and limit five. Local primary files remain
untouched; all source work was isolated.

The explicit recovery adapter requires a separately authenticated, source-bound
execution capability, preserves accounting, claims only one technical execution,
and reuses the already verified probe without a new qualification inference.
Source is API data only. Generated missing-plan evidence is explicitly marked
not committed, and the default queue reader remains fail-closed. Publication has
fresh guards at the actual POST boundary and retains genuine reports on an
uncertain acknowledgement.

## Results

| Check | Result | Proof |
|---|---|---|
| AC1: exact independent capability, no implicit grant | PASS | New core adversarial tests, independent QA |
| AC2: one-shot same-round CAS, no allowance/history replacement | PASS | Core and real-default transport tests; persisted synthetic result |
| AC3: bounded frozen source and explicitly generated plan | PASS | Source-reader tests and [actual frozen520 packet/capacity check](evidence/qa/frozen-source-capacity.json) |
| AC4: stale/revoked/concurrent/publication failure safety | PASS | Actual publisher-boundary tests; one `--print` strictly after CAS |
| AC5: synthetic tests, browser reload, independent validation | PASS | Focused347/347; full CI and evidence below |
| AC6: separate PR only, original520 unaffected | PASS for preparation | Preservation readback; execution/merge/deploy remain intentionally unperformed |
| Focused controller/native/new tests | 347 PASS, 0 FAIL, 0 SKIP | Independently rerun on the reviewed code |
| Full application build | PASS | Frontend TypeScript/Vite and backend Prisma/TypeScript/font copy |
| Native Windows CI | 10 PASS, 0 FAIL, 0 SKIP | [source-bound CI41249496255](https://github.com/l2v-hub/ClinicOS/actions/runs/41249496255) |
| Complete Linux controller regression | 1846 PASS, 0 FAIL, 3 existing SKIP (1849 total) | Same source-bound CI |
| Real isolated sandbox / HTTP / PostgreSQL / denied external egress | PASS | Same test-only CI; no model inference |
| Synthetic browser result and persistence | PASS | [result JSON](evidence/qa/final-code/browser/result.json), [screenshot](evidence/qa/final-code/browser/result.png), [HTML report](evidence/qa/final-code/browser/playwright-report/index.html), trace/video in adjacent test-results |
| Security/privacy and source integrity | Independently checked | [source hash receipt](evidence/qa/source-integrity.json); synthetic payloads only |

## Failures preserved, not hidden

Independent QA initially found:

1. P1: the first transport called the live inference probe before CAS. Corrected
   in `2a90c687`: reuse the sealed canonical receipt; read-only run/CLI provenance
   checks and local `--version` only. New tests with the real core and default
   qualification prove exactly one review inference after CAS, zero on replay or
   missing capability, and one winner under concurrency.
2. P2: the browser harness referenced undeclared `@playwright/test`. Corrected in
   `430afa97` to use the already installed `playwright/test` and its CLI. No new
   dependency or disabled assertion. Final browser proof is tied to `2a90c687`.

The initial **FAILED VALIDATION** is retained in
[initial findings](evidence/qa/initial-findings.md). Earlier run41249319209 passed
on the superseded430afa code; it is not used as final-source certification.

Local broad Windows regression was **not green**: initial candidate1844 tests,
1646 pass,197 fail,1 skip versus untouched main1803 tests,1605 pass,197 fail,1 skip.
All192 detailed failed test identities and14 suite blobs matched exactly. Causes
include POSIX executable/permission assumptions, Windows worktree paths and
symlink privileges. A missing tracked sparse-checkout trace fixture was separately
materialized on baseline: three of its four previously blocked cases passed;
the fourth still hit Windows symlink `EPERM`. No assertions were relaxed.
The complete Linux CI above supplies the clean regression result; the Windows
setup suite independently passes on GitHub's native Windows runner.

## Remaining boundary

This proves infrastructure preparation, **not** a real Claude review of PR520 or
online resolution of issue506. The infrastructure is not on trusted main and
must not be dispatched from the feature branch. Actual recovery and any later
release remain subject to their existing explicit authority and independent
gates. No Claude approval is invented or implied by a mock report or empty run.

## Decision

READY FOR CODEX QA — separate technical PR preparation only; no activation,
merge or deployment. Independent detailed QA verdict is included with this bundle.
