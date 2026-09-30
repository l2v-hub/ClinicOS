# Task Validation Report

## Task

- Title: Ingresso 3b: testo OCR per pagina e provenienza per pagina dei campi AI
- Slug: ingresso-3b-testo-ocr-per-pagina-e-provenienza-per-pagina-dei-campi-ai
- Commit: (vedi PR)
- Date: 2026-09-30

## Implementation Summary

Solo backend, tutto additivo, **nessuna migrazione**.

- **Testo di una pagina: `GET /ai/extraction/jobs/:id/pages/:pageId/text`** (`page-text.ts`, route in `import-pages.ts`).
  - Risposta `{pageId, status, rawText, manifestRevision}`, con `Cache-Control: private, no-store` e nessun log del testo.
  - La riga OCR si cerca con l'hash corrente della pagina: una pagina sostituita non restituisce mai il testo vecchio.
  - Un altro operatore o una pagina sconosciuta ricevono 404.
  - Passa per `requireOperator`, `importRateLimit`, `requireOwnedImportJob` e `pageOnly`.
- **Pagina di origine: `locateFieldPages`** (`page-locate.ts`), funzione pura. Principio: una pagina sbagliata è peggio di nessuna.
  - **Nomi**: nome e cognome contano solo come coppia adiacente, senza titoli da medico davanti ("Dott. Rossi Mario" è una firma). Il sesso segue solo la coppia.
  - **Date**: solo con l'anno a 4 cifre.
  - **CF, email, telefono e codici**: corrispondenza a token intero.
  - **Testi lunghi**: almeno 5 parole e 30 caratteri, esclusi titoli e frasi di rito.
  - **Allergeni**: contano solo vicino a una parola di allergia non negata.
- **Unione** (`draft-merge.ts`, `draft-link.ts`): carica nella stessa transazione solo il testo OCR corrente delle pagine coinvolte e scrive `pages` nell'origine dei campi e nelle proposte.
  - Nell'unione finale restringe `groupIds` solo quando le pagine trovate stanno tutte nell'unica lettera che ha prodotto il valore; negli altri casi lascia i `groupIds` come oggi, senza pagine.
  - Le bozze senza `pages` funzionano come prima.
  - Il PATCH del client continua a scartare le chiavi del server.

## Files Changed

- backend/src/ai/upload/pages/: draft-merge.ts, draft-link.ts, page-locate.ts (nuovo), page-text.ts (nuovo)
- backend/src/routes/import-pages.ts
- test: pages/**tests**/page-locate.test.ts, draft-merge-pages.test.ts, page-text-contract.test.ts; intake/**tests**/import-page-provenance-db.test.ts

## Acceptance Criteria Result

| AC  |          Result | Evidence                                                                                                                                                                                                                |
| --- | --------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |            PASS | page-locate.test.ts: date, CF con spazi, token interi, nessuna corrispondenza, più pagine, allergie, sesso. Include le sonde negative della QA (Rosa, Basso, Santa Maria, firma di un medico omonimo, allergie negate). |
| AC2 |            PASS | draft-merge-pages.test.ts: `pages` per lettera e nella finale, proposte, apply, lettera produttrice, regressione BASS0/basso, bozze vecchie.                                                                            |
| AC3 | PENDING CI gate | Contratto offline in page-text-contract.test.ts (proprietà, 404, `rawText` null, no-store); versione DB in import-page-provenance-db.test.ts, che gira solo in CI.                                                      |
| AC4 | PENDING CI gate | import-page-provenance-db.test.ts, unione con testo OCR per pagina, in CI.                                                                                                                                              |
| AC5 |            PASS | tsc del backend ok; unit e contratto locali 71/71; suite completa: nessun file prima verde diventa rosso, gli unici file in più falliscono per `DATABASE_URL`, come atteso in locale.                                   |

## Independent QA

clinicos-qa:

- **1° giro, FAILED VALIDATION.** Falsi positivi con testo italiano realistico: cognomi che sono parole comuni, l'intestazione "Santa Maria", frasi di rito, allergeni citati in terapia, anno a 2 cifre, sottostringhe. Nell'unione finale, lettera sbagliata. Tutto corretto, con test.
- **2° giro, READY FOR QA.** Due rifiniture consigliate e applicate dopo il giro, con test:
  - scartare la coppia preceduta da un titolo da medico (`dott`, `dr`, `prof`, …);
  - ignorare le parole di allergia negate ("nega allergie", "allergie: nessuna").
- **Casi residui accettati**, perché richiedono il nome completo della paziente scritto altrove come frase:
  - elenchi di nomi adiacenti;
  - un luogo con lo stesso nome della paziente, per esempio "Villa Serena" per Serena Villa.

  Il danno massimo è una pagina in più dentro la lettera produttrice.

## Residual Risks

- La pagina è una corrispondenza testuale, non un riferimento dato dal modello. Il frontend deve presentarla come "trovato a pagina", mai come certezza.
- Con più lettere concordi, l'unione finale non registra pagine: resta quella dell'unione per lettera.
- Le diagnosi brevi non ricevono pagina (soglia di sicurezza).

## Final Decision

IMPLEMENTED — NOT VERIFIED
