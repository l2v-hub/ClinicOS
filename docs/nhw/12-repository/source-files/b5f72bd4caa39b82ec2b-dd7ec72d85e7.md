---
id: "component.repository.source.b5f72bd4caa39b82ec2b"
kind: "repository-source"
title: "project-memory.md"
status: "declared"
summary: "Repository source path .openclode/project-memory.md classified as narrative-source."
bounded_contexts: []
sources:
  - path: ".openclode/project-memory.md"
    confidence: "declared"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".openclode/project-memory.md"
    confidence: "observed"
tags:
  - "repository-source"
  - "narrative-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
