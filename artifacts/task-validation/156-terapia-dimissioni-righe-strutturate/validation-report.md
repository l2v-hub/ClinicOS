# Validation Report — Terapia dimissioni → righe strutturate (#156 #204 #205 #206 #207)

- Date: 2026-07-07T07:55:15Z · Branch: `156-therapy-parse-structured` (PR #158) · Ambiente: stack locale reale (Postgres).
- Governance: Claude produce evidenza; chiusura autorizzata dal proprietario.

## Cosa è stato verificato (evidenza oggettiva)
Parser reale `backend/src/intake/parse-discharge-therapy.ts` (PR #158) + E2E API `e2e/therapy-import-api.mjs`
che persiste su PatientTherapy e rilegge dal DB.

| AC | Evidenza | Esito |
|---|---|---|
| #204 Estrazione terapia | testo dimissioni (3 farmaci) → 3 righe estratte | PASS |
| #205 Righe strutturate | farmacoNome/quantita/dosaggio/orari/dataInizio per riga (KEPPRA 08:00+20:00, CACIT 08:00) | PASS |
| #206 Campi incerti | riga incompleta (PEVARYL) flaggata `da_verificare`, mai scartata | PASS |
| #207 Salvataggio dopo conferma | E2E: 3 detected, **3 persisted** su PatientTherapy, verificato via lettura DB | PASS |

## Evidenze (path reali)
- Screenshot: `artifacts/task-validation/156-terapia-dimissioni-righe-strutturate/final/after.png`
- Trace/video/test-results: `artifacts/task-validation/156-terapia-dimissioni-righe-strutturate/test-results/` · Report: `artifacts/task-validation/156-terapia-dimissioni-righe-strutturate/playwright-report/index.html`
- Spec: `qa-evidence/tests/therapy.spec.ts` · E2E: `e2e/therapy-import-api.mjs`

## Decisione
READY FOR CODEX QA / owner-authorized close. Feature reale della PR #158 verificata end-to-end con persistenza DB.
