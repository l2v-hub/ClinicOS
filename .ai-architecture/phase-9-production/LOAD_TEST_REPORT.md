# Phase 9 — Load Test Report

**Environment (local, non-destructive):** one backend process (`node --import tsx src/server.ts`,
tier `demo`, NODE_ENV=production config path), embedded Postgres 18 (UTF8) with 304 synthetic
residents × 5 vitals, AI runtime **stub** (`scripts/production/ai-runtime-stub.mjs`, 400 ms latency —
no paid provider), Windows 11 dev machine. Role Simulator sessions for OSS / nurse / doctor /
supervisor (mixed roles). Script: `scripts/production/load-test.mjs`. Raw: `artifacts/task-validation/
phase-9-production-hardening/test-results/load*/`.

Scenario mix (weights): GUI patients page 30, GUI patient detail 20, `/auth/me` 10, Copilot home 12,
proactive inbox 13, Assistant read turn 15 (skill route on the stub). Writes are excluded here
(covered by concurrency/recovery tests).

## Run A — production limits (`AI_RATE_LIMIT_PER_MIN=60`)

| c   | total rps | GUI error % | `/skills/*`                                              |
| --- | --------: | ----------: | -------------------------------------------------------- |
| 10  |       446 |           0 | 97–98 % **429** (4 identities × ~60 req/s each ≫ 60/min) |
| 40  |       423 |           0 | idem                                                     |

Interpretation: the per-operator limiter protects the AI/skills surface from a single runaway
client; classic GUI throughput is unaffected (patients page 134 rps, p95 60 ms at c=10).
A human operator stays far below 60 AI requests/min.

## Run B — capacity (limiter raised to 1 000 000/min, same mix)

| Scenario            |       c=10 req | p50 | p95 | p99 |       c=40 req |   p50 |   p95 |   p99 |  errors |
| ------------------- | -------------: | --: | --: | --: | -------------: | ----: | ----: | ----: | ------: |
| GUI patients page   |          1 733 |  31 |  79 | 102 |          1 525 |   177 |   273 |   320 |       0 |
| GUI patient detail  |          1 111 |  11 |  34 |  48 |          1 096 |   148 |   235 |   281 |       0 |
| `/auth/me`          |            599 |   6 |  19 |  29 |            529 |    55 |   105 |   130 |       0 |
| Proactive inbox     |            733 |  30 |  69 |  92 |            645 |   244 |   377 |   440 |       0 |
| Copilot home        |            695 |  78 | 175 | 228 |            611 |   900 | 1 329 | 1 528 |       0 |
| Assistant read turn |            867 | 492 | 581 | 646 |            783 | 1 507 | 1 978 | 2 248 |       0 |
| **Total** (60 s)    | 5 738 (95 rps) |  30 | 510 | 573 | 5 189 (86 rps) |   197 | 1 582 | 1 944 | **0 %** |

ms. Error rate 0 % at both levels; no 5xx; RSS ≈ 270 MB.

**Saturation:** throughput plateaus at ~90 rps mixed (single Node event loop + pg pool default 10);
c=40 queues requests (p50 rises 6×) without errors. Copilot home is the heaviest read (inbox +
availability + audit-derived recent activity): p95 1.3 s at c=40.
**AI vs app latency:** Assistant turn = 400 ms stub + ~90 ms app at c=10; at c=40 app queueing
dominates (≈1.1 s).
**AI amplification:** 1 825 runtime calls for 1 825 successful Assistant turns; Copilot home and
inbox (2 600+ requests) produced **0** AI calls. Every runtime call carried `X-Request-Id`.

## Real-provider smoke (separate, small)

Browser regression on backend :3099 with the demo environment's real Agno runtime
(`azure:gpt-6.1-sol`): 21 real AI calls observed (`skill_route` 17, `briefing` 2, `assistant_plan` 1,
`assistant_compose` 1), all `ok`; one sampled skill route 3.7 s.

## Limits of this baseline

Local hardware, not Railway; DB on the same machine; stubbed AI. Re-run on staging with
`--base https://<staging>` and a staging `METRICS_TOKEN` before go-live; never against production
data. Horizontal scaling is not possible today (in-memory stores — see PRODUCTION_ARCHITECTURE §5).

## Provider abstraction (Phase 9)

Mass load continues to use the runtime stub / `test` provider (no paid calls). The provider switch
acceptance run (`provider-switch-acceptance.mjs`) exercised the full stack with the real OpenAI SDK
against an OpenAI-compatible stub and then with `AI_PROVIDER=test` (13/13). A small real-provider run
used the Azure deployment (≈ 30 calls): its token-rate quota, not the application, was the bottleneck
(429 on the command parser, 25–55 s planner latency) — measured, not load-tested further.
