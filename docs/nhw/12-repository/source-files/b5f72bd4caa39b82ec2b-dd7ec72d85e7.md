---
id: 'component.repository.source.b5f72bd4caa39b82ec2b'
kind: 'repository-source'
title: 'project-memory.md'
status: 'declared'
summary: 'Repository source path .openclode/project-memory.md classified as narrative-source.'
bounded_contexts: []
sources:
  - path: '.openclode/project-memory.md'
    confidence: 'declared'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: '.openclode/project-memory.md'
    confidence: 'observed'
tags:
  - 'repository-source'
  - 'narrative-source'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.repository.source.b5f72bd4caa39b82ec2b` represent in ClinicOS?

## Canonical Definition

component.repository.source.b5f72bd4caa39b82ec2b is the canonical repository-source named project-memory.md.

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

- `.openclode/project-memory.md`

## Related Knowledge

- `belongs-to` → `system.clinicos`
