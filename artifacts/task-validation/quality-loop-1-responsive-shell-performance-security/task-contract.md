# Task Contract

## Task
- Title: Quality loop 1 responsive shell performance security
- Slug: quality-loop-1-responsive-shell-performance-security
- Type: refactor
- Date: 2026-08-29

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | yes |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

La shell importa in modo eager quasi tutte le pagine, compresi moduli clinici e PDF non necessari
alla dashboard iniziale. Dopo il login vengono inoltre avviate molte richieste indipendentemente
dalla pagina corrente. La dashboard mobile mostra alert clinici molto densi, con paziente, farmaci,
orari e ritardi fusi visivamente. Il deployment espone HSTS ma non una policy completa di header
browser (CSP, frame restrictions, MIME sniffing, referrer e permissions policy). I pattern di
caricamento, azione e focus dell'assistente non hanno una verifica integrata in questo ciclo.

## Expected Behaviour

La prima navigazione deve caricare soltanto la shell e la pagina attiva; i moduli pesanti devono
essere scaricati su richiesta con fallback accessibile. La dashboard deve conservare la gerarchia
clinica e rendere scansionabili gli alert su desktop e mobile senza overflow. Il frontend Vercel
deve applicare header di sicurezza compatibili con le dipendenze correnti. L'assistente deve
restare raggiungibile da tastiera e le modifiche non devono alterare i suoi contratti di azione.

## Acceptance Criteria

- AC1: build frontend valida e chunk separati per almeno PatientDetail, pagine admin e AgnosPanel;
  nessun singolo entry chunk applicativo deve incorporare tutte le route.
- AC2: a 390x844 e a viewport desktop la dashboard non presenta overflow orizzontale; ogni riga
  di alert distingue in modo percepibile paziente, dettagli clinici e ritardo, con target >= 44 px.
- AC3: navigazione dashboard -> pazienti -> dettaglio e apertura/chiusura assistente funzionano
  senza errori console e con un fallback di caricamento annunciato semanticamente.
- AC4: la risposta Vercel configura Content-Security-Policy, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy e protezione anti-framing senza rompere font/API/asset.
- AC5: test frontend esistenti, lint mirato, build e scansione dipendenze non introducono regressioni;
  eventuali vulnerabilita residue sono riportate esplicitamente.
- AC6: nessuna modifica abilita delete o bypassa conferme/autorizzazioni delle azioni Agnos; i test
  del registro azioni e i controlli di sicurezza pertinenti restano verdi.
- AC7: in modalita `entra` nessuna identita `X-Operator-*` auto-dichiarata autentica richieste
  cliniche o AI; token assente/forgiato/utente inattivo fallisce chiuso e l'identita deriva solo
  da token verificato + mapping server-side.
- AC8: le origin CORS di produzione sono confrontate con una allowlist esatta; un dominio Vercel
  contenente la stringa `clinicos` ma non esplicitamente autorizzato viene rifiutato.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Regressioni frontend e contratti Agnos |
| Integration | yes | Navigazione e caricamento route |
| API | yes | Test negativi auth/CORS e route protette |
| Playwright | yes | Desktop/mobile, navigazione, assistente, console |
| Persistence after refresh | no | |
| Agnos action registry | yes | Nessun ampliamento non autorizzato delle azioni |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Header, dipendenze, segreti e configurazione |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

Evidenze specifiche: statistiche bundle prima/dopo, output build/test/lint/audit, screenshot desktop
e mobile prima/dopo, DOM assertions responsive, header del deployment e console browser sanitizzata.

## Risks

- Lazy loading puo introdurre flash o boundary senza fallback: usare Suspense con stato accessibile.
- Una CSP troppo restrittiva puo bloccare font, API o worker PDF: derivare le direttive dagli asset
  realmente usati e verificarle localmente e dopo deploy.
- Gli alert contengono dati clinici: screenshot ed evidenze devono restare sui dati demo gia pubblici
  e i log non devono aggiungere valori clinici o credenziali.
- Il worktree originale contiene modifiche non correlate: implementazione e commit avvengono solo
  nel worktree isolato `codex/quality-loop-20260829`.

## Gate Status

READY FOR IMPLEMENTATION
