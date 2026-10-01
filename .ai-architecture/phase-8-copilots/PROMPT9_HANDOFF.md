# PROMPT 9 — Handoff from Phase 8 (Role-Specific Copilots) → Production Hardening

Read with `.ai-architecture/CURRENT_STATE.json` (phase 8), `phase-7-proactive/PROMPT8_HANDOFF.md`
and `phase-6-safety/PROMPT7_HANDOFF.md` (invariants still binding).

## 1. Copilot architecture

`COPILOT_ARCHITECTURE.md`: Identity → Role → Policy → Resident Scope → Shared Assistant → Role
Experience Profile → Shared Skills → Shared Tools. One assistant, one skill engine, one Tool Layer,
one voice channel, one proactive engine; the profile is presentation only.

## 2. Role Experience Profile schema

`backend/src/copilot/profiles.ts` (`RoleProfile`): `label, primaryGoals, commonWorkflows, density,
landing, emphasis, confirmationUx, escalation, terminology{resident,focus}, assistantHint (≤200),
starterOrder, startersFromProfileOnly, shortcuts[{id,kind,label,skillId|intro+steps|tab|screen+
requiresCapability, phrases}], signals{preferredEventTypes, defaultTab, maxVisible},
briefing{focus,maxFacts}, sections`. Bundled `role-profiles.json`; override with
`COPILOT_PROFILES_FILE` (validated: unknown skills/events dropped, authorization-like keys refused).
Baseline matrix: `ROLE_EXPERIENCE_MATRIX.json` (regenerate with `scripts/copilot/export-profiles.mts`).

## 3. Contracts

- Role home + round: `ROLE_HOME_CONTRACT.md` (`GET /skills/copilot/home`, `GET /skills/copilot/round`).
- Composite workflows: `ROLE_WORKFLOW_CATALOG.json` (start_shift, resident_round + per-role shortcuts).
- Starter logic: deterministic ranking (profile → resident → signals → recent), authorized skills only.
- Proactive integration: Phase 7 inbox / briefing / change-since-last-view / Signal → Skill, presented
  per role (default tab, preferred order, density cap that never hides «alta»/«urgente», briefing
  focus and facts ordering).
- Voice integration: the reviewed transcript enters `submitText(…, 'voice')` = typed path; whole-phrase
  shortcuts from the profile; no mapping in the voice layer.
- Prompting: `COPILOT_PROMPTING_CONTRACT.md` (shared prompts + ≤ 200-char role hint + authorized subset).
- Context invalidation: `COPILOT_ARCHITECTURE.md` §5.

## 4. Current auth assumptions

- Identity sources: Role Simulator (HMAC token, demo/synthetic data, `AUTH_MODE=demo` +
  `ROLE_SIMULATOR_ENABLED`), demo headers (non-production only), Entra JWT (`requireEntraOperator`,
  used by the documents gate; `AUTH_MODE=entra` elsewhere fails closed where unimplemented).
- Role = ACTIVE policy assignment (`AuthzPolicyVersion`), legacy-role fallback for unassigned
  identities (R-03). Resident scope = `registered_by_me` for operators, `all` for admin/manager.
- **Production `AUTH_MODE` is unset → every clinical endpoint answers 503** (fail closed). Pending
  user decision (R-16).

## 5. Role Simulator dependencies

E2E (backend harness `login()`, all browser scripts) and the demo environment depend on the
simulator (`/auth/simulator/session`, identities SIM-ADMIN / SUPERVISOR-1 / DOCTOR-1 / NURSE-1 /
OSS-1). Token minting is unauthenticated (R-01) — acceptable only with synthetic data.

## 6. Gaps for production hardening

| Area           | Gap                                                                                                                                                            | Note                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication | no production identity provider wired end-to-end (Entra only on documents; `AUTH_MODE` unset in prod)                                                          | decide Entra rollout; remove simulator from production builds                                                                         |
| Authentication | Entra `preferred_username` auto-link (R-07)                                                                                                                    | review before rollout                                                                                                                 |
| Session        | simulator tokens: no revocation list; logout is client-side                                                                                                    | server-side session / short expiry                                                                                                    |
| Session        | in-memory stores per instance: Skills workflows (30-min TTL), GUI idempotency (24 h), briefing summary cache, profile cache                                    | multi-instance needs a shared store (DB / Redis)                                                                                      |
| Security       | `X-Tool-Origin` caller-declared (R-10); `confirmed:true` on raw `/tools` trusted for GUI (R-06)                                                                |                                                                                                                                       |
| Security       | classic Note / Consegne screens show residents outside the reader scope (R7-2)                                                                                 | product decision                                                                                                                      |
| Observability  | console logs only; audit table is the only structured trail (best-effort sink, R-17); no metrics, tracing or alerting; AI provider errors only in runtime logs | add metrics (latency, LLM calls, content-filter refusals, fallbacks), alerting on 5xx / 503 `authz_unavailable` / `scope_unavailable` |
| Observability  | the Azure content filter refused prompts silently for days (Phase 7 finding)                                                                                   | alert on `content_filter` / composed:false ratio                                                                                      |
| Data           | append-only audit grows unbounded (no retention procedure)                                                                                                     | DB-ops retention policy                                                                                                               |

## 7. Deployment assumptions

Backend (Railway, `node backend/dist/server.js`, pre-deploy `prisma migrate deploy`) and AI runtime
deploy automatically on merge to `main`; the demo backend needs a manual `railway up`; the frontend
deploys on Vercel (`clinicos__`). JSON configuration is bundled through imports (tsc copies imported
JSON to `dist/`). CI gate: ~19 pre-existing failing backend tests on main; roster-epoch suites run in
an isolated pass.

## 8. Cost / context baseline

Role hint ≤ 200 chars; skill list sent per role 908–2 934 chars (full catalog 3 099); home load
~0.3–0.5 s locally (1 inbox computation + availability + audit); briefing ≤ 1 LLM call (~8 s with
`azure:gpt-6.1-sol`, own 25 s timeout), reuse on identical context.

## 9. E2E / regression commands

```bash
# backend (backend/, local Postgres)
NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock DATABASE_URL=<local> npx tsx --test src/copilot/__tests__/*.test.ts
NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock DATABASE_URL=<local> npx tsx --test src/proactive/__tests__/*.test.ts src/safety/__tests__/adversarial.test.ts
# browser (Vite :5199, backend :3099 with production AI_ASSISTANT_* flags, runtime :8765)
npx tsx scripts/assistant/seed-assistant-demo.mts && npx tsx scripts/proactive/seed-proactive-demo.mts
node scripts/copilot/copilot-browser-e2e.mjs --out <dir>       # 27 checks
node scripts/proactive/proactive-browser-e2e.mjs --out <dir>   # 29
node scripts/safety/safety-browser-e2e.mjs --out <dir>         # 18
node scripts/assistant/assistant-browser-e2e.mjs --out <dir>   # 47
node scripts/voice/voice-browser-e2e.mjs --out <dir>           # 78 (DB without unread notes)
npx tsx scripts/copilot/export-profiles.mts                    # regenerate role matrices
python scripts/ai/prompt-filter-check.py <rule file>            # provider content-filter check
```

## 10. Production blockers (for Prompt 9 to resolve or accept)

1. Production identity: `AUTH_MODE` unset (clinical API 503) and no end-to-end Entra flow.
2. In-memory state on a single instance (workflows, idempotency, caches) — blocks horizontal scaling.
3. No observability/alerting beyond logs and the audit table.
4. Phase 5 Azure STT deployment (PR #393) still missing; Google STT active.

## 11. File / symbol entry points

`backend/src/copilot/{profiles,home,http}.ts`, `role-profiles.json`; `skills/engine.ts`
(`roleHint`), `skills/interpreter.ts`; `proactive/engine.ts` (`composeBriefing` role ordering);
runtime `agents/skill_router.py`, `domain/contracts.py`; frontend `components/assistant/{CopilotHome,
RoundPanel,ProactivePanel,AssistantMode}.tsx`, `assistantApi.ts` (`loadCopilotHome`,
`loadRoundResidents`, `matchShortcut`).

## 12. Constraints Prompt 9 must preserve

1. One shared assistant / engine / Tool Layer / voice / proactive engine — no per-role copies.
2. Profiles never grant: availability, scope and confirmation are decided per request by the
   backend; preference ≠ policy.
3. The «Conferma» button is the only commit path; composites and shortcuts reuse skills.
4. Policy changes take effect without prompt or profile edits.
5. Administrator: no implicit clinical feed or clinical write.
6. Phase 6 invariants (PROMPT7_HANDOFF §13) and Phase 7 constraints (PROMPT8_HANDOFF §13).
7. Keep the untrusted-data rule descriptive; re-run the provider filter check on any prompt change.
