---
id: 'system.clinicos-ontology'
kind: 'knowledge-contract'
title: 'Knowledge Ontology'
status: 'declared'
summary: 'Knowledge Ontology governing the ClinicOS NHW knowledge base.'
bounded_contexts: []
sources:
  - path: 'docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md'
    line_start: '1'
    line_end: '520'
    confidence: 'declared'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'docs/superpowers/specs/2026-07-25-clinicos-nhw-knowledge-base-design.md'
    confidence: 'observed'
tags:
  - 'nhw'
  - 'contract'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `system.clinicos-ontology` represent in ClinicOS?

## Canonical Definition

system.clinicos-ontology is the canonical knowledge-contract named Knowledge Ontology.

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
