---
name: user-prefers-autonomous-drive
description: User (Luca) prefers Claude to act autonomously and drive; minimize clarifying questions
metadata:
  node_type: memory
  type: feedback
  originSessionId: 281c7380-2d4e-47cb-98ca-3758502d9ade
---

Luca repeatedly says "procedi" / "processa" and rejects clarifying/prioritization questions. He wants
Claude to **drive the work autonomously and act**, not stop to ask which order or whether to proceed.

**Why:** he treats Claude as the implementer that gets things done end-to-end (fix → evidence → PR),
with Codex as the QA gatekeeper.

**How to apply:** for backlog/processing tasks, pick a sensible order and START; don't ask "which one
first". Reserve questions for genuinely irreversible/ambiguous forks (e.g. prod mutations, overriding
Codex holds — and even those he tends to authorize). Still honor the CLAUDE.md gate: implement +
produce objective evidence + declare READY FOR CODEX QA; never close issues unless he says so.
Related: [[clinicos-branch-topology]].
