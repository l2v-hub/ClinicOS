---
id: 'component.repository.source.6a1c0ca25c3cac1d4cc1'
kind: 'repository-source'
title: 'StepClinica.tsx'
status: 'observed'
summary: 'Repository source path frontend/src/components/shared/intake/StepClinica.tsx classified as semantic-source.'
bounded_contexts: []
sources:
  - path: 'frontend/src/components/shared/intake/StepClinica.tsx'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'frontend/src/components/shared/intake/StepClinica.tsx'
    confidence: 'observed'
tags:
  - 'repository-source'
  - 'semantic-source'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.repository.source.6a1c0ca25c3cac1d4cc1` represent in ClinicOS?

## Canonical Definition

component.repository.source.6a1c0ca25c3cac1d4cc1 is the canonical repository-source named StepClinica.tsx.

## Inputs

Path classification: `semantic-source`; reason: `application-source`.

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

- `frontend/src/components/shared/intake/StepClinica.tsx`

## Related Knowledge

- `belongs-to` → `system.clinicos`
