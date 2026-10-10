# #427 Agenda identity and activity states

## Final Decision
CLOSED — VERIFIED

Application 7680ec0b25c61de5745f296d91e370b575de9c00; Verceldpl_7gUmFGCKpyg9Wm6j1tTXtZKMTugY READY exactGitSource/meta SHA; alias/HTML/JS/CSS HTTP200/static hashes unchanged before/after compiled acceptance. Backend unchanged47a/Railwayed539 health200, no backenddeployment required.

## Original acceptance criteria
| Criterion | Result | Actual evidence |
|---|---|---|
| AC1 Identity does not imply activity state | PASS | Names retained; all admin identity dots hidden; week/month identity-border width0, including inlinecolors; scoped CSS excludes HMI |
| AC2 State beyond color | PASS | All four state words retained in day/week/month; cancelled included in named legend; admin blue/amber surfaces agree with badge/legend. Labels preexisted, not a newly claimed feature |
| AC3 Empty/populated hierarchy | PASS | Real DOM appointment-filter caption and activity legend title/counts; empty zero count, no async falseempty message; original handlers/nativecontrols retained |
| AC4 Mixed operators/states/grayscale | PASS | NEW independent QA and byte-identical root/compiled recipes, actual SPA, multiple operators, repeat palette, normal/grayscale, desktop/phone software. No physicalhardware/AT/light certification |

## Independent quality gate and root replay
independent-qa/validation-report.md and manifest.json: 118 immutable files, manifest SHAe8db13384c0e4cae777a2f7d121055f9a4c3f941a7ffba4cbba1792ed7bb23e3. Original4AC read independently. 36 groups each independent/root/compiled; root-rerun/pre-run.json freezes recipes byte-for-byte, source-before/after stable1540physical app inputs, rawSHA1ddbf32e62eeeb45f3087dcd76ddaa814de2aebbc8ac6384555ebfcbc1bcbe9d; independent rawSHAbad1bb43cddfc1deecc9ba6862db3456f5c17afd2c4ab29b52ecd19a8b409431. Cross-checkout differences restricted to verified strictUTF8 CRLF-to-LF only, normalization receipt in release-gate-receipt.json. No app changes during tests. Root checked BOTH physical checkouts against actual cleanGit candidate in root-rerun/source-git-binding.json, without changing the immutable QA bundle. Inherited phone-month narrow seven-column calendar wrapping remains; no global mobile layout/readability redesign claimed.

Commands10focusedPASS, FE/BE/types/tsc-b/ViteReactcompiler/secretsPASS. Full1271:1259PASS/12 exactnamedacceptedbaseline/0new. Not globallygreen. Native scanner4diffpaths0new baseline/candidate; not globalCVEcertification. Security checklist in independent report; no API/auth/schema/deps/env/config changes or runtime bypass. CI38009583177 exactsame single accepted422backendfailure/stage Backend unit tests; downstream importtests skipped, not claimed passing; secret38009583192 success. ci-comparison.json authoritative.

## Artifacts and safety
Actual successful results/screenshots/traces/videos: independent-qa/browser02, root-rerun/browser02, compiled-online/browser02; independent-qa/values01, root-rerun/values01, compiled-online/values01. Planfolders enumerated in each browser-plan.json; preliminary failed QA attempts remain historical inside immutable QA manifest and are NOT successful replay claims. Receipt HTML in corresponding playwright-report, clearly Playwright library rather than native runner report if applicable. Pinned public proof790fdaa96fcf739dbf638407270e50d023faceea, 4 PNG HTTP200/rawSHA verified in public-preverification.json. Final publisher must reverify current finalproof canonical hashes/PNG/actor/exactoriginalissue before closure.

All clinical/auth/facility requests intercepted BEFORE wire, staticonly production GET allowlist, zero unauthorized/unexpected/HTTPconsole/pageerrors and zero real writes. Synthetic names/IDs only; no original clinical photos. User main dirty/native launchers/blocked405/408/410/416 preserved. local initial test-discovery/tsxtransform incident retained in initial-test-discovery.md and tdd-red.log, no failing independent assertion weakened. root-initial02 actual pre-freeze command/security data included. No real persistence claim required for presentation-only change. Publication scanner checks configured credentials and expanded ZIP canonical blobs; publication-manifest.json authoritative. Final action policy is root human-authorized gate, no fabricated Ruflo lease/capability.
