---
id: "config.discovered.ai-runtime-url"
kind: "configuration-key"
title: "AI_RUNTIME_URL"
status: "observed"
summary: "Configuration key AI_RUNTIME_URL; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: ".github/workflows/ai-import-e2e.yml"
    symbol: "AI_RUNTIME_URL"
    line_start: "49"
    line_end: "49"
    confidence: "observed"
  - path: "backend/src/ai/assistant/config.ts"
    symbol: "AI_RUNTIME_URL"
    line_start: "29"
    line_end: "29"
    confidence: "observed"
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "AI_RUNTIME_URL"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
  - path: "clinicos-ai-runtime/README.md"
    symbol: "AI_RUNTIME_URL"
    line_start: "79"
    line_end: "79"
    confidence: "observed"
  - path: "docs/azure-backend-config-principles.md"
    symbol: "AI_RUNTIME_URL"
    line_start: "25"
    line_end: "25"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-runtime-url-771d366cb4ce.md"
    symbol: "AI_RUNTIME_URL"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "docs/qa/requirement-processing-report.md"
    symbol: "AI_RUNTIME_URL"
    line_start: "62"
    line_end: "62"
    confidence: "observed"
  - path: "e2e/issue-127-verify.mjs"
    symbol: "AI_RUNTIME_URL"
    line_start: "2"
    line_end: "2"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: ".github/workflows/ai-import-e2e.yml,backend/src/ai/assistant/config.ts,backend/src/ai/upload/job-service.ts,clinicos-ai-runtime/README.md,docs/azure-backend-config-principles.md,docs/nhw/09-configuration/keys/ai-runtime-url-771d366cb4ce.md,docs/qa/requirement-processing-report.md,e2e/issue-127-verify.mjs"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.discovered.ai-runtime-url` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-runtime-url is the canonical configuration-key named AI_RUNTIME_URL.

## Inputs

Environment variable name: `AI_RUNTIME_URL`.

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

- `.github/workflows/ai-import-e2e.yml:49-49` — AI_RUNTIME_URL
- `backend/src/ai/assistant/config.ts:29-29` — AI_RUNTIME_URL
- `backend/src/ai/upload/job-service.ts:8-8` — AI_RUNTIME_URL
- `clinicos-ai-runtime/README.md:79-79` — AI_RUNTIME_URL
- `docs/azure-backend-config-principles.md:25-25` — AI_RUNTIME_URL
- `docs/nhw/09-configuration/keys/ai-runtime-url-771d366cb4ce.md:4-4` — AI_RUNTIME_URL
- `docs/qa/requirement-processing-report.md:62-62` — AI_RUNTIME_URL
- `e2e/issue-127-verify.mjs:2-2` — AI_RUNTIME_URL

## Related Knowledge

- `belongs-to` → `system.clinicos`
