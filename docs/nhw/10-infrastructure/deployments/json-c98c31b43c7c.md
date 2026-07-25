---
id: "integration.vercel.frontend.vercel.json"
kind: "integration"
title: "integration.vercel.frontend.vercel.json"
status: "observed"
summary: "integration.vercel.frontend.vercel.json declared by frontend/vercel.json."
bounded_contexts: []
sources:
  - path: "frontend/vercel.json"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "frontend/vercel.json"
    confidence: "observed"
tags:
  - "infrastructure"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `integration.vercel.frontend.vercel.json` represent in ClinicOS?

## Canonical Definition

integration.vercel.frontend.vercel.json is the canonical integration named integration.vercel.frontend.vercel.json.

## Inputs

`"vercel"`

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

- `frontend/vercel.json`

## Related Knowledge

- `belongs-to` → `system.clinicos`
