---
id: "component.repository.source.a1dc8138ce6e8c4e58d8"
kind: "repository-source"
title: "SKILL.md"
status: "declared"
summary: "Repository source path .claude/skills/speckit-implement/SKILL.md classified as narrative-source."
bounded_contexts: []
sources:
  - path: ".claude/skills/speckit-implement/SKILL.md"
    confidence: "declared"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".claude/skills/speckit-implement/SKILL.md"
    confidence: "observed"
tags:
  - "repository-source"
  - "narrative-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.repository.source.a1dc8138ce6e8c4e58d8` represent in ClinicOS?

## Canonical Definition

component.repository.source.a1dc8138ce6e8c4e58d8 is the canonical repository-source named SKILL.md.

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

- `.claude/skills/speckit-implement/SKILL.md`

## Related Knowledge

- `belongs-to` → `system.clinicos`
