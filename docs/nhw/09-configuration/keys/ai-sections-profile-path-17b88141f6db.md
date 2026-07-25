---
id: "config.discovered.ai-sections-profile-path"
kind: "configuration-key"
title: "AI_SECTIONS_PROFILE_PATH"
status: "observed"
summary: "Configuration key AI_SECTIONS_PROFILE_PATH; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/src/ai/sections/profile.ts"
    symbol: "AI_SECTIONS_PROFILE_PATH"
    line_start: "80"
    line_end: "80"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/ai-sections-profile-path-17b88141f6db.md"
    symbol: "AI_SECTIONS_PROFILE_PATH"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "requirements/evidence/REQ-026/acceptance-matrix.md"
    symbol: "AI_SECTIONS_PROFILE_PATH"
    line_start: "11"
    line_end: "11"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/sections/profile.ts,docs/nhw/09-configuration/keys/ai-sections-profile-path-17b88141f6db.md,requirements/evidence/REQ-026/acceptance-matrix.md"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `config.discovered.ai-sections-profile-path` represent in ClinicOS?

## Canonical Definition

config.discovered.ai-sections-profile-path is the canonical configuration-key named AI_SECTIONS_PROFILE_PATH.

## Inputs

Environment variable name: `AI_SECTIONS_PROFILE_PATH`.

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

- `backend/src/ai/sections/profile.ts:80-80` — AI_SECTIONS_PROFILE_PATH
- `docs/nhw/09-configuration/keys/ai-sections-profile-path-17b88141f6db.md:4-4` — AI_SECTIONS_PROFILE_PATH
- `requirements/evidence/REQ-026/acceptance-matrix.md:11-11` — AI_SECTIONS_PROFILE_PATH

## Related Knowledge

- `belongs-to` → `system.clinicos`
