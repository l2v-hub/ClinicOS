# Release policy decision receipt

Date: 2026-09-22. Decision owner: root integration agent.

Decision: ALLOW the exact verified frontend change to be committed, pushed to the existing codex/subtle-dashboard-notifications branch and deployed to existing Vercel project clinicos__, alias clinicos-eosin.vercel.app.

Authority: the user's prior explicit requests to push completed changes so they can verify each change on this site persist. The current request narrows this release to patient-list loading and immediate import-action rendering. No new infrastructure, backend release, merge or force push is authorized by this receipt.

Evidence: valid task contract; candidate source hash 8bbe6c94a38d43300d2e682e64e3e789c77831f8bbadac9541a825eb9685b106; 29 passing tests; successful types/build; 17 browser assertions; independent QA final READY FOR CODEX QA after persisted evidence review. This is a local decision record, not a claim of a distributed Ruflo release capability.

Bounds: stage only the eight reviewed app/test files and this task's selected evidence. Preserve other launcher edits, product plans and historical artifacts. Publish a clean export of the resulting commit; exclude local configuration, patient data, secrets and development evidence from deployment. Bind the final deployment metadata to the exact commit. Production smoke is read-only. No deletion of worktrees.
