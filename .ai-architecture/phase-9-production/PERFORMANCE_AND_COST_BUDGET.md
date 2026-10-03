# Phase 9 — Performance, Context and Cost Budget

Monetary cost is not observable from the code (Azure/Google billing is external). The baseline is
measured in calls, characters (≈ tokens / 3.5 for Italian text + JSON) and audio bytes.

## 1. Context per role — one Assistant text turn (skill route request body)

Measured 2026-10-01 via the runtime stub (`test-results/context-per-role.json`):

| Role          | chars | ≈ tokens in | Phase 8 baseline (skill list only) |
| ------------- | ----: | ----------: | ---------------------------------: |
| OSS           | 2 641 |        ~755 |                              2 117 |
| Nurse         | 2 993 |        ~855 |                              2 609 |
| Doctor        | 2 997 |        ~856 |                              2 604 |
| Supervisor    | 3 191 |        ~912 |                              2 934 |
| Administrator | 1 700 |        ~486 |                                908 |

The difference to P8 is message + forbidden-skill ids/names + value keys + role hint. Already
minimal: only authorized skills carry descriptions/slots; unavailable skills are id+name only
(needed to answer DENIED explicitly); no history, no resident data, no signals. Safety/policy text
lives in the runtime prompt and is never truncated. No further reduction applied (gain < 300
chars per turn, risk to routing accuracy).

## 2. Cost baseline per unit of work

| Unit                                       | AI calls                                        | Context                                    | Notes                                                                       |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| Text turn (Assistant / Copilot)            | 1 skill-route                                   | 1.7–3.2k chars in                          | + 0 when deterministic handles a pending value or cancellation              |
| Voice utterance                            | 1 STT + 1 skill-route                           | audio ≈ 16–64 KB per utterance + text turn | rate-limited 20/min/operator                                                |
| Shift briefing                             | ≤ 1 compose                                     | ~1.9–2.2k chars (P7)                       | reused on identical context; cooldown `PROACTIVE_BRIEFING_COOLDOWN_S`       |
| Proactive inbox / copilot home / polling   | **0**                                           | —                                          | verified: load run with 2 600+ home/inbox requests produced 0 runtime calls |
| Common workflow «registra parametri»       | 1–2 skill-route (ask + fill) + 0 for «Conferma» |                                            | confirmation is deterministic                                               |
| Assistant facility query (`/ai/assistant`) | ≤ 1 plan + ≤ 1 compose                          |                                            | flags `AI_ASSISTANT_*`                                                      |

Amplification checks: no N+1 summaries (briefing is one call over the fact list), no repeated full
context (each turn is stateless for the LLM), polling never reaches the LLM, no retries on
interactive calls (fallback instead).

## 3. Latency / capacity (local, one Node process, AI stub at 400 ms) — see LOAD_TEST_REPORT.md

| Scenario            | c=10 p50 / p95 | c=40 p50 / p95   |
| ------------------- | -------------- | ---------------- |
| GUI patients page   | 31 / 79 ms     | 177 / 273 ms     |
| GUI patient detail  | 11 / 34 ms     | 148 / 235 ms     |
| Proactive inbox     | 30 / 69 ms     | 244 / 377 ms     |
| Copilot home        | 78 / 175 ms    | 900 / 1 329 ms   |
| Assistant read turn | 492 / 581 ms   | 1 507 / 1 978 ms |

## 4. Budgets (configurable)

| Budget                | Value                                    | Config                         |
| --------------------- | ---------------------------------------- | ------------------------------ |
| Role hint             | ≤ 200 chars                              | profile validation             |
| Message to router     | `MAX_TEXT`                               | `skills/interpreter.ts`        |
| AI calls per operator | 60/min across `/skills`, `/tools`, `/ai` | `AI_RATE_LIMIT_PER_MIN`        |
| STT per operator      | 20/min                                   | `VOICE_STT_RATE_LIMIT_PER_MIN` |
| Extractions           | `AI_MAX_EXTRACTIONS_PER_5MIN`            | cost guard                     |
| Briefing              | ≤ 1 call per cooldown                    | `PROACTIVE_BRIEFING_*`         |
| Retries               | ≤ 5 (validated)                          | `AI_MAX_RETRIES`               |

Token usage is not returned by the runtime for LLM calls (only Google STT reports usage) — the
character counter `clinicos_ai_request_chars_total` is the production proxy. Residual: add
provider `usage` to runtime responses to get exact tokens.

## 5. Real usage baseline through the provider-agnostic layer (2026-10-02)

Provider-reported tokens (normalized `Usage`), real Azure `gpt-6.1-sol` + Google STT, synthetic
fixtures (`clinicos-ai-runtime/tools/benchmark`). Monetary prices are applied outside the code
(tokens × the provider's current price list).

| Unit                                 | Role           |            Calls |                            Input tok / call | Output tok / call |                    Latency p50 | Notes                                                       |
| ------------------------------------ | -------------- | ---------------: | ------------------------------------------: | ----------------: | -----------------------------: | ----------------------------------------------------------- |
| Command parser (text turn)           | COMMAND_PARSER |                1 | ≈ 750–910 (est. from 2.6–3.2k chars, P9 §1) |           ≈ 20–40 |           2–4 s (browser runs) | benchmark: 13/13 RATE_LIMIT on the Azure deployment quota   |
| Read planner                         | REASONING      |              ≤ 1 |                                     **874** |            **54** | 46 s (rate-limited deployment) | 5/5 correct intents                                         |
| Clinical/proactive summary           | SUMMARY        |              ≤ 1 |                 **328** (small result sets) |            **39** |            54 s (rate-limited) | 3/3 grounded                                                |
| Shift briefing                       | SUMMARY        | ≤ 1 per cooldown |                  ≈ 550–650 (1.9–2.2k chars) |          ≈ 50–100 |                     7–8 s (P7) | reused on identical context                                 |
| Voice utterance                      | STT            | 1 (+1 text turn) |                    **≈ 291** (audio tokens) |          **≈ 12** |                          1.3 s | 5/5 transcripts ≥ 0.8 word accuracy (incl. silence → empty) |
| Role briefing / copilot home / inbox | —              |            **0** |                                           — |                 — |                              — | no AI on polling (load test)                                |

Cost guards: per-operator rate limit (60/min), `AI_DAILY_TOKEN_BUDGET` (process-level daily token cap →
normalized RATE_LIMIT → deterministic fallback), `AI_MAX_OUTPUT_TOKENS`, no hidden SDK retries,
≤ 1 repair call per extraction, no N+1 summaries. Expensive workflows: document import (VISION + OCR,
multi-page), briefing (largest SUMMARY context). Re-run the benchmark with OpenAI Direct when
`OPENAI_API_KEY` is set to obtain its baseline (same command, different variables).
