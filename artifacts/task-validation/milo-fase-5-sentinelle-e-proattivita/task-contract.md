# Task Contract

## Task

- Title: Milo fase 5 sentinelle e proattività
- Slug: milo-fase-5-sentinelle-e-proattivita
- Type: change
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
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |      yes |

Note: richiesta dell'utente (2026-11-22): procedere con le fasi del piano
`docs/architecture/milo-ai-first.md` (§4, Fase 5). Decisione annunciata: sentinelle = promemoria
informativi, mai ordini o diagnosi. Nessuna modifica a Prisma né rotte nuove: si estende il motore
proattivo esistente (`backend/src/proactive`), con la presa visione già registrata nell'audit.

## Current Behaviour

Il motore proattivo segnala le nuove rilevazioni dei parametri solo come «nuova informazione»,
senza alcun punteggio clinico. Il badge dei segnali da vedere esiste, ma non è montato: per
vederli bisogna aprire l'assistente.

## Expected Behaviour

Una sentinella deterministica valuta ogni nuova rilevazione completa con NEWS2 (RCP 2017):

- totale ≥ 7: segnale «urgente»;
- totale ≥ soglia di struttura (5 per default) o un parametro a 3: segnale «alta».

Il segnale porta il perché (parametri che contribuiscono, con i punti), la risposta prevista dal
protocollo come promemoria e la fonte.

La struttura può spegnere la sentinella o anticipare la soglia a 3–4, mai ritardarla oltre il
protocollo.

Il pulsante Milo nella barra in alto mostra il conteggio, aggiornato ogni pochi secondi e subito
dopo un salvataggio di parametri, e un'evidenza distinta quando ci sono promemoria clinici.

La presa visione resta personale ed è registrata. Una nuova rilevazione sopra soglia riapre il
promemoria; una normale no.

## Acceptance Criteria

- AC1: una rilevazione che porta NEWS2 a 5 o più genera un segnale `ATTENTION_REQUIRED` con
  titolo, perché, risposta del protocollo e fonte; non contiene i valori misurati.
- AC2: il segnale è leggibile dal conteggio del badge senza aprire il pannello. Il badge si
  aggiorna entro 15 secondi, e subito dopo un salvataggio dallo stesso browser.
- AC3: la presa visione è registrata nell'audit con l'ospite, è personale e nasconde il
  promemoria fino a una nuova rilevazione sopra soglia (nuova revisione, priorità aggiornata).
- AC4: rilevazioni incomplete non generano NEWS2; l'amministratore non riceve segnali clinici;
  la configurazione accetta solo soglie 3–5 o lo spegnimento.
- AC5: catalogo eventi/segnali rigenerato dal codice; suite proattiva, test nuovi, typecheck e
  build senza errori.

## Test Plan

| Test type                 | Required | Reason                                                                |
| ------------------------- | -------: | --------------------------------------------------------------------- |
| Unit                      |      yes | regole NEWS2, configurazione                                          |
| Integration               |      yes | e2e proattivo su Express + PostgreSQL reali                           |
| API                       |      yes | `/skills/proactive/inbox`, `?view=count`, `/ack`                      |
| Playwright                |      yes | dopo il rilascio: badge sul sito dopo una misura alta                 |
| Persistence after refresh |      yes | presa visione registrata nell'audit                                   |
| Agnos action registry     |       no | nessuna azione nuova                                                  |
| Voice simulation          |       no |                                                                       |
| OCR/import test           |       no |                                                                       |
| Security/privacy scan     |      yes | ambito dell'ospite, amministratore escluso, niente valori nel segnale |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` test, suite e build

## Risks

- Aggiornamento a intervalli (15 s), non a spinta: lo stack non ha un canale in tempo reale.
- Un promemoria resta visibile fino alla presa visione anche se una misura successiva è normale.

## Gate Status

READY FOR IMPLEMENTATION
