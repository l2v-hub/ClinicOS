# Validation report

Final Decision: IMPLEMENTED — NOT VERIFIED

| Acceptance | Result | Evidence |
|---|---|---|
| Fixed target and M/W separation | PASS offline | policy/controller tests |
| Read-only provenance boundary and credentials | PASS offline | native-proof/live tests |
| Live mutation fails closed | PASS offline | two independent rejection hooks; zero writes |
| Controller uncertainty semantics | PASS fixtures | one submission, no retry/finalization after failure |
| Hosted CI, native Max review, final Codex QA | NOT RUN | Required next gates |
| Native independent human approval and protected merge | NOT ACQUIRED | No replacement by model approval |
| Live development deployment/full parity | NOT PROVEN | Source-free service shells only |

Focused Node tests run locally with no provider credentials or writes. Actual raw test output is retained in test-results/gate-tests.txt. These fixture results do not prove provider fencing, actual mutation effects, runtime identity or online availability. No app/frontend/schema files changed. No clinical test writes, SQL cleanup, seed or alias action performed.
