# Task Contract

## Task

- Title: Diary therapy preview AI fallback
- Slug: diary-therapy-preview-ai-fallback
- Type: feature
- Date: 2026-09-30
- Source: user report 2026-09-30 — "Terapia techipirina 1000mg ogni 8ore parte dalle 8.00" in Diario Paziente: first 404 (demo backend on old code — fixed by deploying main to the Railway demo environment), then the preview understands nothing. Approved rule 2026-09-29 (memory project_diario_terapia_rules): deterministic rules first, AI proposes when they are not enough, never invent data.
- Branch: `feat/diario-terapia-ai-fallback` (from origin/main eef539f1)

## Impact Classification

| Area                 |                                                                             Impacted |
| -------------------- | -----------------------------------------------------------------------------------: |
| Frontend/UI          |                                                 yes (notices for AI-proposed fields) |
| Backend/API          |         yes (therapy-preview may call the AI runtime; response adds optional fields) |
| Database/Persistence |                                                                                   no |
| Agnos AI / Chatbot   |                                           yes (runtime extraction unit, gpt-6.1-sol) |
| Voice                |                                                                                   no |
| OCR / Import         |                                                                                   no |
| Auth / Permissions   |                                                           no (same route/capability) |
| Privacy / Security   | yes (diary text sent to the AI runtime, as already done for documents; never logged) |
| Config / Env         |                                      yes (optional DIARY_THERAPY_AI=off kill switch) |

## Current Behaviour

therapy-preview uses only the deterministic parser: typos ("techipirina"), "8ore", "ogni 8 ore dalle 8.00" produce an empty row with `testo_non_classificato`.

## Expected Behaviour

When the deterministic result misses drug, dose or times (and the intent is a prescription), the
backend asks the AI runtime (text-only extraction, JSON schema) for a proposal; only EMPTY fields
are filled, times are validated HH:MM, fascia conflicts recomputed, the row stays `da_verificare`,
the response lists `aiFields` and `aiNotes` (typo corrections/doubts) and the UI flags them. AI
unavailable/slow → deterministic preview + warning, never an error.

## Acceptance Criteria

- AC1: "Terapia techipirina 1000mg ogni 8ore parte dalle 8.00" → preview with drug (TACHIPIRINA), dose 1000 mg, times 08:00/16:00/00:00 proposed by AI and flagged.
- AC2: deterministic fields are never overwritten by the AI; invalid AI values are discarded.
- AC3: AI failure/timeout → 200 with deterministic preview and `ai_non_disponibile` warning.
- AC4: blocking intents (sospensione/somministrazione/modifica) and fully parsed texts do not call the AI.
- AC5: backend + frontend suites without new failures; builds pass; verified on the deployed environment.

## Test Plan

| Test type                 | Required | Reason                                                                   |
| ------------------------- | -------: | ------------------------------------------------------------------------ |
| Unit                      |      yes | needsAiFallback, mergeAiProposal (injected proposer)                     |
| Integration               |      yes | route with injected proposer (no network)                                |
| API                       |      yes | demo/prod backend after deploy with the user's text                      |
| Playwright                |       no | UI change limited to notices (unit-tested); API evidence on deployed env |
| Persistence after refresh |       no |                                                                          |
| Agnos action registry     |       no |                                                                          |
| Voice simulation          |       no |                                                                          |
| OCR/import test           |       no |                                                                          |
| Security/privacy scan     |      yes | no clinical text in logs                                                 |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- API output on the deployed environment (synthetic patient text)

## Risks

- Latency of the runtime job (bounded by a timeout, falls back to deterministic).
- AI hallucination: mitigated by fill-only-empty, validation, `da_verificare`, explicit flags.

## Gate Status

READY FOR IMPLEMENTATION
