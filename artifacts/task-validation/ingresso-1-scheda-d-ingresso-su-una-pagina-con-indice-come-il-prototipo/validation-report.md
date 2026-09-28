# Task Validation Report

## Task

- Title: Ingresso 1: scheda d'ingresso su una pagina con indice come il prototipo
- Slug: ingresso-1-scheda-d-ingresso-su-una-pagina-con-indice-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-28

## Implementation Summary

- **`IntakeWorkspace`**: il wizard a 5 passaggi diventa una pagina unica. Resta nella stessa finestra, allargata fino a 1440px e a tutto schermo sotto i 1024px.
  - Titolo: "Nuovo ingresso" seguito da "· Cognome Nome"; sottotitolo "Bozza salvata alle HH:MM".
  - Indice a sinistra (`IntakeIndex`, nuovo) con 8 sezioni e il loro stato:
    - numero da risolvere;
    - da confermare (cerchio tratteggiato);
    - completata (spunta verde);
    - vuota.
  - Un clic porta alla sezione e `aria-current` segue lo scorrimento (IntersectionObserver).
  - In fondo all'indice:
    - "Mancano N passaggi obbligatori", apribile, con i passaggi cliccabili che portano al campo, alla riga di terapia o alla conferma da sistemare; oppure "Pronto per la creazione";
    - "Crea paziente";
    - "Salva bozza e chiudi" / "← Torna alla revisione";
    - stato del salvataggio.
  - Centro: sezioni in card (Anagrafica, Ingresso, Allergie, Terapia, Diagnosi e anamnesi, Parametri iniziali, Moduli da pianificare, Riepilogo).
    - Le conferme obbligatorie diventano interruttori `ds-btn--secondary` con `aria-pressed` nelle testate di Anagrafica e Terapia. Usano gli stessi flag `_accepted`, senza caselle duplicate.
    - Il Riepilogo resta, senza conferme e senza pulsante di creazione, che sono nell'indice.
  - Handler invariati: `handleConfirm`, `updateSection`, `decideProposal`, `saveAndClose`, i duplicati, il conflitto allergie e la correzione delle terapie.
- **`intakeProgress.ts`** (nuovo, puro): stato delle sezioni e passaggi mancanti con le stesse regole di prima (checklist del Riepilogo e controlli di `handleConfirm`). Test unitari: 5.
- **`StepClinica` / `StepVerifica`**: nuove prop facoltative (`only`, `therapyBlock`, `showTherapyAcceptance`, `showLegacyPain`, `showTitles`, `showAcceptance`, `showCreate`). Il comportamento di default è invariato e i test esistenti restano verdi.
- **Design system**: stato "premuto" per `ds-btn--secondary` (interruttore). L'audit dichiara l'indice come componente di navigazione (come TopNav).
- **Sotto i 1024px**: l'indice diventa una riga di sezioni in alto che scorre di lato; le azioni stanno in una barra fissa in basso.
- **e2e** `import-happy-path.mjs` (job browser-e2e della CI): aggiornato alla pagina unica, con conferme a interruttore e "Crea paziente" dall'indice.

## Files Changed

- frontend/src/components/shared/intake/IntakeWorkspace.tsx, StepClinica.tsx, StepVerifica.tsx
- frontend/src/components/shared/intake/IntakeIndex.tsx, intakeProgress.ts, IntakePage.css (nuovi)
- frontend/src/components/shared/intake/\_\_tests\_\_/intakeProgress.test.ts (nuovo)
- frontend/src/design-system.css
- e2e/import-happy-path.mjs
- artifacts: ds-audit.mjs del design system (indice dichiarato)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | 8 sezioni in una pagina, indice con 8 voci e stato, nessun Avanti/Indietro. Un clic su "Parametri iniziali" porta la sezione in cima e `aria-current` la segue. Titolo "Nuovo ingresso · Galli Teresa".                                                                                                                                                                                                                                 |
| AC2 |   PASS | "Mancano 3 passaggi obbligatori" e "Crea paziente" disattivato. Il passaggio "Dati anagrafici da correggere" porta il fuoco su Nome. Con nomi e conferme compare "Pronto per la creazione"; "Crea paziente" invia la stessa conferma (nome e cognome) e atterra su `#/dettaglio-paziente/p001`.                                                                                                                                         |
| AC3 |   PASS | Le conferme sono `ds-btn ds-btn--secondary` con `aria-pressed` false→true, salvate nella bozza (PATCH `_accepted` con demographics e therapy a true). "Conferma: nessuna terapia da inserire" compare quando non ci sono terapie. Indice e conteggio si aggiornano.                                                                                                                                                                     |
| AC4 |   PASS | Bozza d'import (seed simulato): anagrafica, allergie e terapia sono nelle loro sezioni e la proposta in attesa blocca. "Salva bozza e chiudi" salva e chiude, e alla riapertura la conferma anagrafica c'è ancora. Il duplicato ("Crea comunque", `confirmDuplicate`) e le allergie contrastanti ("Conferma comunque", `confirmAllergyConflict`) atterrano sul paziente come prima. Il modulo selezionato viene passato alla creazione. |
| AC5 |   PASS | Nessuno scorrimento orizzontale a 390/768/1024/1440. Sotto i 1024 l'indice è in alto e le azioni sono in basso, sempre visibili. Audit DS 21/21 su 102 + 68 stati.                                                                                                                                                                                                                                                                      |
| AC6 |   PASS | build.txt exit 0; unit-full.txt 894/903, con i soli 9 fallimenti della baseline (5 test nuovi). `import-happy-path.mjs` aggiornato (sintassi verificata).                                                                                                                                                                                                                                                                               |

## Test Results

| Test                                     | Result | Evidence                                        |
| ---------------------------------------- | -----: | ----------------------------------------------- |
| Unit                                     |   PASS | intakeProgress 5/5; suite completa (baseline)   |
| Playwright                               |   PASS | evidence.mjs 16/16; ds-audit 21/21 + 21/21      |
| Persistence after refresh                |   PASS | bozza riaperta con la conferma (draft simulato) |
| OCR/import                               |   PASS | bozza con dati d'import (seed simulato)         |
| Integration, API, Agnos, Voice, Security |     NA | nessuna API toccata                             |

## Runtime Evidence

- screenshots/pagina-unica-1180.png (accanto a hmi-parity/proto/ingresso-docs.png), bozza-da-import-1180.png, pagina-unica-390/768/1024/1440.png
- logs/playwright-evidence.txt, ds-audit-390-768-1180.txt, ds-audit-1024-1440.txt, unit-full.txt, build.txt

## Independent QA

- Primo giro (clinicos-qa): FAILED VALIDATION.
  - Bloccante: sotto i 1024px l'errore di autosalvataggio era invisibile e l'intestazione diceva "Bozza salvata" anche dopo un fallimento (regressione di #234).
  - Bloccante: a 390px l'interruttore di conferma della terapia usciva dalla card.
  - Avvisi: passaggio "decisione in attesa" fuori vista; "Salva bozza" disattivato con bozza non aperta; etichette della checklist diverse; audit che non vedeva il contenuto della scheda.
- Correzioni:
  - stato del salvataggio nell'intestazione a tutte le larghezze (role=status), senza "salvata" dopo un errore;
  - variante DS ds-btn--wrap per gli interruttori;
  - salto a "Riprova decisione";
  - saveDisabled/ready nell'indice;
  - etichette "Conferma …";
  - audit con /intake/drafts simulato: card dei moduli dichiarate e ds-btn--wrap misurato per altezza minima.
- Secondo giro: READY FOR QA. Bloccanti riprodotti e risolti a 390/768/1180; regressione delle sonde del primo giro (race di autosalvataggio, dati non validi, bozza da import, modulo appuntamento, larghezze, tastiera) tutta PASS; audit 21/21 + 21/21; suite 894/903 (baseline).

## Residual Risks

- A 390px, dentro la card, la tabella dei parametri mensili è più stretta (293px contro 347 nel wizard) e il pulsante del mese successivo si raggiunge scorrendo la tabella di lato. Da affinare in un ciclo successivo.

- Le bozze d'ingresso nell'evidence sono simulate (lo stub non implementa `/intake/drafts`). La logica di salvataggio e conferma non è cambiata.
- Gli script e2e storici fuori dalla CI `e2e/intake-scroll.mjs` e `e2e/remediation/issue-243.spec.ts` guidavano il wizard ed erano già obsoleti (cercavano uno `intake-step-6` inesistente). Restano come riferimento storico.
- Arrivano nei cicli successivi del programma d'ingresso: documento a fianco, card Documenti nella pagina, provenienza per pagina, archivio con "Collega alla cartella", letto.

## Final Decision

CLOSED — VERIFIED
