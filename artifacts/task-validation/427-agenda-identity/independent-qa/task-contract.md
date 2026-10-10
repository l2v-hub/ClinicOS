# Task Contract

## Task
- Title: 427 agenda identity
- Slug: 427-agenda-identity
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
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour
Original issue427 read as untrusted evidence. Accepted30e exposes semantic operator colors in admin filters, day headers, week dots and week/month inline borders. Activity labels and operator names already exist; AC2 must be certified, not claimed as new. Existing global card surfaces invert blue/amber compared with legend/badges. Empty range has a zero count but unnamed hierarchy. Old audit screenshot is not a source-bound reproduction.

## Expected Behaviour
Root sole application writer in isolated C:/w-427, readonly architecture review completed. Limit edits to AgendaLegend.tsx, AgendaStatoFilter.tsx, AgendaInline.css and agendaIdentity.test.ts, all under500lines. Hide decorative operator dots and neutralize aggregate identity borders only in non-HMI admin agenda. Align admin card surface colors to existing textual badge/legend semantics, without changing operator HMI styles. Add actual visible filter caption and legend title; include cancelled state. Retain native buttons, keyboard controls, names, counts and all handlers. No false empty-day claim during loading/error. No backend/API/auth/schema/dependency/config changes.

## Acceptance Criteria
- AC1: Operator identity is communicated by names, never by green/blue/amber activity colors, across day/week/month and operator filters; scoped overrides leave HMI operator palette intact.
- AC2: All four activity states remain visible in words beyond color on populated cards and legend; admin surfaces agree with legend/badges. Existing behavior certified with synthetic mixed states, not attributed as newly implemented.
- AC3: Empty and populated ranges show explicit appointment-count/filter caption and activity legend hierarchy. No invented data, misleading async empty message or removed controls.
- AC4: Actual browser checks with multiple operators, shared identity colors, mixed states on same operator and same states across operators at1280x720 and390x844, normal and grayscale; filters/keyboard preserved, zero real writes. Grayscale software evidence is not physical light/hardware/AT acceptance.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | TDD real SSR labels/counts and scoped CSS semantic guards, existing agenda regression |
| Integration | yes | Source-bound types/build/full regression with exact named baseline delta |
| API | no | No API changes |
| Playwright | yes | Actual repo SPA synthetic mixed/empty day/week/month, filters, grayscale, HMI regression; fresh independent QA then exact root replay |
| Persistence after refresh | no | No data/model changes |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Scoped native scan, secret scan, source isolation, before-wire auth/clinical guards, canonical credentials/ZIP/public screenshots |

## Evidence Plan
Required evidence: validation-report.md, focused/full output, actual UI screenshots, traces, videos, immutable independent manifest and root byte-identical recipes, exact clean source/deployment/CI receipts, commit-pinned public synthetic PNG.

## Risks
Do not edit778line AdminAgenda or large app-additions global styles; presentation-only scoped override. Shared filter/legend captions affect operator too and require regression evidence; no HMI palette redesign. No app writer overlap; QA separate isolated source-frozen session with artifact-only ownership. No production patients/network mutation. Human-authorized root release gate remains independent of advisory Ruflo registry (unavailable/previous OOM; no fabricated durable authority). Preserve dirty launchers/primary and blocked candidates. Close only after independent gates, deployed exact source and pinned proof verify.

## Gate Status
READY FOR IMPLEMENTATION
