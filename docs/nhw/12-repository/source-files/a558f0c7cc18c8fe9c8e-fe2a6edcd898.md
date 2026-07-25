---
id: "component.repository.source.a558f0c7cc18c8fe9c8e"
kind: "repository-source"
title: "decisions.md"
status: "declared"
summary: "Repository source path .openclode/decisions.md classified as narrative-source."
bounded_contexts: []
sources:
  - path: ".openclode/decisions.md"
    confidence: "declared"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".openclode/decisions.md"
    confidence: "observed"
tags:
  - "repository-source"
  - "narrative-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.repository.source.a558f0c7cc18c8fe9c8e` represent in ClinicOS?

## Canonical Definition

component.repository.source.a558f0c7cc18c8fe9c8e is the canonical repository-source named decisions.md.

## Inputs

Path classification: `narrative-source`; reason: `documentation-or-requirement`.

## Outputs

Makes the authored source independently retrievable through its stable knowledge identifier.

## Dependencies

Repository inventory and file hash.

## Side Effects

None observed

## Consumers

Coverage reconciliation, semantic retrieval, and impact analysis.

## Invariants

The file payload remains authoritative; this unit stores metadata and purpose, not a duplicate payload.

## Failure Modes

A changed file hash invalidates stale source evidence until regeneration.

## Evidence

- `.openclode/decisions.md`

## Related Knowledge

- `belongs-to` → `system.clinicos`
