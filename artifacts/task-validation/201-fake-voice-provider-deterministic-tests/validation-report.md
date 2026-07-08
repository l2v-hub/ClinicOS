# Validation Report — Issue #201 "Test provider voce fake"

- Slug: 201-fake-voice-provider-deterministic-tests
- Branch: `fix/issue-201-fake-voice-provider` (base `origin/main` @ `b5c06c4`)
- Date: 2026-07-06
- Mode: B (CI-gate evidence; no local app run / no Playwright — nessuna UI)
- Governance: Claude implementa+evidenzia; **Codex QA gate** decide chiusura. Claude NON chiude/merge/deploy.

## Change

- `backend/src/ai/voice/provider.ts` — seam `VoiceSttProvider` (probe capability STT, con AbortSignal) +
  doppio di test `FakeVoiceSttProvider` (modalità `success` / `failure` / `timeout`) + helper
  `probeSttStatus(provider, cfg, {timeoutMs})` che mappa l'esito in `SttStatus` (available oppure
  degraded+reason su capability mancanti / errore / timeout). **Nessuna** modifica a runtime/route:
  `sttStatus()` resta invariato; la seam serve i test ora e il futuro wiring runtime.
- `backend/src/ai/__tests__/voice-provider.test.ts` — 5 test deterministici (+ registrato in `package.json`).

## Acceptance Criteria — verifica una per una

| AC | Come verificato | Esito |
|---|---|---|
| AC1 Tests do not require live provider credentials | i test usano solo `FakeVoiceSttProvider`; nessun env/segreto; nessuna rete | PASS |
| AC2 Fake provider covers success/failure/timeout | 3 modalità + test dedicati: success→available, failure→degraded(errore), timeout→degraded(timeout); + capability mancanti; + no-model short-circuit | PASS |
| AC3 No secrets needed in CI | test unit puri, deterministici, offline | PASS |

## Test eseguiti (evidenza)

- `voice-provider.test.ts`: **5/5 PASS** (`test-results/voice-provider.txt`).
- Non-regressione: `voice.test.ts` + `actions.test.ts` + `voice-provider.test.ts` = **68/68 PASS**.
- `provider.ts` importa solo da `voice/config.ts` (esistente): nessun impatto su altri moduli.

## Cosa resta al CI gate

- `npm run build` (`prisma generate` + `tsc`) + suite completa su runner con toolchain/DB provisionati (mode B).
- Deploy non pertinente (aggiunta test/seam; nessun runtime prod modificato).

## Final Decision

IMPLEMENTED — VERIFIED (5/5 test verdi; AC1/AC2/AC3 soddisfatte; 68/68 senza regressioni nei test DB-free).
Build completo + suite su DB provisionato + eventuale deploy → **Codex QA gate**. Claude non chiude l'issue.
