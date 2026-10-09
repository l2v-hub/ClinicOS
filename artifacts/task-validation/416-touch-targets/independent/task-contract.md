# Independent QA contract — original issue 416

## Scope and ownership
Dedicated non-implementer QA, isolated detached application commit a57cffe6337929f4021913d7b319a85e5feef9f8. Application read-only. Only this independent artifact directory is writable. Exclusive browser lane assigned by root; no production requests, GitHub writes, commit, push, merge, release or deployment.

## Impact Classification
Frontend UI geometry and native keyboard behavior; security/privacy of synthetic test harness. No application edits or new credentials/providers. Existing source contract inspected read-only.

## Current Behaviour
Fresh GitHub issue and comments obtained on 2026-10-09; issue open, no comments. Original audit live revision unknown and not attributed to accepted local baseline. Candidate changes 12 frontend source/test files, including bounded header ResizeObserver and scoped 44px token.

## Expected Behaviour
Frequent nurse/supervisor roster, chart, catalog/workspace and room controls meet contextual 44×44CSSpx design goal; hitboxes separate and focus visible/unobscured. Existing 413 first-radio focus, 414 draft/reload and 415 catalog-purpose behavior survive. Underlying unchanged paper radio controls are not falsely described as 44px targets or operator-certified equivalents.

## Acceptance Criteria
1. Measure actual active bounds ≥44×44CSSpx for scoped frequent controls; exact inventory and raw geometry required.
2. Edge-midpoint hit tests, non-overlap, real Tab/Shift+Tab and Enter/Space/Escape, painted/unobscured focus. Inactive roving tabs intentionally tabindex=-1.
3. Real intended device with realistic hands/gloves: EXTERNALLY UNVERIFIED. Emulation is software evidence only; overall verdict BLOCKED.
4. Contextual bedside recommendation, not blanket WCAG-AA failure or clinical/hardware certification.

## Test Plan
Independent frontend/backend types, frontend tsc and Vite build, 66 focused tests and separate 4 SSR tests with QA-only Vite-URL loader, normal full-suite baseline comparison. Actual SPA guarded API fixtures before navigation, both roles, 1150×1004,1280×720,390×844 and coarse emulation. All unexpected writes/external calls rejected. No backend patient writes.

## Evidence Plan
Source/server receipts before/after, canonical and line-ending mapping, raw command logs, independent browser assertions/geometry, final-result screenshots, video, trace, HTML report, raw results and any preliminary failures. Immutable SHA256 manifest excludes itself. Security scoped diff review and independent secret scan, disclose unchanged broad scan findings and baseline test failures.

## Gate Status
READY FOR IMPLEMENTATION — QA artifacts only. Hardware AC3 cannot pass here.
