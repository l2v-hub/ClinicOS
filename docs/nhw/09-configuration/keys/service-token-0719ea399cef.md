---
id: "config.discovered.service-token"
kind: "configuration-key"
title: "SERVICE_TOKEN"
status: "observed"
summary: "Configuration key SERVICE_TOKEN; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "scripts/nhw/test/fixtures/python/app.py"
    symbol: "SERVICE_TOKEN"
    line_start: "25"
    line_end: "25"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "scripts/nhw/test/fixtures/python/app.py"
    confidence: "observed"
tags:
  - "configuration"
  - "python"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `config.discovered.service-token` represent in ClinicOS?

## Canonical Definition

config.discovered.service-token is the canonical configuration-key named SERVICE_TOKEN.

## Inputs

Environment variable name: `SERVICE_TOKEN`.

## Outputs

Runtime scopes: `["python"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- python

## Invariants

Security classification: sensitive-name; value intentionally excluded.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `scripts/nhw/test/fixtures/python/app.py:25-25` — SERVICE_TOKEN

## Related Knowledge

- `belongs-to` → `system.clinicos`
