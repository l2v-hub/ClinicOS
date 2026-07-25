---
id: "config.discovered.ai-ocr-transcription"
kind: "configuration-key"
title: "AI_OCR_TRANSCRIPTION"
status: "observed"
summary: "Configuration key AI_OCR_TRANSCRIPTION; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/src/ai/__tests__/lazy-sections.test.ts"
    symbol: "AI_OCR_TRANSCRIPTION"
    line_start: "54"
    line_end: "54"
    confidence: "observed"
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "AI_OCR_TRANSCRIPTION"
    line_start: "822"
    line_end: "822"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-ocr-transcription-c6c2b435bd1e.md"
    symbol: "AI_OCR_TRANSCRIPTION"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/__tests__/lazy-sections.test.ts,backend/src/ai/upload/job-service.ts,docs/nhw/09-configuration/keys/ai-ocr-transcription-c6c2b435bd1e.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `config.discovered.ai-ocr-transcription` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-ocr-transcription is the canonical configuration-key named AI_OCR_TRANSCRIPTION.

## Inputs

Environment variable name: `AI_OCR_TRANSCRIPTION`.

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

- `backend/src/ai/__tests__/lazy-sections.test.ts:54-54` — AI_OCR_TRANSCRIPTION
- `backend/src/ai/upload/job-service.ts:822-822` — AI_OCR_TRANSCRIPTION
- `docs/nhw/09-configuration/keys/ai-ocr-transcription-c6c2b435bd1e.md:4-4` — AI_OCR_TRANSCRIPTION

## Related Knowledge

- `belongs-to` → `system.clinicos`
