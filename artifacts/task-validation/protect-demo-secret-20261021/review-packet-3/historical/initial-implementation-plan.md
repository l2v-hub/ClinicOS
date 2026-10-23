# Implementation plan

The source change consists of a focused helper and pure tests, a manual-only protected-main workflow, and one added test argument in the existing credential-free CI command.

The helper fixes repository, owner, environment ID/name, and secret name. The credential-free preflight validates the repository, actor and triggering actor against `l2v-hub`, event, ref, reviewed SHA and workflow SHA/ref before reading credential bindings. The subsequent authenticated API reads verify fresh main, matching admin identity and the exact complete main-only environment policy before each mutation. Secret-name inventories are bounded, complete, paginated, and fail closed on 403/404, truncation, mismatch, or uncertainty. The child CLI receives only a safe environment allowlist and `GH_TOKEN`; the secret value travels only through stdin. Output and errors contain fixed codes/counts rather than response bodies or secret material.

The manual workflow has a credential-free context/test preflight and two serialized, fresh jobs bound to the existing protected environment. Job one conditionally fills only a missing environment copy. Job two verifies a fresh nonempty environment binding and metadata, deletes only the repository copy once, and checks repository absence plus environment presence. Existing environment values are preserved. Uncertain mutations do not retry or compensate automatically.

Before an actual run, maintain exclusive cooperative ownership of the fixed secret for the operation; workflow serialization only covers this workflow. After repository deletion, run the separate non-environment absence probe in a newly queued workflow. Neither step is executed by this packet. Root owns the later commit, publication metadata, and any approval-gated operation.
