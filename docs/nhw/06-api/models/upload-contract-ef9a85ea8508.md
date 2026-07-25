---
id: "value.api.upload-contract"
kind: "api-contract"
title: "Clinical document upload contract"
status: "observed"
summary: "Intake and AI extraction endpoints accept bounded document payloads and preserve job/document provenance."
bounded_contexts: []
sources:
  - path: "backend/src/routes/patient-intake.ts"
    confidence: "observed"
  - path: "backend/src/routes/ai-jobs.ts"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/domain/contracts.py"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/patient-intake.ts,backend/src/routes/ai-jobs.ts,clinicos-ai-runtime/clinicos_ai/domain/contracts.py"
    confidence: "observed"
tags:
  - "api-contract"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `value.api.upload-contract` represent in ClinicOS?

## Canonical Definition

value.api.upload-contract is the canonical api-contract named Clinical document upload contract.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Intake and AI extraction endpoints accept bounded document payloads and preserve job/document provenance.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Creates document and extraction-job state and may invoke OCR/model providers.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/routes/patient-intake.ts`
- `backend/src/routes/ai-jobs.ts`
- `clinicos-ai-runtime/clinicos_ai/domain/contracts.py`

## Related Knowledge

- `belongs-to` → `system.clinicos`
