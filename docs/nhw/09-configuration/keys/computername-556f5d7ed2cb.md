---
id: "config.discovered.computername"
kind: "configuration-key"
title: "COMPUTERNAME"
status: "observed"
summary: "Configuration key COMPUTERNAME; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "agent-team/src/runtime.mjs"
    symbol: "COMPUTERNAME"
    line_start: "35"
    line_end: "35"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/computername-556f5d7ed2cb.md"
    symbol: "COMPUTERNAME"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "agent-team/src/runtime.mjs,docs/nhw/09-configuration/keys/computername-556f5d7ed2cb.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `config.discovered.computername` represent in ClinicOS?

## Canonical Definition

config.discovered.computername is the canonical configuration-key named COMPUTERNAME.

## Inputs

Environment variable name: `COMPUTERNAME`.

## Outputs

Runtime scopes: `["typescript"]`.

## Dependencies

Declared in example configuration: `false`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

- typescript

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `agent-team/src/runtime.mjs:35-35` — COMPUTERNAME
- `docs/nhw/09-configuration/keys/computername-556f5d7ed2cb.md:4-4` — COMPUTERNAME

## Related Knowledge

- `belongs-to` → `system.clinicos`
