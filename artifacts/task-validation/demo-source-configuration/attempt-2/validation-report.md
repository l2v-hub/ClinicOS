# Demo source configuration — attempt 2 implementer handoff

Final decision: PARTIAL, ready for NEW independent QA. Configuration implementation attempt 2/4. No real provider request, credential access, provider mutation, deployment, push, PR or GitHub mutation was performed by this implementer. Original attempt1 contract, QA and evidence are preserved unchanged. Guard19 and maintenance470 sources/budgets were not touched or reset.

## Frozen authorization and actual prerequisite

Read before edits: `operational-contract.md`, `operational-addendum-2-create-missing-trigger.md`, `provider-constraint-clarification.md`. The original contract describes attempt1; the latter two explicitly authorize this limited extension.

Root supplied the real trusted-main inspection39026327913: missing-trigger, digest bb0843673ebc593892cc8bdabddca75746f06676e0c141f3bb4ea0ee70d05a5f, SHA8124b1bc88c0f086b1ee328214f87f4802005d11. Its artifact body could not be downloaded through this cloud proxy; this candidate does not pretend to have read it. Actual Node22 tests in that earlier run belong to attempt1, not this implementation.

## Behavior and scope

Exactly the same three source paths changed: the dedicated manual workflow, operational module and its tests. No merge from main was necessary: own HEAD44e2aae contains attempt1, and the coordinator confirmed source-identical integration into main8124b1bc.

Default `inspect` stays read-only. Existing `set-main` keeps its prior branch-only behavior and still rejects absent triggers. New explicit `create-main` requires a supplied inventory digest, zero existing triggers with hasMoreTriggers=false, and a fresh identical full metadata snapshot immediately before its one mutation. An already-existing unique GitHub/main/Wait-for-CI/no-override trigger can produce a no-write result only with the supplied current digest. All other existing/duplicate/foreign/truncated/conflicting cases fail before any mutation.

Creation uses only `deploymentTriggerCreate`, exact target IDs/repository/main, provider `github`, checkSuites=true and the exact inspected rootDirectory, including null or empty string. The returned ID and all selected trigger fields must be valid. A fresh after-read must equal the prior complete metadata plus exactly that returned trigger; target, root, domain, repository, branch, CI policy and override are verified. There is one mutation attempt, no alternate provider literal, retry, rollback, delete, reconnect, direct deployment, variables or database operation.

The official schema defines provider as String, not an enum. `github` is an explicitly unverified operational assumption until the actual provider accepts it and both returned/fresh metadata verify GitHub identity. Project-token permission for creation remains unverified. Any provider refusal blocks with a fixed diagnostic. Official sources do not guarantee that trigger creation has no immediate deploy effect. The addendum authorizes a possible automatic deployment of protected main; this is not clinical Max review, live release proof or issue resolution. Wait for CI is not a substitute for the controller's exact-SHA gates.

## Fresh main and log receipt

Workflow dispatch still requires exact reviewed SHA, repository/main and protected demo environment. The actual operation receives the sole existing repository secret RAILWAY_DEMO_TOKEN and the automatic contents:read GitHub token; tests receive neither binding. A fixed, bounded, no-store/no-cache GitHub ref read verifies current main before provider inspection, again before the final fresh inventory preceding a mutation, and after it. A main advance blocks before the write or leaves an explicitly failed/uncertain post-write result; no retry is performed. GitHub and Railway tokens use separate fixed HTTPS clients/headers, with redirects refused.

A successful operation writes the same allowlisted metadata receipt to its artifact and one bounded single-line `DEMO_SOURCE_CONFIGURATION_RECEIPT` GitHub log record. Serialization reprojects the metadata, checks its digest and context, strips unknown keys and rejects any reflection of the actual bound credentials before writing/logging. Provider bodies/errors/extensions, variables and headers never enter that receipt. The following OK line retains the outcome/digest. Error output stays a fixed constant.

Railway has no trigger revision/CAS field, and GitHub/provider operations are separate systems. The before/after checks detect observed races and block success; they do not claim atomic prevention of every concurrent update. An error after a mutation can mean configuration was already changed: inspect before any subsequent authorized action.

## Executed verification

- **107/107 Node tests PASS**, zero failures/skips/cancellations. Original57 meaningful tests still run unchanged, plus50 create/conflict/drift/policy/provider-response/current-main/receipt cases.
- A TypeScript AST comparison proves every original top-level test/helper statement remains byte-identical (imports excluded); the new cases are appended. All tracked historical attempt1/QA1 evidence remains unchanged.
- Existing real owned loopback HTTP transport test still passes. New create tests exercise the actual production module/client with synthetic responses and assert exactly two pre-write inventories, exact mutation inputs, one write, fresh post-read, no retry and no success on drift. No real Railway call is claimed.
- GitHub current-main checks test automatic-token header isolation, fixed URL/redirect refusal/no-cache, changed main, malformed/ref/error/oversize responses. Before-write main drift means zero mutations; after-write main drift fails without another write. Inspect cannot publish a success receipt when main advances during its read.
- Logging tests prove unknown fields and provider extensions are dropped, digests bind exact inventories, null root survives, output is one line and bounded, and even an opaque bound credential without a known secret prefix is rejected if reflected in metadata.
- Official Railway CLIv5.66.0 schema: all **3 actual GraphQL documents** validate with zero errors, including the create mutation. TypeScript source ASTs2, protected workflow YAML and action pins validate. Node syntax and Prettier checks pass. Static checks confirm exactly3 source modifications and all old tracked evidence unchanged.
- Host Node v24.19.0; workflow pins Node22. Actual native execution of this new107-test candidate remains unrun and must not be inferred from the earlier57-test run.
- Whole owned evidence/source privacy scan: zero credential-pattern findings; no actual patient rows or raw provider/GitHub response dumps. No new setup bindings or dependencies are needed.

## Simplification and continuation

The module shares one trigger projector and one bounded JSON reader. Create/update converge on one after-inventory/main-freshness verification and result builder, keeping the two mutation policies distinct.

A NEW dedicated QA agent must independently run all5 phases against the sealed candidate, including a safe real internal browser surface. Root owns PR, native checks, trusted-main merge and provider dispatch. After integration: inspect with the actual current reviewed main SHA, verify its allowlisted receipt via GitHub logs, then create-main only with that fresh missing-state digest. Verify the fresh post-create receipt and rerun the unchanged release preflight. Existing clinical issues remain open until their actual Max review, exact-commit deployment and release evidence are complete.

Official references: https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/schema.json ; https://github.com/railwayapp/cli/blob/v5.66.0/src/commands/service.rs#L349 ; https://github.com/railwayapp/cli/blob/v5.66.0/src/commands/environment/changes/source.rs#L126 ; https://docs.railway.com/deployments/github-autodeploys#wait-for-ci ; https://docs.railway.com/integrations/api#project-token .
