# Task Contract

## Task

- Title: Ingresso 1: scheda d'ingresso su una pagina con indice come il prototipo
- Slug: ingresso-1-scheda-d-ingresso-su-una-pagina-con-indice-come-il-prototipo
- Type: feature
- Date: 2026-09-28

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

OCR/Import: la scheda è la stessa che si apre dopo la revisione dell'import. Cambia solo l'impaginazione; seed, proposte e conferma restano uguali.

## Current Behaviour

La scheda d'ingresso (`IntakeWorkspace`) è un wizard a 5 passaggi con "Avanti"/"Indietro": Anagrafica, Ingresso, Clinica, Moduli, Verifica.

- Si vede un passaggio alla volta. Il riepilogo e il pulsante "Crea paziente" compaiono solo all'ultimo passaggio.
- Le accettazioni obbligatorie sono caselle di spunta, in punti diversi del wizard: anagrafica solo in Verifica, terapia in Clinica e in Verifica.
- Non c'è un indice delle sezioni con il loro stato, né un conteggio di cosa manca finché non si arriva all'ultimo passaggio.

Prototipo di riferimento: `artifacts/hmi-parity/proto/ingresso-docs.png`.

## Expected Behaviour

La scheda diventa una pagina unica, come nel prototipo. Resta nella stessa finestra di oggi (import, pagina Nuovo ingresso, modulo appuntamento).

- **Indice a sinistra** con le sezioni: Anagrafica, Ingresso, Allergie, Terapia, Diagnosi e anamnesi, Parametri iniziali, Moduli da pianificare, Riepilogo.
  - Ogni voce mostra il proprio stato:
    - numero di problemi da risolvere (per esempio dati anagrafici obbligatori mancanti o terapie da correggere);
    - "da confermare";
    - completata (spunta);
    - vuota (cerchio).
  - Un clic porta alla sezione; la voce della sezione visibile è evidenziata (`aria-current`).
- **In fondo all'indice**:
  - "Mancano N passaggi obbligatori", oppure "Pronto per la creazione";
  - "Crea paziente" (primario, attivo solo se non manca nulla);
  - "Salva bozza" oppure "← Torna alla revisione";
  - stato dell'autosalvataggio.
- **Centro**: le sezioni una sotto l'altra, ciascuna in una card con titolo.
  - Anagrafica e Terapia hanno in testa il pulsante di conferma. È un interruttore con `aria-pressed` e sostituisce le caselle, sugli stessi flag `_accepted.demographics` e `_accepted.therapy`. La testata della terapia distingue "nessuna terapia da inserire".
  - Il Riepilogo resta, con quello che verrà creato, le terapie che restano in bozza e i collegamenti alla correzione.
- **Intestazione**: "Nuovo ingresso", seguito dal nome del paziente appena è noto.
- **Regole invariate**:
  - validazione anagrafica (errori mostrati al tentativo di creazione);
  - accettazioni obbligatorie;
  - proposte d'import in attesa, che bloccano;
  - duplicato ("Crea comunque") e conflitto allergie ("Conferma comunque");
  - navigazione alla correzione delle terapie;
  - autosalvataggio versionato;
  - bozza;
  - modulo da aprire dopo la creazione;
  - atterraggio sul paziente creato.
- **Sotto i 1024px**: l'indice diventa una riga di sezioni in alto, e le azioni ("Mancano N", "Crea paziente", "Salva bozza") restano in una barra in basso.

## Acceptance Criteria

- AC1: La scheda mostra tutte le sezioni nella stessa pagina (nessun "Avanti"/"Indietro"). L'indice elenca le 8 sezioni con lo stato calcolato dai dati della bozza. Un clic su una voce porta alla sezione e `aria-current` segue la sezione visibile.
- AC2: "Mancano N passaggi obbligatori" corrisponde alla lista dei blocchi di oggi: dati anagrafici obbligatori, conferma anagrafica, conferma terapia, terapie da correggere, proposte in attesa. "Crea paziente" è attivo solo con N = 0 e crea il paziente come oggi, stessa chiamata di conferma e stesso atterraggio.
- AC3: Le conferme di anagrafica e terapia sono interruttori canonici (`ds-btn`, `aria-pressed`) nelle testate delle sezioni e aggiornano `_accepted` nella bozza (autosalvata). Nessuna casella duplicata.
- AC4: Nessuna funzione persa:
  - errori anagrafici con fuoco sul primo campo;
  - duplicato con "Crea comunque";
  - conflitto allergie con "Conferma comunque";
  - proposte d'import con aggiungi/rimanda;
  - correzione terapie dal Riepilogo (porta alla terapia);
  - modulo selezionato aperto dopo la creazione;
  - "Salva bozza" / "Torna alla revisione";
  - ripresa della bozza.
- AC5: Nessuno scorrimento orizzontale a 390/768/1024/1180/1440; sotto i 1024px indice in alto e azioni in basso sempre visibili. Controlli canonici (audit DS verde).
- AC6: npm run build passa; la suite completa non ha nuovi fallimenti rispetto alla baseline; `e2e/import-happy-path.mjs` è aggiornato alla pagina unica.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                                 |
| ------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | suite completa (StepVerifica/StepClinica mantengono il comportamento di default); guardia DS                                                                           |
| Integration               |       no | nessuna API toccata                                                                                                                                                    |
| API                       |       no |                                                                                                                                                                        |
| Playwright                |      yes | evidence: pagina unica, indice/stato/scroll, conteggio mancanti, conferme, creazione (stub), bozza, duplicato/conflitto simulati con page.route, 5 larghezze; audit DS |
| Persistence after refresh |      yes | la bozza con le conferme si riapre uguale (draft PATCH simulato o stub)                                                                                                |
| Agnos action registry     |       no |                                                                                                                                                                        |
| Voice simulation          |       no |                                                                                                                                                                        |
| OCR/import test           |      yes | la scheda aperta dopo l'import (seed simulato) mostra i campi importati nelle sezioni giuste                                                                           |
| Security/privacy scan     |       no |                                                                                                                                                                        |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots della pagina a 390/768/1024/1180/1440 accanto al prototipo
- log dell'evidence Playwright e dell'audit DS

## Risks

- **Componente complesso.** Contiene flussi critici: accettazioni, proposte, conferma, duplicati. Si cambia solo l'impaginazione e si riusano gli stessi gestori; i test esistenti di StepVerifica/StepClinica restano verdi.
- **Test e2e fuori CI.** Gli e2e che guidano il wizard vanno aggiornati: `import-happy-path`, `intake-scroll`, `issue-243`.
- **Rimandato ai cicli successivi del programma d'ingresso:**
  - documento a fianco;
  - card Documenti dentro la pagina;
  - provenienza per pagina;
  - archivio;
  - letto.

## Gate Status

READY FOR IMPLEMENTATION
