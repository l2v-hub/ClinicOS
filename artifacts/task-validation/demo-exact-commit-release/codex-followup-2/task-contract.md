# Task Contract

## Impact Classification
Security correction for synthetic-demonstrated credential reflection into uploaded release progress and receipt. Two source paths; no clinical, schema, workflow or provider action.

## Current Behaviour
Currentsource3fc38d3dc867b73baa26ef5dfd14f3f9e11c36aa. IndependentQA3FAILED with one HIGH: valid UUID-form bound token reflected by native reply becomes mutation deploymentId, reusedactiveID or previousActiveDeployment.id. It reaches always-uploaded failure progress or success receipt;0600 does not prevent artifact leak. All3actualCLI repros synthetic, no real token/provider call. Functional930PASS3skip+140probes+26schema not override failure.

## Expected Behaviour
Reject actual bound credentials in ALL serialized progress/receipt/fallback metadata and before initialnative identity drives any mutation. Fixed finite diagnostics only. Preserve successful safe partial-failure/resume semantics, source/target/proof guards and all failed history.

## Acceptance Criteria
- Guard every newly serialized CLI/publicartifact progress/receipt/fallback against actual nonempty RAILWAY_TOKEN andGITHUB_TOKEN; both exact values and string reflection/JSON escaping handled. Reuse unchanged configure helper serializeReceipt forbiddenValues as established pattern without modifying helper.
- Validate initialactive/previousidentity/knowncommit BEFORE mutation: reflected initial/reuse ID or knownSHA causes zero deploycalls. Reflected mutationresult rejected after exactlyonecall, neverretry, neverentersartifact/progress orerror text. Final receipt fields also scanned independentlyofcallback. No rawresponse/env/token inerror/diagnostic/path/output.
- Alwaysupload remains safe: ifguardrejects, retainonlyalready-safeprogress or finitecredential-freefailure artifact; do NOT export cliProgress containingreflectedfield, and do not letcatch/finally restore it. Ifevencontextiscredential-reflecting, omitunsafeartifact/failclosed withconstantdiagnostic ratherthan leak. Noexistingprogress overwrite withsecret andno successreceipt fromunverifiedtarget/currentmain.
- Fresh actualCLI repros mutationUUID/reuseUUID/previousActiveUUID/previousSHA/tokenequalscurrentSHA/GITHUB_TOKEN reflection, rawstdout/stderr/artifact scans; normal safe success/failure/resume/readretry/deadline/defaultpolicy tests stillpass. No lowering schema/native/target/source/no-retry guards.
- Twoexactsourcepaths+NEWpacket; oldQA1/QA2/QA3/currentauthor3/private/publicfrozen unchanged. RootsoleGit/GH/state/providerwriter; authorread-onlyGit, no liveproviders/Max/GH/DBactions. Trustedverificationrunnerstriprealcredentials; syntheticfixtures only.

## Scope
- agent-team/src/bug-pipeline/demo-deployment.mjs
- agent-team/tests/bug-pipeline/demo-deployment.test.mjs

## Test Plan
Meaningful adversarial actualCLI+unit and wholebug-pipeline/configureworkflow once; preserveharness/assertionfailures. No realRailway authorization/deploy ornativeCI claim. AuthorSTOP thenfresh independentQA4, actualClaude/finalCodex/native6/protectedmerge.

## Evidence Plan
Private /workspace/.clinicos-cloud/demo-exact-author4-20261019; NEWpublic artifacts/task-validation/demo-exact-commit-release/codex-followup-2. Freeze2source/originalinodes+oldproofs, safeMDJSONsummaryonly. QA3 originalHIGHseal/repro neveredited; copyprobes tonewprivate if needed. Noignoredrawforceadd.

## Gate Status
READY FOR IMPLEMENTATION afterrootdefault-four auditedcontinuation4nonce readback. Rootactualusercontinue-untilresolution grant persists; within4 noadditionalallowance invented. Threepreviousattempts includingfailedQA3 preserved. Allprovideractionstillunauthorizeduntilsourcegatescomplete.
