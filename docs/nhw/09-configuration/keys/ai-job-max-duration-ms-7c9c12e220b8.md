---
id: "config.discovered.ai-job-max-duration-ms"
kind: "configuration-key"
title: "AI_JOB_MAX_DURATION_MS"
status: "observed"
summary: "Configuration key AI_JOB_MAX_DURATION_MS; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_JOB_MAX_DURATION_MS"
    line_start: "49"
    line_end: "49"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example"
    confidence: "observed"
tags:
  - "configuration"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `config.discovered.ai-job-max-duration-ms` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-job-max-duration-ms is the canonical configuration-key named AI_JOB_MAX_DURATION_MS.

## Inputs

Environment variable name: `AI_JOB_MAX_DURATION_MS`.

## Outputs

Runtime scopes: None observed.

## Dependencies

Declared in example configuration: `true`.

## Side Effects

May alter runtime behavior in the consuming process; no value is captured in this knowledge base.

## Consumers

None observed

## Invariants

Security classification: runtime configuration.

## Failure Modes

Missing, malformed, or incompatible values follow the consuming source validation and fallback policy.

## Evidence

- `backend/.env.example:49-49` — AI_JOB_MAX_DURATION_MS

## Related Knowledge

- `belongs-to` → `system.clinicos`
