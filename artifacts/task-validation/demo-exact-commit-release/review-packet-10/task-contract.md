# Task Contract

## Impact Classification
Release/workflow integration and metadata-only review-notification regression correction. Complex release plumbing remains6.1; small existing11path change already independentlyverified1072PASS+8adversarial. No clinical product/runtime or provider action authorized to author.

## Current Behaviour
PR498 b07317f4d7eee2bd873ff465d0df317459fcde28 actualClaude latestchangesrequested: demo credential still accessible outside protectedenvironment, knownunresolved. PR499 helper actuallymerged onmainb062; actualmigration preflightPASS/environmentFAIL/deleteSKIP, BotGETrepository andenvironmentsecrets403; userpersonalpermissionactionpending. Separately source5c0694987b43bb76810d144cb32b88acb1e90824 alreadycontains exact-current-main preflight/mergedSHA release wiring and32MiB evidence bound (47? see actualsealedreport; do not inventcounts), independently1072PASS0FAIL3Windowsskips+8adversarial seal45194048797d7f4b38bf6fcce2aa3312022915dc081d04523b900346f7811c90. Rootactualmerge-tree combining5c withmainb062 is ba7a004ce299fbaa5bfb67fc67c8f0d81528b493, no conflicts. Neither liveproviderrelease nor knownsecretfindingresolved by sourceintegration. Root499 actualreview falsefeedback incident proved ownedmetadata-statuscomments lacking genericBOTmarker can raceClaudeclaim and falselychange feedback. Existing statusMessages generates suchcomments for cohortPRs too.

## Expected Behaviour
Use private integrated snapshot, preserve EVERY existing source byte from frozenintegration except explicitlyscopedcommunication/regressiontestfiles. Add generic codex-bug-pipeline BOTmarker to controller-generated statusMessages only, preserving existingleadingISSUE_REVIEW_MARKER, deterministicchunking/idempotence/reportdisplay. Do not tag userfeedback/sourcefeedback as ignorable. Meaningful regression through generated statusmessages and actualGithubfeedbackadapter/fingerprint: own statuspostedafterclaim must notchange substantivefeedback; real userfeedback stillchangesit, foreignauthorcopiedmarker mustnotbeignored. Preserve all original5c guards:exactpreflightbeforemerge/exactmergedSHAdeploy/immutablecorrelation/currentmainrechecks/no duplicate dispatch/32MiBboundedcollector-reader-release. Do not introduce new release/policy/budgetexceptions or broaden credentials.

## Acceptance Criteria
Only agent-team/src/bug-pipeline/issue-review-communication.mjs, agent-team/tests/bug-pipeline/issue-review-communication.test.mjs, agent-team/tests/bug-pipeline/github.test.mjs maychange. Existing source11path5c integration and helper5filemain remainunchanged. Freshfocused existing communication/GitHub/release tests actualPASS with sourcehashbinding; existingunrelatedskipsreportedhonestly. Originalcomplete-release1072 proof reused withoriginalsourceattribution, nevercallitnewexecution. RootwillobtainindependentQA/newnative6 and onlyrequestactualClaudeafteractualsecretfindingresolved. All9historicalimplementationattempts/reviews preserved; noapprovedotherPRrequeue.

## Scope
Private /tmp/clinicos-release-integration10 only; rootmaterializes exactintegrationtree. Author cannotedit/Git operations on /workspace/clinicos-release-integration or existingPRsources/proofs. NO Git/index/ref/canonical/GitHub/provider/DB/Docker/browser/HTTP/install/executable downloads/cache/sharedauth. Read oldsealedproofs/trustedsourceonly. No sourcefixoutside3fileswithoutrootamendment. Output /workspace/.clinicos-cloud/498-release-integration10-20261022/author.

## Test Plan
Use existing trusted stripped verification runner, PATH-only parent, no realtokens/DATABASE_URL. Existingpure node --test communication/github/release/exactdispatch tests; own testfixturesonly. Add targeted meaningful statusfeedback regression using injected fake transport, never network/realAPI. Freeze complete selected source manifest before/after, classify exactscope plusanypreexistingEOLnormalizations; rootpublicationretains originalGitallotherblobs. No fullbackend/UI/provider tests under authorgrant.

## Evidence Plan
/workspace/.clinicos-cloud/498-release-integration10-20261022/author: contract/reservationbeforeSession, inputfreeze/sourcepatch/hashmanifest, actualcommand logs/results, conciseanalysis/report/summary/STOP/seal. Preserveknownsecretfindingandactual403, nofalseend-to-end/deploy/closureclaims. RootpublishesintegratedsourceintoexistingPR498 onlyafterindependentQA, retainingoldpackets/reviewhistory and recordedallowance10.

## Gate Status
READY FOR IMPLEMENTATION after canonicalreservationreadback and rootprivate-snapshotreadyreceipt.
