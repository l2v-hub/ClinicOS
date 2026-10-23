# Independent QA commands

Source worktree: `/workspace/clinicos-adaptive-work-items`.

- Frozen source SHA-256 comparison of all 103 files against `../source-freeze.json` before independent execution.
- `/tmp/clinicos-node22-native12/node_modules/node/bin/node --test agent-team/tests/bug-pipeline/*.test.mjs`
- `/tmp/clinicos-node22-native12/node_modules/node/bin/node --test /tmp/clinicos-adaptive-orchestration-20261023/qa/novel-caller-faults.test.mjs`
- `/tmp/clinicos-node22-native12/node_modules/node/bin/node --check <each of 16 changed/new source or test .mjs files>`
- `git diff --check 26a4137814f47c78d590f1b4dfe928d480e92909`
- Python SHA-256/byte verification of 79 pinned upstream files, MIT license, 27 frontmatter records and credential-pattern scan of frozen source.
- Python PyYAML parse of `.github/workflows/codex-bug-pipeline.yml`.
- `/tmp/clinicos-node22-native12/node_modules/node/bin/node /tmp/clinicos-adaptive-orchestration-20261023/qa/browser-evidence.cjs`
- Browser: existing Playwright at `/workspace/ClinicOS/node_modules/playwright`; installed `/usr/bin/chromium`; ephemeral localhost-only artifact report; no app stack or external network used.
- SHA-256 comparison after source review/execution; trace ZIP integrity check.

Initial QA harness failures remain in `logs/novel-caller-faults.log`: the retained-tamper assertion initially ran after normal parent checkpoint, so the earlier exact-tip guard correctly stopped it; the blocked-stage assertion initially read durable parent progress before its outer caller saved the failed state. The QA harness now tests tamper immediately after graph execution and saves outer parent failure state. No feature source was changed for these corrections. The final novel fault run passes 3/3.

The initial browser attempt requested optional video and found no installed Playwright ffmpeg. No download was performed. Video was removed from the artifact-only harness because this feature changes no product UI/chat/voice. Screenshot, trace, HTML report and raw assertions pass in the final run. Both browser logs are retained.
