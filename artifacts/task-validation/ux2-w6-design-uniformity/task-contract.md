# Task Contract

## Task

- Title: ux2 w6 graphic and layout uniformity
- Slug: ux2-w6-design-uniformity
- Type: change
- Date: 2026-10-03

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

Per `artifacts/task-validation/ux-cycle-discovery/design-uniformity.md`: four contradictory page
container rules, per-page max-width caps (Turno, Pazienti, Consegne, Posti letto, Orari), the topbar
title jumps 64px when the back button appears, the chart adds an extra 28px inset on half of its
sections, page stack gaps vary (0/16/24/margins), ~124 page-local buttons and 7 badge systems.

## Expected Behaviour

One page container (`.ds-page` + `--ds-page-gutter`/`--ds-page-gap`/`--ds-stack-gap`/`--ds-fab-clearance`)
on every route root, identical content left edge and topbar title x on every route and in the chart,
24px between widgets, one button system (ds-btn/ds-icon-btn/ds-chip/ds-link, 48px), one badge system
(ds-badge), cards on ds-card/ds-card--compact. No behaviour, copy, navigation or data-flow change.

## Acceptance Criteria

- AC1: every route root carries `.ds-page`; no per-page max-width on route roots.
- AC2: first content block left x identical on every route per width (1180x820, 820x1180, 390x844), chart sections included.
- AC3: topbar title x identical on every route per width.
- AC4: gap between consecutive top-level widgets = 24px.
- AC5: legacy button classes (btn-primary/btn-secondary/btn-sm/btn-success/btn-ghost*/btn-danger/btn-link/icon-btn) migrated to canonical classes; page-local action buttons migrated; buttons measure 48px/r12.
- AC6: dead components (ExpCard, PatientCompactHeader, PatientOverview.css, ParameterEntryRow) deleted after confirming no imports.
- AC7: no horizontal scroll, no console errors at the three widths; FAB clearance ≤1023px.
- AC8: tsc + build + vitest with no new failures vs baseline; guard test added.

## Test Plan

| Test type                 | Required | Reason                                         |
| ------------------------- | -------: | ---------------------------------------------- |
| Unit                      |      yes | guard test designUniformity + contract tests   |
| Integration               |       no | frontend only                                  |
| API                       |       no | no backend change                              |
| Playwright                |      yes | geometry measurement on every route, 3 widths  |
| Persistence after refresh |       no | no data change                                 |
| Agnos action registry     |       no |                                                |
| Voice simulation          |       no |                                                |
| OCR/import test           |       no |                                                |
| Security/privacy scan     |       no | no new data flows                              |

## Evidence Plan

- validation-report.md
- test output
- screenshots + results.json (artifacts/task-validation/ux2-cycle/w6/)

## Risks

Wide CSS/class migration may shift visuals in untested corners; mitigated by measuring every route
at three widths and keeping behaviour/copy untouched.

## Gate Status

READY FOR IMPLEMENTATION
