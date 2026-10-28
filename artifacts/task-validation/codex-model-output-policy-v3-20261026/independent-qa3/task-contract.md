# Independent QA3 contract

Source `31b11f09331249a93468bf00d8cc3d1313004a72`; parent `b868e72ceb2d2e29fdaf077b3d7144c34481e176`; baseline main `995e2ff6d14a96b5d67e0d14d708f4a95c4c816f`. QA nonce `e224a4fd-aebb-4679-af5e-7d1d6eb061e5`. Reservation was read before this session; canonical reservation state `5993433361c47a422398a10432c77e1e462ff9da`.

Scope is the root-approved v3 nonfatal model stdout policy and peer1 findings. The task is provided by the trusted coordinator; no network/API or issue read is permitted in this QA session. Actual peer1 report was read from `../source-pr-native-handoff/actual-peer-report.json`. The existing 117-file historical packet is immutable evidence, not unrelated source work.

- AC1: Real fakecodex.mjs emits >2 MiB stdout plus valid separate typed result. Old b868 fails; candidate succeeds with full raw count and <=32 KiB retained stdout.
- AC2: Both tails own <=32 KiB backing each; discarded bytes are unreachable. No raw stdout disk/log retention.
- AC3: 64 KiB fatal model stderr, 30 minute configured timeout, TERM→KILL process groups and 256 KiB regular/path/schema/symlink typed-result checks remain. Exercise small real timeout and descendant cleanup.
- AC4: Default/controller/review/verification callers retain combined limits and prefix capture. Only models pass limitStdout:false; option is boolean validated. All tracked actual runner call limits fit 64 MiB, including forwarding. Separate process adapter remains separate.
- AC5: Bare 401/403/402/429/502/503/504 source numbers produce other and no capacity cooldown; anchored HTTP/status and terminal provider codes retain categories and actual next selections. Finite private diagnostics and 64-entry collector remain.
- AC6: Exact native command passes independently. Frontend unchanged; no frontend build or six-check native CI claim. Safe local generated report receives Playwright assertions, reload, screenshot, trace and zero external requests/errors.
- AC7: No CLI/auth/environment/role/counters/release or source edits by QA. All six file identities sealed before/after. Final metadata head is unknown; later head can bind to this seal only through identical source projection and actual new-head CI.

Skills applied: `.claude/skills/qa-gate/SKILL.md`, `.claude/skills/playwright-evidence/SKILL.md` and evidence contract sections of `parallel-evidence-remediation/SKILL.md`, read in the bounded snapshot. No app stack/database, publication or provider calls are authorized here.
