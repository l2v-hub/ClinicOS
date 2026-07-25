---
id: 'component.repository.source.eef5ff89908c654aecea'
kind: 'repository-source'
title: 'deploy-vercel.yml.disabled'
status: 'observed'
summary: 'Repository source path .github/workflows/deploy-vercel.yml.disabled classified as deployment-source.'
bounded_contexts: []
sources:
  - path: '.github/workflows/deploy-vercel.yml.disabled'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: '.github/workflows/deploy-vercel.yml.disabled'
    confidence: 'observed'
tags:
  - 'repository-source'
  - 'deployment-source'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.repository.source.eef5ff89908c654aecea` represent in ClinicOS?

## Canonical Definition

component.repository.source.eef5ff89908c654aecea is the canonical repository-source named deploy-vercel.yml.disabled.

## Inputs

Path classification: `deployment-source`; reason: `delivery-or-operations`.

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

- `.github/workflows/deploy-vercel.yml.disabled`

## Related Knowledge

- `belongs-to` → `system.clinicos`
