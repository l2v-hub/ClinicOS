---
id: "component.agent-team.agent-team.src.core.locks.releasegithubclaim"
kind: "typescript-function"
title: "releaseGitHubClaim"
status: "observed"
summary: "Exported function from agent-team/src/core/locks.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/locks.mjs"
    symbol: "releaseGitHubClaim"
    line_start: "119"
    line_end: "131"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/locks.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.locks.releasegithubclaim` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.locks.releasegithubclaim is the canonical typescript-function named releaseGitHubClaim.

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
- `agent-team/tests/unit/claim-lifecycle.test.mjs`

## Invariants

The symbol is exported across its module boundary as `releaseGitHubClaim`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/locks.mjs:119-131` — releaseGitHubClaim

## Related Knowledge

- `belongs-to` → `project.agent-team`
