# Task Contract

## Task
- Title: 421-import-empty
- Slug: 421-import-empty
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
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Original421 and comments freshly saved: a collecting session with zero files/pages exposes usage counters, group naming/navigation/removal and disabled processing before the first useful action. Audit explicit import creation already works; accepted420c00 recovery presentation must remain intact. Root alone writes application in C:/w-421, primary/blocked candidates and unrelated launchers preserved. Read-only architecture and NEW independent QA per issue, one browser lane.

## Expected Behaviour

Guided empty start with primary Carica documento and understandable Scansiona alternative. Ordinary-language accepted formats and actual server limits shown BEFORE chooser. No object-management or disabled processing competing with first action. Reveal multipage/multiletter controls after first saved content, preserve uploads/retry/idempotency, camera fallback and active processing. Existing blue design-system controls, scoped CSS. No backend/provider/OCR/schema/config/dependency/auth policy changes; no real clinical import/test writes.

## Acceptance Criteria

- AC1: Empty collecting session shows explicit primary Carica documento and understandable Scansiona alternative, both keyboard-accessible, backed by existing chooser/camera path. Desktop1150x1004/mobile390x844 no horizontal overflow.
- AC2: With no saved content, counters/group tabs/rename/reorder/remove and disabled process action do not occupy first hierarchy; pending/error upload recovery remains visible and not falsely empty. First real saved content reveals existing management; global content, not selected-letter emptiness, decides guided start.
- AC3: Before any file selection, show truthful server-bound size/page/file/letter limits and readable accepted formats, including non-default limits/formats; do not silently weaken actual accept/validation. Avoid technical progressive-transmission jargon and multiple usage counters in empty state.
- AC4: After first synthetic upload, multipage/multiletter creation, rename/reorder/page move/removal/replacement/preview remain available, as appropriate to existing behavior. Close/reload retains fixture saved-page/group identity. Adding an empty second letter must not revert entire workspace to guided start. Failed/lost upload/retry remains safe. No AI processing or provider calls; no actual database durability or camera hardware success certification.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | TDD empty presentation/content gating/format labels and existing all-import/upload/capability tests |
| Integration | yes | Types frontend/backend and actual Vite/React compiler build, focused and full baseline delta |
| API | yes | Synthetic transport first upload/manifest operations, strict fault guards, no live clinical writes |
| Playwright | yes | All four AC, initial empty vs first saved content, keyboard/desktop/mobile, error/retry, root + fresh independent + compiled static online |
| Persistence after refresh | yes | Client opaque session + fixture saved page/group identity after close/reload, not DB persistence |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | Synthetic document selection/management UI only, no extraction/provider execution |
| Security/privacy scan | yes | Scoped diff/scanner baseline, configured credential and expanded ZIP artifact scans; all synthetic |

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

Use global saved pages/documents rather than current-letter emptiness; malformed/failed/pending content cannot be hidden. Existing queue errors and revision/idempotency must remain untouched. Server MIME/limits are authoritative; readable labels must not advertise unsupported types or fabricated limits. Camera entry only uses existing component; denial/fallback can be mocked, no physical clinical device claim. Use explicit actual compiled runtime and no production patient APIs. Keep accepted420 recovery states and opaque owner memory unchanged. Full frontend has12 pinned pre-existing failures, backend CI has one pinned scope failure; no new failure allowed and no global-green claim. Preserve immutable pre-run recipes and every independent attempted run; root development failures retained honestly. New independent QA and root rerun before commit/push/deployment; exactREADYcommit and public pinned screenshots before closure. Native Ruflo ledger initialized max3; MCP guidance/AgentDB absent and prior CLI memory/route OOM unchanged, source/ADR fallback, no installs.

## Gate Status

READY FOR IMPLEMENTATION
