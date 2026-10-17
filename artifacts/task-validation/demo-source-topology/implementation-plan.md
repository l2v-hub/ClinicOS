# Implementation plan — candidate 3/4

1. Add an independent inspect-only Node module importing legacy fixed TARGET, read-only client, scoped projector/digest and exact-main verifier without modifying them.
2. Read bounded paginated visible project environments/services and per-visible-environment instances/triggers using official static GraphQL fields. Validate ids, names, ownership, source and cursor progress; finish all pages or fail closed.
3. Re-read topology and scoped fixed-target metadata, compare complete canonical digests and exact current main. Emit an allowlisted receipt with request provenance, actual pagination status, explicit environment-scoped visibility, and `serviceConnectAllowed: false`.
4. Add a workflow with workflow_dispatch inspect only; trusted fixed repository/main/reviewed SHA; pinned checkout/setup/upload; same railway-backend concurrency; tests before credentials; token only in the inspector step; existing protected demo environment.
5. Add no-network unit/adversarial real HTTP fixture tests for context, pagination, foreign entities, duplicates, inaccessible/extra/forked environments, scope uncertainty, drift, redaction, no mutation/no retry, and transports. Build/types and actual safe browser evidence come from a fresh independent QA session.
6. Author records actual tests and source hashes then stops. Root requests independent gate, publishes exact reviewed bytes and alone decides live read-only dispatch after merge. No create/connect/deploy operation is implemented or run.
