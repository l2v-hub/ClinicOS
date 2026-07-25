---
id: "system.exclusion-contract"
kind: "knowledge-contract"
title: "Exclusion Contract"
status: "declared"
summary: "Exclusion Contract governing the ClinicOS NHW knowledge base."
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `system.exclusion-contract` represent in ClinicOS?

## Canonical Definition

system.exclusion-contract is the canonical knowledge-contract named Exclusion Contract.

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
