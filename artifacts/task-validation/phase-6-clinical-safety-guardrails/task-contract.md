# Task Contract

## Task

- Title: Phase 6 clinical safety guardrails
- Slug: phase-6-clinical-safety-guardrails
- Type: hardening
- Date: 2026-10-01
- Source: `.ai-prompts/PROMPT_6_CLINICAL_SAFETY_GUARDRAILS.md` (user request 2026-10-01); handoff `.ai-architecture/phase-5-voice/PROMPT6_HANDOFF.md`
- Branch: `feat/phase6-safety` (from origin/main bc46c82f; Phase 5 Azure iteration #393 unmerged = residual blocker)

## Impact Classification

| Area                 |                                                                          Impacted |
| -------------------- | --------------------------------------------------------------------------------: |
| Frontend/UI          |             possibly (result integrity, session transitions — minimal fixes only) |
| Backend/API          | yes (guards/validation/idempotency fixes where gaps are found; adversarial suite) |
| Database/Persistence |                  possibly (idempotency/audit integrity only if a gap requires it) |
| Agnos AI / Chatbot   |            yes (prompt-injection defenses for LLM consumers of untrusted content) |
| Voice                |                                  yes (voice safety verification, no new features) |
| OCR / Import         |                                yes (malicious document → no authorization effect) |
| Auth / Permissions   |      yes (fail-closed, TOCTOU recheck, role change, stale policy, forged payload) |
| Privacy / Security   |                                  yes (leakage, error disclosure, audit integrity) |
| Config / Env         |                                                            no new config expected |

## Current Behaviour

Phases 1–5 deliver Tool Layer, policy, resident scope, skills, Assistant and voice with many
safety checks, but no consolidated threat model, adversarial matrix or release-hardening pass.

## Expected Behaviour

A documented threat model and ≥30 adversarial scenarios executed against the real backend (and
browser where relevant); every critical gap fixed minimally (fail-closed, recheck before commit,
idempotency, result integrity, injection defenses, leakage) without lowering security criteria and
without regressions in Prompts 1–5 and the classic GUI.

## Acceptance Criteria

- AC1: threat model covering identity, authorization, resident, agent, voice, prompt injection, backend, audit.
- AC2: ≥30 adversarial scenarios (precondition, attack, expected, backend enforcement, audit, status, evidence), executed.
- AC3: no known critical authorization bypass; TOCTOU (capability + scope) rechecked before commit; fail-closed on identity/policy/scope failures.
- AC4: wrong-patient, voice safety, auto-confirm, idempotency, result integrity, provider failure, data leakage, error disclosure tests pass.
- AC5: prompt injection in data/tool output/transcripts cannot override policy or authorize actions.
- AC6: audit reconstructs actions (identity, role, resident, skill, tool, confirmation, origin, outcome); append-only.
- AC7: regression Prompts 1–5 + classic GUI pass; artefacts + PROMPT7_HANDOFF complete.

## Test Plan

| Test type                 | Required | Reason                                                                 |
| ------------------------- | -------: | ---------------------------------------------------------------------- |
| Unit                      |      yes | guards, validators, sanitizers added by fixes                          |
| Integration               |      yes | adversarial suite against the real Express app + Postgres (local only) |
| API                       |      yes | direct tool/route attacks, forged payloads, TOCTOU, idempotency        |
| Playwright                |      yes | wrong-patient / session transitions / result integrity in the browser  |
| Persistence after refresh |      yes | DB write counts and audit rows verified directly                       |
| Agnos action registry     |      yes | LLM output cannot select forbidden skills/tools                        |
| Voice simulation          |      yes | voice safety scenarios (fake STT / fixtures)                           |
| OCR/import test           |      yes | malicious document content                                             |
| Security/privacy scan     |      yes | independent QA certification                                           |

## Evidence Plan

Required evidence:

- validation-report.md
- adversarial suite output + ADVERSARIAL_TEST_MATRIX.json
- regression outputs (backend full, frontend, runtime, browser)
- `.ai-architecture/phase-6-safety/SECURITY_TEST_REPORT.md`

## Risks

- Hardening could break authorized flows → full regression after every fix.
- Production `AUTH_MODE` unset (owner decision) — not changed here; documented.

## Gate Status

READY FOR IMPLEMENTATION
