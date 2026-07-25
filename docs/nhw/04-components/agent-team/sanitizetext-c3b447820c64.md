---
id: "component.agent-team.agent-team.src.core.sanitize.sanitizetext"
kind: "typescript-function"
title: "sanitizeText"
status: "observed"
summary: "Exported function from agent-team/src/core/sanitize.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/sanitize.mjs"
    symbol: "sanitizeText"
    line_start: "18"
    line_end: "25"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/sanitize.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.sanitize.sanitizetext` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.sanitize.sanitizetext is the canonical typescript-function named sanitizeText.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/adapters/process-runner.mjs`
- `agent-team/tests/unit/process-runner.test.mjs`

## Invariants

The symbol is exported across its module boundary as `sanitizeText`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/sanitize.mjs:18-25` — sanitizeText

## Related Knowledge

- `belongs-to` → `project.agent-team`
