# Candidate 2 acceptance addendum

Root reserved correction cycle 2 after independent QA cycle 1 FAILED VALIDATION. The original contract, candidate1 manifest and independent-qa evidence remain historical and unchanged. No implementation/review ledger is reset.

AC1 terminology correction: the dedicated demo uses **native exact-source deployment** through the official `serviceInstanceDeployV2(commitSha)` API, using only the existing demo token in its dedicated environment. It validates the fixed project/environment/service/domain, exact source repository and main trigger before mutation. It does not upload source with the CLI or infer commit provenance from a message. This is the protocol decision already explicitly authorized and recorded during candidate1.

Cycle 2 corrections:

1. Live readiness must contain an exact, bare, valueless `no-store` Cache-Control directive. Parse comma boundaries outside quoted extension values; accept legitimate case/OWS/combined directives; reject prefix/suffix/value lookalikes, argument-bearing no-store and malformed headers. Preserve the original three independent RED regressions and record their fresh passing execution separately.
2. Native active deployments must contain exactly one deployment: the expected UUID with SUCCESS. Old/new coexistence, duplicate identity and transitional statuses cannot establish proof. Deployment polling may wait for convergence and only requests public readiness/creates its receipt after the old deployment disappears.
3. Add the six existing unconditional pull-request checks to the managed main ruleset, all bound to Actions app15368: bug-pipeline-tests, secret-scan, frontend-tests, archive-tests, gate, browser-e2e. Preserve existing checks, human approval rules, strict mode, bypass actors and default workflow permissions. Read managed, cumulative effective and available classic check bindings before ANY mutation; reject wrong bindings or failed reads, including later result pages. Verify every effective mandatory check afterward and remain idempotent.

Authorized additional source scope is only scripts/quality-gate/configure-bug-repository.mjs and agent-team/tests/bug-pipeline/repository-settings.test.mjs. The eight earlier source files remain in total candidate scope; no new workflow, dependency, clinical data/schema, frozen clinical packet, control budget, GitHub state or deployment change is authorized by this addendum. Root performs the existing native configure-repository dispatch only after reviewed trusted-main activation; this local candidate does not claim any real settings change.

Fresh dedicated independent QA cycle 2 and native CI remain required after stable handoff. Actual feature Claude review and live release proofs remain future gates.
