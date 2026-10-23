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
READY FOR BOUNDED IMPLEMENTATION onlyafter durable rootreservation readback. RootsoleGit/GH/state/providerwriter. No implementation outside3paths withoutrootamendment.
