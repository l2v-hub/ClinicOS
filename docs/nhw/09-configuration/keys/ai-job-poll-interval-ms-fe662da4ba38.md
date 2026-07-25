---
id: "config.discovered.ai-job-poll-interval-ms"
kind: "configuration-key"
title: "AI_JOB_POLL_INTERVAL_MS"
status: "observed"
summary: "Configuration key AI_JOB_POLL_INTERVAL_MS; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_JOB_POLL_INTERVAL_MS"
    line_start: "50"
    line_end: "50"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `config.discovered.ai-job-poll-interval-ms` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-job-poll-interval-ms is the canonical configuration-key named AI_JOB_POLL_INTERVAL_MS.

## Inputs

Environment variable name: `AI_JOB_POLL_INTERVAL_MS`.

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

- `backend/.env.example:50-50` — AI_JOB_POLL_INTERVAL_MS

## Related Knowledge

- `belongs-to` → `system.clinicos`
