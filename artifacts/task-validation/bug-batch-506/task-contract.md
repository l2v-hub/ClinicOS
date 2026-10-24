# Task Contract

## Task
- Title: #506 import e ripresa bozza nella pagina principale
- Slug: bug-batch-506-507-import-layout-e-data-inizio-terapia
- Type: bugfix
- Baseline: 715a4b9e47ff9bd0192b7f58f24271e48da4900d
- Owner: Codex cloud; branch codex/bug-batch-506
- Scope: issue #506 only; #507 separate branch because different root cause/files.

## Impact Classification
| Area | Impacted |
|---|---|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no schema or live data changes; draft reads through existing contracts |
| OCR / Import | layout and presentation only |
| Auth / Permissions | existing checks unchanged |
| Privacy / Security | synthetic QA data only; navigation and modal semantics reviewed |
| Config / Env | no |

## Current Behaviour
Import and resumed draft cover the viewport via fixed inset-zero workspaces and the global modal overlay. Sidebar/topbar are obscured even when launched from the routed patient page. Both document review and intake draft phases use dialog surfaces.

## Expected Behaviour
The routed patient import/draft workspace fills the main content area while existing sidebar/topbar remain visible and usable. Existing true dialogs keep their modal accessibility. Explicit save/close and genuine nested confirmation dialogs preserve existing behavior.

## Acceptance Criteria
- AC1: Importa dimissione fills the main pane without intersecting the visible sidebar/topbar at desktop, tablet and mobile widths.
- AC2: Riprendi bozza and transition document review to intake remain within the same pane; input fields, scrolling and existing save/close controls remain reachable.
- AC3: Navigation is not obscured by an overlay or trapped by page-mode focus behavior; page mode does not claim aria-modal. Nested confirmations still behave modally.
- AC4: Import/draft state and API/permission behavior preserved; no patient creation, schema/backend/provider/live data changes.
- AC5: Relevant unit/SSR tests, independent frontend build and Playwright with real React components, synthetic API fixtures, screenshots, trace/video pass; no relevant console/HTTP errors.

## Test Plan
| Test type | Required | Reason |
|---|---|---|
| Unit | yes | page/modal presentation, entry-point propagation and existing import tests |
| Integration | yes | actual frontend components with isolated synthetic API fixtures |
| API | no | no server changes; browser fixtures explicitly not server validation |
| Playwright | yes | shell geometry, entry/resume, mobile navigation, focus and close |
| Persistence after refresh | yes where draft edits exercised | verify fixture-backed saved draft/reload, otherwise explicitly no draft write claimed |
| Security/privacy scan | yes | no real PHI, remote requests, secrets, auth bypass or new dependencies |

## Evidence Plan
Independent screenshots for #506, Playwright trace/video and JSON assertions; frozen source manifest and exact publication SHA; sanitized build/test logs. Publish evidence in issue and PR. Original screenshot not required to reproduce CSS cover.

## Risks
Page-mode focus semantics, nested modal stacking, small screens, and multi-stage draft resume. Reuse existing layout/navigation; no alternative shell. Keep appointment-driven true dialogs modal unless this issue's routed entry selects page presentation. Claude final review is external and cannot be fabricated.

## Gate Status
READY FOR IMPLEMENTATION
