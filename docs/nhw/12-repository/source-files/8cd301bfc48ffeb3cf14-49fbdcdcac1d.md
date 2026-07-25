---
id: "component.repository.source.8cd301bfc48ffeb3cf14"
kind: "repository-source"
title: "mcp.json"
status: "observed"
summary: "Repository source path .claude/mcp.json classified as configuration-source."
bounded_contexts: []
sources:
  - path: ".claude/mcp.json"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".claude/mcp.json"
    confidence: "observed"
tags:
  - "repository-source"
  - "configuration-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.repository.source.8cd301bfc48ffeb3cf14` represent in ClinicOS?

## Canonical Definition

component.repository.source.8cd301bfc48ffeb3cf14 is the canonical repository-source named mcp.json.

## Inputs

Path classification: `configuration-source`; reason: `configuration-or-manifest`.

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

- `.claude/mcp.json`

## Related Knowledge

- `belongs-to` → `system.clinicos`
