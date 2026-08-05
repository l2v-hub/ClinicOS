# Task Validation Report

## Task
- Title: Disattivare cancellazione fisica e proteggere endpoint demo
- Slug: disattivare-cancellazione-fisica-e-proteggere-endpoint-demo
- Commit: (uncommitted at validation time)
- Date: 2026-08-05 (rivalidato con Postgres reale — vedi sotto)

## Implementation Summary

`ALLOW_PATIENT_DELETE` invertito a "disabilitato di default" in entrambi i punti che lo leggono
(`patientDeleteAllowed()` e `GET /patients/settings`). `POST /patients/seed` e
`POST /patients/demo-setup` rispondono 403 quando `NODE_ENV=production`, prima di qualunque
operazione DB, invariati in ogni altro ambiente.

## Files Changed

`backend/src/routes/patients.ts`; nuovo test
`backend/src/routes/__tests__/patients-delete-demo-gate.test.ts`.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 (default disabilitato) | PASS | DELETE senza env var → 403, verificato anche con Postgres reale. |
| AC2 (403 senza var, normale con true) | PASS | Con `ALLOW_PATIENT_DELETE=true` il gate non blocca piu' (mai 403); con Postgres reale la richiesta raggiunge l'handler completo (id inesistente → esito applicativo normale, non piu' un limite ambientale). |
| AC3 (settings coerenti) | PASS | `deleteEnabled: false`/`true` coerente con la env var, verificato anche con Postgres reale. |
| AC4 (403 seed/demo-setup in produzione) | PASS | 403 immediato con NODE_ENV=production, prima di ogni query; con NODE_ENV diverso da production e Postgres reale, `POST /patients/demo-setup` ha effettivamente creato il paziente demo end-to-end (200, scrittura reale confermata — vedi Runtime Evidence). |
| AC5 (tsc pulito) | PASS | `cd backend && npx tsc --noEmit` → 0 errori. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Integration | PASS (8/8) | `patients-delete-demo-gate.test.ts` rieseguito contro un Postgres reale (Railway, database usa-e-getta dedicato, non quello di produzione) via `DATABASE_URL` puntato a un tunnel SSH locale; tutte le 8 assert passano, incluso l'esito applicativo pieno oltre al solo gate. Nessuna regressione: suite backend completa 435/435 verde nella stessa run (vedi nota generale sotto). |
| API | PASS | Vedi Integration: stesso file esercita le route HTTP reali via `express` + `fetch` locale, non solo la logica del gate. |
| Security/privacy | PASS | Cambio di default piu' restrittivo, riduce il rischio residuo del progetto senza introdurre nuovi log/PII. |

## Runtime Evidence

Rivalidato il 2026-08-05 contro un Postgres reale: creato un servizio Postgres Railway dedicato
e usa-e-getta (progetto `glistening-friendship`, NON il Postgres di produzione), esposto via
`railway connect --tunnel-only` (tunnel SSH locale), migrato con `prisma migrate deploy` (26/26
migrazioni applicate senza errori), poi `npm test` eseguito da `backend/` con `DATABASE_URL`
puntato al tunnel. Log applicativo sanitizzato osservato durante il test AC4 in ambiente non-prod:
`POST /patients/demo-setup → Fabio Forlano id=<cuid> MRN=DEMO-FULL-001 — cartella completa`
(nome/MRN sono dati sintetici del seed di test, non un paziente reale). Suite completa: 435/435
test verdi (nessun fallimento residuo nel repo dopo un fix separato a una race condition trovata
in `appointment-service.ts`, task `transazioni-e-vincoli-race-condition-letti-e-appuntamenti`).
Servizio Postgres di test riutilizzato per validare gli altri task in sospeso nella stessa
sessione; tenuto attivo su decisione dell'utente per eventuale riuso futuro (solo dati sintetici
di test, nessun dato reale).

## Residual Risks

- Verifica dell'esito applicativo pieno (200 con `ALLOW_PATIENT_DELETE=true` e DB reale) rimandata
  insieme alla validazione runtime cumulativa di fine piano.
- **Segnalazione operativa per l'utente**: `e2e/prod-persist-verify.mjs` (script manuale, non in
  CI) elimina un paziente sintetico chiamando `DELETE /patients/:id` contro il backend Railway di
  produzione per verificarne la pulizia. Con il nuovo default, quello script fallira' la pulizia
  (403) a meno che `ALLOW_PATIENT_DELETE=true` non sia impostato esplicitamente su quel deployment
  al momento di un'eventuale esecuzione futura. Nessuna azione automatica intrapresa su questo
  script, per restare nello scope del task.

## Final Decision

CLOSED — VERIFIED
