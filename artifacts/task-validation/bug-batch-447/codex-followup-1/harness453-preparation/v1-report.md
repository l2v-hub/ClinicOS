# UX453 / route486 harness preparation evidence

Status: **prepared; browser E2E unexecuted**.

- Reserved HEAD: `ccea0be90b906e71c3a32581097781e9623b6cef`.
- Original harness SHA-256: `f0cc1ef82e21761bfb104128c1087b5c7498442d509d06d44870baf26fbca50a` (matches reservation).
- New harness SHA-256: `da96ad3af26a98f600bc7d0782a58c77fd61e1e1d9626c95e190604194ac7dc0`.
- Task contract SHA-256: `89ce49e2b394e67925223d89194eb0b3b5df08817b246b99e82138fb0b3d486a` (matches reservation).
- Accepted amendment SHA-256: `7aeb7dc7960a035c06f4867b969db9222dc789d4def858534d378a9823bf12fc` (matches reservation).
- Scope check: bytes before and after the #453 scenario are identical to the original; the original harness remains byte-identical. Worktree changes are limited to the authorized new harness plus pre-existing reserved contract artifacts.
- Bounded-flow static check: known-negative path has four individually wrapped UI actions (explicit route, twice-daily schedule, seven-day duration, save); positive recorded-allergy path has five (those four plus the acknowledgement checkbox). Both assert the existing one-compressa default without editing it. No page evaluation or API assignment occurs in either counted block.
- Positive flow checks recorded warnings and initial unchecked acknowledgement, exact AIC/strength/operator route/active state/civil dates/schedules, SQL readback, and UI persistence after reload. Later invalidation cases begin with a fresh prescription.
- `node --check` passed through the trusted `createRunner` with `envMode=verification`, owned runtime directory, and child `PATH` only. The harness was not imported or executed.
- Git status at preparation time:
```text
?? artifacts/task-validation/bug-batch-447/codex-followup-1/harness453-preparation/
?? e2e/qa-bug-batch-447-route486-browser.mjs
```

The complete copy diff is in `harness453-exact.diff`; run metadata and author attempts are preserved alongside this report. No actual E2E, app, database, browser, network, provider, Git write, commit, or push operation was performed.
