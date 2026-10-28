# Validation report — single-developer automatic infrastructure merge

Date: 2026-10-28. Baseline `d0c5fd82e358de60b4e31879e02f04929c7b0954`. Delivery: existing PR505.

## Authorization and change

The user's explicit instruction removes the prior repository-imposed mandatory second-human/manual trust-root merge policy. See `authorization.md`. Historical contracts and reports remain unchanged and describe their original commits.

The canonical `bug-delivery` paragraph and linked current skills/docs now describe automatic ordinary infrastructure merge after genuine exact-SHA Claude approval and a separately verified Codex final. The runtime policy no longer requires a native human approval or a different GitHub account for the model reports. Trusted default scopes are instructions, workflows, controller source/tests, quality-gate source, documentation and the root instruction files. Every path must also match the trusted caller allowlist. Application, database, provider/runtime and unknown paths stay outside this merge route.

Both the actual finalizer readiness test and the pre-invocation merge guard use that same scope policy. The normal GitHub merge adapter is unchanged (`--match-head-commit`, no admin bypass). Passed implementation, clean published Claude report, fresh independent Codex final, current checks/feedback/identity, ownership, absence of hold, durable reservation, preparation deadline, native rejection recovery and unknown-outcome reconciliation remain required. No GitHub review is forged; no branch rule or credential is changed.

## Acceptance and evidence

| AC | Result | Evidence |
| --- | --- | --- |
| AC1 active instructions aligned | PASS | Ten-file frozen diff and independent review. |
| AC2 same-account model review / no mandatory second human | PASS locally | Actual standalone runtime/finalize CLI integration tests and independent 77-test run. |
| AC3 fixed infrastructure boundary + caller allowlist | PASS | Canonical/malformed/traversal and app/provider/runtime/unknown path negatives. |
| AC4 all other review/merge guards retained | PASS locally | Independent diff review; exact-head adapter unchanged; current-check, missing/stale proof, hold, concurrency, reservation/receipt, rejected/uncertain merge regression tests. |
| AC5 independent verification | PASS locally | `independent-qa/validation-report.md`: READY FOR CODEX QA; 77/77 targeted; Playwright1/1; all10sourcehashesmatch. |
| AC6 ordinary publication and live distinction | Ready for source push; live merge unverified | Source will update existing PR505 by ordinary fast-forward; no new implementation PR. Latest actual merge attempt in this environment was refused at `https://api.github.com/graphql` with `Forbidden`. No native merge, main activation or deployment claimed. |

## Executed tests

- Full native-style Node22 domain and review/security script run: **1,803 total; 1,800 passed; zero failed; three Windows-only skips**. `test-results/full-node22.tap`.
- Bounded author regression run:77/77passed. `test-results/standalone-focused.txt`.
- Fresh independent QA regression run:77/77passed. `independent-qa/test-results/targeted-node22.tap`.
- Independent safe local Playwright surface:1/1passed; screenshot, trace and HTML report under `independent-qa/`. This is a synthetic control-policy report, not a clinical screenshot, live GitHub approval or deployment.
- Contract validator PASS; frozen manifest10/10match; source diff whitespace PASS. No app source/dependencies changed, so no app build or clinical database used.

## Residual limits

Code/tests/docs are locally verified. Publishing a PR branch is distinct from reviewed default-branch activation. The API access restriction is independent of the removed local human gate. Existing native branch checks/reviews remain authoritative at ordinary merge; synthetic tests do not prove native CI or model/deploy execution. No canonical ledger, hold, budget or history was changed.

## Final Decision

PARTIAL

The source policy change is verified and ready for publication. The broader live autonomous workflow, main integration and deployment cannot be declared verified from this environment while its API operation is refused.
