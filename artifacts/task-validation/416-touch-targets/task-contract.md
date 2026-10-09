# Task Contract

## Task
- Title: 416-touch-targets
- Slug: 416-touch-targets
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
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Original GitHub416 and all comments (none) read; OPEN P2 oldest unblocked after accepted415. Main accepted application0d7adc361b92c8466655d9ed830d2b87bbd0f419;415 immutable proof82920e256904b8a967ecb343cc19add281f58ed0. New isolated C:/w-416 branch codex/bug-416-touch-targets, root sole writer. Primary dirty directory untouched. Canonical design-system.css currently defines36px standard controls and40px pointer-coarse; frequently used patient roster open/chart header icons/module buttons and fields inherit these dimensions. Catalog rows already have44px from415 and must not regress. Inspect actual hitboxes, not icon dimensions or historic photos; original audit not source-bound to today's accepted commit. Role scope nurse and supervisor, patient list/chart/modules and room actions shown in audit screenshot33. Ruflo coordination ledger swarm-1791551093351-qbwnal, read-only architecture plus later fresh independent QA; AgentDB search unavailable database, source/ADR fallback. No reachable guidance_brain/recommend registered; no implication of release authority from ledger.

## Expected Behaviour

Target design goal >=44×44CSSpx for identified frequent active controls, native visible focus and adjacent non-overlapping hitboxes with sufficient gap. Use existing canonical control tokens/styles; don't introduce arbitrary page styles or reduce action targets to obtain density. Compact card/layout spacing may be changed only if needed to avoid overflow or unnecessary blank area. Preserve action semantics, chart navigation, draft/history/resume behavior from413-415, permissions and print layout. No clinical model, score, validation, API/client/store/backend/schema/auth/config/dependency changes.

## Acceptance Criteria

- AC1 original: Le azioni frequenti individuate hanno area attiva almeno44×44px o una soluzione equivalente validata con gli operatori. Choose directly measured >=44×44 goal, not invented operator validation. Verify roster open, chart header actions, module catalog/workspace actions/fields and room actions on nurse/supervisor role surfaces; desktop1150×1004/1280×720, mobile390×844 and coarse-pointer emulation. Identify exact controls, bounding boxes and pointer hit-test values; no blanket assumption all buttons match.
- AC2 original: Controlli adiacenti non hanno hitbox sovrapposte e focus visibile. Pairwise rect/hit-test assertion for adjacent action groups, native Tab/Shift-Tab/Enter/Space focus with visible outline, no accidental neighboring action, responsive fit/wrap. Catalog scopes and413first-question keyboard entry preserved.
- AC3 original: Testare con touch sul dispositivo previsto e mani in condizioni realistiche. EXTERNALLY UNVERIFIED: no actual intended device/operator real hands or gloves evidence available. Browser touch emulation is software evidence only and cannot PASS this criterion. Keep issue OPEN, no main promotion/deployment of416 candidate or completion claim until genuine source-bound synthetic human device check arrives.
- AC4 original: Non classificare automaticamente ogni36px come fallimento WCAG AA. Document44 as contextual bedside design goal; no automated blanket WCAG-AA failure claim. Preserve existing accessible semantics and no physical/clinical signoff invention.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | RED before source changes, canonical44/scoped density and existing design system contracts |
| Integration | yes | frontend/backend types, production build, focused413-415/catalog/nav/roster tests and exact full baseline delta |
| API | no | no endpoint/client or boundary changes |
| Playwright | yes | source-bound before/after actual SPA synthetic nurse/supervisor scenarios, rect/hit-test geometry, adjacent pairs/native keyboard, desktop/mobile/coarse emulation, actual result screenshots/trace/video/HTML/raw values |
| Persistence after refresh | yes | unchanged module local draft recovery after entering history and reload; no actual backend writes or new persistence contract |
| Agnos action registry | no | no registry changes |
| Voice simulation | no | no voice changes |
| OCR/import test | no | no import changes |
| Security/privacy scan | yes | escaped UI/no new endpoint or auth bypass, synthetic guarded before navigation, source/dist credentials and full scoped diff review; publication canonical blob/archive credential scan |

## Evidence Plan

Before/after measurements/screenshots from actual SPA on isolated localhost port7478, accepted415 baseline port7477. Serialized browser lane root until explicitly released to fresh independent QA. No new backend/DB; all APIs fulfilled synthetically before navigation, external requests blocked. Exact app source commit/hash frozen before independent QA, all independent immutable evidence preserved; root reruns QA scripts separately and no self-certification. Types/build/focused/full suite compare exact12baseline failures (1215/1203baseline). No global security/CI-green claim. Record AC3 explicitly UNVERIFIED even if every software check passes; overall BLOCKED and no416source included in later accepted releases. Publish only sanitized source-bound partial proof on separate evidence-only branch from accepted baseline, with pinned synthetic screenshot on416 and status-blocked label; do not close. Preserve local candidate for genuine physical acceptance. User authorized GitHub evidence/comments/commits/push, not invented device validation.

## Risks

Canonical :not(#ds) specificity means page min-height alone cannot override; use inherited tokens/shared class within source-owned layout. Portal topbar/header actions must be measured in actual DOM, not assumed to inherit patient body scope. Global token change could alter unrelated pages; select smallest coherent bedside scope after architecture and runtime baseline. No invisible expanded pseudo-hitboxes overlapping adjacent controls. Existing files may exceed500lines; no unrelated split. Preserve print48px, coarse field16px text, responsive wrap and current navigation. No changes to primary dirty checkout, pending405/408/410 or existing issue415 proof. Baseline/hardware external blockers retained honestly, not automatically waived by generic implementation authority.

## Gate Status

READY FOR IMPLEMENTATION — software scope only; final AC3 hardware gate remains external.
