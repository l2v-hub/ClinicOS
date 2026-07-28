---
name: clinicos-branch-topology
description: ClinicOS which branch is actually deployed vs the local working branch (they differ)
metadata:
  node_type: memory
  type: project
  originSessionId: 281c7380-2d4e-47cb-98ca-3758502d9ade
---

ClinicOS production (Railway runtime/backend) runs code from **`main`**, which **already contains** the
Agnos-LLM-on-Azure code (`clinicos-ai-runtime/.../env_config.py` `resolve_agnos_llm`, `configuration.py`
`_ROLE_RESOLVERS`, `providers/azure.py`). Confirmed via prod `GET /v1/runtime/health` showing
`agent=azure:gpt-5.5`.

The **local working branch is often `ai/codex-project-stabilization`**, which is an OLDER/divergent
branch with a deterministic-only assistant and NO `env_config.py` — do NOT assume the checked-out
working tree reflects production. `req-236-azure-gpt55` = `main` + a docs commit (nearly identical).
The `.worktrees/*` dirs had broken git (stale `C:` gitdir after a C:→E: repo move) — create a fresh
`git worktree ... origin/main` to get a committable tree. Related: [[clinicos-azure-foundry-config]].
