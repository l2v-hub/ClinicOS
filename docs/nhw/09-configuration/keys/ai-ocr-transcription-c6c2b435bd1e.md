---
id: "config.discovered.ai-ocr-transcription"
kind: "configuration-key"
title: "AI_OCR_TRANSCRIPTION"
status: "observed"
summary: "Configuration key AI_OCR_TRANSCRIPTION; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "AI_OCR_TRANSCRIPTION"
    line_start: "799"
    line_end: "799"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-ocr-transcription-c6c2b435bd1e.md"
    symbol: "AI_OCR_TRANSCRIPTION"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/upload/job-service.ts,docs/nhw/09-configuration/keys/ai-ocr-transcription-c6c2b435bd1e.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

- `backend/src/ai/upload/job-service.ts:799-799` — AI_OCR_TRANSCRIPTION
- `docs/nhw/09-configuration/keys/ai-ocr-transcription-c6c2b435bd1e.md:4-4` — AI_OCR_TRANSCRIPTION

## Related Knowledge

- `belongs-to` → `system.clinicos`
