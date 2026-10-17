# Review label handoff — coordinator validation

User-authorized operational workflow change; base main299ba8ff8d048631cdb969f26656d02de981da83.
Implementation cycle2/4. Source ownership and normal clinical ledgers unchanged during development.

## Acceptance Criteria Result

| AC | Result | Evidence |
| --- | --- | --- |
| AC1 PR+issue exclusive handoff labels | PASS | independent-qa2/browser-result.json, screenshots |
| AC2 Authenticated CAS/nonce/SHA report protocol | PASS | 633 regression tests and independent adversarial probes |
| AC3 Autonomous local Max prompt and explicit initial infrastructure recovery | PASS | docs/claude-local-review-prompt.md, protocol tests; actual Max execution not claimed |
| AC4 Independent QA, browser evidence, safety and dashboard | PASS | independent-qa2/validation-report.md and final-seal.json |

## Validation

Independent QA1 FAILED on distinct-publisher feedback and dirty final-QA worktree. Both proven
failures are retained. Cycle2 fixes have a fresh independent gate:633regressions/630PASS/3existing
Windows skips,12validatorPASS, frontend typecheck/build PASS. Real Playwright9actions with
synthetic HTTP GitHub, production protocol/controller/dashboard and real Git/worktree PASS.
Six PNG, two videos fully decoded, two traces CRC verified. Root checked all15source/32QA2/
11QA1 artifact hashes and inspected actual browser screenshot. No real Max, deployment,
patient database or provider model was invoked by QA.

First sparse local regression omitted a required historical trace fixture; restored that
tracked fixture through sparse checkout, without changing code/assertions. All failed and
final author logs are retained. Independent reports explicitly distinguish fixture/cache
failures and historical RED proof from current GREEN; no invented replay of missing bytes.

## Final Decision

CLOSED — VERIFIED

This decision covers the operational implementation and local QA. Protected native checks,
trusted-main activation and actual external Max/clinical deployment are subsequent stages,
not certified by synthetic evidence. Clinical source issues remain open until their trusted
release evidence is verified.
