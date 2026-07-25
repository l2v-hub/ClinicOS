---
id: 'component.scripts.scripts.nhw.lib.knowledge-pipeline.synchronizeknowledgerecords'
kind: 'typescript-function'
title: 'synchronizeKnowledgeRecords'
status: 'observed'
summary: 'Exported function from scripts/nhw/lib/knowledge-pipeline.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'scripts/nhw/lib/knowledge-pipeline.mjs'
    symbol: 'synchronizeKnowledgeRecords'
    line_start: '219'
    line_end: '238'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.repository-automation'
    evidence: 'scripts/nhw/lib/knowledge-pipeline.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.knowledge-pipeline.synchronizeknowledgerecords` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.knowledge-pipeline.synchronizeknowledgerecords is the canonical typescript-function named synchronizeKnowledgeRecords.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/generate.mjs`
- `scripts/nhw/test/knowledge-compiler.test.mjs`

## Invariants

The symbol is exported across its module boundary as `synchronizeKnowledgeRecords`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/knowledge-pipeline.mjs:219-238` — synchronizeKnowledgeRecords

## Related Knowledge

- `belongs-to` → `project.repository-automation`
