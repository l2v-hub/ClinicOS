# Task Contract

## Impact Classification
Demo-only release workflow correctness and strict default proof preservation, no clinical/schema/production workflow edit. ActualClaude1 comment6256790782 contains2major3minor findings. Preserve both existing implementationattempts and QA1failure.

## Current Behaviour
Current published f8890678378c3cd8c59a1a3c2c29e0e4aad3fff4 exactdemo shares production queue, no-policy preflight discovers exact-first, polling cannotresume, exactacceptsone trigger, migration side effects unspecified. Environment current real metadata: name glistening-friendship / demo, protection_rules[], deployment_branch_policy:null; no required human reviewers claimed. ActualRailwayAPI permission/deploy remainUNPROVEN.

## Expected Behaviour
F1 dedicated railway-demo queue shared exactworkflow/configure-demo-source ONLY; old deploy-backend.yml remainsbyteidentical. Prevent nonterminal demo deployment overlap beforemutation through actualnative inventory; no interference withproduction pendingqueue. F2 no-policy preflight strictly main-trigger-v1; exact discovery explicitoptin ONLY, no automaticrootreleasegate relaxation. Rootcoordinates explicit exactpreflight+postmergeexactworkflow+liveproof inthissession; permanent releasepipeline existingtriggerpolicy remainsstrict untilseparatereviewedintegration. F3 bounded safe idempotency/resume for alreadySUCCESS exactSHA, readpoll transienttolerance and totaldeadlinebelow40min, safe deploymentID failureartifact. F4 exactpolicy requiresZEROtriggers. F5 explicitnormalforwardmigrations sideeffect+previousactiveSHA receipt/protectionmetadata/ownerack.

## Acceptance Criteria
- Shared demo-only group railway-demo inexact andconfigure workflows; cancel-in-progress:false, no newproductionqueuecoupling. Legacyworkflow remains45033bytes; old combinedworkflowexistingdual-tokenqueue is historical/notnewlyapproved. Tests assertnewdemowriter groups neverproductionrailway-backend, productionworkflow unchanged. Beforeanymutation reject existingnonterminal/demo inprogress deployment, including unknown/incomplete inventory failclosed. No cancellation/DELETE/triggerwrite added.
- verifyDemoPreflight({reader}) considersstricttriggerONLY and exact-only artifact cannotauthorizerelease; explicit sourcePolicy exact required. Add meaningfuldefaultrelease regression, preserve oldreceipts/policybindings; no release.mjs change or falsepostmergeautomaticdispatchclaim.
- If uniqueexistingactiveSUCCESS sameexactcommit, no mutation; verifylive/native/currentmain andissuereceipt withreusedidentity. InprogresssameSHA neverduplicate; eitherexplicitverifyresumeorvisiblefailclosed. Singlemutation otherwise, no uncertainmutationretry. Read-only polling toleratesbounded transient transport errors only; permanentdenialunsupported remainsfailclosed. Aggregate deadline accounts30srequests+20sready+delays+rechecksandfinisheswellbelow40min; injectedclocktests no sleeps. Safe failure progress includes only validated fixedtarget/deploymentID/SHA and ownfiniteerrorcode; workflowalwaysuploads privateartifactwithno rawresponse/token. RequirecompleteactualavailableRailwayreadshape, inspectpinnedschema if newfields; rootpublic5.66sourceavailable.
- ExactpolicyZEROtriggers, onevalidtriggerreject; legacyexactone unchanged. Policyexclusiveworkflow and postready native+currentmain checks retained.
- Workflowinput/packet state deploy runs existing npm run db:migrate fromrailway.json, forward-onlyschema sideeffect; recordpreviousactive deploymentID+knowncommit nullable/unproven insteadof inventing. Actualowner alreadyauthorizesfullbugfixdeployflow andnormalexistingdeployconfiguration; thisisNOTsecondhumanapproval and doesNOTauthorizenewdestructiveSQL/providercleanup. Rootmetadata realenvironment hasNOrequiredreviewers; packetexplicitlystatesowner-authorized demo deploy, no claimprotectedhumanreview. No remote environmentpolicychange required. Source/schemafiles unchanged; migration delta canbeunknown and mustnotbeclaimednonewithoutproof.
- Exact6sourcepaths +NEWpacket only; no changes tohelper/legacyworkflow/clinical/policiesoutsidecontract. Author noGit/GH/provider/Max/DB/APIwrites, allverificationstrippedcredentials; meaningfulfocused/fullworkflow+configuretests beforeauthorSTOP; independentQAafterSTOP, actualClaude/finalCodex/native6/protectedmergebeforeprovider action.

## Scope
- .github/workflows/deploy-demo-exact-commit.yml
- .github/workflows/configure-demo-source.yml
- agent-team/src/bug-pipeline/demo-deployment.mjs
- agent-team/tests/bug-pipeline/demo-deployment.test.mjs
- agent-team/tests/bug-pipeline/release.test.mjs
- scripts/automation/configure-demo-source.test.mjs

## Test Plan
Adversarialproofpolicy/defaultdiscovery, queueisolation/legacybytes, nativeoverlap/idempotentreuse/deadline/readretry/failureprivacy, receiptoldcompatibility, scope. Full bug-pipeline+qualitytests andactualconfigureautomationtests using trustedverificationrunner; Node24local vs22native. No actualRailwayorGitHubprovider fromauthor.

## Evidence Plan
Private /workspace/.clinicos-cloud/demo-exact-author3-20261019; NEWpublic artifacts/task-validation/demo-exact-commit-release/codex-followup-1. PreserveactualClaude1/QA1failed/QA2passed/twoimplementationattempts alloldGitblobs/oldpublic/private unchanged; retainalltestsetupfailures. Parentrootpacket unchanged. SafeMDJSONonly, noignoredrawlogsforceadd.

## Gate Status
READY FOR IMPLEMENTATION afterrootcanonicalcontinuation3nonce readback; actualusersession continueuntilresolution persists. RootsoleGit/GH/state/providerwriter, readonlyGitallowed. Allprovideractionstillfalseuntilfreshreview+QA+merge.
