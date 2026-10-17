# Related issue batching

User request: prioritize grouping similar GitHub issues, especially multiple bugs affecting the same file.

Acceptance criteria:

1. Successive authorized issue wake-ups collect durably before planning; no paid session or claim while collecting. Two-minute quiet window, ten-minute cap, next scheduled invocation resumes without sleeping.
2. Every new plan maps each selected issue to scoped files and each scoped file to an issue. Shared-file splits require explicit reasons in both groups. Related issues retain separate acceptance, regression and evidence requirements.
3. One grouped plan produces one worktree and PR. An existing occupied scope blocks conflicting incoming work without rewriting frozen plans or budgets.
4. Existing frozen plans remain byte-for-byte compatible; collection state is validated; revoked/externally owned issues cannot be claimed.
5. Actual dashboard renders the collection phase and preserves its counts and values after reload, with no browser/HTTP errors or source payload leakage.
6. Existing four-cycle budgets, independent QA, external Claude Max review and verified-release closure remain enforced. No bug batch, patient mutation, merge or deployment is authorized by this workflow change.

Scope: bug-pipeline planning/controller/contracts/packet/dashboard and relevant tests, triage skill and documentation. Use synthetic fixtures only; no extra dependencies or credentials.

Validation: regression suite including negative controls; frontend typecheck/build per QA gate; independent diff/security review; browser test of the actual dashboard with a QA-only synthetic state adapter, screenshot/trace/video.
