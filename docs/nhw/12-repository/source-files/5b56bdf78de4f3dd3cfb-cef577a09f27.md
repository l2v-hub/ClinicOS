---
id: 'component.repository.source.5b56bdf78de4f3dd3cfb'
kind: 'repository-source'
title: 'pull-requests.json'
status: 'observed'
summary: 'Repository source path docs/migration/github-account-migration/pull-requests.json classified as configuration-source.'
bounded_contexts: []
sources:
  - path: 'docs/migration/github-account-migration/pull-requests.json'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'docs/migration/github-account-migration/pull-requests.json'
    confidence: 'observed'
tags:
  - 'repository-source'
  - 'configuration-source'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.repository.source.5b56bdf78de4f3dd3cfb` represent in ClinicOS?

## Canonical Definition

component.repository.source.5b56bdf78de4f3dd3cfb is the canonical repository-source named pull-requests.json.

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

- `docs/migration/github-account-migration/pull-requests.json`

## Related Knowledge

- `belongs-to` → `system.clinicos`
