# Task Contract

## Task

- Title: Phase 7 proactive intelligence
- Slug: phase-7-proactive-intelligence
- Type: change
- Date: 2026-10-01

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |      yes |

## Current Behaviour

The AI Assistant is reactive only: nothing tells a professional what changed, what is pending or
overdue, or what to know at the start of the shift. Facts exist in the domain tables (readings,
diary, handovers, therapies, administrations, documents, rooms, notes, previews) but are not
surfaced proactively.

## Expected Behaviour

Prompt 7: EVENT → DETERMINISTIC ELIGIBILITY → POLICY/SCOPE → (AI SYNTHESIS) → HUMAN ATTENTION.
Attention Inbox («Per te / Da vedere / Cosa è cambiato»), shift briefing, change-since-last-view,
ack/dedup, Signal → existing Skill, audit; no autonomous clinical action; Phase 6 invariants kept.
No Prisma model change (ack/seen as append-only audit facts).

## Acceptance Criteria

- AC1: real Event Catalog (types from existing tables), Event ≠ Signal ≠ AI summary.
- AC2: authorization + resident scope applied BEFORE any AI; roles tested with real capabilities; administrator has no implicit clinical feed; dynamic revocation removes access at the next refresh.
- AC3: Attention Inbox with what/resident/when/origin/status/action/why; ack and dedup; change since last view on a real watermark.
- AC4: shift briefing from real events, period, facts separated from AI synthesis, drill-down; deterministic fallback on AI failure.
- AC5: Signal → existing Skill only; no signal auto-executes a clinical write; AI-prepared handovers default NORMAL, escalation only by human edit + confirm.
- AC6: prompt injection in data cannot change scope/policy/skill; cross-resident leakage tests pass.
- AC7: audit of shown / ack / action opened / briefing; cost and performance measured.
- AC8: regression Prompts 1–6 + GUI + Assistant + Voice pass; PROMPT8_HANDOFF complete.

## Test Plan

| Test type                 | Required | Reason                                                                             |
| ------------------------- | -------: | ---------------------------------------------------------------------------------- |
| Unit                      |      yes | time windows, projection, eligibility fail-closed, rule wording                    |
| Integration               |      yes | proactive E2E on the real app (scenarios A–P)                                      |
| API                       |      yes | /skills/proactive/* via HTTP                                                       |
| Playwright                |      yes | proactive browser E2E (inbox, ack, changes, signal→skill, resume, briefing, roles) |
| Persistence after refresh |      yes | ack / watermark survive refresh (audit facts)                                      |
| Agnos action registry     |      yes | skills reused through the Agno interpreter                                         |
| Voice simulation          |      yes | Phase 5 voice regression                                                           |
| OCR/import test           |       no | extraction prompt wording only (provider check)                                    |
| Security/privacy scan     |      yes | scope leakage, injection, admin feed, independent QA                               |

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

- Scope leakage through a collector → scope inside every query, leakage tests (A, B, F, N + browser).
- Alert fatigue → grouping per resident/day and per slot, ack per revision.
- AI over-reach → one call per briefing, templated facts only, composer post-check, fallback.
- Polling cost → bounded queries on existing indexes, 60 s / 120 s refresh.

## Gate Status

READY FOR IMPLEMENTATION
