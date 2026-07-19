# Metodo di validazione oggettiva — ClinicOS / Agnos

**Regola cardine**: nessun task è "done"/"fixed"/"completed" senza **evidenze verificabili**.
Se non puoi validare oggettivamente, scrivi **"IMPLEMENTED — NOT VERIFIED"**, mai "DONE".

Prima di dichiarare completato qualsiasi task, identifica il tipo di modifica e produci le evidenze
minime sotto `artifacts/validation/<task>/`.

## 1. Frontend / UX / UI

Se tocchi interfaccia, layout, popup, form, liste, chatbot o voce:

- test Playwright; screenshot **prima/dopo**; video o trace del flusso;
- responsive desktop/mobile; **assenza errori console**; dimostrazione visiva.

```
artifacts/validation/<task>/
├── screenshots/   ├── video/   ├── trace/   └── validation-report.md
```

## 2. Backend / API / dati

Se tocchi backend, servizi, DB, API o persistenza:

- endpoint coinvolti; request/response; status code; payload; **persistenza su DB**;
- errori controllati; test API aggiornati/creati; elenco REST esposte/modificate.

```
artifacts/validation/<task>/
├── api-report.md   ├── requests-responses.json   ├── database-check.md   └── validation-report.md
```

## 3. Agnos AI / chatbot / voce

Se tocchi Agnos AI:

- domanda → risposta; tool/action chiamata; **impossibilità di Delete**;
- **log sanitizzati** (PHI-safe: nomi campo, mai valori); frontend aggiornato dopo azione AI;
- comando vocale se coinvolto.

## 4. Regola finale — tabella obbligatoria

Non dichiarare "done" senza: test eseguiti · evidenza generata · path artefatti · PASS/FAIL · limiti residui.

| Area      | Test eseguito                       | Esito     | Evidenza |
| --------- | ----------------------------------- | --------- | -------- |
| Frontend  | Playwright/screenshot/video         | PASS/FAIL | path     |
| Backend   | API/database/test                   | PASS/FAIL | path     |
| Agnos AI  | chatbot/voice/action                | PASS/FAIL | path     |
| Sicurezza | no-secret/no-delete/log sanitizzati | PASS/FAIL | path     |

## Note operative su questo progetto

- **Prod frontend** (`clinicos-eosin.vercel.app`) non raggiungibile da questa postazione (Zscaler):
  usare Playwright su build locale (pointing a prod o locale) + stato deploy piattaforma.
- **Prod backend**: validabile via API (`/ai/actions/*`, `/health`, `/patients`). Validazione su prod
  **solo letture/rifiuti** (nessuna mutazione dei dati reali); scritture via test backend + E2E locali.
- **Railway CLI** bloccata in locale (Zscaler) → deploy/env via GitHub Actions
  (`deploy-backend.yml`, `deploy-runtime.yml`, `activate-assistant-llm.yml`, `railway-set-var.yml`).
- Evidenze rieseguibili: preferire uno script (`run-validation.mjs`) committato nel dir del task.
