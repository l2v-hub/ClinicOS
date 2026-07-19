# Task Contract

## Task

- Title: Agnos Fase 1a andamento parametri vitals trend
- Slug: agnos-fase-1a-andamento-parametri-vitals-trend
- Type: feature
- Date: 2026-07-19

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

L'agente Clinico legge i parametri recenti (`vitals_recent`) come lista, ma non c'è un "andamento"
su finestra 7/15/30 giorni né una resa grafica. Le letture vitali esistono in cartella e il filtro
`filterVitals` supporta già `label` + `from`/`to`.

## Expected Behaviour

- Nuovo intent **`vitals_trend`** (dominio Clinico): "andamento/grafico/storico dei parametri <X> negli
  ultimi 7/15/30 giorni" → legge le rilevazioni del parametro nella finestra, SOURCE_ONLY.
- Il planner resta puro: emette `{label, days:N}`; il service traduce `days`→`from` (data corrente lato server).
- La UI Agnos mostra una **sparkline** compatta dell'andamento (parsing difensivo dei valori numerici).
- Nessun cambio schema; nessun nuovo ruolo; guardrail invariati (interpretazione parametri ancora rifiutata).

## Acceptance Criteria

- AC1: `vitals_trend` è un intent Clinico; una domanda di andamento con parametro+finestra produce le rilevazioni della finestra (SOURCE_ONLY).
- AC2: il planner emette `days` e il service calcola `from` = oggi−N giorni; finestra default 7 se non specificata; mappa 7/15/30 e "settimana"/"mese".
- AC3: `vitals_trend` è nell'allowlist Clinico (redirect da Gestione); UI mostra una sparkline dai risultati.
- AC4: build FE+BE verdi; unit planner/agents verdi; suite backend verde.

## Test Plan

| Test type                 | Required | Reason                                                               |
| ------------------------- | -------: | -------------------------------------------------------------------- |
| Unit                      |      yes | Planner `vitals_trend` (label+days) + agents (vitals_trend→clinical) |
| Integration               |       no | Riusa il tool vitali esistente                                       |
| API                       |       no | Nessuna nuova route                                                  |
| Playwright                |      yes | Sparkline resa in Agnos (agente Clinico)                             |
| Persistence after refresh |       no | Sola lettura                                                         |
| Agnos action registry     |       no | Nessuna write                                                        |
| Voice simulation          |       no | Percorso voce invariato                                              |
| OCR/import test           |       no | Non impattato                                                        |
| Security/privacy scan     |       no | Sola lettura, SOURCE_ONLY, refuse_clinical invariato                 |

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

## Risks

- Overlap con `vitals_recent`: mitigazione — check `vitals_trend` PRIMA di `vitals_recent` nel planner.
- Parsing valori per la sparkline (es. "130/80"): mitigazione — parsing difensivo, punti non numerici saltati; nessun errore se serie vuota.
- Nessuna interpretazione dei valori (solo resa dei dati esistenti) → refuse_clinical invariato.

## Gate Status

READY FOR IMPLEMENTATION
