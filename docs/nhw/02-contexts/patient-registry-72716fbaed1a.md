---
id: 'context.patient-registry'
kind: 'bounded-context'
title: 'Patient Registry'
status: 'inferred'
summary: 'Patient Registry bounded context reconstructed from executable ClinicOS sources.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'prisma/schema.prisma'
    line_start: '67'
    line_end: '99'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    line_start: '414'
    line_end: '432'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    line_start: '132'
    line_end: '148'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    line_start: '241'
    line_end: '257'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    line_start: '437'
    line_end: '451'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    line_start: '105'
    line_end: '126'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patient'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patientdiaryentry'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patientdocument'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patientintakedocument'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patientintakedraft'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patientnarrativesection'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patientroomassignment'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.patienttherapy'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma'
    confidence: 'inferred'
tags:
  - 'bounded-context'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
inference_rule: 'Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership.'
---

## Question Answered

What does `context.patient-registry` represent in ClinicOS?

## Canonical Definition

context.patient-registry is the canonical bounded-context named Patient Registry.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.patient`
- `data.model.patientdiaryentry`
- `data.model.patientdocument`
- `data.model.patientintakedocument`
- `data.model.patientintakedraft`
- `data.model.patientnarrativesection`
- `data.model.patientroomassignment`
- `data.model.patienttherapy`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:67-99`
- `prisma/schema.prisma:414-432`
- `prisma/schema.prisma:132-148`
- `prisma/schema.prisma:241-257`
- `prisma/schema.prisma:437-451`
- `prisma/schema.prisma:105-126`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.patient`
- `contains` → `data.model.patientdiaryentry`
- `contains` → `data.model.patientdocument`
- `contains` → `data.model.patientintakedocument`
- `contains` → `data.model.patientintakedraft`
- `contains` → `data.model.patientnarrativesection`
- `contains` → `data.model.patientroomassignment`
- `contains` → `data.model.patienttherapy`
