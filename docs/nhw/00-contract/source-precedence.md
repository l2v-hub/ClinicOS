---
id: "system.source-precedence"
kind: "knowledge-contract"
title: "Source Precedence"
status: "declared"
summary: "Source Precedence governing the ClinicOS NHW knowledge base."
bounded_contexts: []
sources:
  - path: "docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md"
    line_start: "1"
    line_end: "520"
    confidence: "declared"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md"
    confidence: "observed"
tags:
  - "nhw"
  - "contract"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `system.source-precedence` represent in ClinicOS?

## Canonical Definition

system.source-precedence is the canonical knowledge-contract named Source Precedence.

## Inputs

Repository inventory, semantic catalogs, and atomic knowledge units.

## Outputs

Deterministic retrieval and validation rules.

## Dependencies

The approved NHW design specification.

## Side Effects

None observed

## Consumers

Future LLM agents, validators, and graph traversals.

## Invariants

Executable runtime evidence outranks narrative documentation.

## Failure Modes

Validation fails closed for malformed or uncovered semantic objects.

## Evidence

- `docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md:1-520`

## Related Knowledge

- `belongs-to` → `system.clinicos`
