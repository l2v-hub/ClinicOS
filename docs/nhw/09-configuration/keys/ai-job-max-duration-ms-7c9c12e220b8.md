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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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
