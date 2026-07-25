---
id: "component.scripts.scripts.nhw.lib.knowledge-pipeline.writeknowledgerecords"
kind: "typescript-function"
title: "writeKnowledgeRecords"
status: "observed"
summary: "Exported function from scripts/nhw/lib/knowledge-pipeline.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/knowledge-pipeline.mjs"
    symbol: "writeKnowledgeRecords"
    line_start: "186"
    line_end: "193"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/knowledge-pipeline.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.knowledge-pipeline.writeknowledgerecords` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.knowledge-pipeline.writeknowledgerecords is the canonical typescript-function named writeKnowledgeRecords.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `writeKnowledgeRecords`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/knowledge-pipeline.mjs:186-193` — writeKnowledgeRecords

## Related Knowledge

- `belongs-to` → `project.repository-automation`
