# PR474 Windows verification

Final Decision: PARTIAL — native setup checks pass; actual SHA-bound Claude review and new exact-source CI still pending at this source checkpoint. This report is not a merge/deployment approval. Later durable Claude reports and the final PR comment bind the actual reviewed commit without rewriting this historical checkpoint.

## Source and preservation

Base d2019b6f308187d513b742a6779d2764f350b8a9 plus one native test-file correction and scoped documentation/evidence. Installed runtime scripts unchanged from d201; no clinical/frontend/backend/schema/dependency change. Primary C:/Workspace/ClinicOSHouse remains branch ux2/cycle, HEADa5194907925ad05db04d8c6cef7807f5ff7d190f with two original dirty scripts. No stash/reset/clean/switch, credential copy, global execution policy or global Git/environment mutation. Dedicated canonical physical MSIX-backed checkout only; its local longpaths setting remains.

## Original two failures

1. `native Windows ACL creation is private and rejects a later public access rule`: assertion change.ok failed; `Set-Acl` raised PrivilegeNotHeldException because SeSecurityPrivilege was absent. Secure directory/config and initial privacy already passed. The synthetic public mutation—not the privacy rejection—failed. Correction: File.GetAccessControl(Access) / File.SetAccessControl changes DACL only, checks owner and inheritance protection unchanged, still requires mutation success AND privacy rejection of Everyone Read. No assertion removed.
2. `native Windows bootstrap preserves dirty, foreign, wrong-branch and diverged work and fast-forwards only its dedicated checkout`: nonrepo reason assertion received script-execution-disabled under PowerShell5 Restricted, before bootstrap scenario execution. Correction: only the synthetic child uses RemoteSigned, never Bypass or persistent Set-ExecutionPolicy; MachinePolicy/UserPolicy/LocalMachine/CurrentUser values must match before/after. All seven original scenarios and HEAD/file/installer-marker assertions remain. An enforcing GPO still applies and cannot be bypassed.

Original8PASS/2FAIL logs/result stay outside the source checkout in the existing local setup packet. They are not relabelled. The canonical synthetic TEMP/TMP root avoids the independently observed MSIX alias mismatch; generic alias support is not claimed. The bootstrap/path trust checks still fail closed and the supported explicit physical-path installation is documented.

## Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Contract | PASS | task-contract.md validator |
| Root native Windows | 10/10 PASS, zero fail/skip/cancel | native-1792193729518/test.log, receipt.json |
| Independent native Windows | 10/10 PASS, zero fail/skip/cancel; source unchanged | independent-qa/native-1792193794909; manifest b36cdc2fcc942ac3151f037df30034e5d2c2853da4cccf90f2c5285d3aa6ae1a |
| Independent scoped diff/security | READY FOR CODEX QA for fixture correction only | independent-qa/validation-report.md |
| Broad suite on Windows | FAILED:130 tests/116PASS/13FAIL/1SKIP | full-1792193776736/test.log; raw failure history retained |
| Fresh metadata browser | PASS1/1, assertions/reload, clean telemetry, screenshot/trace/video | windows-result.png, browser-results, browser-report |
| Actual task | PT5M, Interactive/Limited, Ready, last result0 | runtime-snapshot.json, exact snapshot time retained |
| Claude Max PR review | PENDING; cron empty and earlier smoke are NOT review | durable continuation setupReview474 will reserve before inference |
| New exact-source required CI | PENDING push/checks | final PR summary will give exact run links/results |

Broad Windows failures are not waived or called green: six POSIX cron tests assume LF templates/POSIX permissions, several symlink fixtures cannot be created without host privileges (EPERM), and two process-environment/private-mode tests use POSIX assumptions. The process-group termination test is the single explicit existing Windows skip. Native Windows10 pass within that broad run too. The intended CI matrix is Windows native10 plus Linux broad130; no assertion/skip change was made to hide these13 host-lane failures. Original exactd201 CI38979450053 passed Windows10/Linux127+3native skips, but is historical and is NOT a new-commit CI result. Required fresh CI must settle before final readiness. No frontend build was run here because no clinical/frontend/config/dependency bytes changed; original clinical-build evidence remains historical, not a new claim.

## Security and operating limits

Cached claude.ai Max remains in personal config. Actual review must use restricted Read/Glob/Grep, no MCP/writes, no API keys or fallback, and structured subject_sha validation. Remote CAS reservation precedes inference. Existing failed setup471 round is retained in the continuation lineage; maximum4 cumulative rounds, not four new attempts. No model evidence existed at this checkpoint.

Private real scheduler config/ACL and exact action checks passed during installation and must be rechecked after source commit. Metadata screenshot renders captured Task Scheduler facts, not task controls or the clinical app; reviewExecuted=false is explicit. No patient data, credential values, raw account email, SID, or production actions in this packet. Public logs were checked for credential-shaped strings/connection URIs/auth headers, zero found. Privacy source review is bounded to this automation change, not global application security certification.

The PC must remain powered, connected and user logged in. MSIX physical storage is explicit; reinstall/relocate before uninstalling Codex. PR remains open; no merge/deploy, issue processing or remote budget reset is authorized by this report.
