# Validation Report — Agnos/016 (letture NL, F0 attivo · F1/F2 deployati flag-off)

**Task**: SPEC-016 fase LLM di Agnos (F0 risoluzione paziente + F1 planner LLM + F2 composer)
**Data validazione**: 2026-07-04
**Ambiente**: produzione — backend `https://clinicos-backend-production-df88.up.railway.app`, runtime `https://clinicos-ai-runtime-production.up.railway.app`
**Metodo**: `docs/validation-method.md` (evidenze oggettive prima di dichiarare "done")

## Evidenze generate (path)

```
artifacts/validation/agnos-016-llm-reads/
├── requests-responses.json   # request/response REALI catturate da prod (letture + rifiuti + catalogo)
├── checks.json               # esito PASS/FAIL per criterio
├── run-validation.mjs        # script rieseguibile (solo letture/rifiuti, nessuna mutazione)
├── f0-e2e-report.json        # report Playwright F0 (5/5 PASS, generato oggi)
└── screenshots/
    ├── f0-01-panel.png           # pannello Agnos aperto
    ├── f0-02-parametri.png       # chatbot: paziente risolto per nome → dati reali con fonti
    └── f0-04-delete-rifiutato.png# tentativo delete rifiutato nella UI
```

## Esiti oggettivi (da checks.json — tutti PASS)

| Criterio | Esito | Evidenza |
|---|---|---|
| Chatbot read allergie: `intent=allergies`, HTTP 200, **2 risultati reali** con fonti | ✅ PASS | requests-responses.json → `agnos_read_allergie` |
| Chatbot read parametri: paziente risolto per nome, `intent=vitals_recent` (0 risultati = paziente senza parametri, valido) | ✅ PASS | `agnos_read_parametri` |
| Delete via **chat** rifiutato: `actionType=refuse_forbidden`, `refusalKind=delete` | ✅ PASS | `agnos_delete_refused` |
| Delete via **voce** rifiutato (canale voce) | ✅ PASS | `agnos_delete_refused_voce` |
| Catalogo allowlist: **8 azioni, 0 delete** (prova strutturale) | ✅ PASS | `catalog_zero_delete` |
| Backend health 200 | ✅ PASS | `backend_health` |
| Frontend F0 (pannello, risoluzione per nome, fonti, refuse) — Playwright | ✅ PASS 5/5 | f0-e2e-report.json + screenshots/ |

## Cosa NON è verificato (onesto)

- **F1 planner LLM** e **F2 composer LLM** sono **deployati, cablati e provati fino alla chiamata al modello**, ma **NON verificati end-to-end** perché il modello Google (gemini-2.0-flash e gemma-4-31b-it) risponde `429 quota limit:0` e i flag sono attualmente **spenti** (chatbot deterministico, veloce). L'attivazione reale è rinviata al modello Azure.
  → Stato: **IMPLEMENTED — NOT VERIFIED** (attesa modello con quota).
- **Risposta discorsiva `answerText` nella UI** (F2): non mostrabile finché l'LLM non è attivo → **IMPLEMENTED — NOT VERIFIED**.
- **Frontend re-run in questa pass**: gli screenshot sono la verifica Playwright F0 **odierna** (5/5), non ri-eseguita in questa passata (riprodurrebbe lo stesso F0; la UI LLM non è mostrabile senza modello). Il prod frontend `clinicos-eosin.vercel.app` non è raggiungibile da questa postazione (proxy Zscaler) per un test diretto.

## Tabella finale

| Area | Test eseguito | Esito | Evidenza |
|---|---|---|---|
| Frontend | Playwright + screenshot (F0 UI: pannello, risoluzione per nome, fonti, refuse) | ✅ PASS (F0) · LLM UI: NOT VERIFIED | `screenshots/`, `f0-e2e-report.json` |
| Backend | API `/ai/actions/plan`, `/ai/actions/catalog`, `/health` — request/response, status, payload, retrieval da DB | ✅ PASS | `requests-responses.json`, `checks.json` |
| Agnos AI | chatbot read (domanda→risposta con fonti), delete-refuse chat+voce, azione via catalogo | ✅ PASS (deterministico) · planner/composer LLM: IMPLEMENTED — NOT VERIFIED | `requests-responses.json` |
| Sicurezza | no-delete (chat+voce+catalogo 0 delete), audit PHI-safe (nomi campo mai valori), no-secret nei log/workflow | ✅ PASS | `requests-responses.json`, `docs/validation-method.md`, audit `AiAuditEvent` (test unit) |

## Limiti residui
1. LLM (F1/F2) non attivabile finché non c'è un modello con quota → **Azure domani** (endpoint+deployment via workflow, chiave dal dashboard).
2. Verifica visiva del frontend di produzione impossibile da questa postazione (Zscaler blocca vercel.app) → si usano evidenze Playwright locali + stato deploy piattaforma.
3. Disco macchina locale quasi pieno (residuo `.wt-016` bloccato da handle) — non impatta la produzione.
