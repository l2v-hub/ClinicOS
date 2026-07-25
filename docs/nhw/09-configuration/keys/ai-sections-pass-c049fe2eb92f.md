---
id: "config.discovered.ai-sections-pass"
kind: "configuration-key"
title: "AI_SECTIONS_PASS"
status: "observed"
summary: "Configuration key AI_SECTIONS_PASS; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/src/ai/__tests__/lazy-sections.test.ts"
    symbol: "AI_SECTIONS_PASS"
    line_start: "26"
    line_end: "26"
    confidence: "observed"
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "AI_SECTIONS_PASS"
    line_start: "394"
    line_end: "394"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-sections-pass-c049fe2eb92f.md"
    symbol: "AI_SECTIONS_PASS"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "requirements/deployments/DEPLOY-20260615-2158.md"
    symbol: "AI_SECTIONS_PASS"
    line_start: "24"
    line_end: "24"
    confidence: "observed"
  - path: "requirements/deployments/DEPLOY-20260616-0624.md"
    symbol: "AI_SECTIONS_PASS"
    line_start: "44"
    line_end: "44"
    confidence: "observed"
  - path: "requirements/deployments/DEPLOY-20260616-0751.md"
    symbol: "AI_SECTIONS_PASS"
    line_start: "42"
    line_end: "42"
    confidence: "observed"
  - path: "requirements/deployments/DEPLOY-20260616-1309.md"
    symbol: "AI_SECTIONS_PASS"
    line_start: "18"
    line_end: "18"
    confidence: "observed"
  - path: "requirements/evidence/REQ-026/data-smoke-after.txt"
    symbol: "AI_SECTIONS_PASS"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/__tests__/lazy-sections.test.ts,backend/src/ai/upload/job-service.ts,docs/nhw/09-configuration/keys/ai-sections-pass-c049fe2eb92f.md,requirements/deployments/DEPLOY-20260615-2158.md,requirements/deployments/DEPLOY-20260616-0624.md,requirements/deployments/DEPLOY-20260616-0751.md,requirements/deployments/DEPLOY-20260616-1309.md,requirements/evidence/REQ-026/data-smoke-after.txt"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.ai-sections-pass` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-sections-pass is the canonical configuration-key named AI_SECTIONS_PASS.

## Inputs

Environment variable name: `AI_SECTIONS_PASS`.

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

- `backend/src/ai/__tests__/lazy-sections.test.ts:26-26` — AI_SECTIONS_PASS
- `backend/src/ai/upload/job-service.ts:394-394` — AI_SECTIONS_PASS
- `docs/nhw/09-configuration/keys/ai-sections-pass-c049fe2eb92f.md:4-4` — AI_SECTIONS_PASS
- `requirements/deployments/DEPLOY-20260615-2158.md:24-24` — AI_SECTIONS_PASS
- `requirements/deployments/DEPLOY-20260616-0624.md:44-44` — AI_SECTIONS_PASS
- `requirements/deployments/DEPLOY-20260616-0751.md:42-42` — AI_SECTIONS_PASS
- `requirements/deployments/DEPLOY-20260616-1309.md:18-18` — AI_SECTIONS_PASS
- `requirements/evidence/REQ-026/data-smoke-after.txt:4-4` — AI_SECTIONS_PASS

## Related Knowledge

- `belongs-to` → `system.clinicos`
