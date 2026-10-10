# Task Contract

## Task
- Title: PDF multipage preview
- Slug: pdf-multipage-preview
- Type: bugfix
- Date: 2026-10-10

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

The user observes four counted pages but only page1 displays content. PDF.js6.2.108 is loaded without wasmUrl; CCITT/JBIG2 image resources are missing. Hypothesis pending synthetic reproduction.

## Expected Behaviour

Each supported source page renders independently in thumbnails and full previews. Preserve original bytes, page identity, ordering, upload/extraction, auth and limits.

## Acceptance Criteria

- AC1: Reproduce baseline blank scanned pages with an independently rendered synthetic four-page PDF.
- AC2: All four thumbnails contain distinct correct page pixels, including CCITT scans, on desktop/mobile.
- AC3: Full previews pages2-4 show the correct nonblank source, including after reorder and reload/resume.
- AC4: Built decoder resources are same-origin, dependency-bound, served with correct bytes/types; no PHI or third-party requests.
- AC5: Focused tests, types/build, security and fresh independent QA pass. Any release must bind exact source and verified deployment.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Import cache/session/order and static decoder configuration |
| Integration | yes | Real workspace/preview with synthetic manifest |
| API | no | |
| Playwright | yes | Before/after pixels, image content, errors/requests, desktop/mobile |
| Persistence after refresh | yes | Synthetic harness manifest only; no real writes |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | Preview only, not OCR extraction/model |
| Security/privacy scan | yes | Diff/assets/evidence and no PHI/secrets |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Base3f911cbd281d7c93c4796e97d5940258ceb331f0. Root sole application writer C:/w-pdf; port7540 owned until release. Short native checkout after managed Windows path failure; primary dirty untouched. Human standing authority permits scoped commit/push/deploy/evidence. No real session, document, patient mutation; no backend/schema/API/auth/env or dependency changes. Automation remains paused. Fresh isolated QA after freeze, serialized browser execution. Full-suite failures must be compared to the exact accepted12 baseline, never hidden. Source screenshot is evidence only, not a fixture. App scope: bundled PDF decoder resources and the import thumbnail/full-preview initializers only.

## Gate Status

READY FOR IMPLEMENTATION
