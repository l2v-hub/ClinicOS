# Task Contract

## Task
- Title: Disattivare cancellazione fisica e proteggere endpoint demo
- Slug: disattivare-cancellazione-fisica-e-proteggere-endpoint-demo
- Type: bugfix
- Date: 2026-07-31

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

`backend/src/routes/patients.ts`: `patientDeleteAllowed()` (riga 890-892) e il flag esposto da
`GET /patients/settings` (riga 29) leggono `process.env.ALLOW_PATIENT_DELETE ?? 'true'` — in
assenza della variabile d'ambiente, la cancellazione fisica del paziente (con cascata su cartella,
terapie, MAR, diario, documenti) e' ABILITATA di default. `POST /patients/seed` e
`POST /patients/demo-setup` (righe 48, 80) creano/sovrascrivono dati paziente e sono raggiungibili
in qualunque ambiente, incluso production, senza alcun controllo su `NODE_ENV` (gia' dietro
`requireOperator` dallo step 1, ma quel gate e' header-based e spoofabile, non e' una vera difesa).

## Expected Behaviour

`ALLOW_PATIENT_DELETE` disabilitato di default: la cancellazione fisica funziona SOLO se la
variabile e' impostata esplicitamente a `'true'`. `POST /patients/seed` e
`POST /patients/demo-setup` rispondono 403 quando `NODE_ENV === 'production'`, indipendentemente
dagli header operatore, cosi' anche uno header spoofato non basta a raggiungerli in produzione.

## Acceptance Criteria

- AC1: `patientDeleteAllowed()` ritorna `false` quando `ALLOW_PATIENT_DELETE` non e' impostata
  (comportamento invertito rispetto ad oggi).
- AC2: `DELETE /patients/:id` risponde 403 in assenza della variabile d'ambiente, 200 solo con
  `ALLOW_PATIENT_DELETE=true` esplicito.
- AC3: `GET /patients/settings` riflette lo stesso default (`deleteEnabled: false` senza la
  variabile), cosi' la UI (che gia' legge questo flag, verificato in frontend F-audit) resta
  coerente senza modifiche frontend.
- AC4: `POST /patients/seed` e `POST /patients/demo-setup` rispondono 403 quando
  `NODE_ENV === 'production'`; restano invariati (comportamento pre-task) in ogni altro ambiente
  (development/test), per non rompere l'uso locale/demo attuale.
- AC5: `cd backend && npx tsc --noEmit` pulito.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | yes | Nuovo test (o estensione di uno esistente) che verifica: DELETE senza env var -> 403; DELETE con ALLOW_PATIENT_DELETE=true -> comportamento normale; POST /seed e /demo-setup con NODE_ENV=production -> 403; con NODE_ENV=test/development -> comportamento normale. |
| API | yes | Copre lo stesso comportamento via chiamata diretta, complementare ai test di integrazione. |
| Playwright | no | Nessun impatto UI diretto (il flag deleteEnabled era gia' letto correttamente dalla UI). |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Cambio di default piu' restrittivo, riduce il rischio, non lo introduce. |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test di integrazione backend
- output tsc --noEmit

## Risks

- **Rischio di rottura del flusso demo/test locale**: se `ALLOW_PATIENT_DELETE=true` non viene
  impostato negli ambienti dove la cancellazione e' effettivamente usata (es. script di test E2E
  che puliscono dati), quegli script inizieranno a fallire con 403. Mitigazione: verificare prima
  dell'implementazione se script in `scripts/`, `e2e/` o CI dipendono da DELETE /patients/:id senza
  impostare la variabile, e documentarlo esplicitamente se trovato.
- **NODE_ENV in produzione**: l'azione assume che Railway imposti `NODE_ENV=production` per il
  servizio backend (comportamento standard, ma da verificare nei log/config a runtime se possibile
  — non e' stato possibile verificarlo con certezza in questa sessione per assenza di accesso ai
  file .env).

## Gate Status

READY FOR IMPLEMENTATION
