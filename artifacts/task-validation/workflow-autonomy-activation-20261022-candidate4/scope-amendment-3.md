# Scope amendment3: observed sync interaction, before source edits

Actual activation test39858249394/check120101962018 reached the real10minutejobdeadline and was cancelled. Full retainedlogs contain a completed source-sync summary, but GitHub run/step cancellation stays a failed activation, never rewritten PASS. Summary: four batch approvals preserved, oldsourcefeedback forwarded7to483 and16to497, standalone393 projected codex-review-fixes despite existing operator review. Exactinternalstallcause is not established; no timeout increase, skippedassert or genericretry.

This demonstrates why global/operator-owned work also needs protection in scheduled synchronization: even without canonicalwrites, it may mirror oldfeedback/change held labels and spend guardedAPIroundtrips on work owned elsewhere. Reuse the already specified pure shared operator-ownership helper before mirrorFeedback/publishState in syncIssueReviews. Return explicit skipped/operator-owned for each held subject; keep all real new/unowned sync behavior, source-feedback authorization/provenance and fullguard checks. Do not claim skippedsubjects synced/reviewed/deployed. No change to explicit root-requested readonlyClaude handoff/cron; no new supervisor or rolechange.

Add exactly:
- agent-team/src/bug-pipeline/issue-review-sync.mjs
- agent-team/tests/bug-pipeline/issue-review-sync.test.mjs

Syntheticnegativecases: activeglobalpause yields zero mirror/publish calls; recognizednewunclaimedhandback skips protectedsubject while ordinaryunownedsubjectstillmirrors/publishes; operator coordination skip; released/closed previous behavior unchanged; canonical entity hashes/budgets unchanged. Preserve firstactualtimeout and23forwardedfeedbackmessages as genuinehistory. Roottemporarilydisablesonlysync to avoid unchanged repeatedscheduledattempts; controller/release remainpaused. Re-enable after real reviewedsource merge and once-onlynew-source test. Restore393ownedlabels from recordedpreprobe source without claiming nativehuman approval or changing approvalstate.
