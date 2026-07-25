---
id: "api.backend.get-ai-voice-stt-38"
kind: "api-endpoint"
title: "GET /ai/voice/stt"
status: "observed"
summary: "GET /ai/voice/stt endpoint implemented by the express runtime."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-voice.ts"
    symbol: "voiceRouter"
    line_start: "40"
    line_end: "44"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-voice.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.get-ai-voice-stt-38` represent in ClinicOS?

## Canonical Definition

api.backend.get-ai-voice-stt-38 is the canonical api-endpoint named GET /ai/voice/stt.

## Inputs

- Method: `GET`
- Path: `/ai/voice/stt`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: None observed
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: None observed. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-voice.ts:40-44` — voiceRouter

## Related Knowledge

- `belongs-to` → `project.backend`
