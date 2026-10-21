# Null-policy bootstrap analysis

The fixed demo environment may report `deployment_branch_policy: null` while the GitHub branch-policy inventory endpoint returns 404 until custom policies are enabled. The previous implementation queried that inventory before attempting the preserving environment update, so the bounded admin workflow stopped before it could establish the stricter branch policy.

The implementation now treats only exact `null` as the bootstrap case. It skips the inaccessible inventory, reads custom deployment protections and secret-name presence, validates the full environment update body, and performs one fixed PUT that enables custom branch policies while retaining reviewer, timer, self-review, administrator-bypass, and other environment controls. It immediately reads the same environment back and checks its fixed identity, enabled policy, and unrelated settings before requesting the complete branch-policy inventory.

The inventory remains authoritative. A 404, malformed page, wildcard, tag, duplicate, or non-main policy fails the invocation. Such failures after the bootstrap PUT are reported as one attempted write and do not trigger a branch-policy POST, retry, rollback, or deletion. An empty complete inventory permits one exact `main` POST. Existing readable policy modes still inspect and validate the complete inventory before any write.

The repository-level secret inventory remains a presence-only read and the result continues to state that repository secrets are not confined by the environment restriction. The change does not read secret values, perform provider requests during author validation, change dispatch authorization, or touch the legacy repository-settings configuration path.
