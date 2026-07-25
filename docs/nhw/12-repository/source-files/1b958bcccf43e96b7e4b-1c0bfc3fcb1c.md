---
id: "component.repository.source.1b958bcccf43e96b7e4b"
kind: "repository-source"
title: "frontend-bundle-scan.txt"
status: "declared"
summary: "Repository source path requirements/evidence/BUG-048/prod-verify/frontend-bundle-scan.txt classified as narrative-source."
bounded_contexts: []
sources:
  - path: "requirements/evidence/BUG-048/prod-verify/frontend-bundle-scan.txt"
    confidence: "declared"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "requirements/evidence/BUG-048/prod-verify/frontend-bundle-scan.txt"
    confidence: "observed"
tags:
  - "repository-source"
  - "narrative-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.repository.source.1b958bcccf43e96b7e4b` represent in ClinicOS?

## Canonical Definition

component.repository.source.1b958bcccf43e96b7e4b is the canonical repository-source named frontend-bundle-scan.txt.

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

- `requirements/evidence/BUG-048/prod-verify/frontend-bundle-scan.txt`

## Related Knowledge

- `belongs-to` → `system.clinicos`
