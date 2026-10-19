# Cycle2 implementation plan
1. Add standalone bounded per-field validator and per-report schema/security checks, unchanged normal100KB policy.
2. Newpacket revision adoption with prior proof map retained and checked at currentSHA; old evidence digest equality.
3. Fixed infrastructure allowlist in trusted CLI passed to normal pipeline; guard readiness/actualreviewproof/nativechecks/hold/exactSHA, receipt persistence and terminal skip.
4. Regression for both actual QA counterexamples, four reports, adversarial sanitization and true pipeline merge path. Full regression and formatting, append cycle2 sourcefreeze/report, sourceSTOP for fresh QA2.

Root-approved expansion before implementation: share finalization state/receipt transitions between runtime and standalone-only finalize CLI. CLI constructs real read-only Codex models and external runtime without invoking application execution/doctor readiness; DI tests cover production dispatch and pending outcomes. Authenticate frozen merge-base via GitHub compare against current main tip; add real-Git advancing-main and changed merge-base tests.
