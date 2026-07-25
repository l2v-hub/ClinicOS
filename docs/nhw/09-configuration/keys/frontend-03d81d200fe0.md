---
id: "config.discovered.frontend"
kind: "configuration-key"
title: "FRONTEND"
status: "observed"
summary: "Configuration key FRONTEND; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: ".claude/skills/run-clinicos/driver.mjs"
    symbol: "FRONTEND"
    line_start: "19"
    line_end: "19"
    confidence: "observed"
  - path: ".claude/skills/run-clinicos/measure-detail.mjs"
    symbol: "FRONTEND"
    line_start: "2"
    line_end: "2"
    confidence: "observed"
  - path: ".claude/skills/run-clinicos/measure.mjs"
    symbol: "FRONTEND"
    line_start: "3"
    line_end: "3"
    confidence: "observed"
  - path: ".claude/skills/run-clinicos/overflow.mjs"
    symbol: "FRONTEND"
    line_start: "2"
    line_end: "2"
    confidence: "observed"
  - path: ".claude/skills/run-clinicos/review-shot.mjs"
    symbol: "FRONTEND"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
  - path: "agent-team/tests/unit/e2e-import-journey.test.mjs"
    symbol: "FRONTEND"
    line_start: "83"
    line_end: "83"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/frontend-03d81d200fe0.md"
    symbol: "FRONTEND"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "e2e/agnos-cru.mjs"
    symbol: "FRONTEND"
    line_start: "16"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".claude/skills/run-clinicos/driver.mjs,.claude/skills/run-clinicos/measure-detail.mjs,.claude/skills/run-clinicos/measure.mjs,.claude/skills/run-clinicos/overflow.mjs,.claude/skills/run-clinicos/review-shot.mjs,agent-team/tests/unit/e2e-import-journey.test.mjs,docs/nhw/09-configuration/keys/frontend-03d81d200fe0.md,e2e/agnos-cru.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `config.discovered.frontend` represent in ClinicOS?

## Canonical Definition

config.discovered.frontend is the canonical configuration-key named FRONTEND.

## Inputs

Environment variable name: `FRONTEND`.

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

- `.claude/skills/run-clinicos/driver.mjs:19-19` — FRONTEND
- `.claude/skills/run-clinicos/measure-detail.mjs:2-2` — FRONTEND
- `.claude/skills/run-clinicos/measure.mjs:3-3` — FRONTEND
- `.claude/skills/run-clinicos/overflow.mjs:2-2` — FRONTEND
- `.claude/skills/run-clinicos/review-shot.mjs:8-8` — FRONTEND
- `agent-team/tests/unit/e2e-import-journey.test.mjs:83-83` — FRONTEND
- `docs/nhw/09-configuration/keys/frontend-03d81d200fe0.md:4-4` — FRONTEND
- `e2e/agnos-cru.mjs:16-16` — FRONTEND

## Related Knowledge

- `belongs-to` → `system.clinicos`
