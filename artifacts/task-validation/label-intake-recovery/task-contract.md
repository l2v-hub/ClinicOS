# Label intake recovery

Observed production-controller logs: the user's authorized `codex-run` label events start Actions, but the controller reports `reconciled` with no batches and no durable collection. Latest label actor is GitHub type `User`, login `l2v-hub`; the controller uses the same owner's PAT. The old code incorrectly treats login equality as bot identity and demands a preceding slash command. Several opted-in issues also lack `bug` after queued events were cancelled/replaced.

Acceptance criteria:

1. A GitHub `User` actor with write/maintain/admin may opt in with `codex-run`, including the same account used by the controller token. Bots cannot self-authorize; actual Bot events still need a recent exact command by an authorized human. Unknown actor types fail closed.
2. Authorized `codex-run` alone survives lost event invocations. Controller discovery normalizes classification labels after authorization; read-only/dashboard discovery never writes. Unauthorized, blocked, PR and externally owned issues must not be implemented.
3. Dashboard includes newly opted-in issues before classification, preserves external ownership and exposes no issue text/patient/credential payloads.
4. Job-level concurrency preserves serialization and `cancel-in-progress: false` while filtering unrelated labels before they can replace pending controller wake-ups.
5. Durable collection, existing grouping, frozen plans, four-cycle budgets, personal Claude Max review and verified-release closure remain intact.

Verification: reason-specific regressions and full bug-pipeline suite; read-only comparison of the old and fixed adapters on the actual GitHub queue, storing IDs/counts only; independent QA/security and real dashboard browser assertions with synthetic fixtures. No production data operations, budget resets or issue closure. No credential replacement.
