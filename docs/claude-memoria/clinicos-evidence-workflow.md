---
name: clinicos-evidence-workflow
description: 'How to produce/attach objective QA evidence for ClinicOS issues — Codex Gate SUPERSEDED 2026-07-20: internal independent QA gate, Claude may merge/close after QA PASSED'
metadata:
  node_type: memory
  type: project
  originSessionId: 08434833-867b-426e-9ae2-c1343b876320
  modified: 2026-07-20T15:52:34.467Z
---

**PROCESS CHANGE (user directive, 2026-07-20): the Codex Gate is retired.** The user said "non serve Codex, devi affrontare direttamente tu il discorso QA" — Claude now runs the QA gate itself, but NEVER self-certifies: the `qa-gate` skill's 5 phases run in a **dedicated independent QA subagent** (worktree isolation; whoever wrote the code doesn't certify it). Verdicts become **QA PASSED / BLOCKED / FAILED VALIDATION** (instead of READY FOR CODEX QA). After QA PASSED, Claude MAY merge the PR (squash, repo style) and close the issues, attaching the QA verdict + evidence links as an issue comment. First applications: PR #293→issue #263 closed (merge `ec7fafc7`); PR #292 batch #278-285. CLAUDE.md still contains the old Codex-Gate text — the user directive overrides it.

**Why:** the user wants the loop concluded end-to-end without the external Codex gatekeeper.
**How to apply:** on delivery, spawn an independent QA agent per PR (evidence to `artifacts/task-validation/<n>-qa-gate-.../` in the MAIN repo path, since agent worktrees get cleaned); on PASS → merge + close with evidence comment; on BLOCKED/FAILED → back to implementation, never merge.

(Historical, pre-2026-07-20:) requirement processing ran under the **Codex Gate**: Claude implements + produces evidence + declares READY FOR CODEX QA — never closes/merges/deploys; Codex sole QA Gatekeeper.

**Private-repo image gotcha:** `l2v-hub/ClinicOS` is PRIVATE. `raw.githubusercontent.com/...` URLs return 404 without a token, and GitHub's anonymous camo proxy can't fetch them → `![](raw...)` embeds do NOT reliably render inline in issue comments. The repo's prior comments used raw-URL embeds anyway (they render for authenticated members inconsistently). Reliable inline rendering on a private repo needs GitHub **user-attachments** (browser drag-drop upload), which `gh` can't do. Pragmatic approach: (1) commit+push evidence to the `fix/issue-N` branch (that's the objective ground truth Codex can view), (2) post the comment with inline **textual** proof (JSON/code blocks always render) + the raw-URL image (repo convention) + a `/blob/<SHA>/...` clickable fallback.

**Evidence stack:** bring up the real local stack for live Playwright — `podman start clinicos-postgres` (container exists, was Exited), then `npm run dev:backend` (:3001) + `npm run dev:frontend` (:5173) in background; smoke via `node .claude/skills/run-clinicos/driver.mjs smoke`. DB seeds ~15 synthetic patients (e.g. `Moretti, Elena` = SEED-PAZ-008). Reuse `e2e/agnos-llm-reads.mjs` pattern (`.agnos-input` / `.ai-asst__send`, intercept `/ai/actions/plan`). `rtk` proxy truncates piped curl output — write responses with `curl -o file` then parse the file.

Artifacts live under `artifacts/task-validation/<n>-<slug>/` (task-contract.md, validation-report.md with `Final Decision: READY FOR CODEX QA`, screenshots/, trace/trace.zip, video/, logs/). See [[clinicos-branch-topology]].

**Subagent worktree discipline (incident 2026-07-10):** a fix subagent once worked in the MAIN repo instead of the assigned worktree, committing on the wrong branch and swallowing the user's uncommitted changes (recovered via `reset --mixed HEAD~1` + surgical hunk removal). Every subagent dispatch that commits MUST mandate: verify `git rev-parse --show-toplevel` ends with the worktree path AND `git branch --show-current` matches, before edits and before commit, else return BLOCKED. Also: `backend/package.json` `test` script is a hardcoded file list — every new test file must be registered there or it silently never runs in regression.
