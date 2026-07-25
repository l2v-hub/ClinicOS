---
id: "config.discovered.allow-patient-delete"
kind: "configuration-key"
title: "ALLOW_PATIENT_DELETE"
status: "observed"
summary: "Configuration key ALLOW_PATIENT_DELETE; generated knowledge never includes its value."
bounded_contexts: []
sources:
  - path: "backend/src/routes/patients.ts"
    symbol: "ALLOW_PATIENT_DELETE"
    line_start: "24"
    line_end: "24"
    confidence: "observed"
  - path: "docs/nhw/09-configuration/keys/allow-patient-delete-62b90d541dd2.md"
    symbol: "ALLOW_PATIENT_DELETE"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
  - path: "frontend/src/components/operator/PatientList.tsx"
    symbol: "ALLOW_PATIENT_DELETE"
    line_start: "157"
    line_end: "157"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/patients.ts,docs/nhw/09-configuration/keys/allow-patient-delete-62b90d541dd2.md,frontend/src/components/operator/PatientList.tsx"
    confidence: "observed"
tags:
  - "configuration"
  - "typescript"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `config.discovered.allow-patient-delete` represent in ClinicOS?

## Canonical Definition

config.discovered.allow-patient-delete is the canonical configuration-key named ALLOW_PATIENT_DELETE.

## Inputs

Environment variable name: `ALLOW_PATIENT_DELETE`.

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

- `backend/src/routes/patients.ts:24-24` — ALLOW_PATIENT_DELETE
- `docs/nhw/09-configuration/keys/allow-patient-delete-62b90d541dd2.md:4-4` — ALLOW_PATIENT_DELETE
- `frontend/src/components/operator/PatientList.tsx:157-157` — ALLOW_PATIENT_DELETE

## Related Knowledge

- `belongs-to` → `system.clinicos`
