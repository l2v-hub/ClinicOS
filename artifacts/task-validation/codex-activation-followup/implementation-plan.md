# Implementation and activation plan

1. Keep the existing PR471 and unrelated patient-cleanup SQL unchanged in scope.
2. Diagnose native Codex sandbox execution with fixed credential-free payloads; use synchronous readiness output while preserving all five assertions.
3. Add a manual-only administrative job bound to an exact reviewed commit and repository-admin actor. The bot stays in Actions. Preserve default workflow permissions and all existing human/repository rules; add only a cumulative exact-main Actions check requirement.
4. Emit the required bug-pipeline-tests check on every PR so unrelated changes do not deadlock behind a filtered workflow.
5. Independently review the source, run the full relevant synthetic regression suite, then dispatch the reviewed SHA and inspect actual settings and sandbox results. Never describe secret presence as provider authentication.
6. Record native evidence and remaining activation prerequisites. Merge and deploy remain gated by real tests, independent QA, Claude review and reviewed-SHA requirements. Preserve the durable four-attempt/four-review budgets.
