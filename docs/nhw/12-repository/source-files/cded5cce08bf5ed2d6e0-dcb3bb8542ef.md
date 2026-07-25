---
id: "component.repository.source.cded5cce08bf5ed2d6e0"
kind: "repository-source"
title: "requirements.md"
status: "declared"
summary: "Repository source path specs/011-parametri-quick-entry/checklists/requirements.md classified as narrative-source."
bounded_contexts: []
sources:
  - path: "specs/011-parametri-quick-entry/checklists/requirements.md"
    confidence: "declared"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "specs/011-parametri-quick-entry/checklists/requirements.md"
    confidence: "observed"
tags:
  - "repository-source"
  - "narrative-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.repository.source.cded5cce08bf5ed2d6e0` represent in ClinicOS?

## Canonical Definition

component.repository.source.cded5cce08bf5ed2d6e0 is the canonical repository-source named requirements.md.

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

- `specs/011-parametri-quick-entry/checklists/requirements.md`

## Related Knowledge

- `belongs-to` → `system.clinicos`
