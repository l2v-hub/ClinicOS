# Phase 9 — Privacy and Retention

This maps data flows and the minimum-necessary decisions taken in code. It does **not** claim
legal compliance (GDPR/DPIA, processor agreements and retention periods are organisational
decisions — listed in §4).

## 1. Data map

| Flow                                 | Data                                                                                                                                                                         | Destination                                          | Minimisation in code                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Skill routing (every Assistant turn) | the operator's message (≤ `MAX_TEXT`), today's date, pending slot, the AUTHORIZED skill list (id, name, description, slots) + forbidden skill ids/names, ≤200-char role hint | AI runtime → Azure OpenAI                            | no resident record, no history; patient only as the words the user typed                       |
| Assistant plan                       | question only                                                                                                                                                                | runtime → LLM                                        | no clinical data                                                                               |
| Assistant compose                    | query RESULTS (clinical) + sources                                                                                                                                           | runtime → LLM                                        | only when `AI_ASSISTANT_COMPOSE_ENABLED`; post-check anti-invention                            |
| Shift briefing                       | fixed-template facts of already-authorized signals (no free text written by users)                                                                                           | runtime → LLM (≤1 call, cached on identical context) | P7 contract                                                                                    |
| Voice                                | one utterance audio (base64) in memory                                                                                                                                       | runtime → Google STT (Gemini)                        | never stored or logged (bytes count only); transcript shown for review, then same path as text |
| Document import                      | uploaded pages                                                                                                                                                               | runtime → OCR/extraction providers                   | P1/REQ-019 retention sweep (`AI_JOB_RETENTION_MIN`)                                            |
| Logs (backend)                       | route shape, status, latency, error code, ids of requests/audit                                                                                                              | Railway logs                                         | ids collapsed, no bodies/query/prompt/names (tested)                                           |
| Logs (runtime)                       | provider, deployment, correlationId, duration, sizes, exception TYPE                                                                                                         | Railway logs                                         | no prompt/transcript/response                                                                  |
| Metrics                              | counters/histograms by area/code/kind                                                                                                                                        | `/metrics` (token)                                   | no resident/operator ids (tested)                                                              |
| Audit                                | actor, action, resident id, field NAMES, outcome                                                                                                                             | Postgres `AiAuditEvent` (append-only)                | PHI-safe by API shape (`recordOperationalAudit`)                                               |
| Proactive state                      | seen watermarks / acks (audit rows), briefing cache (memory)                                                                                                                 | Postgres / process                                   | P7                                                                                             |
| Copilot                              | profile (no data), recent activity from audit                                                                                                                                | —                                                    | P8                                                                                             |

## 2. Phase 9 changes affecting privacy

- Runtime no longer returns exception/provider text to the caller (500/502 generic) and logs only
  the exception type for plan/compose (provider error bodies may echo prompt content).
- New telemetry is structurally redacted (`logEvent` key filter, `routeShape`).
- `X-Request-Id` values are validated (no free text can be smuggled into logs through the header).

## 3. Retention (as implemented)

| Data                       | Retention today                                  | Mechanism                                                   |
| -------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Audio                      | 0 (request lifetime)                             | memory only                                                 |
| Voice transcripts (server) | `AI_VOICE_TRANSCRIPT_RETENTION_DAYS` config (P5) | voice config                                                |
| Import jobs/files          | `AI_JOB_RETENTION_MIN` sweep every 15 min        | `server.ts` sweep                                           |
| Skill workflows            | 30 min TTL, memory                               | `skills/store.ts`                                           |
| Simulator revocations      | until token expiry, memory                       | `authz/simulator.ts`                                        |
| Audit                      | unbounded (append-only triggers)                 | DB-ops procedure required (drop trigger → purge → recreate) |
| Railway logs               | platform retention (plan-dependent)              | external                                                    |

## 4. Organisational decisions required (not invented here)

1. Lawful basis / DPIA for sending clinical query results (compose) and briefing facts to Azure
   OpenAI and audio to Google — data residency (EU region of the Azure deployment), processor
   agreements.
2. Audit retention period and the purge procedure owner.
3. Log retention on Railway (plan) and whether logs may leave the EU.
4. Google STT vs Azure STT (P5 PR #393 unmerged) — residency of audio processing.
5. R7-2: classic Note/Consegne screens show residents outside the reader scope (product decision).

## 6. Data per provider (Phase 9 provider abstraction)

| Provider                                | Data sent (by role)                                                                                                                                              | Retention / residency config in code                                                                            | Notes                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| OpenAI Direct (primary)                 | COMMAND_PARSER: message + authorized skill list; REASONING: question; SUMMARY: query results / briefing facts; VISION: document images/PDF; STT: utterance audio | Responses API with `store=False`; organisation/project data controls and region are account settings (not code) | DPA / residency decision required before real clinical data |
| Azure OpenAI (legacy, fallback-capable) | same as above                                                                                                                                                    | deployment region (germanywestcentral observed)                                                                 | current production until switch                             |
| Google Gemini (STT today)               | utterance audio                                                                                                                                                  | API key project settings                                                                                        |                                                             |
| Mistral / Azure DocIntel (OCR)          | document pages                                                                                                                                                   | unchanged scope                                                                                                 |                                                             |
| test / mock                             | nothing leaves the process                                                                                                                                       | —                                                                                                               | CI, switch tests                                            |

Fallback implication: enabling `AI_FALLBACK_PROVIDER` sends the same data to a second processor — an
organisational decision, off by default. Minimum-necessary context is unchanged by the abstraction.

## 7. Data flow after the OpenAI Direct cutover (Phase 9B)

`Browser → clinicos-backend (Railway) → clinicos-ai-runtime (Railway) → OpenAI API (api.openai.com)`

| Stream                            | What reaches OpenAI                                                                               | Model (config)                                 | Notes                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Chat text / structured commands   | the operator's message (≤ MAX_TEXT), authorized skill list, ≤ 200-char role hint                  | `gpt-5.6-luna` (COMMAND_PARSER)                | no resident record, no history                |
| Read planning                     | the question                                                                                      | `gpt-5.6-sol` (REASONING)                      | no clinical data                              |
| Grounded answers / shift briefing | query results / fixed-template facts                                                              | `gpt-5.6-luna` (SUMMARY)                       | only when `AI_ASSISTANT_COMPOSE_ENABLED`      |
| Document import                   | page images / PDF                                                                                 | `gpt-5.6-luna` (VISION via `AI_MODEL_DEFAULT`) | review before save                            |
| STT audio                         | one push-to-talk utterance (≤ 2 MB) + ≤ 300-char vocabulary hint                                  | `gpt-transcribe`                               | never stored or logged by ClinicOS            |
| Transcript                        | returned to the operator for review; then a chat-text turn                                        | —                                              | stored only per voice retention settings (P5) |
| Telemetry                         | none to OpenAI; internal logs/metrics carry provider, role, model, tokens, seconds, estimated USD | —                                              | no prompt, audio, transcript or key           |

Responses API calls use `store: false`. OpenAI-side retention / zero-data-retention / region are
organisation settings (OpenAI console, DPA) — **not verified here**; no compliance is claimed.
The OCR scope still sends document pages to Mistral on the Azure resource (unchanged by decision).
