# Task Contract

## Task

- Title: Milo competenze: valutazione, feedback e proposte
- Slug: milo-competenze-valutazione-feedback-e-proposte
- Type: change
- Date: 2026-11-23

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |      yes |

Note: richiesta dell'utente (2026-11-23): «su questi agent abilita la skill creator al fine di
migliorare e rendere sempre più precise le competenze». Scelta dell'utente: ciclo di miglioramento +
feedback (competenze versionate, i cinque casi d'uso come prove misurabili, 👍/👎 con correzione in
app, proposte di miglioramento approvate da un amministratore).

Il feedback e le versioni approvate vanno salvati: servono due tabelle nuove. Lo schema Prisma si
cambia solo con un via libera esplicito dell'utente: senza, si consegna la parte 1 (valutazione) e la
parte 2 resta in attesa.

## Current Behaviour

- Le competenze degli specialisti sono file con versione nel runtime
  (`clinicos-ai-runtime/clinicos_ai/skills/*.md`); la versione usata è nella risposta.
- Il runtime accetta istruzioni approvate (`skillOverrides`, solo testo, mai strumenti), ma il backend
  non ne invia.
- Non esiste una prova ripetibile dei casi d'uso contro il sito, né un modo per dire a Milo che una
  risposta era sbagliata.

## Expected Behaviour

Parte 1 — valutazione (nessuna tabella nuova):

- una raccolta di prove dei cinque casi d'uso con controlli oggettivi per ciascuno (lettura giusta,
  blocchi attesi, fonti, specialisti coinvolti, anteprima e conferma per le scritture, rifiuto per
  il ruolo sbagliato);
- un comando che le esegue contro un sito e produce un esito per caso e per versione delle
  competenze;
- le competenze si migliorano finché le prove passano; ogni modifica è una nuova versione.

Parte 2 — feedback e proposte (richiede le due tabelle):

- sotto ogni risposta di Milo: 👍 / 👎 e, con 👎, una correzione scritta;
- il feedback salva domanda, giudizio, correzione, specialisti e versioni usate, autore e ruolo;
- l'amministratore vede i feedback e chiede a Milo una proposta di nuove istruzioni per uno
  specialista (solo testo, entro i limiti del runtime);
- la proposta ha effetto solo dopo l'approvazione dell'amministratore; si può tornare alla versione
  precedente; ogni passo è tracciato;
- le istruzioni approvate arrivano al runtime come `skillOverrides`.

## Acceptance Criteria

- AC1: raccolta di prove dei cinque casi con controlli oggettivi, eseguibile contro un sito, con esito
  per caso e versioni delle competenze nel risultato.
- AC2: sulla demo, con i dati di prova, le prove passano; le correzioni alle competenze fatte per
  arrivarci sono versioni nuove.
- AC3: 👍/👎 con correzione sotto le risposte di Milo; salvato una volta sola per risposta e per
  persona; un ruolo senza permesso non lo vede.
- AC4: l'amministratore elenca i feedback, genera una proposta, la approva o la rifiuta; solo
  l'approvata viene usata; il ripristino funziona; nessun altro ruolo può farlo.
- AC5: una proposta non può cambiare strumenti, permessi o limiti: solo istruzioni, validate nel
  backend e di nuovo nel runtime.
- AC6: suite toccate, typecheck, build.
- AC7 (dopo il rilascio): sulla demo, un feedback negativo diventa una proposta approvata che cambia
  la risposta successiva, con evidenze.

## Test Plan

| Test type                 | Required | Reason                                           |
| ------------------------- | -------: | ------------------------------------------------ |
| Unit                      |      yes | controlli delle prove, validazione proposte      |
| Integration               |      yes | feedback e versioni su database reale            |
| API                       |      yes | rotte di feedback e approvazione, permessi       |
| Playwright                |      yes | prove sulla demo; feedback e approvazione in app |
| Persistence after refresh |      yes | feedback e versione approvata restano            |
| Agnos action registry     |      yes | nuove rotte nel catalogo dei permessi            |
| Voice simulation          |       no |                                                  |
| OCR/import test           |       no |                                                  |
| Security/privacy scan     |      yes | testo libero nelle correzioni, ruoli, iniezione  |

## Evidence Plan

Required evidence:

- validation-report.md
- esito delle prove per caso e per versione
- `logs/` test e build; prove sulla demo

## Risks

- Una correzione scritta può contenere dati del paziente: resta nel database dell'applicazione, non
  va nei log né nell'audit; al modello arriva solo quando l'amministratore chiede la proposta.
- Una proposta è testo scritto da un modello a partire da testo scritto da persone: è trattata come
  dato non attendibile, limitata in lunghezza e numero, senza effetto fino all'approvazione.
- Le competenze non possono allargare ciò che Milo può leggere o fare: strumenti e permessi restano
  nel codice e nel registro dei permessi.

## Gate Status

READY FOR IMPLEMENTATION
