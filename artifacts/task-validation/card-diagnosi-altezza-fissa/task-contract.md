# Task Contract

## Task
- Title: Card diagnosi ad altezza fissa
- Slug: card-diagnosi-altezza-fissa
- Type: bugfix
- Date: 2026-09-15
- Base: 6acae24700cbf89db918c9b849d88d45eff95844

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | review only |
| Config / Env | no production config changes |

## Current Behaviour
The diagnosis overview card grows with an entire imported narrative, pushing its existing Apri diagnosi action far below the other summary cards. The generic preview text allows unlimited wrapping. Browser evidence establishes the layout issue; clinical values from the user screenshot must not be copied to fixtures or logs.

## Expected Behaviour
The diagnosis summary has a compact fixed height at desktop and mobile widths, regardless of text length. Long diagnosis descriptions show an ellipsis; the existing Apri diagnosi action remains visible and opens the unmodified complete diagnosis. Scope is the diagnosis overview card only.

## Acceptance Criteria
- AC1: Short, long, multiple and empty diagnosis summaries have the same 160 CSS-pixel height at the default root font size, including mobile. The existing counter is preserved.
- AC2: A single long description shows a three-line ellipsis; multiple entries use one-line previews, fitting the three-item overview. No content overlaps the footer or escapes the card horizontally.
- AC3: Apri diagnosi remains visible inside the card and opens the complete synthetic diagnosis, including the final marker; no underlying clinical data is truncated or changed.
- AC4: Independent CSS diff review, frontend typecheck/build and desktop/mobile browser assertions pass, with screenshots and no unexpected runtime errors. No mirrored CSS unit tests are needed.
- AC5: Scoped commit/push and authorized publication to the existing Vercel site are verified. No backend deployment is needed.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Pure CSS presentation; DOM geometry and browser rendering are authoritative |
| Integration | no | No data/interface changes |
| API | no | No endpoint changes |
| Playwright | yes | Supported CUA surface: fixed bounds, ellipsis, visible action and full modal text |
| Persistence after refresh | no | No writes; full value remains in the same fixture source |
| Agnos action registry | no | Unchanged |
| Voice simulation | no | Unchanged |
| OCR/import test | no | Only existing diagnosis text display changes |
| Security/privacy scan | yes | Scoped CSS, no secrets or real patient data in evidence |

## Evidence Plan
Use the real PatientDetail component with DEV/loopback-only synthetic fixtures for short, long, multiple, empty and unbroken text. Record exact dimensions and visible text, screenshots and clean browser console. Native trace/video are unavailable in CUA and must not be fabricated. All evidence lives under this task directory. Independent QA has a separate source snapshot; browser lane is serialized.

## Policy and Ownership
ALLOW: user requests this card correction; explicit earlier push/publication authorization persists for these site modifications. Root sole application writer in isolated subtle-dashboard-notifications worktree; QA separate snapshot. Keep original checkout, unrelated launchers, live patient records and user browser tabs intact. No credentials, new dependencies, schema or backend changes.

## Gate Status
READY FOR IMPLEMENTATION
