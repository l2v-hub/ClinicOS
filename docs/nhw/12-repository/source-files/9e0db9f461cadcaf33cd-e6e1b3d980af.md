---
id: 'component.repository.source.9e0db9f461cadcaf33cd'
kind: 'repository-source'
title: 'SKILL.md'
status: 'declared'
summary: 'Repository source path .claude/skills/speckit-constitution/SKILL.md classified as narrative-source.'
bounded_contexts: []
sources:
  - path: '.claude/skills/speckit-constitution/SKILL.md'
    confidence: 'declared'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: '.claude/skills/speckit-constitution/SKILL.md'
    confidence: 'observed'
tags:
  - 'repository-source'
  - 'narrative-source'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.repository.source.9e0db9f461cadcaf33cd` represent in ClinicOS?

## Canonical Definition

component.repository.source.9e0db9f461cadcaf33cd is the canonical repository-source named SKILL.md.

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

- `.claude/skills/speckit-constitution/SKILL.md`

## Related Knowledge

- `belongs-to` → `system.clinicos`
