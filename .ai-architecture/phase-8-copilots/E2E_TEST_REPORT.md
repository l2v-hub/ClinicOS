# Phase 8 — E2E Test Report

Date 2026-10-01 · branch `feat/phase8-copilots` · local embedded Postgres (fresh UTF8 databases),
never production. Evidence: `artifacts/task-validation/phase-8-role-specific-copilots/evidence/`.

## 1. Backend — real app (`backend/src/copilot/__tests__/copilot-e2e.test.ts`, 14/14)

| Id  | Scenario (Prompt 8 §22)                                                                                                              | Result |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| P   | profiles configurable + validated; unknown skills dropped; authorization keys refused; unknown role → neutral default; hints ≤ 200   | PASS   |
| A   | OSS home: only authorized starters / shortcuts / steps; round list only in the OSS scope                                             | PASS   |
| B   | nurse: starter → workflow → preview → «Conferma» → backend write → audit; recent activity                                            | PASS   |
| C   | doctor: «Prepara visita» steps = existing skills; overview read; prescription prepared HIGH_RISK, never written; «Continua» lists it | PASS   |
| D   | supervisor briefing: role focus, facility scope on the full fact list, AI context ⊆ authorized facts; nurse briefing stays in scope  | PASS   |
| E   | administrator: technical starters only, no resident, no round, clinical request not executable                                       | PASS   |
| F   | role change (policy): profile, shortcuts follow; a now-forbidden pending preview leaves «Continua» and the backend denies it         | PASS   |
| G   | resident switch cancels a pending sensitive workflow                                                                                 | PASS   |
| H   | policy update: capability revoked → shortcut / starter gone + backend deny                                                           | PASS   |
| I   | signals boost only authorized starters, coming from real signal actions                                                              | PASS   |
| J   | voice and text reach the same skill                                                                                                  | PASS   |
| K   | prompt efficiency: one shared router prompt + ≤ 200-char hint + authorized subset only (sizes in COPILOT_PROMPTING_CONTRACT §3)      | PASS   |
| L   | «Continua» never resumes a preview older than COPILOT_RESUME_MAX_MIN                                                                 | PASS   |
| M   | home audited, nothing clinical written                                                                                               | PASS   |

Adversarial suite (Phase 6, extended): **50/50** — new COP-01…06 (hostile profile file, round scope +
revocation, continue after revocation, admin no clinical promotion, prompt-text validation, urgent
fact never dropped by the role briefing cap). Matrix: 57 scenarios, 57 PASS.

Unit: runtime `RoleHintTests` (optional, bounded hint), frontend `copilotShortcut.test.ts` (same
whole-phrase match for text and voice; real requests never hijacked).

## 2. Browser — real Vite + backend + Agno + real compose model (`scripts/copilot/copilot-browser-e2e.mjs`, 28/28)

OSS: copilot home, ≤ 4 starters with no therapy/prescription, 56 px targets; «Inizia giro parametri»
→ only own residents → resident evident → step = existing vitals skill → preview → nothing written
→ «Conferma» → one write; close clears the resident; typed «inizia il turno» → shift briefing;
dictated «iniziamo il giro» (fake mic, real voice panel) → same round shortcut, mic usable again.
Role switch OSS → Doctor → Supervisor in one browser: doctor copilot («Prepara visita» → overview,
no write), no OSS context left; supervisor «Briefing struttura» (facility). Nurse: «Inizia giro
terapia» steps = nurse skills, vitals step → one write after «Conferma», audited; «Continua da dove
avevi lasciato» reopens the preview, still needing «Conferma». Administrator: configuration
shortcuts only, «Controlla configurazione ruoli» opens the classic screen. No console errors.

## 3. Usability gate (§23)

| Check                                  | OSS | Nurse | Doctor | Supervisor | Admin |
| -------------------------------------- | --- | ----- | ------ | ---------- | ----- |
| top tasks one click from home          | ✓   | ✓     | ✓      | ✓          | ✓     |
| current resident evident (bar + round) | ✓   | ✓     | ✓      | ✓          | n/a   |
| no forbidden actions shown             | ✓   | ✓     | ✓      | ✓          | ✓     |
| same confirmation UX                   | ✓   | ✓     | ✓      | ✓          | n/a   |
| classic GUI available                  | ✓   | ✓     | ✓      | ✓          | ✓     |
| role / copilot always named            | ✓   | ✓     | ✓      | ✓          | ✓     |

## 4. Regression

| Suite                                                                                                                               | Result                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Backend full suite, serial, fresh DB                                                                                                | 1694 tests, 1672 pass, 21 fail = the pre-existing baseline set, **0 new** |
| Phase 7 proactive browser                                                                                                           | 29/29                                                                                            |
| Phase 6 safety browser                                                                                                              | 18/18                                                                                            |
| Phase 4 Assistant browser (production AI flags)                                                                                     | 47/47                                                                                            |
| Phase 5 voice browser (real STT + Agno)                                                                                             | 78/78                                                                                            |
| Frontend `npm test`                                                                                                                 | 1001 tests, 992 pass, 9 fail = same pre-existing set                                                    |
| Frontend build / `tsc -b`, backend `tsc`                                                                                            | pass                                                                                             |
| Runtime unittest                                                                                                                    | 189/189                                                                                          |
| Provider content-filter check (real Azure): compose, plan, briefing, extraction + every role's briefing focus and skill-router hint | all OK                                                                                           |

## 5. Findings during the loop (fixed)

1. Administrator home filled with baseline-granted clinical reads → `startersFromProfileOnly`.
2. OSS targets 48 px → design-system token `--ds-control-h: 56px` on the minimal home.
3. Duplicate starter / shortcut → starters exclude shortcut skills.
4. Independent QA (FAILED VALIDATION → fixed → re-verification): role ordering could drop an
   urgent fact from the briefing (HIGH) → priority first, non-«normale» never capped; voice stuck
   after a non-skill shortcut (MEDIUM); adversarial suite / provider check / validation evidence
   missing (MEDIUM); classic shortcut without capability, prompt-text validation, audit noise,
   out-of-order home, round error / list limits (LOW).
5. Test D asserted on the capped AI context; on a busy DB routine facts are legitimately capped →
   scope asserted on the full fact list, AI context ⊆ facts.

## 6. Cost / context baseline (`evidence/performance-home.json`)

| Role          | home p50 / p95 | home payload | skills available | role-router context (chars) |
| ------------- | -------------- | ------------ | ---------------- | --------------------------- |
| OSS           | 21 / 98 ms     | 2.2 kB       | 11/16            | 2 117                       |
| Nurse         | 31 / 40 ms     | 3.3 kB       | 13/16            | 2 609                       |
| Doctor        | 25 / 30 ms     | 2.8 kB       | 13/16            | 2 604                       |
| Supervisor    | 20 / 34 ms     | 2.1 kB       | 15/16            | 2 934                       |
| Administrator | 12 / 30 ms     | 1.4 kB       | 6/16             | 908                         |

Full catalog for the router: 3 099 chars. Role-specific prompt text: ≤ 200 chars (hint) + ≤ 200
(briefing focus). No per-role prompt duplication. Home: 0 LLM calls.
