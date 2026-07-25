---
id: "component.repository.requirement.req-015"
kind: "requirement"
title: "REQ-015"
status: "declared"
summary: "component.repository.requirement.req-015 declared by REQ-015.md."
bounded_contexts: []
sources:
  - path: "REQ-015.md"
    confidence: "declared"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "REQ-015.md"
    confidence: "observed"
tags:
  - "infrastructure"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.repository.requirement.req-015` represent in ClinicOS?

## Canonical Definition

component.repository.requirement.req-015 is the canonical requirement named REQ-015.

## Inputs

`"REQ-015"`

## Outputs

None observed

## Dependencies

None observed

## Side Effects

Defined by the cited infrastructure or requirement source.

## Consumers

Runtime deployment, local development, or governance automation.

## Invariants

Executable deployment configuration outranks narrative deployment documentation.

## Failure Modes

Configuration drift, unavailable platform, failed health check, or unmet declared requirement.

## Evidence

- `REQ-015.md`

## Related Knowledge

- `belongs-to` → `system.clinicos`
