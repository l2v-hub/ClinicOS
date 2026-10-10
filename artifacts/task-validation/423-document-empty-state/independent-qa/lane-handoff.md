# RELEASED

QA2 exclusively owned serialized7531 for actual candidate/baseline SPA runs. All owned static processes were normally stopped by the lane owner; no unrelated process was killed. No DB lane acquired or used.

- browser01 PID43736 stopped SIGTERM, failed selector attempt retained.
- browser02 PID17768 stopped SIGTERM, status0.
- baseline01 PID2960 stopped SIGTERM, status0.
- browser03 PID25432 stopped SIGTERM, final candidate status0.
- baseline02 PID41784 stopped SIGTERM, final accepted-baseline status0.

Exact receipts: each attempt's lane-receipt.json. Final port-final-released.json independently bound a native7531 probe and closed it successfully; free:true. No browser/static process remains owned by QA2.

Final plan: browser-plan.json -> recipes/browser.mjs, browser03/run,46 candidate cases/30 synthetic contexts. Accepted-baseline comparison: baseline02/run,2 cases, C:/w-423-before-qa1 at3cd984a5a40f1fe5cdc368dbcc4bb629bd6d1510. Raw schema: applicationCommit,outcomes[{name,status}],states,fixtureTransport. Final recipes byte-identical in recipes/,browser03/recipes/,baseline02/recipes/. Baseline is not counted as candidate PASS.

Root integration owner may independently replay these unchanged recipes on its owned7530 lane, bind its current source before/after, and decide release. This independent QA has no commit/push/deploy/GitHub or real clinical/API/DB write authority. Publication/closure remains pending independent root replay and authorized release.
