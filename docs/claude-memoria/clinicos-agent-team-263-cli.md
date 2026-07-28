---
name: clinicos-agent-team-263-cli
description: agent-team subsystem (REQ
metadata:
  node_type: memory
  type: project
  originSessionId: 7a45fd8d-9aea-4836-82a8-521a0c24281f
  modified: 2026-07-20T15:14:11.961Z
---

The **agent-team orchestration subsystem** (REQ #263) is in `main` (merged `fc2d337`, PR #286) as a **self-contained CLI-only** directory `agent-team/` (66 files: config, protocol JSON schemas, prompts, cli/commands/adapters/core/workers, tests) + 5 root npm aliases: `agent-team:doctor|once|start|status|stop`. It does **NOT run in the deployed web app** — there is nothing to "test online" in the browser. Try it from a terminal: `npm run agent-team:doctor` (green: ok/dev/qa ready), `npm run agent-team:status` (reads live GitHub state for labeled issues).

Purpose: durable, restart-safe loop where **Claude is the only implementer** and **Codex is the independent QA gatekeeper** on GitHub-labeled issues (`ready-for-dev`+`assigned-to-claude` → dev → `ready-for-qa` → qa-passed/failed). Never merges/deploys/closes on its own.

**Status (2026-07-20):** #263 issue still **OPEN**, now labeled `ready-for-qa`. The last Codex verdict (attempt 9) failed only AC2 → finding **QA-263-016** (doctor false-negative on fresh checkout: `git check-ignore` on bare runtime/worktree roots returns nothing when the dir doesn't exist). Fix delivered as **PR #293** (`fix/263-qa-016-doctor-fresh-checkout`, head 14d50e3): probe a synthetic child path `<root>/.doctor-ignore-probe` (existence-independent, read-only) + real temp-git-repo regression tests; suite 108/108; evidence under `artifacts/task-validation/qa-263-016-doctor-fresh-checkout-ignore-probe-fix/` (logs force-added — `*.log` is gitignored), comment on #263 with blob URLs at the SHA. **PR #264 is CLOSED** — delivery vehicle for #263 is now main-based PRs. Original port was merged via explicit user override WITHOUT the Codex QA gate. `.claude/team/` in main is the OLDER, unrelated tmux team — not this subsystem. NB: `agent-team:doctor` needs codex+claude+gh all authenticated (they are locally). PR-CI gotcha: the legacy Azure SWA "Build and Deploy Job" check fails on PRs with "maximum number of staging environments" — environmental, ignore it (Vercel is the real frontend deploy). Related: [[clinicos-husky-ci-gotcha]].
