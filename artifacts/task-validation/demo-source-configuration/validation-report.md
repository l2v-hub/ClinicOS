# Demo source configuration — implementer handoff

Final decision: PARTIAL — candidate ready for new independent QA. No provider inspection, configuration update, deployment, PR or push was performed.

This operational change is attempt 1/4 in its own reserved group. It does not alter or reset demo-release-guard or maintenance-470 budgets. Existing tracked files at base b7194ac4dd185b3edc4f8d093c0505d0b4ef69ea are unchanged; only three new source files and this owned evidence directory were added.

## Behavior

The manual workflow defaults to read-only metadata inspection. Both workflow condition and CLI require this repository, trusted main and reviewed SHA equal to the current GitHub SHA. The environment is `glistening-friendship / demo`; its existing demo token is supplied only to the operation step. Unit tests receive no secret binding. Actions are pinned, checkout credentials are not persisted, and the workflow shares the existing Railway deployment concurrency group.

The inspector checks the exact fixed project, environment named demo, service, repository and public demo domain. It validates and projects only finite metadata, including at most two existing trigger records plus an explicit more-pages flag, root directory and domain bindings. Snapshot fields are sorted deterministically, recursively frozen and bound to a SHA-256 digest. Provider errors, headers, credentials, variables and unknown fields are never emitted. Missing/duplicate triggers remain inspectable with a blocked outcome; foreign bindings fail with a fixed diagnostic.

`set-main` requires the prior inventory digest. It checks that digest, rejects missing/duplicate triggers and foreign bindings, obtains a fresh matching inventory immediately before action, and changes only the unique existing trigger's branch. A unique already-main trigger is a two-read no-op. No create/delete/connect/deploy/variable mutation exists. All metadata except the intended branch must compare exactly after the update. Trigger IDs remain opaque, bounded GraphQL identifiers rather than an invented UUID requirement.

Railway exposes no trigger revision/CAS field. The implementation therefore re-reads immediately before mutation and verifies afterwards; it does not claim provider-side atomic compare-and-swap. Post-update drift fails explicitly, with no automatic retry or rollback. Such a failure can mean the branch was written and concurrent metadata then changed: inspect before any subsequent action.

## Executed validation

- Node unit/integration suite: **57/57 PASS**, zero skipped/cancelled. Includes a real owned loopback HTTP server exercising the production transport adapter, read-only inspection, expected digest, fresh before-read, exactly one branch-only mutation, after-read and preserved settings. This is synthetic provider traffic, not a real Railway request.
- Adversarial coverage: digest omission/malformed/newline/staleness; changing branch/check policy/root/domain; missing/duplicate/more-pages trigger; foreign project/environment/service/source/trigger/provider; secret-shaped metadata; after-write drift; unconfirmed mutation; HTTP/GraphQL/network/JSON/redirect/oversize errors; token absence; exact-main manual context and actual CLI failure paths.
- Official Railway CLI v5.66.0 schema: both actual GraphQL documents parsed and validated with **zero errors**. Schema digest and document hashes are recorded in `static-validation.json`.
- TypeScript parser: both JavaScript source ASTs have **zero parse errors**. YAML parser with duplicate-key rejection verifies the actual protected workflow, fixed checkout, sole secret, action pins, dispatch-only trigger and concurrency configuration. `node --check` and Prettier checks pass.
- Host execution used Node v24.19.0. The workflow pins Node 22; actual trusted native execution remains unrun. Used APIs are available in Node 22, but this report does not substitute local execution for the native result.
- Entire owned packet and three source files scanned for credential-shaped strings: zero findings. No raw provider/GitHub responses or actual patient data were saved. The only network interaction in tests was the owned synthetic loopback server, closed by the test cleanup hook.

Evidence: `unit-tests.log`, `static-validation.json`, `verify-static-contract.mjs`, frozen `operational-contract.md`, `candidate-seal.json`.

## Required continuation

A new dedicated QA must review this candidate independently. After QA, PR checks and trusted-main integration, dispatch **inspect** first with exact current reviewed main SHA. Read only the validated receipt. If it identifies exactly one existing correct-repository GitHub trigger with a wrong branch, dispatch **set-main** with that snapshot digest. Missing/duplicate/foreign cases remain blocked and require an explicit subsequent operational decision; this candidate cannot create/delete/reconnect them. Then rerun the existing release guard preflight without changing its source or exhausting additional guard implementation rounds. Clinical issues remain open until their own review, release and live proof complete.
