# Task Contract

## Task
- Title: 407 badge contrast
- Slug: 407-badge-contrast
- Type: bugfix
- Date: 2026-10-09

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
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

GitHub407 reports Ricoverato normal14px text #0d9488 over #e7f7f0, 3.3806:1. Current source confirms .stato-pill--ricovero-ricoverato uses --teal over --emerald-bg; actual PatientRoster renders a literal admission label in desktop/mobile. Accent tokens also affect non-text elements, so changing global --teal would exceed this badge-text fix. No current live patient's data will be examined or changed.

## Expected Behaviour

Use a distinct readable success-badge text token shared by green status badges, preserving their light surfaces, admission label, shapes and brand/non-text accents. Measure actual loaded CSS states. Complete a visual rendering check in a dedicated visible Chrome tab on the actual Windows desktop; keep emulated mobile and unverified ward/panel/sunlight checks separate. Do not close/release as accepted if the genuine desktop-browser visual check cannot be supplied.

## Acceptance Criteria

- AC1: normal success badge text has >=4.5:1 in default/hover/focused-parent states, desktop/mobile, including shared green badge consumers.
- AC2: automate sRGB relative luminance against actual CSS tokens and computed browser styles, then inspect a visible real Chrome desktop tab on the host device with synthetic actual SPA, no emulation/viewport override for this desktop check. Record host/browser/source/viewport and visual result. Headless mobile is emulation, not hardware; no physical panel, ward lighting or sunlight certification claim.
- AC3: actual Ricoverato label remains visible and accessible, not color-only; other badge labels remain text.
- AC4: record control/icon/border/focus contrast separately, with exact surfaces and scope. Do not describe text ratio as control/border pass or infer untested contrast coverage.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Parse source tokens, resolve badge consumer colors, WCAG sRGB threshold, baseline regression ratio and preservation of accent tokens. |
| Integration | yes | Fresh independent QA; build/type check and full baseline comparison. |
| API | no | |
| Playwright | yes | Actual SPA synthetic roster, computed default/hover/focus desktop/mobile badge text colors, labels, separate nearby control measurements; screenshot/trace/video/JSON. |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | No PHI/secret/test production writes; source/bundle/evidence scan. |

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

Publish only synthetic source-bound artifacts, scoped test outputs, actual source/build hashes and explicit desktop visual/emulated-mobile limitations. Do not include the original audit photo. Root sole application writer in C:/w-407; independent QA evidence-only writer after app freeze, separate folder. No backend/schema/API/auth/dependency/env/deployment-config changes; no changes to warning/alarm palette, filter semantics, badge sizes or unrelated text. App candidate stays isolated until acceptance gate. User authorized publication; no automatic promotion if visual AC2 unmet.

## Risks

Primary workspace dirty, preserved. Node_modules existing junction reused; no install/generate. Unrelated launcher modifications and generated Ruflo metadata excluded. Ruflo swarm1791527654785-9e8qi2 coordinates at most2 agents; root app writer plus fresh independent QA. Native AgentDB known OOM: recall through tracked style/tests/ADRs instead. Known baseline12 frontend failures are scoped waived, zero new failures required. Evidence distinguishes browser screenshots from physical device inspection.

Acceptance interpretation receipt: initial root wording demanded human physical-panel verification. Fresh independent QA read original407 and identified that as stricter than the issue: it asks visual completion on a device, not a human, mobile physical device or sunlight/display-luminance measurement. Actual Chrome extension browser is available on the Windows host. Root reconciles AC2 to a genuine visible desktop-browser visual check, not just screenshots from headless emulation. This does not certify untested ward hardware #429 or AT #405. If unavailable, AC2 remains unmet; no fabricated hardware claim.

## Gate Status

READY FOR IMPLEMENTATION
