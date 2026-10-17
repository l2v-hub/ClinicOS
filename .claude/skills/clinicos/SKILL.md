---
name: clinicos
description: Usa per lavorare su ClinicOS da qualsiasi ambiente o harness. Guida onboarding, analisi approfondita delle issue, aggregazione per causa e file condivisi, worktree autorizzati, esecuzione adattiva Codex, test isolati ed evidenze, QA indipendente e review Claude tramite GitHub fino al rilascio verificato.
---

# ClinicOS: sviluppo e validazione

ClinicOS è un gestionale clinico RSA: pazienti, cartella, terapie, diario, agenda,
importazione OCR/LLM e assistente Agnos. Repository: `l2v-hub/ClinicOS`.
Questa skill è un metodo operativo, non una prova che una feature o un deploy funzionino.

## Prima di agire, su qualsiasi postazione

1. Individua il checkout e leggi le istruzioni applicabili (`AGENTS.md`, `CLAUDE.md`),
   i manifest, il lockfile e i workflow della revisione corrente. Le istruzioni dell'utente
   e dell'harness hanno precedenza; non assumere capacità o permessi di un'altra sessione.
2. Registra branch, SHA, stato del checkout, worktree occupati, servizi, risorse disponibili
   e strumenti effettivi. Preserva modifiche, file non tracciati e processi dell'utente.
3. Distingui setup, sviluppo, QA, review e rilascio. Per il solo onboarding non modificare
   sorgenti o lockfile. Usa installazioni riproducibili (`npm ci` dalla root, poi
   `npm --prefix backend run prisma:generate`) se necessarie; prima controlla versioni e spazio.
4. Riusa autenticazione e configurazioni esistenti senza stamparne i valori. L'assenza di
   `GH_TOKEN` non dimostra mancanza di accesso: il cloud può fornire un proxy Git autenticato.
   Non copiare token in chat, repository, istruzioni o artefatti; non disabilitare TLS/checksum.
5. Per avviare l'app leggi `run-clinicos` e i comandi correnti. Verifica una richiesta funzionale,
   non solo PID/porta. Configurazioni salvate, processi avviati e deploy sono risultati diversi.

## Mappa del codice da verificare

| Area                           | Punto di ingresso                                                |
| ------------------------------ | ---------------------------------------------------------------- |
| Frontend React/Vite/TypeScript | `frontend/src/`, navigazione in `App.tsx` e componenti esistenti |
| Backend Express/Prisma         | `backend/src/routes/`, servizi e moduli di dominio               |
| Dati e migrazioni              | `prisma/` alla root                                              |
| AI Python/FastAPI/Agno         | `clinicos-ai-runtime/`, servizio separato                        |
| Browser E2E                    | `e2e/`, runner Node/Playwright e script richiamati dai workflow  |
| Orchestrazione GitHub          | `agent-team/src/bug-pipeline/`, `.github/workflows/`             |

Non fissare in questa skill conteggi di modelli, componenti o test: ricavali dal checkout.
Non inventare nuove pagine, rotte o campi senza leggere il codice. Il runtime AI mantiene
la conoscenza dei provider; non distribuire nuove dipendenze dai provider nel frontend.
Rispetta navigazione e design system correnti: blu medicale `#2F6BED`, sidebar navy,
rosso riservato ad allarmi/errori/badge. Modifiche chirurgiche, niente framework UI paralleli.
Backend, schema, API e configurazione richiedono uno scope autorizzato dal task.

## Percorso obbligatorio

Segui [il playbook completo](references/bug-delivery.md) prima di prendere issue o delegare.
Contiene profondità minima dell'analisi, packet, budget, test, sicurezza, comunicazione
Codex–Claude, stati e condizioni di chiusura. Non saltare le fasi per urgenza o per ottenere
un esito verde. Un blocco dimostrato è un risultato valido, non una risoluzione.

Quando il repository è disponibile leggi anche:

- `.agents/skills/codex-bug-triage/SKILL.md`: comandi, aggregazione e supervisore attuali.
- `.claude/skills/agent-loop-quality-gate/SKILL.md`: contratto e report obbligatori.
- `.claude/skills/qa-gate/SKILL.md`: sessione QA indipendente, tutte le fasi obbligatorie.
- `.claude/skills/playwright-evidence/SKILL.md` e `parallel-evidence-remediation/SKILL.md`:
  requisiti delle prove e pubblicazione per issue.
- `.claude/skills/bug-final-review/SKILL.md`: Claude reviewer in sola lettura.
- `docs/codex-bug-workflow.md`, `docs/quality-gate.md`, `docs/validation-method.md`:
  configurazione e contratti dell'automazione.

## Riutilizzo fuori dal repository

Il pacchetto portabile è l'intera directory `clinicos/`: conserva `SKILL.md` e `references/`
insieme nella directory skill supportata dal tuo harness. Non richiede percorsi Windows,
`/workspace`, un modello fisso o credenziali incluse. Gli altri percorsi citati sono relativi
alla root del checkout ClinicOS, non alla directory d'installazione della skill.
Senza checkout puoi fare orientamento; non dichiarare verificati codice, test o deploy.
Se una skill complementare manca, recuperala dal repository e leggila prima della fase
che la richiede; non ricostruirne i vincoli a memoria. Non installare cron o cambiare
impostazioni di account su una nuova macchina senza l'autorizzazione necessaria.
