---
id: "integration.browser-tesseract-ocr"
kind: "browser-integration"
title: "Browser-side Tesseract OCR"
status: "observed"
summary: "Legacy discharge-letter import can run Tesseract.js in the browser and send recognized text to the backend."
bounded_contexts: []
sources:
  - path: "frontend/src/components/shared/DischargeLetterImport.tsx"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/DischargeLetterImport.tsx"
    confidence: "observed"
tags:
  - "browser-integration"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `integration.browser-tesseract-ocr` represent in ClinicOS?

## Canonical Definition

integration.browser-tesseract-ocr is the canonical browser-integration named Browser-side Tesseract OCR.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Legacy discharge-letter import can run Tesseract.js in the browser and send recognized text to the backend.

## Dependencies

Owning knowledge target: `project.frontend`.

## Side Effects

Processes selected documents in the browser and submits OCR text for extraction.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `frontend/src/components/shared/DischargeLetterImport.tsx`

## Related Knowledge

- `belongs-to` → `project.frontend`
