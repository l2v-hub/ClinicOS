# Task Validation Report

## Task

- Title: Milo fase 5 sentinelle e proattività
- Slug: milo-fase-5-sentinelle-e-proattivita
- Commit: vedi `git log` del ramo `claude/relaxed-wright-t5j39k` (commit «Milo fasi 4–5»)
- Date: 2026-11-22

## Implementation Summary

`backend/src/clinical/sentinels.ts` aggiunge la sentinella NEWS2, basata su RCP 2017, che vale
solo per rilevazioni complete:

- totale ≥ 7 → urgente;
- totale ≥ soglia di struttura (5 per default) o un parametro a 3 → alta.

Restituisce il perché (parametri e punti), la risposta prevista dal protocollo come promemoria e la
fonte. La configurazione si fa con due variabili d'ambiente:

- `SENTINEL_NEWS2_ENABLED=false` la spegne;
- `SENTINEL_NEWS2_ALERT_FROM` accetta solo 3–5, cioè può anticipare l'avviso ma non ritardarlo.

Il motore proattivo esistente riceve un nuovo evento `vitals.news2_alert`, prodotto dal
raccoglitore dei parametri. Diventa un segnale `ATTENTION_REQUIRED` per ospite, con le stesse
capacità e lo stesso ambito dei parametri, quindi l'amministratore è escluso. Il segnale contiene
punteggi e protocollo, non i valori misurati.

La presa visione usa il meccanismo esistente (audit, personale). Ogni nuova rilevazione sopra
soglia crea una nuova revisione e il promemoria torna da vedere.

Il conteggio `attention` è disponibile anche nella vista `?view=count`.

Frontend: il badge viene montato sul pulsante Milo della barra in alto:

- si aggiorna ogni 15 s e subito dopo un salvataggio di parametri da questo browser;
- un anello distingue i promemoria clinici;
- l'etichetta accessibile dice quanti sono.

Il catalogo eventi/segnali/ruoli è rigenerato dal codice (`scripts/proactive/export-catalog.mts`).

## Files Changed

- Backend:
  - `clinical/sentinels.ts` (nuovo);
  - `proactive/{catalog,sources,engine}.ts`;
  - test `clinical/__tests__/sentinels.test.ts`;
  - scenario V in `proactive/__tests__/proactive-e2e.test.ts`.
- Frontend:
  - `components/assistant/AssistantEntryBadge.tsx`;
  - `components/assistant/assistantApi.ts`;
  - `App.tsx`: montaggio del badge;
  - `App.css`;
  - test `components/assistant/__tests__/assistantEntryBadge.test.ts`.
- Documentazione generata: `.ai-architecture/phase-7-proactive/{EVENT_CATALOG,SIGNAL_CATALOG,ROLE_SIGNAL_MATRIX}.json`.

## Acceptance Criteria Result

| AC  |  Result | Evidence                                                                                                                                                                                                                                     |
| --- | ------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |    PASS | `logs/proactive-suite.log`, scenario V: NEWS2 6 → `ATTENTION_REQUIRED`, alta, «NEWS2 6 — rischio medio», «FR 2 · SpO₂ 2 · FC 2 · Risposta prevista: Valutazione medica urgente (promemoria, … RCP 2017 …)»; il segnale non contiene i valori |
| AC2 | PARTIAL | lato server il segnale è nel conteggio `?view=count` subito dopo la scrittura (meno di 5 s, scenario V); il badge si aggiorna ogni 15 s e dopo un salvataggio (`logs/frontend-badge.log`); nel browser sul sito non è ancora verificato      |
| AC3 |    PASS | scenario V: presa visione nell'audit con l'ospite, conteggio −1, misura normale non riapre, NEWS2 8 → nuova revisione urgente di nuovo da vedere; personale (scenario K esistente)                                                           |
| AC4 |    PASS | `logs/unit-sentinels.log`: incompleta → nessun NEWS2; soglie 3–5 o spegnimento; amministratore senza il segnale (scenario V)                                                                                                                 |
| AC5 |    PASS | catalogo rigenerato; proattiva 31/0, frontend 1623/0, typecheck e build backend e frontend                                                                                                                                                   |

## Test Results

| Test             |  Result | Evidence                                                                           |
| ---------------- | ------: | ---------------------------------------------------------------------------------- |
| Unit             |    PASS | `logs/unit-sentinels.log` (3/3), `logs/frontend-badge.log` (2/2)                   |
| Integration      |    PASS | `logs/proactive-suite.log` (31/0, Express + PostgreSQL reali)                      |
| API              |    PASS | `/skills/proactive/inbox`, `?view=count`, `/skills/proactive/ack` nello scenario V |
| Playwright       | NOT RUN | sul sito dopo il rilascio                                                          |
| Persistence      |    PASS | presa visione letta dall'audit (scenario V)                                        |
| Agnos AI         |      NA |                                                                                    |
| Voice            |      NA |                                                                                    |
| OCR              |      NA |                                                                                    |
| Security/privacy |    PASS | ambito dell'ospite, amministratore escluso, niente valori nel segnale              |

## Runtime Evidence

`screenshots/badge-milo-render-locale.png`: pulsante Milo con le novità e con un promemoria
clinico. È un render statico con gli stili dell'app, non il sito.

## Logs

`logs/unit-sentinels.log`, `logs/proactive-suite.log`, `logs/frontend-badge.log`,
`logs/frontend-tests.log`, `logs/frontend-typecheck.log`, `logs/frontend-build.log`,
`logs/backend-typecheck.log`, `logs/backend-build.log`.

## Residual Risks

- Aggiornamento a intervalli di 15 s (polling), non a spinta. Un canale in tempo reale (SSE) è un
  passo successivo.
- Una sola sentinella, NEWS2: altre regole da protocolli (es. Braden, cadute) vanno scelte con i
  clinici.

## Final Decision

IMPLEMENTED — NOT VERIFIED
