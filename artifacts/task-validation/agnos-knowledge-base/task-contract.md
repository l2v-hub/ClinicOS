# Task Contract — Agnos Knowledge Base (feat/agnos-kb)

**Spec:** docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md
**Piano:** docs/superpowers/plans/2026-07-10-agnos-knowledge-base.md (9 task TDD)
**Base:** origin/main 4ff2249 · **Branch:** feat/agnos-kb

## Scope
7 nuovi intent read Agnos (vitals_compare, vitals_trend, rooms_occupants, consegne, diary_notes, clinical_scores, operators_on_duty) + rooms_occupancy aggregato; planning LLM-first (llm-planner esistente) con guardie deterministiche e fallback; motore confronti backend-only; esito `clarify` con chips template; turni operatori persistiti (OperatorShift, migration additiva); chips frontend.

## Impatti
Frontend: sì (AgnosPanel chips, App.tsx schedules) · Backend: sì (assistant/gateway/routes) · DB: sì (OperatorShift additiva) · Agnos/LLM: sì · Voice: no (invariata) · OCR: no · Auth: operators_on_duty disponibile a entrambi i ruoli (decisione 2026-07-10: dato organizzativo non clinico; gate admin-only rimosso da queryOperators) · Privacy: aggregato camere senza nomi; occupanti = stessa disclosure UI; no PHI nei log.

## Invarianti non negoziabili
Delete sempre rifiutato; write terapie/allergie rifiutati; refuse_clinical intatto; patientId autoritativo server-side; SOURCE_ONLY; LLM mai fa matematica; LLM mockato nei test.

## Validazione finale
Test unit per modulo + regressione completa backend + build FE/BE + evidenza Playwright 10 scenari → validation-report.md con decisione basata sui test. Esito massimo dichiarabile: READY FOR CODEX QA (Codex Gate).
