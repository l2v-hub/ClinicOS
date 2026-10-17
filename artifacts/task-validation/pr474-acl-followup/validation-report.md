# PR474 follow-up — pre-publication validation checkpoint

Final Decision: PARTIAL — independent local QA passed; exact pushed-source CI, live deployment absence and actual final Claude Max cycle4 remain pending at this immutable checkpoint. The final PR comment and durable report will update those gates without rewriting this historical evidence. This is not merge/deployment authorization.

## Source and scope

Base main62a52a94218cf3c02f2817e946b0b76126e76bc8; source delta is the approved ACL assertion and exact follow-up branch Vercel veto only. Task scripts/reports are synthetic QA artifacts. No backend/schema/API/runtime/credential/dependency/lockfile or clinical UI changes. Scope verified against the complete diff, not previous PR history. Earlier squash merge requires a new main-based parent; old093 commit approval is not falsely reassigned to the new SHA.

ACL test LF bytes SHA256082762f220976a73978ce5fb2deca9657eecaf7adb996552c9b5697b49f9cc1f match actual round3-approved093. It still requires a failed privacy result and now matches Non-private scheduler state. No assertions/skips removed. Config prior-semantic digest497c7bc34e85f8b735d50076fca7f8bef49479826f25fb3e0452adf27109410a unchanged after excluding the added git key. Exact branch codex/pr474-acl-rejection-followup is false, no wildcard/main/global veto. Live project lookup before push found only clinicos__ linked to this repo, frontend root, auto Git previews enabled; no provider settings mutation. Official policy reference: https://vercel.com/docs/project-configuration/git-configuration.

## Acceptance criteria and phases

|Criterion/gate|Result at checkpoint|Evidence|
|---|---|---|
|Contract/plan|PASS|task-contract.md validated CONTRACT VALIDO; implementation-plan.md|
|ACL reason/bytes|PASS|deployment-guard.test.mjs; native receipts; independent controls|
|Branch-only veto / unchanged config|PASS locally; live post-push absence PENDING|guard tests3PASS; provider read-only inspection|
|Root native+guard|13/13PASS,0FAIL,0SKIP|native-1792195143404/receipt.json,test.log, source-before/after|
|Independent native+guard|13/13PASS,0FAIL,0SKIP|independent-qa/receipt.json,native-and-guard.log|
|Independent negative controls|expected failures, not product failures|SID removal: negative-control.log; wrong PowerShell error with retained nonzero exit: wrong-reason-control.log|
|Independent frontend|typecheck/buildPASS;1377/1377 unitPASS,0skip|independent-qa/build-receipt.json, frontend-typecheck.log, frontend-build.log, frontend-tests.log|
|Independent browser|1/1PASS; actual values/reload/clean telemetry|independent-qa/browser/result.png,metadata.json,playwright-report,test-results; browser.log|
|Diff/security|PASS scoped, no actionable findings|independent-qa/validation-report.md; source/lock manifests unchanged|
|Exact-source remote CI|PENDING publication|final PR comment will bind head/integration SHA/tree and new run links|
|Final Max / cumulative budget|PENDING final4/4 only|prior1failed/2changesrequested/3approved retained in setupReview474; no API fallback/reset|
|No deployment / open PR / preserved primary|PENDING final live recheck|final source-bound PR comment and local receipt; no merge/auto-merge/deploy authority|

Root source manifest c81799652fa01bc45dfe89d76b49a5ff9c8dbe06c61947004cc4dbb45a8a1fd6. Independent native/browser11-file manifest6909ba6e6b188cd336ebc2cc62764f87820ac97b58ced4b4f16486cd4ff9daef; independent build8-file manifest181988caefe162a3393f5820a66f5328b537d212f77effdf887a1bcb34e04632. Before/after identical. Counts and raw log digests are in receipts; original external QA copies retained. No synthetic-control source copies are published.

## Limits and safeguards

Browser result is a QA-only intercepted metadata page, not a clinical app/deployment, not proof of live CI/Claude. It reads the actual local receipt/config/source hash and displays its scope; screenshot independently and root visually inspected. No services, production patient reads/writes or data migrations were used.

Frontend build retains existing large-chunk/plugin timing warnings; Node26 unit-suite loader deprecation warnings retained. Historical broad Windows suite116PASS/13FAIL/1SKIP remains historical RED (POSIX/CRLF/symlink privileges), not relabelled; the intended full regression lane is Linux. No platform assertions weakened.

Worktree is separate from primary dirty project and installed093 checkout. Lockfile installation was isolated with ignore-scripts/HUSKY0, no junction/dependency borrowing. Personal cached Max configuration remains in place and is never copied. Final review must be restricted Read/Glob/Grep, no MCP/command/write tools, CAS-reserved final4/4 before inference. Bot status/review comments use the existing codex-bug-pipeline marker to suppress broad pipeline wakeups. No issue queue starts.

Before push root scans the entire selected delta recursively including ZIP and embedded HTML ZIP evidence for configured secret literals and credential patterns. Only synthetic source/test/metadata can be published; the final comment will record actual scan results, not a general PHI/security certification. Preserve original failed result/reviews and all user files. Leave PR open for final human verification; do not merge, deploy or enable auto-merge.
