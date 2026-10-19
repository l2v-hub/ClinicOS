# Preserved QA attempt history

No prior attempt or evidence file was rewritten.

1. Initial preservation helper wrongly compared historical author disk presence against present post-root sparse materialization. Historical Git blobs and existing disk bytes matched; corrected helper pins current QA before/after presence and independently verifies7448 old proof entries, including all26 original untracked proofs. This was a QA helper assumption, with no source mutation.
2. New R1-R7 initial run:28/29 passed. R3 expected the authorization-provenance text even when an issue-only normal owner correctly rejected earlier for unsupported allowance coordinates. The original harness is r1-r7.initial.test.mjs and output r1-r7.json.
3. Second R1-R7 run:28/29 passed. A manual owner without a reviewIssue also correctly rejected earlier. Preserved r1-r7.second.test.mjs and r1-r7-final.json. Final harness checks authorization-provenance for PR/reviewIssue owners and the earlier issue-only rejection for unready owners; all cases still require rejection by both validators. No product assertion or enforcement was weakened.
4. Final R1-R7 run after four additional revision-adoption cases:33/33 passed, r1-r7-third.json.
5. Browser's first nonblocking global clinical lock acquisition refused before browser execution. Root confirmed disjoint ownport5592 and private controller lock; recorded scope-amendment-controller-lock.md before changing harness. No global lock or clinical resource was used. Private-lock browser completed all7 actions.
6. First actual CLI run:1/2 passed. /usr/bin/time was unavailable; CLI did not start for the failing command. Preserved cli.initial.test.mjs, cli.json and cli-backend-attempt1/. Corrected observation uses a read-only Node import and process.resourceUsage().maxRSS on exit, not a system installation.
7. Second actual CLI run:2/2 passed, cli-second.json and cli-backend-attempt2/. Added actual CLI same-owner409/CAS and exact8MiB status tests; final run3/3 passed, cli-third.json.
8. A final report-helper initially assumed every manual owner had a pr property and raised KeyError. The complete checked helper uses optional real coordinates; all source/proof preservation checks passed. No test or source was changed by that helper.

All failed QA setup/assertion attempts remain private. Final successful suite counts are reported separately from earlier attempts and expected negative CLI exit codes.
