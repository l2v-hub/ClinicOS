---
id: "flow.authentication-token-propagation"
kind: "runtime-flow"
title: "Authentication and token propagation"
status: "inferred"
summary: "Authentication and token propagation workflow across ClinicOS components."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "authenticateEntra"
    line_start: "72"
    line_end: "134"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "bearerToken"
    line_start: "65"
    line_end: "68"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "EntraAuthFailure"
    line_start: "55"
    line_end: "57"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "EntraConfig"
    line_start: "17"
    line_end: "22"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "entraConfig"
    line_start: "26"
    line_end: "36"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "EntraIdentity"
    line_start: "59"
    line_end: "63"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "jwksCache"
    line_start: "40"
    line_end: "40"
    confidence: "observed"
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "jwksFor"
    line_start: "41"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.lib.entra-auth.authenticateentra"
    evidence: "backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.lib.entra-auth.entraauthfailure"
    evidence: "backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.lib.entra-auth.entraconfig"
    evidence: "backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.lib.entra-auth.entraidentity"
    evidence: "backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts,backend/src/lib/entra-auth.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.authentication-token-propagation` represent in ClinicOS?

## Canonical Definition

flow.authentication-token-propagation is the canonical runtime-flow named Authentication and token propagation.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `component.backend.backend.src.lib.entra-auth.authenticateentra`
- `component.backend.backend.src.lib.entra-auth.entraauthfailure`
- `component.backend.backend.src.lib.entra-auth.entraconfig`
- `component.backend.backend.src.lib.entra-auth.entraconfig`
- `component.backend.backend.src.lib.entra-auth.entraidentity`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/lib/entra-auth.ts:72-134` — authenticateEntra
- `backend/src/lib/entra-auth.ts:65-68` — bearerToken
- `backend/src/lib/entra-auth.ts:55-57` — EntraAuthFailure
- `backend/src/lib/entra-auth.ts:17-22` — EntraConfig
- `backend/src/lib/entra-auth.ts:26-36` — entraConfig
- `backend/src/lib/entra-auth.ts:59-63` — EntraIdentity
- `backend/src/lib/entra-auth.ts:40-40` — jwksCache
- `backend/src/lib/entra-auth.ts:41-48` — jwksFor

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `component.backend.backend.src.lib.entra-auth.authenticateentra`
- `invokes` → `component.backend.backend.src.lib.entra-auth.entraauthfailure`
- `invokes` → `component.backend.backend.src.lib.entra-auth.entraconfig`
- `invokes` → `component.backend.backend.src.lib.entra-auth.entraidentity`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `component.backend.backend.src.lib.entra-auth.authenticateentra` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `component.backend.backend.src.lib.entra-auth.bearertoken` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `component.backend.backend.src.lib.entra-auth.entraauthfailure` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `component.backend.backend.src.lib.entra-auth.entraconfig` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `component.backend.backend.src.lib.entra-auth.entraconfig` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.backend.backend.src.lib.entra-auth.entraidentity` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.backend.backend.src.lib.entra-auth.jwkscache` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.backend.backend.src.lib.entra-auth.jwksfor` | Defined by cited component | Owning component error contract |
