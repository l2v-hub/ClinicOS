---
id: "component.repository.source.dcea20672d16f1fdba29"
kind: "repository-source"
title: "05-job-after-cancel.json"
status: "observed"
summary: "Repository source path requirements/evidence/BUG-049/prod-verify/05-job-after-cancel.json classified as configuration-source."
bounded_contexts: []
sources:
  - path: "requirements/evidence/BUG-049/prod-verify/05-job-after-cancel.json"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "requirements/evidence/BUG-049/prod-verify/05-job-after-cancel.json"
    confidence: "observed"
tags:
  - "repository-source"
  - "configuration-source"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.repository.source.dcea20672d16f1fdba29` represent in ClinicOS?

## Canonical Definition

component.repository.source.dcea20672d16f1fdba29 is the canonical repository-source named 05-job-after-cancel.json.

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

- `requirements/evidence/BUG-049/prod-verify/05-job-after-cancel.json`

## Related Knowledge

- `belongs-to` → `system.clinicos`
