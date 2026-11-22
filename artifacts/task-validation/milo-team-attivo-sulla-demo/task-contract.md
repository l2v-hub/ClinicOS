# Task Contract

## Task

- Title: Milo team attivo sulla demo
- Slug: milo-team-attivo-sulla-demo
- Type: bugfix
- Date: 2026-11-22

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |      yes |

Note: trovato verificando la demo dopo #545 (2026-11-22), su richiesta dell'utente «verifica tutto».
Il servizio AI della demo si aggiorna solo caricando i sorgenti (`railway up`), non dal commit: il
deploy precedente aveva ridistribuito l'immagine vecchia. Ricaricato da `main` (deploy `81c8f9f8`).

## Current Behaviour

- Ogni chiamata del team fallisce sul modello Azure: «Function tools with reasoning_effort are not
  supported for gpt-6.1-sol in /v1/chat/completions… set reasoning_effort to 'none'». Risponde
  sempre il percorso classico.
- Nella prosa composta resta una parentesi spuria: «… coscienza: A. [ [1]».

## Expected Behaviour

- Primo tentativo (#546): `reasoning_effort='none'` su chat/completions. Sul sito il modello lo
  rifiuta («does not support 'none' … Supported values are: 'low', 'medium', 'high', and 'xhigh'»).
  Quindi su chat/completions questo modello non può usare strumenti.
- Correzione: per i modelli Azure il team usa la Responses API dello stesso deployment
  (`AzureOpenAIResponses`, stesso endpoint e chiave), che supporta strumenti e ragionamento;
  livello `AI_TEAM_REASONING_EFFORT` (default `low`, valori minimal/low/medium/high/xhigh). Gli altri
  provider restano invariati.
- Le forme «[id]», «[fonte: id]», «(fonte: id)» diventano un solo «[n]».
- Dopo #547 il team risponde senza errori ma le sue risposte sono scartate dal backend e i tempi
  salgono a 20–37 s: team spento sulla demo. Il backend registra il motivo dello scarto
  (`[ai-team]`, senza contenuti) e il servizio AI un riepilogo di ogni esecuzione; se il testo
  finale non riporta i [S#] ma il team ha letto dati, si citano le fonti lette (fondate per
  costruzione, verificate dal backend).

## Acceptance Criteria

- AC1: un modello Azure chat diventa per il team un modello Responses API con lo stesso deployment;
  il ciclo completo del team (coordinatore → specialista → strumento → backend) gira su un finto
  endpoint `/v1/responses` e le richieste portano il livello di ragionamento.
- AC2: `numberSourceIds` non lascia parentesi spurie per «[id]», «[fonte: id]», «(fonte: id)».
- AC3: test del servizio AI e del backend, typecheck.
- AC5: i motivi di scarto (no_text, no_reads, no_citations, ungrounded, action_claim) sono distinti
  e registrati; una risposta senza [S#] dopo letture riuscite cita le fonti lette.
- AC6: il testo del team è mostrato senza simboli markdown grezzi (grassetto come grassetto,
  elenchi come elenchi, righe di tabella leggibili), senza HTML grezzo; il coordinatore risponde in
  testo semplice.
- AC4 (dopo il rilascio): sulla demo almeno una domanda risponde in modalità team con fonti
  numerate; tempi registrati; altrimenti il team viene spento.

## Test Plan

| Test type                 | Required | Reason                                      |
| ------------------------- | -------: | ------------------------------------------- |
| Unit                      |      yes | modello del team, numerazione delle fonti   |
| Integration               |      yes | team Agno con finto modello e finto backend |
| API                       |      yes | dopo il rilascio: `/ai/actions/plan`        |
| Playwright                |      yes | dopo il rilascio: risposte del team         |
| Persistence after refresh |       no | sola lettura                                |
| Agnos action registry     |       no |                                             |
| Voice simulation          |       no |                                             |
| OCR/import test           |       no |                                             |
| Security/privacy scan     |       no | nessun nuovo accesso                        |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` test; verifica sulla demo

## Risks

- Senza ragionamento il team può essere meno accurato: il backend verifica comunque le fonti.

## Gate Status

READY FOR IMPLEMENTATION
