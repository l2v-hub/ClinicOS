# Task Contract — Navigazione terapia senza salti

## Impact Classification
Low-risk frontend layout correction in one existing component. Root is the sole writer in the existing isolated worktree. Baseline: ec3b8fbeb6319f8b81f7ff9f53c2be711b0e582e.

## Current Behaviour
Conditional medication filters, errors and anomaly notices precede the therapy tab navigation. Switching to Calendar removes these blocks and moves the tabs vertically; opening the prescription form also removes filters above navigation.

## Expected Behaviour
The therapy navigation precedes view-specific controls and notices. Switching between views and opening/closing the form preserves the navigation's position in the section. Filters and anomaly warnings remain usable and scoped exactly as before.

## Acceptance Criteria
- AC1: Desktop and mobile navigation geometry remains stable when switching Programmazione, Calendario and the other therapy views.
- AC2: Visible filters and anomaly notices follow navigation; the calendar keeps its own date controls.
- AC3: Opening and cancelling the new-therapy form does not move navigation or discard filter state.
- AC4: Existing filter actions, calendar loading and empty/error states remain functional; no clinical data or backend contracts change.
- AC5: Frontend production build passes; record browser evidence and verify the deployed result read-only.

## Test Plan
Reproduce and measure the original shift with a local synthetic fixture. Recheck all six views, form open/cancel, filters and calendar error/retry at desktop and mobile widths. Use supported CUA only; no additional unit tests for a markup relocation. Run frontend build and scoped diff checks.

## Evidence Plan
Record source SHA, before/after element geometry, browser assertions, synthetic screenshots, build output and deployment receipts here. No live patient screenshots or clinical writes. The supported CUA API does not export trace/video.

## Gate Status
READY FOR IMPLEMENTATION

ALLOW implementation within the single application file above. User's existing instruction authorizes commit, push and publication of verified corrections to clinicos-eosin.vercel.app. Release follows successful validation; no backend deployment or environment changes required. Preserve unrelated files.
