# Task Contract

## Task
- Title: Scanner PDF per foto di dimissione
- Slug: scanner-pdf-per-foto-di-dimissione
- Type: feature
- Base: 5385b4bf9a83ffe376121c6809c13eb53f89ba5b
- Date: 2026-09-15

## Impact Classification
| Area | Impacted |
|---|---|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no schema change; reuse import upload |
| OCR / Import | yes: PDF camera input |
| Agnos AI / Chatbot | no |
| Voice | no |
| Auth / Permissions | no change; existing camera permission |
| Privacy / Security | yes: local image processing and cleanup review |
| Config / Env | no |

## Current Behaviour
Scatta foto captures the entire video frame as JPEG, without a document boundary. Discharge upload preview and retake are image-only. Archive capture shares the camera component.

## Expected Behaviour
The discharge camera shows an adjustable rectangular document boundary before capture. Touch or keyboard adjustment defines exactly the cropped preview. Confirmation converts that crop into a valid one-page PDF and adds it to the existing ordered import list. The PDF remains previewable and replaceable. Separate scans remain separate ordered PDFs; automatic edge detection and perspective correction are not required. Archive JPEG behavior remains compatible.

## Acceptance Criteria
- AC1: Live scanner has a visible bounded crop frame, touch/pointer and keyboard handles, correct portrait/landscape mapping without letterbox drift, and an accurate cropped preview.
- AC2: Confirmation emits a real image-containing single-page PDF with correct MIME/name and matching orientation/aspect ratio; bounded image dimensions and byte validation prevent excessive allocations. No image is merely renamed PDF.
- AC3: Capture/retake/cancel, denied/unavailable fallback, duplicate-click prevention, late conversion suppression and stream/object URL cleanup work. Upload occurs only after explicit use confirmation.
- AC4: Accepted PDFs can be viewed with the shared pdf.js canvas renderer and rescanned. Replacement preserves original on failure and retains grouping/order on success. Existing manual uploads and archive JPEG capture remain compatible.
- AC5: Focused crop/PDF/session tests, frontend regression/typecheck/build, independent review and desktop/mobile browser assertions pass. Synthetic inside/outside markers prove crop correspondence; rendered PDF is inspected. No real camera or patient data in testing.
- AC6: User-authorized scoped commit/push and existing Vercel publication verified against immutable source and published bundles.

## Test Plan
| Test type | Required | Reason |
|---|---|---|
| Unit | yes | Crop boundaries/pixel mapping, PDF validity/structure, replacement acceptance |
| Integration | yes | Real import and camera components with synthetic camera and mocked upload |
| API | no | Existing backend PDF acceptance unchanged |
| Playwright | yes | CUA browser: mobile/desktop frame adjustment, crop/preview/PDF, errors and cleanup |
| Persistence after refresh | no | No persistence implementation changes; exact accepted bytes checked in mocked existing upload |
| OCR/import test | yes | Valid PDF accepted by existing import flow; no external OCR or live writes |
| Agnos / Voice | no | Unchanged |
| Security/privacy scan | yes | Bounds, lifecycle, no sensitive fixture data or secret/dependency change |

## Evidence Plan
Local DEV/loopback-only fixture with real components, synthetic video and controlled camera/conversion failure cases. Record DOM geometry, pixel markers, valid PDF page/render, request metadata, screenshots and sanitized logs. CUA cannot record native trace/video; do not fabricate. Independent QA in a separate source snapshot; root may execute QA-authored UI instructions if child browser remains unavailable, with independent evidence review.

## Architecture and Ownership
Root sole writer in subtle-dashboard-notifications isolated worktree. Read-only integration reviewer; later isolated QA. CameraCapture gets opt-in PDF output, reusable crop geometry/PDF helpers and border control. Extract existing PDF renderer into shared component without changing archive API. Reuse import session ID mapping and generation guards. No dependency installation in shared node_modules. Prior user push/publication authorization applies to existing site.

## Policy Receipt
ALLOW_PREPARE: user-requested scanner implementation and synthetic testing. Swarm swarm-1789483345843-zhpom9 is advisory coordination; permissions not expanded. Protect original checkout, unrelated launchers, historical artifacts and user browser tabs. Release requires independent QA and exact source receipt. No real camera access, real clinical upload, credentials change or backend deployment.

## Gate Status
READY FOR IMPLEMENTATION
