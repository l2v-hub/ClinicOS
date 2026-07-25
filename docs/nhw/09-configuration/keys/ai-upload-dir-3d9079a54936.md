---
id: "config.discovered.ai-upload-dir"
kind: "configuration-key"
title: "AI_UPLOAD_DIR"
status: "observed"
summary: "Configuration key AI_UPLOAD_DIR; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/.env.example"
    symbol: "AI_UPLOAD_DIR"
    line_start: "35"
    line_end: "35"
    confidence: "observed"
  - path: "backend/src/ai/config.ts"
    symbol: "AI_UPLOAD_DIR"
    line_start: "120"
    line_end: "120"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-upload-dir-3d9079a54936.md"
    symbol: "AI_UPLOAD_DIR"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "requirements/deployments/DEPLOY-20260613-1233.md"
    symbol: "AI_UPLOAD_DIR"
    line_start: "38"
    line_end: "38"
    confidence: "observed"
  - path: "requirements/PRIVACY-AI-IMPORT.md"
    symbol: "AI_UPLOAD_DIR"
    line_start: "35"
    line_end: "35"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/.env.example,backend/src/ai/config.ts,docs/nhw/09-configuration/keys/ai-upload-dir-3d9079a54936.md,requirements/deployments/DEPLOY-20260613-1233.md,requirements/PRIVACY-AI-IMPORT.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.ai-upload-dir` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-upload-dir is the canonical configuration-key named AI_UPLOAD_DIR.

## Inputs

Environment variable name: `AI_UPLOAD_DIR`.

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

- `backend/.env.example:35-35` — AI_UPLOAD_DIR
- `backend/src/ai/config.ts:120-120` — AI_UPLOAD_DIR
- `docs/nhw/09-configuration/keys/ai-upload-dir-3d9079a54936.md:4-4` — AI_UPLOAD_DIR
- `requirements/deployments/DEPLOY-20260613-1233.md:38-38` — AI_UPLOAD_DIR
- `requirements/PRIVACY-AI-IMPORT.md:35-35` — AI_UPLOAD_DIR

## Related Knowledge

- `belongs-to` → `system.clinicos`
