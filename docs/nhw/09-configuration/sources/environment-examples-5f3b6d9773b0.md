---
id: "config.source.environment-examples"
kind: "configuration-source"
title: "Environment example declarations"
status: "observed"
summary: "Checked-in .env.example files declare supported variable names without supplying production credentials."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    confidence: "observed"
  - path: "frontend/.env.example"
    confidence: "observed"
  - path: "clinicos-ai-runtime/.env.example"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example,frontend/.env.example,clinicos-ai-runtime/.env.example"
    confidence: "observed"
tags:
  - "configuration-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.source.environment-examples` represent in ClinicOS?

## Canonical Definition

config.source.environment-examples is the canonical configuration-source named Environment example declarations.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Checked-in .env.example files declare supported variable names without supplying production credentials.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

None observed

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/.env.example`
- `frontend/.env.example`
- `clinicos-ai-runtime/.env.example`

## Related Knowledge

- `belongs-to` → `system.clinicos`
