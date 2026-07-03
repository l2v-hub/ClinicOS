# Deployment manifest — SPEC-015 Agnos AI unificato (CRU, no Delete) + UX/Performance

**Stato**: PENDING — branch `015-agnos-unified-cru` completo e validato in locale; PR verso `main` aperta.

## Contenuto

- SPEC-015 (specs/015-agnos-unified-cru/): orchestratore Agnos unificato testo+voce,
  allowlist CRU deny-by-default (0 azioni delete), audit AI persistente (`AiAuditEvent`),
  voce nel pannello (STT/TTS it-IT), appuntamenti agenda persistiti (REST + azioni AI
  create/update), quick-wins UX/performance (dedup fetch, memo, stati saving).

## Commit inclusi (branch 015-agnos-unified-cru)

- d65c9fb spec(015), 29a805d plan(015), 50b9635 tasks(015)
- ffe59a5 feat(015-A) orchestratore + pannello CRU
- dae7cea feat(015-B) audit persistente + prova no-delete
- 6712b9c feat(015-C) voce + TTS
- 615df46 perf(015-E1) memo/saving/catch
- 598c153 feat(015-D) appuntamenti persistiti + Agnos
- (successivi) perf(015-E2) dedup cachedGetJson; test(015-F) suite E2E + evidenze

## Gate e validazione

- Backend: 210/210 test. Frontend: `tsc -b && vite build` verde.
- Suite Playwright `e2e/agnos-cru.mjs`: **15/15 PASS** — evidenze (screenshot, trace.zip,
  video, report.json) in `requirements/evidence/SPEC-015/e2e/`.
- Performance: `requirements/evidence/SPEC-015/perf-confronto.md` (duplicati 4→0,
  dettaglio paziente −40%).

## Vincoli deploy

- La migrazione Prisma `20260703225843_ai_audit_event` (ADDITIVA) va applicata al
  Postgres Railway PRIMA del deploy backend.
- Deploy backend Railway NON eseguibile da questa macchina (Zscaler TLS — vedi memoria
  progetto); richiede GitHub Actions o altra postazione dopo il merge su main.
- Deploy frontend Vercel (`vercel deploy --prod --archive=tgz --yes` da root) va fatto
  SOLO insieme/dopo il backend: la UI ora chiama `/appointments` e `/ai/actions/*`.
