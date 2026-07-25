---
id: "finding.coupling.patient-document-route-order"
kind: "architectural-finding"
title: "Patient document route-order coupling"
status: "observed"
summary: "Protected document routes require per-route middleware because router mount order overlaps the patient router."
bounded_contexts: []
sources:
  - path: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
  - path: "backend/src/app.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/app.ts"
    confidence: "observed"
tags:
  - "architectural-finding"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `finding.coupling.patient-document-route-order` represent in ClinicOS?

## Canonical Definition

finding.coupling.patient-document-route-order is the canonical architectural-finding named Patient document route-order coupling.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Protected document routes require per-route middleware because router mount order overlaps the patient router.

## Dependencies

Owning knowledge target: `project.backend`.

## Side Effects

Changing route order or middleware scope can alter access-control behavior.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `backend/src/routes/patient-documents.ts`
- `backend/src/app.ts`

## Related Knowledge

- `belongs-to` → `project.backend`
