---
id: 'component.agent-team.agent-team.src.core.binding.verifyevidencebinding'
kind: 'typescript-function'
title: 'verifyEvidenceBinding'
status: 'observed'
summary: 'Exported function from agent-team/src/core/binding.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'agent-team/src/core/binding.mjs'
    symbol: 'verifyEvidenceBinding'
    line_start: '42'
    line_end: '78'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.agent-team'
    evidence: 'agent-team/src/core/binding.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.agent-team.agent-team.src.core.binding.verifyevidencebinding` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.binding.verifyevidencebinding is the canonical typescript-function named verifyEvidenceBinding.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/tests/integration/evidence-binding.test.mjs`

## Invariants

The symbol is exported across its module boundary as `verifyEvidenceBinding`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/binding.mjs:42-78` — verifyEvidenceBinding

## Related Knowledge

- `belongs-to` → `project.agent-team`
