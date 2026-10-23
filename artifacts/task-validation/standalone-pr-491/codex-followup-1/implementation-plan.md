# PR #491 follow-up implementation plan

1. Give `.github/workflows/inspect-demo-source-topology.yml` the dedicated `demo-source-topology` concurrency group.
2. In `scripts/automation/inspect-demo-source-topology.mjs`, expose `paginationComplete: true` on a successful complete snapshot and rename the access aggregate to `allVisibleEnvironmentsAccessible`.
3. Update `scripts/automation/inspect-demo-source-topology.test.mjs` to cover the successful and inaccessible-environment semantics, reject the old field, and assert the workflow group differs from production deploy.
4. Run both existing credential-free automation test files and check only changed-source formatting/diff. Stop for independent QA.

Scope is limited to the three contracted source files. Prior packet files, manifests, QA probes, reports, and media are retained unchanged.
