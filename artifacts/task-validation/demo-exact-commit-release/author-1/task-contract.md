# Task Contract

## Task
Add reviewed native exact-commit demo deployment policy supporting a fixed source repository with zero native triggers, preserving strict legacy trigger validation by default. Existing deployment mutation already accepts commitSha. User authorizes completeissueimplementation/release without unnecessaryexternalconfiguration or furtherpermission. This is a source change for review, NOT direct provider bypass.

## Scope
- agent-team/src/bug-pipeline/demo-deployment.mjs
- agent-team/tests/bug-pipeline/demo-deployment.test.mjs
- .github/workflows/deploy-backend.yml

## Acceptance Criteria
- Default legacy policy and historical receipts remain strict and compatible. Only explicit fixed workflow/CLI policy may accept zero triggers; reject foreign/duplicate/incomplete trigger lists and all target/source/domain mismatches.
- Exact-main Actions provenance, immutable reviewedsource SHA, dedicateddemoproject/env/service and projecttoken binding stay required. Fixed serviceInstanceDeployV2 commitSha only, no serviceConnect, triggerwrite, latestCommit orrailwayup introduced.
- Newpolicy must propagate/bind through preflight, deploymentreceipt and independent verification; mismatch/unknown policy fails closed. Realnative deployment meta.commitHash, SUCCESS/uniqueactive matching allfixedIDs and uncachedreadydeploymentId remainmandatory. No arbitrarymessageprovenance.
- Preserve canonical existing production job byte-for-byte. Changes onlydemo job andallow newfixedtests beforeitssolecredentialbearingstep; dedicatedworkflowconcurrency remains. No new APIbilling/key/token extraction.
- Meaningful tests prove zero-trigger explicit exactmode reaches onefixedmutation, strictdefaultstillrejects, malicious/wrongsource/partialpagination/mode/provenance rejects, uncertainmutationnotblindlyretried, alllegacytests pass. No fakeproviderrequest/approval/deploy in author checks.
- RootindependentQA, actualClaude, finalCodex, exactnative6 and ordinaryprotectedmainmerge before ANY actualdeploy. Actualprovideracceptance stillunproven; rejectionmustretainhistory andsafeerror, notrepeatedunchanged.

## Validation
Use credential-free trusted runner, fullbugpipelineworkflow andfocusedactualCLIfixtures; hardlink-safe scope freeze, preserve oldproofs, every attemptprivate. Do not run provider or paid APIs. IndependentQA after authorSTOP.

## Gate Status
READY FOR IMPLEMENTATION onlyafter durable rootreservation readback. RootsoleGit/GH/state/providerwriter. No implementation outside3paths withoutrootamendment.

## Impact Classification
High: production deployment provenance. No clinical source/data/schema/auth/billing changes.

## Current Behaviour
Default exact native deployment rejects fixed repo with zero triggers before any mutation. Provider trigger creation failed once; no repeat. Native exact commit SHA API exists but permission/success remains unproven.

## Expected Behaviour
Default stays strict; explicitly reviewed fixed main workflow may request exact SHA with zero complete triggers, retaining target/domain/native deployed commit and live readiness proof.

## Test Plan
Credential-free full bug pipeline, focused module/actual CLI regressions with strict defaults, explicit mode, exact commit, negative topology/pagination/policy/provenance and one mutation only. Fresh independent QA after source STOP.

## Evidence Plan
All raw attempts private; additive safe reports/manifests only in new author-1 packet; immutable previous proof Git blobs. No provider/browser/deploy success claim from fixtures. Actual Claude, native6, fresh final Codex and protected main merge before first actual native deployment.
