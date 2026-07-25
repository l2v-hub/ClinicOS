---
id: "flow.clinical-document-access"
kind: "runtime-flow"
title: "Protected clinical document access"
status: "inferred"
summary: "Protected clinical document access workflow across ClinicOS components."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/routes/patient-documents.ts"
    line_start: "194"
    line_end: "201"
    confidence: "observed"
  - path: "backend/src/routes/patient-documents.ts"
    line_start: "204"
    line_end: "228"
    confidence: "observed"
  - path: "backend/src/routes/patient-documents.ts"
    line_start: "153"
    line_end: "191"
    confidence: "observed"
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "createPatientDocument"
    line_start: "71"
    line_end: "111"
    confidence: "observed"
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "getPatientDocumentContent"
    line_start: "134"
    line_end: "148"
    confidence: "observed"
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "listPatientDocuments"
    line_start: "114"
    line_end: "131"
    confidence: "observed"
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "persistImportDocuments"
    line_start: "28"
    line_end: "64"
    confidence: "observed"
  - path: "backend/src/ai/upload/patient-documents.ts"
    symbol: "PublicPatientDocument"
    line_start: "12"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-by-param-documents-91"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-by-param-documents-by-param-content-92"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-patients-by-param-documents-90"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.upload.patient-documents.createpatientdocument"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.upload.patient-documents.getpatientdocumentcontent"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.upload.patient-documents.listpatientdocuments"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.upload.patient-documents.persistimportdocuments"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument"
    evidence: "backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/routes/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts,backend/src/ai/upload/patient-documents.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.clinical-document-access` represent in ClinicOS?

## Canonical Definition

flow.clinical-document-access is the canonical runtime-flow named Protected clinical document access.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.get-patients-by-param-documents-91`
- `api.backend.get-patients-by-param-documents-by-param-content-92`
- `api.backend.post-patients-by-param-documents-90`
- `component.backend.backend.src.ai.upload.patient-documents.createpatientdocument`
- `component.backend.backend.src.ai.upload.patient-documents.getpatientdocumentcontent`
- `component.backend.backend.src.ai.upload.patient-documents.listpatientdocuments`
- `component.backend.backend.src.ai.upload.patient-documents.persistimportdocuments`
- `component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/patient-documents.ts:194-201`
- `backend/src/routes/patient-documents.ts:204-228`
- `backend/src/routes/patient-documents.ts:153-191`
- `backend/src/ai/upload/patient-documents.ts:71-111` — createPatientDocument
- `backend/src/ai/upload/patient-documents.ts:134-148` — getPatientDocumentContent
- `backend/src/ai/upload/patient-documents.ts:114-131` — listPatientDocuments
- `backend/src/ai/upload/patient-documents.ts:28-64` — persistImportDocuments
- `backend/src/ai/upload/patient-documents.ts:12-22` — PublicPatientDocument

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.get-patients-by-param-documents-91`
- `invokes` → `api.backend.get-patients-by-param-documents-by-param-content-92`
- `invokes` → `api.backend.post-patients-by-param-documents-90`
- `invokes` → `component.backend.backend.src.ai.upload.patient-documents.createpatientdocument`
- `invokes` → `component.backend.backend.src.ai.upload.patient-documents.getpatientdocumentcontent`
- `invokes` → `component.backend.backend.src.ai.upload.patient-documents.listpatientdocuments`
- `invokes` → `component.backend.backend.src.ai.upload.patient-documents.persistimportdocuments`
- `invokes` → `component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.backend.get-patients-by-param-documents-91` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.backend.get-patients-by-param-documents-by-param-content-92` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.backend.post-patients-by-param-documents-90` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `component.backend.backend.src.ai.upload.patient-documents.createpatientdocument` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `component.backend.backend.src.ai.upload.patient-documents.getpatientdocumentcontent` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.backend.backend.src.ai.upload.patient-documents.listpatientdocuments` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.backend.backend.src.ai.upload.patient-documents.persistimportdocuments` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.backend.backend.src.ai.upload.patient-documents.publicpatientdocument` | Defined by cited component | Owning component error contract |
