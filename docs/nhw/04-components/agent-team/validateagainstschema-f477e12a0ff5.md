---
id: "component.agent-team.agent-team.src.core.json-schema.validateagainstschema"
kind: "typescript-function"
title: "validateAgainstSchema"
status: "observed"
summary: "Exported function from agent-team/src/core/json-schema.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/json-schema.mjs"
    symbol: "validateAgainstSchema"
    line_start: "1"
    line_end: "31"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/json-schema.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.json-schema.validateagainstschema` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.json-schema.validateagainstschema is the canonical typescript-function named validateAgainstSchema.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/core/binding.mjs`
- `agent-team/src/core/protocol.mjs`
- `agent-team/src/workers/claude-development-worker.mjs`

## Invariants

The symbol is exported across its module boundary as `validateAgainstSchema`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/json-schema.mjs:1-31` — validateAgainstSchema

## Related Knowledge

- `belongs-to` → `project.agent-team`
