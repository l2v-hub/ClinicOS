# Validation report — Issue #239 (Agnos chatbot plan routing, ported onto main)

**Final Decision: READY FOR CODEX QA**

Branch `fix/239-rooms-occupancy-port` from `origin/main`. Scoped port commit
`9167943` (feature) + this evidence commit. Claude does not close, merge, or
deploy — Codex remains the sole QA Gatekeeper.

## Codex blocking findings → disposition

| Codex finding | Disposition |
|---|---|
| "PR #254 does not contain rooms_occupancy, the plural terapie correction, aggregate room data dispatch" | **Resolved.** Ported onto current main via `9167943`. Investigation showed main already carried the read-delegation, the expanded `READ_VERB`, the plural-`terapie` stem, and both `actions.test.ts`/`assistant-plan.test.ts` regression tests (016-F work superseded the old `6a3d984` base). The only genuinely missing piece — the aggregate `rooms_occupancy` intent + `query_rooms_occupancy` dispatch — was added. See `../../.superpowers/sdd/port-239-report.md`. |
| "The remediation must be rebased or ported onto current main and reviewed through a scoped PR." | **Resolved.** Scoped branch off `origin/main`, scoped PR opened (backend AI routing only). |
| "Required evidence directories playwright-report/ and test-results/ are absent." | **Resolved.** Present in this bundle (see below), from a live-UI Playwright run. |

## Acceptance criteria

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 occupancy → aggregate `rooms_occupancy` | PASS | `screenshots/rooms-occupancy.png` — answer "1/4 letti occupati; 3 camere censite", label "Occupazione camere", Fonte OCCUPANCY. Spec asserts `.ai-asst__source-text` matches `^\d+/\d+ letti occupati; \d+ camere censite$`. |
| AC2 no patient name/id in occupancy answer | PASS | spec asserts none of the seed surnames appears in the drawer body; screenshot confirms counts only. |
| AC3 plural «che terapie ha in corso» → therapies | PASS | `screenshots/result.png` — patient Moretti Elena in context, multiple `Fonte: THERAPY` sources; spec asserts `.ai-asst__count` = "N risultati" and no "Informazione non trovata". |
| AC4 no console errors / no relevant 4xx-5xx | PASS | spec `page.on('console')` + `page.on('response')` guards (401/403 excluded); run green. |
| AC5 evidence bundle complete | PASS | paths below. |

## Runtime path exercised (the real one #239 corrects)

`AgnosPanel` (mounted `frontend/src/App.tsx:1151`) → `POST /ai/actions/plan`
→ `backend/src/ai/actions/orchestrate.ts` delegates the read →
`backend/src/ai/assistant/service.ts` `assistantQuery` → deterministic
`planQuery` (`backend/src/ai/assistant/plan.ts`). Assistant default `mode` is
`deterministic` — **no Azure/LLM call**, so routing is exercised faithfully
offline. `AI_FACILITY_QUERIES_ENABLED=true` on the backend so `canFacilityRead`
permits the aggregate occupancy read; the same gate refuses it when unset
(security-consistent with the 016-F3 facility-read convention).

## Test / build gates (from the port)

- `backend` unit suite **317/317** green (incl. `assistant-plan.test.ts` 23/23
  with the new `rooms_occupancy` test, `actions.test.ts` 45/45).
- `npm --prefix backend run build` exit 0.
- Playwright `issue-239.spec.ts` **1/1** passed against the live stack
  (:5173 UI / :3001 ported backend).

## Evidence paths (real, in this commit)

- `artifacts/task-validation/239-agnos-chatbot-plan-routing/task-contract.md`
- `artifacts/task-validation/239-agnos-chatbot-plan-routing/screenshots/rooms-occupancy.png` (AC1/AC2 result)
- `artifacts/task-validation/239-agnos-chatbot-plan-routing/screenshots/result.png` (AC3 result)
- `artifacts/task-validation/239-agnos-chatbot-plan-routing/playwright-report/index.html`
- `artifacts/task-validation/239-agnos-chatbot-plan-routing/test-results/.../trace.zip`
- `artifacts/task-validation/239-agnos-chatbot-plan-routing/test-results/.../video.webm`
- Test: `e2e/remediation/issue-239.spec.ts` · config `e2e/remediation/pw.config.239.ts`

## Privacy

Synthetic seed data only (Moretti Elena fixture; occupancy is aggregate counts).
No PHI, no secrets, no `DATABASE_URL` in logs or evidence.
