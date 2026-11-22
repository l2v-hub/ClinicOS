# Task Validation Report

## Task

- Title: Milo team attivo sulla demo
- Slug: milo-team-attivo-sulla-demo
- Commit: PR #546, #547, #548, #549, #550 (merge `1a57353` su `main`)
- Date: 2026-11-22

## Implementation Summary

Percorso per far rispondere il team di agenti sul sito, guidato da quello che i log della demo
mostravano a ogni passo:

1. **Servizio AI mai aggiornato** (#546): il servizio non è collegato a GitHub e il deploy da commit
   ridistribuiva l'immagine vecchia. Ora si aggiorna caricando i sorgenti con la CLI di Railway
   (`railway up`).
2. **Modello Azure e strumenti** (#546 → #547): su chat/completions `gpt-6.1-sol` rifiuta gli strumenti
   col ragionamento attivo e rifiuta `reasoning_effort: none`. Il team usa la Responses API dello
   stesso deployment (`AzureOpenAIResponses`), con ragionamento `low` (`AI_TEAM_REASONING_EFFORT`).
3. **Diagnostica** (#548): motivo dello scarto nel backend (`[ai-team]`) e riepilogo nel servizio AI,
   senza contenuti; se il modello non riporta i [S#], si citano le fonti lette.
4. **Rotta non catalogata** (#549): `/internal/ai/tools/:tool` era respinta dal controllo globale delle
   rotte («Operazione non catalogata»). Ora è catalogata come le altre rotte interne; un test
   verifica che ogni rotta `/internal/ai` sia catalogata.
5. **Testo leggibile** (#550): `MiloText` rende in modo sicuro grassetto, elenchi e righe di tabella;
   il coordinatore scrive in testo semplice.

Nella #546 è stata corretta anche la numerazione delle fonti («[ [1]»).

## Files Changed

- Servizio AI: `models/providers/agno_team.py`, `api/app.py`, `agents/team.py` e relativi test.
- Backend: `ai/assistant/{team,model-view}.ts`, catalogo e registro dei permessi, test.
- Frontend: `agnos/MiloText.tsx`, `AIAssistantButton.tsx`, `App.css`, test.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                     |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `logs/runtime-tests.log`: modello Azure chat → Responses API; ciclo completo del team su un finto `/v1/responses`                            |
| AC2 |   PASS | `milo-model-view.test.ts` (forme «[id]», «[fonte: id]», «(fonte: id)»)                                                                       |
| AC3 |   PASS | servizio AI 258 OK, autorizzazione 20/20, frontend 1626/0, build                                                                             |
| AC4 |   PASS | `logs/demo-live.log`: sulla demo le domande sul paziente rispondono in modalità team con fonti numerate verificate; tempi 13–34 s registrati |
| AC5 |   PASS | motivi di scarto distinti e visibili nei log del sito (`no_reads` per le domande senza dati, `accepted` per le altre)                        |
| AC6 |   PASS | `screenshots/16-team-news2-testo.png`: paragrafi ed elenco, nessun «**» sul sito                                                             |

## Test Results

| Test             | Result | Evidence                                                                                           |
| ---------------- | -----: | -------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `logs/unit-model-view.log`, test del pannello (`miloText.test.ts`)                                 |
| Integration      |   PASS | ciclo del team su chat e su Responses API (finti modello e backend)                                |
| API              |   PASS | sul sito: `/ai/actions/plan` con `mode: "team"`; la rotta interna risponde col controllo del token |
| Playwright       |   PASS | sul sito: `logs/demo-live.log`, screenshot 11, 13, 14, 16                                          |
| Persistence      |     NA | sola lettura                                                                                       |
| Agnos AI         |   PASS | team con specialisti e fonti verificate dal backend                                                |
| Voice            |     NA |                                                                                                    |
| OCR              |     NA |                                                                                                    |
| Security/privacy |   PASS | delega + token di servizio; diagnostica senza contenuti; testo mai interpretato come HTML          |

## Runtime Evidence

Demo: backend `d8fde0b1` (commit `01fbae3`, team acceso), servizio AI `2527558d` (sorgenti da
`1a57353`), frontend `dpl_2DGAjEWuPGDKjAMNA4L1XsqAsJTb`. Dettaglio in `logs/demo-live.log`.

## Logs

`logs/demo-live.log`, `logs/runtime-tests.log`, `logs/unit-model-view.log`, `logs/authz-tests.log`,
`logs/frontend-tests.log`, `logs/frontend-build.log`.

## Residual Risks

- Tempi del team 13–34 s contro 5–13 s del percorso classico: scelta da confermare con l'utente.
- Il servizio AI si rilascia solo caricando i sorgenti: va ricordato a ogni rilascio, ed è annotato nelle PR.

## Final Decision

CLOSED — VERIFIED
