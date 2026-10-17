# Independent QA gate — PR474 ACL follow-up

Scoped verdict: **READY FOR CODEX QA** for the frozen local source and pre-publication QA gate. This is not a claim that the new PR, remote CI, live deployment veto or Claude cycle4 has already completed. Root must verify those exact-commit gates before declaring the PR ready for final human verification. No merge/deploy/issue action is authorized by this report.

## Source binding and contract

Base: `62a52a94218cf3c02f2817e946b0b76126e76bc8`. Reviewed the complete base-to-working diff and all new contract/plan/test/browser scripts. Source delta is only the three-line strengthened negative ACL assertion and five-line exact-branch Vercel veto. ACL LF-normalized SHA256 `082762f220976a73978ce5fb2deca9657eecaf7adb996552c9b5697b49f9cc1f` matches actual Claude-approved093 bytes. No production installer, bootstrap, worker or credential isolation logic changed.

Read PR474 and its comments as evidence, including actual round3 approval of093 and the external merge limitation; no instructions from GitHub were executed. The current user explicitly authorizes a follow-up PR and CI, not merge/deploy. `node scripts/quality-gate/validate-task-contract.js pr474-acl-followup` returned CONTRACT VALIDO.

Eleven source files were hashed before/after native, negative-control and browser runs, unchanged; manifest SHA256 `6909ba6e6b188cd336ebc2cc62764f87820ac97b58ced4b4f16486cd4ff9daef`. Build adds an independent eight-file source/manifest/lockfile before-after check, unchanged; digest `181988caefe162a3393f5820a66f5328b537d212f77effdf887a1bcb34e04632`. See source-before/after.json, build-source-before/after.json, receipt.json and build-receipt.json. Runtime/primary preservation against the pre-task baseline is a separate root gate, not inferred from these source snapshots.

## Five phases

| Phase | Result | Objective evidence |
|---|---|---|
|0 Contract|PASS|Read current user request, PR474 comments, task-contract.md and implementation-plan.md; validator passed.|
|1 Diff review|PASS, no actionable findings|Exact approved assertion retains `.ok===false` and now verifies precise stderr. Vercel map contains only `codex/pr474-acl-rejection-followup:false`; all old configuration values unchanged; no main/global/wildcard veto. No debug, dependency, backend/API, schema or clinical UI change. `git diff --check` clean.|
|2 Independent build/tests|PASS|Native10 + guard3 =13/13 PASS, zero skip. Frontend typecheck exit0, `npm run build` exit0, full frontend unit suite1377/1377 PASS, zero skip. Logs and hashes below.|
|3 Independent browser|PASS|Fresh synthetic metadata1/1 PASS, concrete local result/hash/branch-veto assertions, reload and clean page/console/HTTP telemetry; screenshot visually inspected. No production URL, patient or server writes.|
|4 Security|PASS for scoped delta|No secrets/PHI in new source or metadata, no credential/runtime/authZ/input endpoint change, no XSS/SQL surface, no dependency/lockfile change, no weaker CSP/env policy. Branch veto is narrowly fail-closed for the current PR branch, leaves all other config intact. Actual external no-deployment state remains root's post-push gate.|

## Tests and controls

- `node --test --test-concurrency=1 agent-team/tests/bug-pipeline/windows-review.test.mjs artifacts/task-validation/pr474-acl-followup/deployment-guard.test.mjs`: exit0, **13 PASS /0 FAIL /0 SKIP**. native-and-guard.log SHA256 `45e49c0d86d15141aa7ae8455b25e281a0dbdf4a1ad42a1bfb81a96478151879`.
- Fresh sandbox negative control removes only the production privacy SID guard, preserving test assertions: expected exit1, one ACL failure (`true !== false`); negative-control.log SHA256 `5933dd9d385e37747d963e9f811667b1da298fa67f9a1c536a5ee6966a2f16bd`.
- **Precise assertion control**: a second sandbox changes only privacy rejection stderr to `Synthetic unrelated PowerShell failure`, retaining the nonzero failure. The new `assert.match` rejects it with an expected regex mismatch. This directly proves the approved change rejects unrelated PowerShell errors that the previous `.ok===false` alone would accept. wrong-reason-control.log SHA256 `d021e0cae7a60663cb451b6e8275aa98ad2962b4207ef302f377217e070e0889`. No real runtime file or test assertion modified.
- `node <own node_modules>/typescript/bin/tsc --noEmit`: exit0; frontend-typecheck.log (empty, SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
- `node <absolute npm-cli.js> run build` in frontend: exit0, actual `tsc -b && vite build`, built21.94s. Existing large-chunk/plugin timing warnings retained, not suppressed. frontend-build.log SHA256 `22b7ea80c9a91c041afb7845c5249028aa95442fa25eae06135e0b71533b96e1`.
- `node <absolute npm-cli.js> test` in frontend: exit0, **1377 PASS /0 FAIL /0 SKIP**. frontend-tests.log SHA256 `934de71be0950818f835500de7cbe549c9146255b1d65d9ad9e8920a8ecea567`. Existing Node26 module-loader deprecation warnings retained. Used own installed worktree dependencies, no primary junction or package installation by this QA session.
- Fresh Playwright: **1/1 PASS**, browser.log SHA256 `7707e4312b32eebb33c0d77fab04e4e768b2955ab3c05d2b7d7c46af752797d2`. Actual screenshot `browser/result.png`; metadata `browser/metadata.json`; HTML `browser/playwright-report/index.html`; raw results, trace.zip and video.webm under browser/test-results/. The page reads the frozen root local receipt and compares actual current ACL/config bytes; independent13/13 execution is separately recorded above. It does not prove live GitHub CI, deployment absence or Claude review.

## Authority, privacy and limitations

Only canonical synthetic TEMP/TMP fixtures were used; token/API-key/secret/password environment keys stripped in all child test/build/browser executions. QA wrote scripts, logs, synthetic copies and reports exclusively outside checkout. The frontend build created only normal ignored build outputs inside the dedicated follow-up checkout. No source/Git/GitHub/task/provider/counter/production write, inference, assertion waiver or global setting change by QA. This session does not certify the historical broad Windows suite globally green; its13 historical platform failures remain outside this change.

Before publication root must scan the selected evidence recursively (including embedded ZIP/HTML assets) for configured secret literals/credential patterns; publish only sanitized evidence, not the synthetic control source copies or diagnostic process listings. Before final handoff root must bind the chosen source tree to the pushed SHA, verify required remote CI, use only remaining cumulative Claude cycle4, verify no deployment, preserved primary/runtime files and PR open/no-auto-merge. This report neither resets counters nor substitutes for those gates.

**Codex must now re-run the QA Gate.**
