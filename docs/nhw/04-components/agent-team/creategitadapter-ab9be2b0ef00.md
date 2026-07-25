---
id: "component.agent-team.agent-team.src.adapters.git.creategitadapter"
kind: "typescript-function"
title: "createGitAdapter"
status: "observed"
summary: "Exported function from agent-team/src/adapters/git.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/adapters/git.mjs"
    symbol: "createGitAdapter"
    line_start: "15"
    line_end: "169"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/adapters/git.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.agent-team.agent-team.src.adapters.git.creategitadapter` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.adapters.git.creategitadapter is the canonical typescript-function named createGitAdapter.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/runtime.mjs`
- `agent-team/tests/integration/evidence-binding.test.mjs`
- `agent-team/tests/unit/claim-worktree-authority.test.mjs`
- `agent-team/tests/unit/git-worktree-recovery.test.mjs`

## Invariants

The symbol is exported across its module boundary as `createGitAdapter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/adapters/git.mjs:15-169` — createGitAdapter

## Related Knowledge

- `belongs-to` → `project.agent-team`
