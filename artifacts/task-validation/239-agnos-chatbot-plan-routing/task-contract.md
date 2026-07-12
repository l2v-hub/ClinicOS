# Task Contract — Issue #239 (Agnos chatbot plan routing, ported onto main)

## Scope
Port the #239 fix onto **current `main`** via a scoped branch and produce the
objective Playwright evidence Codex flagged as missing (`playwright-report/` +
`test-results/`), exercising the **real chatbot runtime path** on the ported code.

Branch: `fix/239-rooms-occupancy-port` (from `origin/main`), commit `9167943`.

## What #239 fixes (as ported to main)
Codex blocking finding: "PR #254 does not contain rooms_occupancy, the plural
terapie correction, aggregate room data dispatch." On investigation, current
`main` already carried the delegation, the expanded `READ_VERB`, the plural
`terapie` stem, and both regression tests (later 016-F work superseded the old
`6a3d984` base). The only genuinely missing piece — the aggregate
`rooms_occupancy` intent + dispatch — is added by commit `9167943`.

## Acceptance criteria
- **AC1** — Chatbot question «quante camere sono occupate oggi» is routed to the
  deterministic `rooms_occupancy` intent and answered with **aggregate counts
  only** (total/occupied/free beds, occupancy %), rendered in the Agnos panel.
- **AC2** — The occupancy answer leaks **no patient name/identifier** (counts only).
- **AC3** — Plural «che terapie ha in corso» (with a patient in context) is routed
  to the `therapies` intent and returns the patient's therapies (>0 results).
- **AC4** — No console errors; no relevant HTTP 4xx/5xx (401/403 auth-gate excluded).
- **AC5** — Evidence bundle present: `playwright-report/`, `test-results/`
  (trace + video), final result screenshot.

## Chosen QA surface
The **live Agnos chatbot** (`AgnosPanel`, mounted globally in `App.tsx`), which
POSTs to `/ai/actions/plan` → `orchestrate` delegates the read → `assistantQuery`
→ deterministic `planQuery`. This is the exact runtime path #239 corrects. No
Azure/LLM credentials are required: the assistant's default mode is
`deterministic` (no model call), so the routing is exercised faithfully offline.
`AI_FACILITY_QUERIES_ENABLED=true` is set on the backend so the facility-read
gate (`canFacilityRead`) permits the aggregate occupancy read.

## How success is asserted
Playwright drives the browser against the running stack (`:5173` UI, `:3001`
ported backend), opens the Agnos panel, submits each question, waits for the
rendered read-answer, and asserts on the **visible** result text
(`.ai-asst__source-text` = "1/4 letti occupati; 3 camere censite",
`.ai-asst__source-label` = "Occupazione camere", `.ai-asst__count`), plus
console/HTTP guards. Synthetic seed data only; no PHI.

## Governance
Claude produces code + evidence only. Decision is one of READY FOR CODEX QA /
BLOCKED / FAILED VALIDATION. Claude does not close the issue, merge, or deploy.
