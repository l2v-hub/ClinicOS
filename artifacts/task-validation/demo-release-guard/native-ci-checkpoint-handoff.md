# Native CI checkpoint, before final QA4 browser

Root verified all19 frozen candidate4 source hashes and read independent QA4 full19source/security audit. Independent unit586=583PASS/3nativeWindowsSKIP,44additionalnegative/CASprobes,20historicalregressions, types/build/readiness/schema pass. Browser25cases is still waiting on the shared local lock; no final READY verdict, PR, merge, deployment, settings change or Claude approval is claimed.

Root publishes only the immutable source and static sanitized packet to its development branch so native Windows and actual isolated Codex/Chromium/PostgreSQL CI can execute while the local browser waits. The active independent-qa-attempt-4 directory is deliberately excluded from this commit. Workflowdispatch configure_repository=false and verify_provider_access=false; tests have no model/provider inference or operational deployment action. A PR will only open after all5localQAphases actually pass.
