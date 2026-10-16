# Validation report — Windows review setup local checkpoint

**BLOCKED** pending actual native Windows and required Linux CI. Source review has no unresolved finding and gives GO for commit/push to obtain native evidence; it does not certify remote installation on the user's PC.

| Phase                | Outcome                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| Contract/diff        | PASS; findings fixed,8-file source manifest                                          |
| Local tests          | 130 total:127PASS,3native-Windows SKIP,0FAIL                                         |
| Static checks        | PASS JavaScript/YAML/inline scripts; required Linux check depends on Windows success |
| Native Windows/Linux | PENDING exact-source Actions execution                                               |
| Browser              | PASS1/1, explicit QA-only real Linux-host limitation result                          |
| Security             | Source PASS after fixes; actual Windows ACL/native acceptance pending                |

Evidence: `task-contract.md`, `qa-gate.md`, `qa-reviewed-files.sha256`, `qa-full-regressions.txt`, `qa-static-checks.txt`, `qa-actual-readiness.json`, `qa-browser.txt`, `result.png`, `trace.zip`, `video.webm`, `playwright-report/index.html`.

No model inference, actual task registration/removal, user-desktop mutation, GitHub mutation, budget reset, merge or deploy was performed by QA. The browser proves accurate blocked readiness reporting only. A subsequent durable native-CI addendum on the PR may update this verdict for unchanged source hashes; personal-PC installation is not established by CI.

## Branch and integration context update

Independent read-only GitHub inspection confirms PR471 was merged at2026-10-16T22:44:40Z, merge commit `d7e070a5a3c156f3c9216b4f2d18d0dc1e7c7ee3`. That user integration is the base for this separate Windows follow-up branch `codex/windows-claude-review`; the Windows source is not established as integrated by the earlier PR. The bootstrap target and matching native fixture branch now select this Windows branch. Remaining reviewed implementation bytes are unchanged. Windows/Linux native CI for a new draft PR remains pending; no personal task or provider execution is implied.

## Native CI correction checkpoint — PR474

Independent read-only inspection of [run38978727112](https://github.com/l2v-hub/ClinicOS/actions/runs/38978727112) at88be3fb1b22477b21553089c25e4f4dafdc173fa confirms8 Windows passes and2 failures: ACL creation could not autoload Microsoft.PowerShell.Security/Set-Acl, and the clean bootstrap fixture failed without an exposed exception. The stable Linux required check correctly failed immediately on WINDOWS_RESULT=failure; native Linux sandbox/service steps did not run. Raw evidence: `qa-native-first-failure.txt`. Draft Windows PR is474, separate from merged471.

The bounded correction removes PSModulePath case-insensitively only from the child powershell.exe environment so Windows PowerShell rebuilds its own modules. Parent environment, other children, profiles and execution policy remain unchanged. The native ACL test now deliberately supplies an incompatible inherited module path; the bootstrap fixture prints only its synthetic exception message for diagnosis. Independent real-child boundary probe1/1 passes (`qa-module-env.test.mjs`, `qa-module-env.txt`): PowerShell-named child receives no inherited module-path keys, other child retains them and the original environment is unchanged. Affected installer/Windows suites pass15/18 with3 native skips (`qa-module-followup.txt`). This is not a successful native retry; actual corrected Windows/Linux CI remains pending. The browser's Linux-host nativeWindowsExecuted=false describes that specific local readiness probe, not a claim that no Windows CI ran.
